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
// Phase 1: Create repo + infra (API calls)
// Phase 2: Poll the real GitHub Actions workflow run for deploy-des
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

  const setupPipeline: PipelineJob[] = [
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

    // We'll track the timestamp before creating the develop branch
    // so we can find the workflow run that gets triggered
    let branchCreatedAt: Date | null = null;

    // Build init payload: setup jobs + a placeholder "Deploy DES" job
    // The Deploy DES job will be populated with real steps from GitHub Actions
    const initJobs = [
      ...setupPipeline.map((job) => ({
        id: job.id,
        label: job.label,
        status: "pending" as const,
        steps: job.steps.map((step) => ({
          id: step.id,
          label: step.label,
          status: "pending" as const,
        })),
      })),
      {
        id: "deploy-des",
        label: "Deploy DES (GitHub Actions)",
        status: "pending" as const,
        steps: [
          { id: "waiting-run", label: "Waiting for workflow run...", status: "pending" as const },
        ],
      },
    ];

    await stream.writeSSE({
      data: JSON.stringify({ title: `Deploy ${name}`, jobs: initJobs }),
      event: "init",
    });

    // ── Phase 1: Execute setup pipeline ──────────────────────────────
    for (let ji = 0; ji < setupPipeline.length; ji++) {
      const job = setupPipeline[ji];

      await stream.writeSSE({
        data: JSON.stringify({ jobId: job.id, status: "running" }),
        event: "job",
      });

      const jobStart = Date.now();
      let jobFailed = false;

      for (let si = 0; si < job.steps.length; si++) {
        const step = job.steps[si];

        await stream.writeSSE({
          data: JSON.stringify({ jobId: job.id, stepId: step.id, status: "running" }),
          event: "step",
        });

        const stepStart = Date.now();

        try {
          // Record timestamp just before creating develop branch
          if (step.id === "create-branches") {
            branchCreatedAt = new Date();
          }

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

          for (let rs = si + 1; rs < job.steps.length; rs++) {
            await stream.writeSSE({
              data: JSON.stringify({ jobId: job.id, stepId: job.steps[rs].id, status: "skipped" }),
              event: "step",
            });
          }

          jobFailed = true;
          break;
        }
      }

      const jobDuration = Date.now() - jobStart;

      await stream.writeSSE({
        data: JSON.stringify({
          jobId: job.id,
          status: jobFailed ? "error" : "success",
          duration: jobDuration,
        }),
        event: "job",
      });

      if (jobFailed) {
        await stream.writeSSE({
          data: JSON.stringify({
            jobId: "deploy-des",
            status: "pending",
          }),
          event: "job",
        });

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

    // ── Phase 2: Monitor real GitHub Actions workflow ─────────────────
    await stream.writeSSE({
      data: JSON.stringify({ jobId: "deploy-des", status: "running" }),
      event: "job",
    });

    await stream.writeSSE({
      data: JSON.stringify({
        jobId: "deploy-des",
        stepId: "waiting-run",
        status: "running",
        detail: "Polling GitHub Actions...",
      }),
      event: "step",
    });

    try {
      // Wait for the workflow run to appear
      const searchFrom = branchCreatedAt ?? new Date(globalStart);
      const runId = await github.waitForWorkflowRun(name, "develop", searchFrom, 120_000, 4_000);

      if (!runId) {
        throw new Error("Timeout waiting for GitHub Actions workflow run");
      }

      await stream.writeSSE({
        data: JSON.stringify({
          jobId: "deploy-des",
          stepId: "waiting-run",
          status: "success",
          detail: `Run #${runId}`,
          duration: Date.now() - (branchCreatedAt?.getTime() ?? globalStart),
        }),
        event: "step",
      });

      // Now poll the run until it completes, streaming real job/step updates
      const POLL_INTERVAL = 5_000;
      const RUN_TIMEOUT = 600_000; // 10 min max
      const runStart = Date.now();

      // Track which GitHub Actions jobs/steps we've already sent to the client
      const sentJobs = new Map<number, string>(); // jobId -> last status
      const sentSteps = new Map<string, string>(); // "jobId:stepName" -> last status
      // Map GitHub job IDs to our SSE step IDs
      const ghJobIdMap = new Map<number, string>(); // github job.id -> our step id

      let runCompleted = false;
      let lastRunStatus = "";

      while (!runCompleted && Date.now() - runStart < RUN_TIMEOUT) {
        const [run, jobs] = await Promise.all([
          github.getWorkflowRun(name, runId),
          github.getWorkflowRunJobs(name, runId),
        ]);

        // Process each GitHub Actions job
        for (const ghJob of jobs) {
          const ghJobKey = ghJob.id;

          // Create a deterministic step ID from the job name
          if (!ghJobIdMap.has(ghJobKey)) {
            const stepId = `gh-job-${ghJob.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
            ghJobIdMap.set(ghJobKey, stepId);

            // Add this job as a new step in our deploy-des job
            await stream.writeSSE({
              data: JSON.stringify({
                jobId: "deploy-des",
                stepId,
                status: "pending",
                label: ghJob.name,
              }),
              event: "step",
            });
          }

          const stepId = ghJobIdMap.get(ghJobKey)!;
          const currentStatus = ghJob.status === "completed"
            ? (ghJob.conclusion === "success" ? "success" : "error")
            : ghJob.status === "in_progress"
              ? "running"
              : "pending";

          const prevStatus = sentJobs.get(ghJobKey);

          if (prevStatus !== currentStatus) {
            sentJobs.set(ghJobKey, currentStatus);

            // Calculate real duration from GitHub's timestamps
            let duration: number | undefined;
            if (ghJob.completed_at && ghJob.started_at) {
              duration = new Date(ghJob.completed_at).getTime() - new Date(ghJob.started_at).getTime();
            }

            // Build detail from the job's steps
            let detail: string | undefined;
            if (ghJob.conclusion === "success" && ghJob.steps) {
              const totalSteps = ghJob.steps.length;
              detail = `${totalSteps} steps completed`;
            } else if (ghJob.conclusion === "failure" && ghJob.steps) {
              const failedStep = ghJob.steps.find((s) => s.conclusion === "failure");
              detail = failedStep ? `Failed at: ${failedStep.name}` : "Failed";
            }

            // Build logs from real step data
            const logs: string[] = [];
            if (ghJob.steps) {
              for (const step of ghJob.steps) {
                const icon = step.conclusion === "success" ? "✓"
                  : step.conclusion === "failure" ? "✗"
                  : step.status === "in_progress" ? "●"
                  : "○";

                let stepDuration = "";
                if (step.completed_at && step.started_at) {
                  const ms = new Date(step.completed_at).getTime() - new Date(step.started_at).getTime();
                  stepDuration = ms < 1000 ? ` (${ms}ms)` : ` (${(ms / 1000).toFixed(1)}s)`;
                }

                logs.push(`${icon} ${step.name}${stepDuration}`);
              }
            }

            await stream.writeSSE({
              data: JSON.stringify({
                jobId: "deploy-des",
                stepId,
                status: currentStatus,
                detail,
                duration,
                logs: logs.length > 0 ? logs : undefined,
              }),
              event: "step",
            });
          }
        }

        // Check if the overall run is done
        if (run.status === "completed") {
          runCompleted = true;
          lastRunStatus = run.conclusion ?? "unknown";
        } else {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL));
        }
      }

      // Calculate total duration of the GitHub Actions run
      const finalRun = await github.getWorkflowRun(name, runId);
      let ghRunDuration: number | undefined;
      if (finalRun.updated_at && finalRun.run_started_at) {
        ghRunDuration = new Date(finalRun.updated_at).getTime() - new Date(finalRun.run_started_at).getTime();
      }

      const ghRunSuccess = lastRunStatus === "success";

      await stream.writeSSE({
        data: JSON.stringify({
          jobId: "deploy-des",
          status: ghRunSuccess ? "success" : "error",
          duration: ghRunDuration,
        }),
        event: "job",
      });

      if (!ghRunSuccess) {
        await stream.writeSSE({
          data: JSON.stringify({
            error: `GitHub Actions workflow ${lastRunStatus || "timed out"}`,
            failedJob: "deploy-des",
            totalDuration: Date.now() - globalStart,
          }),
          event: "error",
        });
        return;
      }

      // ── Complete ─────────────────────────────────────────────────────
      // Fetch the run summary for the result
      const finalJobs = await github.getWorkflowRunJobs(name, runId);
      const deployJob = finalJobs.find((j) => j.name.toLowerCase().includes("deploy"));
      const buildJob = finalJobs.find((j) => j.name.toLowerCase().includes("build") && !j.name.toLowerCase().includes("r2"));

      // Try to extract commit and build info from job outputs/steps
      let commit = finalRun.head_sha?.substring(0, 7) ?? "";
      let buildVersion = "";

      // Look for the deploy summary in annotations
      const storeJob = finalJobs.find((j) => j.name.toLowerCase().includes("store") || j.name.toLowerCase().includes("r2"));

      const totalDuration = Date.now() - globalStart;
      await stream.writeSSE({
        data: JSON.stringify({
          success: true,
          totalDuration,
          ghRunId: runId,
          ghRunUrl: finalRun.html_url,
          project: {
            name,
            repo: `${org}/${name}`,
            urls: {
              des: `https://dev.${baseDomain}`,
              pre: `https://pre.${baseDomain}`,
              pro: `https://${baseDomain}`,
            },
            github: `https://github.com/${org}/${name}`,
            commit,
          },
        }),
        event: "complete",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";

      await stream.writeSSE({
        data: JSON.stringify({
          jobId: "deploy-des",
          stepId: "waiting-run",
          status: "error",
          detail: message,
          logs: [`Error: ${message}`],
        }),
        event: "step",
      });

      await stream.writeSSE({
        data: JSON.stringify({
          jobId: "deploy-des",
          status: "error",
        }),
        event: "job",
      });

      await stream.writeSSE({
        data: JSON.stringify({
          error: message,
          failedJob: "deploy-des",
          totalDuration: Date.now() - globalStart,
        }),
        event: "error",
      });
    }
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
