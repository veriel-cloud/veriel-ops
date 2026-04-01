import { DEFAULT_PROJECT_TYPE, domainForEnv, PROJECT_TYPE_CONFIG } from "../constants.js";
import type { DeployTarget, PipelineJob } from "../types.js";
import type { CloudflareService } from "./cloudflare.js";
import type { GitHubService } from "./github.js";

interface PipelineContext {
  name: string;
  type: string;
  description?: string;
  customDomain?: string;
  org: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

/**
 * Builds the setup pipeline (repo + infra) for creating a new project.
 * Returns the jobs array and a way to read the pagesSubdomain after execution.
 */
export function buildSetupPipeline(ctx: PipelineContext, gh: GitHubService, cf: CloudflareService) {
  const { name, type, description, customDomain, org } = ctx;
  const projectType = type ?? DEFAULT_PROJECT_TYPE;
  const typeConfig = PROJECT_TYPE_CONFIG[projectType as keyof typeof PROJECT_TYPE_CONFIG];
  const deployTarget: DeployTarget = typeConfig?.deployTarget ?? "cf-pages";
  const desDomain = domainForEnv(name, "des", customDomain);

  let pagesSubdomain = name;

  // ─── Job: Setup Repository (common to all targets) ──────────────

  const repoJob: PipelineJob = {
    id: "setup-repo",
    label: "Setup Repository",
    steps: [
      {
        id: "create-repo",
        label: "Create repository",
        fn: async () => {
          const repo = await gh.createRepo(name, {
            description: description ?? `${projectType} project managed by veriel-ops`,
            isPrivate: true,
            type: projectType,
          });
          return {
            detail: repo.full_name,
            logs: [
              `Creating repository ${org}/${name}...`,
              `Template: ${typeConfig?.template ?? projectType}`,
              `Visibility: private`,
              `Repository created: ${repo.html_url}`,
            ],
          };
        },
      },
      {
        id: "create-branches",
        label: "Create develop branch",
        fn: async () => {
          await gh.createBranch(name, "develop", "main");
          return {
            detail: "develop ← main",
            logs: [
              "Fetching main branch SHA...",
              "Creating branch develop from main...",
              "Branch develop created successfully.",
            ],
          };
        },
      },
      {
        id: "add-workflows",
        label: "Add CI/CD workflows",
        fn: async () => {
          await gh.addWorkflowCallers(name, name, deployTarget, "develop");
          return {
            detail: `5 workflow callers on develop (${deployTarget})`,
            logs: [
              `Adding workflow callers to develop for target: ${deployTarget}...`,
              "  → .github/workflows/ci.yml",
              "  → .github/workflows/deploy-des.yml",
              "  → .github/workflows/deploy-pre.yml",
              "  → .github/workflows/deploy-pro.yml",
              "  → .github/workflows/rollback.yml",
              "All workflow callers committed to develop.",
            ],
          };
        },
      },
      {
        id: "reset-main",
        label: "Reset main branch",
        fn: async () => {
          await gh.resetBranchToReadme(name, name, "main");
          return {
            detail: "main → README only",
            logs: [
              "Resetting main to initial state...",
              "Main now contains only README.md.",
              "All project content lives in develop.",
            ],
          };
        },
      },
    ],
  };

  // ─── Job: Infrastructure (varies by deploy target) ──────────────

  const infraJob = buildInfraJob(deployTarget, {
    name,
    desDomain,
    customDomain,
    org,
    cf,
  });

  const jobs: PipelineJob[] = [repoJob, infraJob];

  // ─── Optional: Webhook ──────────────────────────────────────────

  if (ctx.webhookUrl && ctx.webhookSecret) {
    const { webhookUrl, webhookSecret } = ctx;
    jobs.push({
      id: "connect",
      label: "Connect Services",
      steps: [
        {
          id: "webhook",
          label: "Configure GitHub webhook",
          fn: async () => {
            await gh.createWebhook(name, webhookUrl, webhookSecret);
            return {
              detail: "Webhook active",
              logs: [
                `Creating webhook for ${org}/${name}...`,
                `URL: ${webhookUrl}`,
                "Events: push, workflow_run, pull_request, create",
                "Webhook created and active.",
              ],
            };
          },
        },
      ],
    });
  }

  return { jobs, getPagesSubdomain: () => pagesSubdomain };

  // ─── Infra job builders ─────────────────────────────────────────

  function buildInfraJob(
    target: DeployTarget,
    opts: {
      name: string;
      desDomain: string;
      customDomain?: string;
      org: string;
      cf: CloudflareService;
    },
  ): PipelineJob {
    switch (target) {
      case "cf-pages":
        return buildCfPagesInfraJob(opts);
      case "cf-workers":
        return buildCfWorkersInfraJob(opts);
      case "container":
        return buildContainerInfraJob(opts);
    }
  }

  function buildCfPagesInfraJob(opts: {
    name: string;
    desDomain: string;
    customDomain?: string;
    org: string;
    cf: CloudflareService;
  }): PipelineJob {
    return {
      id: "infra",
      label: "Configure Infrastructure (CF Pages)",
      steps: [
        {
          id: "cf-pages",
          label: "Create Cloudflare Pages project",
          fn: async () => {
            const pages = await opts.cf.createPagesProjectForEnv(opts.name, "des", opts.org, opts.name);
            pagesSubdomain = pages.subdomain;
            return {
              detail: `${opts.name}-des → ${pages.subdomain}`,
              logs: [
                `Creating Pages project: ${opts.name}-des...`,
                `Connected to GitHub: ${opts.org}/${opts.name}`,
                `Auto-deploys: disabled (wrangler only)`,
                `Pages URL: ${pages.subdomain}`,
              ],
            };
          },
        },
        {
          id: "dns-setup",
          label: "Setup DNS + custom domain",
          fn: async () => {
            const result = await opts.cf.setupEnvDns(opts.name, "des", pagesSubdomain, opts.customDomain);
            return {
              detail: `${opts.desDomain} → ${result.pagesTarget}`,
              logs: [
                "Creating CNAME record...",
                `  → ${result.domain} → ${result.pagesTarget}`,
                `Assigning custom domain to ${opts.name}-des...`,
                `  → ${result.domain}`,
                "DNS + custom domain configured.",
              ],
            };
          },
        },
      ],
    };
  }

  function buildCfWorkersInfraJob(opts: { name: string; desDomain: string }): PipelineJob {
    return {
      id: "infra",
      label: "Configure Infrastructure (CF Workers)",
      steps: [
        {
          id: "worker-info",
          label: "Workers setup info",
          fn: async () => {
            return {
              detail: "Domain will be attached after deploy",
              logs: [
                "Skipping Pages project (Workers target).",
                "Custom domain will be attached after GitHub Actions deploys the Worker.",
                `Pending: ${opts.desDomain} → ${opts.name}-des`,
              ],
            };
          },
        },
      ],
    };
  }

  function buildContainerInfraJob(opts: { name: string; desDomain: string }): PipelineJob {
    return {
      id: "infra",
      label: "Configure Infrastructure (Container)",
      steps: [
        {
          id: "dns-setup",
          label: "Setup DNS placeholder",
          fn: async () => {
            return {
              detail: `${opts.desDomain} → pending VPS`,
              logs: [
                "Skipping Cloudflare infra (Container target).",
                `DNS for ${opts.desDomain} will be configured when VPS is available.`,
                "Container projects require manual DNS setup after VPS provisioning.",
              ],
            };
          },
        },
      ],
    };
  }
}
