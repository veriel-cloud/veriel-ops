import { Hono } from "hono";
import { env } from "hono/adapter";
import { streamSSE } from "hono/streaming";
import { DEFAULT_ORG, domainForEnv } from "../constants.js";
import type { Env } from "../env.js";
import { getProjectDetail, getProjects } from "../services/data.js";
import { buildSetupPipeline } from "../services/pipeline.js";
import { executeSetupPipeline, pollWorkflowRun } from "../services/sse.js";

export const projectsRoutes = new Hono<Env>();

const services = (c: { get: (k: "github" | "cloudflare" | "r2") => unknown }) => ({
  github: c.get("github") as ReturnType<typeof import("../services/github.js").createGitHubService>,
  cloudflare: c.get("cloudflare") as ReturnType<typeof import("../services/cloudflare.js").createCloudflareService>,
  r2: c.get("r2") as ReturnType<typeof import("../services/r2.js").createR2Service>,
});

// ─── List ─────────────────────────────────────────────────────────────

projectsRoutes.get("/", async (c) => {
  const projects = await getProjects(services(c));
  return c.json({ projects });
});

// ─── Create (simple, no SSE) ──────────────────────────────────────────

projectsRoutes.post("/", async (c) => {
  const { name, type, description, customDomain } = await c.req.json();
  if (!name) return c.json({ error: "Project name is required" }, 400);

  const log = c.get("logger");
  const gh = c.get("github");
  const cf = c.get("cloudflare");
  const e = env(c);
  const org = e.GITHUB_ORG || DEFAULT_ORG;

  log.info({ project: name, type, customDomain }, "creating project");

  const repo = await gh.createRepo(name, {
    description: description ?? `${type ?? "web"} project managed by veriel-ops`,
    isPrivate: true,
    type: type ?? "astro-static",
  });

  await gh.addWorkflowCallers(name, name);
  await gh.createBranch(name, "develop", "main");

  const pages = await cf.createPagesProjectForEnv(name, "des", org, name);
  const { dnsRecord } = await cf.setupEnvDns(name, "des", pages.subdomain, customDomain);

  if (e.WEBHOOK_URL && e.GITHUB_WEBHOOK_SECRET) {
    await gh.createWebhook(name, e.WEBHOOK_URL, e.GITHUB_WEBHOOK_SECRET);
  }

  return c.json(
    {
      success: true,
      project: {
        name,
        repo: repo.full_name,
        urls: { des: `https://${domainForEnv(name, "des", customDomain)}` },
        github: repo.html_url,
        pages: pages.subdomain,
        dns: [dnsRecord.name],
      },
    },
    201,
  );
});

// ─── Create with SSE ──────────────────────────────────────────────────

