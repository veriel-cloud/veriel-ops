import { DEFAULT_PROJECT_TYPE, domainForEnv } from "../constants.js";
import type { PipelineJob } from "../types.js";
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
  const desDomain = domainForEnv(name, "des", customDomain);

  let pagesSubdomain = name;

  const jobs: PipelineJob[] = [
    {
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
                `Template: ${projectType}`,
                `Visibility: private`,
                `Repository created: ${repo.html_url}`,
              ],
            };
          },
        },
        {
          id: "add-workflows",
          label: "Add CI/CD workflows",
          fn: async () => {
            await gh.addWorkflowCallers(name, name);
            return {
              detail: "5 workflow callers",
              logs: [
                "Adding workflow caller files...",
                "  → .github/workflows/ci.yml",
                "  → .github/workflows/deploy-des.yml",
                "  → .github/workflows/deploy-pre.yml",
                "  → .github/workflows/deploy-pro.yml",
                "  → .github/workflows/rollback.yml",
                "All workflow callers committed.",
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
      ],
    },
    {
      id: "infra",
      label: "Configure Infrastructure",
      steps: [
        {
          id: "cf-pages",
          label: "Create Cloudflare Pages project",
          fn: async () => {
            const pages = await cf.createPagesProjectForEnv(name, "des", org, name);
            pagesSubdomain = pages.subdomain;
            return {
              detail: `${name}-des → ${pages.subdomain}`,
              logs: [
                `Creating Pages project: ${name}-des...`,
                `Connected to GitHub: ${org}/${name}`,
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
            const result = await cf.setupEnvDns(name, "des", pagesSubdomain, customDomain);
            return {
              detail: `${desDomain} → ${result.pagesTarget}`,
              logs: [
                "Creating CNAME record...",
                `  → ${result.domain} → ${result.pagesTarget}`,
                `Assigning custom domain to ${name}-des...`,
                `  → ${result.domain}`,
                "DNS + custom domain configured.",
              ],
            };
          },
        },
      ],
    },
  ];

  // Optional webhook job
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
}
