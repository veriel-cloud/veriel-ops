import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import * as github from "../services/github.js";
import * as cloudflare from "../services/cloudflare.js";
import { getProjects, getProjectDetail } from "../services/data.js";
import * as r2 from "../services/r2.js";

export const projectsRoutes = new Hono();

// GET /api/projects
projectsRoutes.get("/", async (c) => {
  try {
    const projects = await getProjects();
    return c.json({ projects });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// POST /api/projects
projectsRoutes.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { name, type, description, customDomain } = body;

    if (!name) {
      return c.json({ error: "Project name is required" }, 400);
    }

    const org = process.env.GITHUB_ORG ?? "veriel-cloud";

    const repo = await github.createRepo(name, {
      description: description ?? `${type ?? "web"} project managed by veriel-ops`,
      isPrivate: true,
      type: type ?? "astro-static",
    });

    await github.addWorkflowCallers(name, name);
    await github.createBranch(name, "develop", "main");

    const pagesProject = await cloudflare.createPagesProject(name, org, name);
    const dnsRecords = await cloudflare.setupProjectDns(name, customDomain);
    await cloudflare.setupCustomDomains(name, customDomain);

    const webhookUrl = process.env.WEBHOOK_URL;
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookUrl && webhookSecret) {
      await github.createWebhook(name, webhookUrl, webhookSecret);
    }

    const baseDomain = customDomain ?? `${name}.veriel.dev`;

    return c.json({
      success: true,
      project: {
        name,
        repo: repo.full_name,
        urls: {
          des: `https://dev.${baseDomain}`,
          pre: `https://pre.${baseDomain}`,
          pro: `https://${baseDomain}`,
        },
        github: repo.html_url,
        pages: pagesProject.subdomain,
        dns: dnsRecords.map((r: any) => r.name),
      },
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// POST /api/projects/create-stream (SSE)
// Emits GitHub Actions-style events: init (full pipeline), job, step, complete, error
projectsRoutes.post("/create-stream", async (c) => {
  const body = await c.req.json();
  const { name, type, description, customDomain } = body;

  if (!name) {
    return c.json({ error: "Project name is required" }, 400);
  }

  const org = process.env.GITHUB_ORG ?? "veriel-cloud";
  const baseDomain = customDomain ?? `${name}.veriel.dev`;
  const webhookUrl = process.env.WEBHOOK_URL;
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
  const hasWebhook = !!(webhookUrl && webhookSecret);

  // Define the full pipeline as jobs > steps
  interface PipelineStep {
    id: string;
    label: string;
    fn: () => Promise<{ detail?: string; logs?: string[] }>;
  }

  interface PipelineJob {
    id: string;
    label: string;
    steps: PipelineStep[];
  }

  const pipeline: PipelineJob[] = [
    {
      id: "setup-repo",
      label: "Setup Repository",
      steps: [
        {
          id: "create-repo",
          label: "Create repository",
          fn: async () => {
            const repo = await github.createRepo(name, {
              description: description ?? `${type ?? "web"} project managed by veriel-ops`,
              isPrivate: true,
              type: type ?? "astro-static",
            });
            return {
              detail: repo.full_name,
              logs: [
                `Creating repository ${org}/${name}...`,
                `Template: ${type ?? "astro-static"}`,
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
            await github.addWorkflowCallers(name, name);
            return {
              detail: "5 workflow callers",
              logs: [
                "Adding workflow caller files...",
                "  → .github/workflows/deploy-des.yml",
                "  → .github/workflows/deploy-pre.yml",
                "  → .github/workflows/deploy-pro.yml",
                "  → .github/workflows/rollback.yml",
                "  → .github/workflows/teardown.yml",
                "All workflow callers committed.",
              ],
            };
          },
        },
        {
          id: "create-branches",
          label: "Create develop branch",
          fn: async () => {
            await github.createBranch(name, "develop", "main");
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
            const pages = await cloudflare.createPagesProject(name, org, name);
            return {
              detail: `${pages.subdomain}.pages.dev`,
              logs: [
                `Creating Pages project: ${name}...`,
                `Connected to GitHub: ${org}/${name}`,
                `Production branch: main`,
                `Preview URL: ${pages.subdomain}.pages.dev`,
              ],
            };
          },
        },
        {
          id: "dns-records",
          label: "Setup DNS records",
          fn: async () => {
            const records = await cloudflare.setupProjectDns(name, customDomain);
            return {
              detail: `${records.length} CNAME records`,
              logs: [
                "Configuring DNS records on Cloudflare...",
                ...records.map((r: any) => `  → CNAME ${r.name} → ${r.content}`),
                `${records.length} DNS records created.`,
              ],
            };
          },
        },
        {
          id: "custom-domains",
          label: "Assign custom domains",
          fn: async () => {
            await cloudflare.setupCustomDomains(name, customDomain);
            return {
              detail: `dev.${baseDomain}, pre.${baseDomain}, ${baseDomain}`,
              logs: [
                "Assigning custom domains to Pages project...",
                `  → dev.${baseDomain} (DES)`,
                `  → pre.${baseDomain} (PRE)`,
                `  → ${baseDomain} (PRO)`,
                "All custom domains assigned.",
              ],
            };
          },
        },
      ],
    },
    ...(hasWebhook
      ? [
          {
            id: "connect",
            label: "Connect Services",
            steps: [
              {
                id: "webhook",
                label: "Configure GitHub webhook",
                fn: async () => {
                  await github.createWebhook(name, webhookUrl!, webhookSecret!);
                  return {
                    detail: "Webhook active",
                    logs: [
                      `Creating webhook for ${org}/${name}...`,
                      `URL: ${webhookUrl}`,
                      "Events: push, pull_request, deployment_status",
                      "Webhook created and active.",
                    ],
                  };
                },
              },
            ],
          },
        ]
      : []),
  ];

  return streamSSE(c, async (stream) => {
    const globalStart = Date.now();

    // Send init event with the full pipeline structure (all pending)
    await stream.writeSSE({
      data: JSON.stringify({
        title: `Deploy ${name}`,
        jobs: pipeline.map((job) => ({
          id: job.id,
          label: job.label,
          status: "pending",
          steps: job.steps.map((step) => ({
            id: step.id,
            label: step.label,
            status: "pending",
          })),
        })),
      }),
      event: "init",
    });

    // Execute jobs sequentially
    for (let ji = 0; ji < pipeline.length; ji++) {
      const job = pipeline[ji];

      // Mark job as running
      await stream.writeSSE({
        data: JSON.stringify({ jobId: job.id, status: "running" }),
        event: "job",
      });

      const jobStart = Date.now();
      let jobFailed = false;

      // Execute steps within the job
      for (let si = 0; si < job.steps.length; si++) {
        const step = job.steps[si];

        // Mark step as running
        await stream.writeSSE({
          data: JSON.stringify({ jobId: job.id, stepId: step.id, status: "running" }),
          event: "step",
        });

        const stepStart = Date.now();

        try {
          const result = await step.fn();
          const duration = Date.now() - stepStart;

          await stream.writeSSE({
            data: JSON.stringify({
              jobId: job.id,
              stepId: step.id,
              status: "success",
              detail: result.detail,
              logs: result.logs,
              duration,
            }),
            event: "step",
          });
        } catch (err) {
          const duration = Date.now() - stepStart;
          const message = err instanceof Error ? err.message : "Unknown error";

          await stream.writeSSE({
            data: JSON.stringify({
              jobId: job.id,
              stepId: step.id,
              status: "error",
              detail: message,
              logs: [`Error: ${message}`],
              duration,
            }),
            event: "step",
          });

          // Mark remaining steps as skipped
          for (let rs = si + 1; rs < job.steps.length; rs++) {
            await stream.writeSSE({
              data: JSON.stringify({
                jobId: job.id,
                stepId: job.steps[rs].id,
                status: "skipped",
              }),
              event: "step",
            });
          }

          jobFailed = true;
          break;
        }
      }

      const jobDuration = Date.now() - jobStart;

      // Mark job as done
      await stream.writeSSE({
        data: JSON.stringify({
          jobId: job.id,
          status: jobFailed ? "error" : "success",
          duration: jobDuration,
        }),
        event: "job",
      });

      if (jobFailed) {
        // Mark remaining jobs as skipped
        for (let rj = ji + 1; rj < pipeline.length; rj++) {
          await stream.writeSSE({
            data: JSON.stringify({ jobId: pipeline[rj].id, status: "pending" }),
            event: "job",
          });
        }

        await stream.writeSSE({
          data: JSON.stringify({
            error: "Pipeline failed",
            failedJob: job.id,
            totalDuration: Date.now() - globalStart,
          }),
          event: "error",
        });
        return;
      }
    }

    // Send complete event
    const totalDuration = Date.now() - globalStart;
    await stream.writeSSE({
      data: JSON.stringify({
        success: true,
        totalDuration,
        project: {
          name,
          repo: `${org}/${name}`,
          urls: {
            des: `https://dev.${baseDomain}`,
            pre: `https://pre.${baseDomain}`,
            pro: `https://${baseDomain}`,
          },
          github: `https://github.com/${org}/${name}`,
        },
      }),
      event: "complete",
    });
  });
});

// GET /api/projects/:name
projectsRoutes.get("/:name", async (c) => {
  const name = c.req.param("name");
  try {
    const detail = await getProjectDetail(name);
    return c.json({ project: { ...detail.project, workflowRuns: detail.workflowRuns }, deploys: detail.deploys, builds: detail.builds });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// GET /api/projects/:name/deploys
projectsRoutes.get("/:name/deploys", async (c) => {
  const name = c.req.param("name");
  try {
    const detail = await getProjectDetail(name);
    return c.json({ deploys: detail.deploys });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// GET /api/projects/:name/builds
projectsRoutes.get("/:name/builds", async (c) => {
  const name = c.req.param("name");
  try {
    const builds = await r2.listBuilds(name);
    return c.json({ builds });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// POST /api/projects/:name/promote
projectsRoutes.post("/:name/promote", async (c) => {
  const name = c.req.param("name");
  const body = await c.req.json();
  const { from, version } = body;

  try {
    if (from === "des") {
      if (!version) return c.json({ error: "Version required" }, 400);
      await github.createBranch(name, `release/${version}`, "develop");
      return c.json({ success: true, from: "des", to: "pre", branch: `release/${version}` });
    }
    if (from === "pre") {
      return c.json({ success: true, from: "pre", to: "pro", message: "Merge release to main via PR" });
    }
    return c.json({ error: `Cannot promote from ${from}` }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// POST /api/projects/:name/rollback
projectsRoutes.post("/:name/rollback", async (c) => {
  const name = c.req.param("name");
  const body = await c.req.json();
  const { environment, buildArtifact } = body;

  if (!environment || !buildArtifact) {
    return c.json({ error: "environment and buildArtifact required" }, 400);
  }

  try {
    await github.dispatchWorkflow(name, "rollback.yml", { environment, build_artifact: buildArtifact });
    return c.json({ success: true, action: "rollback", project: name, environment, buildArtifact });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});