projectsRoutes.post("/create-stream", async (c) => {
  const { name, type, description, customDomain } = await c.req.json();
  if (!name) return c.json({ error: "Project name is required" }, 400);

  const log = c.get("logger");
  const gh = c.get("github");
  const cf = c.get("cloudflare");
  const e = env(c);
  const org = e.GITHUB_ORG || DEFAULT_ORG;

  log.info({ project: name, type, customDomain }, "creating project via SSE stream");
  const desDomain = domainForEnv(name, "des", customDomain);

  const { jobs } = buildSetupPipeline(
    { name, type, description, customDomain, org, webhookUrl: e.WEBHOOK_URL, webhookSecret: e.GITHUB_WEBHOOK_SECRET },
    gh,
    cf,
  );

  return streamSSE(c, async (stream) => {
    const globalStart = Date.now();

    // Send init with all jobs + deploy placeholder
    const initJobs = [
      ...jobs.map((j) => ({
        id: j.id,
        label: j.label,
        status: "pending" as const,
        steps: j.steps.map((s) => ({ id: s.id, label: s.label, status: "pending" as const })),
      })),
      {
        id: "deploy-des",
        label: "Deploy DES (GitHub Actions)",
        status: "pending" as const,
        steps: [{ id: "waiting-run", label: "Waiting for workflow run...", status: "pending" as const }],
      },
    ];

    await stream.writeSSE({ event: "init", data: JSON.stringify({ title: `Deploy ${name}`, jobs: initJobs }) });

    // Phase 1: Setup repo + infra
    const { branchCreatedAt, failed } = await executeSetupPipeline(stream, jobs, globalStart, log);
    if (failed) return;

    // Phase 2: Poll real GitHub Actions workflow
    try {
      const result = await pollWorkflowRun(stream, gh, name, branchCreatedAt, globalStart, log);
      if (!result) return;

      await stream.writeSSE({
        event: "complete",
        data: JSON.stringify({
          success: true,
          totalDuration: Date.now() - globalStart,
          ghRunId: result.runId,
          ghRunUrl: result.htmlUrl,
          project: {
            name,
            repo: `${org}/${name}`,
            urls: { des: `https://${desDomain}` },
            github: `https://github.com/${org}/${name}`,
            commit: result.commit,
          },
        }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({ error: message, failedJob: "deploy-des", totalDuration: Date.now() - globalStart }),
      });
    }
  });
});

// ─── Detail ───────────────────────────────────────────────────────────

projectsRoutes.get("/:name", async (c) => {
  const detail = await getProjectDetail(c.req.param("name"), services(c));
  return c.json({
    project: { ...detail.project, workflowRuns: detail.workflowRuns },
    deploys: detail.deploys,
    builds: detail.builds,
  });
});

projectsRoutes.get("/:name/deploys", async (c) => {
  const detail = await getProjectDetail(c.req.param("name"), services(c));
  return c.json({ deploys: detail.deploys });
});

projectsRoutes.get("/:name/builds", async (c) => {
  const builds = await c.get("r2").listBuilds(c.req.param("name"));
  return c.json({ builds });
});

// ─── Actions ──────────────────────────────────────────────────────────

projectsRoutes.post("/:name/promote", async (c) => {
  const name = c.req.param("name");
  const { from, version } = await c.req.json();
  c.get("logger").info({ project: name, from, version }, "promoting project");

  if (from === "des") {
    if (!version) return c.json({ error: "Version required" }, 400);
    await c.get("github").createBranch(name, `release/${version}`, "develop");
    return c.json({ success: true, from: "des", to: "pre", branch: `release/${version}` });
  }
  if (from === "pre") {
    return c.json({ success: true, from: "pre", to: "pro", message: "Merge release to main via PR" });
  }
  return c.json({ error: `Cannot promote from ${from}` }, 400);
});

// ─── Deploy ──────────────────────────────────────────────────────────

projectsRoutes.post("/:name/deploy", async (c) => {
  const name = c.req.param("name");
  const { environment } = await c.req.json();

  const envConfig: Record<string, { workflow: string; ref: string }> = {
    des: { workflow: "deploy-des.yml", ref: "develop" },
    pre: { workflow: "deploy-pre.yml", ref: "main" },
    pro: { workflow: "deploy-pro.yml", ref: "main" },
  };

  const config = envConfig[environment];
  if (!config) return c.json({ error: `Invalid environment: ${environment}` }, 400);

  c.get("logger").info(
    { project: name, environment, workflow: config.workflow, ref: config.ref },
    "triggering manual deploy",
  );
  await c.get("github").dispatchWorkflow(name, config.workflow, {}, config.ref);
  return c.json({ success: true, action: "deploy", project: name, environment, workflow: config.workflow });
});

// ─── Branches ────────────────────────────────────────────────────────

projectsRoutes.get("/:name/branches", async (c) => {
  const branches = await c.get("github").getRepoBranches(c.req.param("name"));
  return c.json({ branches: branches.map((b) => b.name) });
});

// ─── Rollback ────────────────────────────────────────────────────────

projectsRoutes.post("/:name/rollback", async (c) => {
  const name = c.req.param("name");
  const { environment, buildArtifact } = await c.req.json();

  if (!environment || !buildArtifact) return c.json({ error: "environment and buildArtifact required" }, 400);

  c.get("logger").info({ project: name, environment, buildArtifact }, "triggering rollback");
  await c.get("github").dispatchWorkflow(name, "rollback.yml", { environment, build_artifact: buildArtifact });
  return c.json({ success: true, action: "rollback", project: name, environment, buildArtifact });
});
