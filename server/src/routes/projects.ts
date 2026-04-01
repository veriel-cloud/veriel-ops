import type { ProjectType } from "@veriel-ops/shared";
import { Hono } from "hono";
import { env } from "hono/adapter";
import { streamSSE } from "hono/streaming";
import { DEFAULT_ORG, domainForEnv, PROJECT_TYPE_CONFIG, pagesProjectName, urlForEnv } from "../constants.js";
import type { Env } from "../env.js";
import { buildSetupPipeline } from "../services/pipeline.js";
import { executeSetupPipeline, pollWorkflowRun } from "../services/sse.js";

export const projectsRoutes = new Hono<Env>();

const services = (c: { get: (k: "github" | "cloudflare" | "r2" | "store") => unknown }) => ({
  github: c.get("github") as ReturnType<typeof import("../services/github.js").createGitHubService>,
  cloudflare: c.get("cloudflare") as ReturnType<typeof import("../services/cloudflare.js").createCloudflareService>,
  r2: c.get("r2") as ReturnType<typeof import("../services/r2.js").createR2Service>,
  store: c.get("store") as import("../services/db-store.js").DbStore,
});

// ─── List ─────────────────────────────────────────────────────────────

projectsRoutes.get("/", async (c) => {
  const projects = await c.get("cachedData").getProjects(services(c));
  return c.json({ projects });
});

// ─── Create (simple, no SSE) ──────────────────────────────────────────

projectsRoutes.post("/", async (c) => {
  const { name, type, description, customDomain } = await c.req.json();
  if (!name) return c.json({ error: "Project name is required" }, 400);

  const projectType: ProjectType = type && type in PROJECT_TYPE_CONFIG ? type : "static";
  const typeConfig = PROJECT_TYPE_CONFIG[projectType];

  const log = c.get("logger");
  const gh = c.get("github");
  const cf = c.get("cloudflare");
  const store = c.get("store");
  const e = env(c);
  const org = e.GITHUB_ORG || DEFAULT_ORG;

  log.info(
    { project: name, type: projectType, deployTarget: typeConfig.deployTarget, customDomain },
    "creating project",
  );

  const repo = await gh.createRepo(name, {
    description: description ?? `${projectType} project managed by veriel-ops`,
    isPrivate: true,
    type: projectType,
  });

  store.setProjectSettings(name, {
    projectType,
    deployTarget: typeConfig.deployTarget,
    buildCommand: typeConfig.defaultBuildCommand,
    outputDir: typeConfig.defaultOutputDir,
    runtime: typeConfig.defaultRuntime,
    coverageThreshold: 80,
  });

  await gh.addWorkflowCallers(name, name, typeConfig.deployTarget);
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

  const projectType = type && type in PROJECT_TYPE_CONFIG ? type : "astro-static";
  const typeConfig = PROJECT_TYPE_CONFIG[projectType as keyof typeof PROJECT_TYPE_CONFIG];
  const store = c.get("store");

  // Save settings so delete/rollback know the deploy target
  store.setProjectSettings(name, {
    projectType,
    deployTarget: typeConfig.deployTarget,
    buildCommand: typeConfig.defaultBuildCommand,
    outputDir: typeConfig.defaultOutputDir,
    runtime: typeConfig.defaultRuntime,
    coverageThreshold: 80,
  });

  log.info(
    { project: name, type: projectType, deployTarget: typeConfig.deployTarget, customDomain },
    "creating project via SSE stream",
  );
  const desDomain = domainForEnv(name, "des", customDomain);

  const { jobs } = buildSetupPipeline(
    {
      name,
      type,
      description,
      customDomain,
      org,
      webhookUrl: e.WEBHOOK_URL,
      webhookSecret: e.GITHUB_WEBHOOK_SECRET,
    },
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

    // Cleanup helper — reverts created resources on failure
    async function cleanupOnFailure() {
      log.info({ project: name }, "cleaning up after failed creation");
      try {
        // Delete DNS records
        const dnsRecords = await cf.listDnsRecords();
        for (const r of dnsRecords.filter((r) => r.name.includes(name))) {
          await cf.deleteDnsRecord(r.id).catch(() => {});
        }
        // Delete Workers if applicable
        if (typeConfig.deployTarget === "cf-workers") {
          await cf.deleteWorker(`${name}-des`).catch(() => {});
        }
        // Delete repo (failed creation, no reason to keep it)
        await gh.deleteRepo(name).catch(() => {});
        // Clean settings
        c.get("store").deleteProjectSettings(name);
        log.info({ project: name }, "cleanup complete");
      } catch (err) {
        log.warn({ project: name, error: err instanceof Error ? err.message : "unknown" }, "cleanup partially failed");
      }
    }

    // Phase 1: Setup repo + infra
    const { branchCreatedAt, failed } = await executeSetupPipeline(stream, jobs, globalStart, log);
    if (failed) {
      await cleanupOnFailure();
      return;
    }

    // Phase 2: Poll real GitHub Actions workflow
    try {
      const result = await pollWorkflowRun(stream, gh, name, branchCreatedAt, globalStart, log);
      if (!result) {
        await cleanupOnFailure();
        return;
      }

      // Post-deploy: attach custom domain for Workers (Worker must exist first)
      if (typeConfig.deployTarget === "cf-workers") {
        const workerName = `${name}-des`;
        log.info({ workerName, domain: desDomain }, "attaching custom domain to worker post-deploy");
        try {
          await cf.setupWorkerDomain(workerName, desDomain);
        } catch (err) {
          log.warn(
            { workerName, error: err instanceof Error ? err.message : "unknown" },
            "failed to attach worker domain",
          );
        }
      }

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
      await cleanupOnFailure();
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({ error: message, failedJob: "deploy-des", totalDuration: Date.now() - globalStart }),
      });
    }
  });
});

// ─── Import (must be before /:name routes) ──────────────────────────

projectsRoutes.post("/import", async (c) => {
  const { repoName, type } = await c.req.json();
  if (!repoName) return c.json({ error: "repoName is required" }, 400);

  const projectType: ProjectType = type && type in PROJECT_TYPE_CONFIG ? type : "static";
  const typeConfig = PROJECT_TYPE_CONFIG[projectType];

  const log = c.get("logger");
  const gh = c.get("github");
  const cf = c.get("cloudflare");
  const store = c.get("store");
  const e = env(c);
  const org = e.GITHUB_ORG || DEFAULT_ORG;

  log.info({ project: repoName, type: projectType }, "importing existing project");

  store.setProjectSettings(repoName, {
    projectType,
    deployTarget: typeConfig.deployTarget,
    buildCommand: typeConfig.defaultBuildCommand,
    outputDir: typeConfig.defaultOutputDir,
    runtime: typeConfig.defaultRuntime,
    coverageThreshold: 80,
  });

  const repo = await gh.getRepo(repoName);
  const pages = await cf.createPagesProjectForEnv(repoName, "des", org, repoName);
  const { domain } = await cf.setupEnvDns(repoName, "des", pages.subdomain);

  try {
    await gh.addWorkflowCallers(repoName, repoName, typeConfig.deployTarget);
  } catch {
    log.warn({ project: repoName }, "workflows may already exist, skipping");
  }

  try {
    await gh.createBranch(repoName, "develop", "main");
  } catch {
    log.warn({ project: repoName }, "develop branch may already exist, skipping");
  }

  if (e.WEBHOOK_URL && e.GITHUB_WEBHOOK_SECRET) {
    try {
      await gh.createWebhook(repoName, e.WEBHOOK_URL, e.GITHUB_WEBHOOK_SECRET);
    } catch {
      log.warn({ project: repoName }, "webhook may already exist, skipping");
    }
  }

  c.get("cachedData").invalidateProject(repoName);

  return c.json(
    {
      success: true,
      project: {
        name: repoName,
        repo: repo.full_name,
        urls: { des: `https://${domain}` },
        github: repo.html_url,
        pages: pages.subdomain,
      },
    },
    201,
  );
});

// ─── Detail ───────────────────────────────────────────────────────────

projectsRoutes.get("/:name", async (c) => {
  const detail = await c.get("cachedData").getProjectDetail(c.req.param("name"), services(c));
  return c.json({
    project: { ...detail.project, workflowRuns: detail.workflowRuns },
    deploys: detail.deploys,
    builds: detail.builds,
    settings: detail.settings,
  });
});

projectsRoutes.get("/:name/deploys", async (c) => {
  const detail = await c.get("cachedData").getProjectDetail(c.req.param("name"), services(c));
  return c.json({ deploys: detail.deploys });
});

projectsRoutes.get("/:name/builds", async (c) => {
  const builds = await c.get("r2").listBuilds(c.req.param("name"));
  return c.json({ builds });
});

projectsRoutes.get("/:name/builds/:env/:artifact", async (c) => {
  const { name, env: buildEnv, artifact } = c.req.param();
  const buffer = await c.get("r2").downloadBuild(name, buildEnv, artifact);

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="${artifact}"`,
      "Content-Length": String(buffer.byteLength),
    },
  });
});

// ─── Actions ──────────────────────────────────────────────────────────

projectsRoutes.post("/:name/promote", async (c) => {
  const name = c.req.param("name");
  const { from, version } = await c.req.json();
  const log = c.get("logger");
  const cf = c.get("cloudflare");
  const e = env(c);
  const org = e.GITHUB_ORG || DEFAULT_ORG;
  log.info({ project: name, from, version }, "promoting project");

  if (from === "des") {
    if (!version) return c.json({ error: "Version required" }, 400);

    // Ensure CF Pages project exists for PRE
    try {
      const pages = await cf.createPagesProjectForEnv(name, "pre", org, name);
      await cf.setupEnvDns(name, "pre", pages.subdomain);
      log.info({ project: name, env: "pre" }, "created CF Pages project for PRE");
    } catch (err) {
      // Project may already exist from a previous promote — ignore 409
      if (err instanceof Error && !err.message.includes("already exists")) throw err;
      log.info({ project: name }, "CF Pages project for PRE already exists");
    }

    await c.get("github").createBranch(name, `release/${version}`, "develop");
    c.get("store").addAuditEntry("promote", name, { from: "des", to: "pre", version });
    c.get("cachedData").invalidateProject(name);
    return c.json({
      success: true,
      from: "des",
      to: "pre",
      branch: `release/${version}`,
      url: urlForEnv(name, "pre"),
      repo: `${org}/${name}`,
    });
  }
  if (from === "pre") {
    // Ensure CF Pages project exists for PRO
    try {
      const pages = await cf.createPagesProjectForEnv(name, "pro", org, name);
      await cf.setupEnvDns(name, "pro", pages.subdomain);
      log.info({ project: name, env: "pro" }, "created CF Pages project for PRO");
    } catch (err) {
      if (err instanceof Error && !err.message.includes("already exists")) throw err;
      log.info({ project: name }, "CF Pages project for PRO already exists");
    }

    c.get("store").addAuditEntry("promote", name, { from: "pre", to: "pro" });
    c.get("cachedData").invalidateProject(name);
    return c.json({
      success: true,
      from: "pre",
      to: "pro",
      message: "Merge release to main via PR",
      url: urlForEnv(name, "pro"),
      repo: `${org}/${name}`,
    });
  }
  return c.json({ error: `Cannot promote from ${from}` }, 400);
});

// ─── Deploy ──────────────────────────────────────────────────────────

projectsRoutes.post("/:name/deploy", async (c) => {
  const name = c.req.param("name");
  const { environment } = await c.req.json();

  const store = c.get("store");
  const settings = store.getProjectSettings(name);
  const deployTarget = settings?.deployTarget ?? "cf-pages";

  // Workflow file names match the callers generated by buildWorkflowCallerFiles.
  // The caller always lives at deploy-{env}.yml but points to the correct org workflow.
  const envConfig: Record<string, { workflow: string; ref: string }> = {
    des: { workflow: "deploy-des.yml", ref: "develop" },
    pre: { workflow: "deploy-pre.yml", ref: "main" },
    pro: { workflow: "deploy-pro.yml", ref: "main" },
  };

  const config = envConfig[environment];
  if (!config) return c.json({ error: `Invalid environment: ${environment}` }, 400);

  c.get("logger").info(
    { project: name, environment, deployTarget, workflow: config.workflow, ref: config.ref },
    "triggering manual deploy",
  );
  await c.get("github").dispatchWorkflow(name, config.workflow, {}, config.ref);
  store.addAuditEntry("deploy", name, { environment, deployTarget, workflow: config.workflow });
  c.get("cachedData").invalidateProject(name);
  return c.json({
    success: true,
    action: "deploy",
    project: name,
    environment,
    deployTarget,
    workflow: config.workflow,
  });
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

  const store = c.get("store");
  const settings = store.getProjectSettings(name);
  const deployTarget = settings?.deployTarget ?? "cf-pages";
  const rollbackWorkflow = deployTarget === "cf-workers" ? "rollback-worker.yml" : "rollback.yml";

  c.get("logger").info(
    { project: name, environment, deployTarget, buildArtifact, workflow: rollbackWorkflow },
    "triggering rollback",
  );
  await c.get("github").dispatchWorkflow(name, rollbackWorkflow, { environment, build_artifact: buildArtifact });
  store.addAuditEntry("rollback", name, { environment, deployTarget, buildArtifact });
  c.get("cachedData").invalidateProject(name);
  return c.json({ success: true, action: "rollback", project: name, environment, deployTarget, buildArtifact });
});

// ─── Pull Requests ───────────────────────────────────────────────────

projectsRoutes.get("/:name/pull-requests", async (c) => {
  const prs = await c.get("github").listPullRequests(c.req.param("name"));
  return c.json({
    pullRequests: prs.map((pr) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      state: pr.state,
      branch: pr.head.ref,
      baseBranch: pr.base.ref,
      author: pr.user?.login ?? "unknown",
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      htmlUrl: pr.html_url,
      draft: pr.draft,
    })),
  });
});

// ─── Create Branch ───────────────────────────────────────────────────

projectsRoutes.post("/:name/branches", async (c) => {
  const name = c.req.param("name");
  const { branch, from = "main" } = await c.req.json();
  if (!branch) return c.json({ error: "branch name is required" }, 400);

  c.get("logger").info({ project: name, branch, from }, "creating branch");
  await c.get("github").createBranch(name, branch, from);
  return c.json({ success: true, branch, from });
});

// ─── Files / Commits ─────────────────────────────────────────────────

projectsRoutes.get("/:name/files", async (c) => {
  const name = c.req.param("name");
  const branch = c.req.query("branch") ?? "main";
  const files = await c.get("github").getTree(name, branch);
  return c.json({ files });
});

projectsRoutes.get("/:name/files/*", async (c) => {
  const name = c.req.param("name");
  const filePath = c.req.path.replace(`/api/projects/${name}/files/`, "");
  const branch = c.req.query("branch") ?? "main";
  const file = await c.get("github").getFileContent(name, filePath, branch);
  return c.json(file);
});

projectsRoutes.post("/:name/commit", async (c) => {
  const name = c.req.param("name");
  const { branch, message, files } = await c.req.json();

  if (!branch || !message || !files?.length) {
    return c.json({ error: "branch, message and files are required" }, 400);
  }

  c.get("logger").info({ project: name, branch, fileCount: files.length }, "creating commit from dashboard");
  const result = await c.get("github").createMultiFileCommit(name, branch, message, files);
  return c.json({ success: true, commit: result });
});

// ─── DNS / Domains ───────────────────────────────────────────────────

projectsRoutes.get("/:name/dns", async (c) => {
  const name = c.req.param("name");
  const cf = c.get("cloudflare");
  const records = await cf.listDnsRecords();
  const projectRecords = records.filter((r) => r.name.includes(name));
  return c.json({ records: projectRecords });
});

projectsRoutes.put("/:name/domain", async (c) => {
  const name = c.req.param("name");
  const { customDomain } = await c.req.json();
  if (!customDomain) return c.json({ error: "customDomain is required" }, 400);

  const log = c.get("logger");
  const cf = c.get("cloudflare");
  log.info({ project: name, customDomain }, "setting up custom domain");

  const results: { env: string; domain: string }[] = [];

  for (const env of ["des", "pre", "pro"] as const) {
    try {
      const pagesName = pagesProjectName(name, env);
      const pages = await cf.getPagesProject(pagesName).catch(() => null);
      if (!pages) continue;

      const { domain } = await cf.setupEnvDns(name, env, pages.subdomain, customDomain);
      results.push({ env, domain });
    } catch (err) {
      log.warn(
        { project: name, env, error: err instanceof Error ? err.message : "unknown" },
        "domain setup failed for env",
      );
    }
  }

  return c.json({ success: true, domains: results });
});

projectsRoutes.delete("/:name/domain/:recordId", async (c) => {
  const recordId = c.req.param("recordId");
  c.get("logger").info({ recordId }, "deleting DNS record");
  await c.get("cloudflare").deleteDnsRecord(recordId);
  return c.json({ success: true });
});

// ─── Settings ────────────────────────────────────────────────────────

projectsRoutes.put("/:name/settings", async (c) => {
  const name = c.req.param("name");
  const body = await c.req.json();

  const store = c.get("store");
  c.get("logger").info({ project: name, settings: body }, "updating project settings");
  const settings = store.setProjectSettings(name, body);
  store.addAuditEntry("settings_update", name, body);
  return c.json({ success: true, settings });
});

// ─── Delete ──────────────────────────────────────────────────────────

projectsRoutes.delete("/:name", async (c) => {
  const name = c.req.param("name");
  const log = c.get("logger");
  const gh = c.get("github");
  const cf = c.get("cloudflare");
  const store = c.get("store");
  const settings = store.getProjectSettings(name);
  const deployTarget = settings?.deployTarget ?? "cf-pages";

  log.info({ project: name, deployTarget }, "deleting project");

  const deleted: { pages: string[]; workers: string[]; dns: string[]; repoArchived: boolean } = {
    pages: [],
    workers: [],
    dns: [],
    repoArchived: false,
  };

  if (deployTarget === "cf-pages") {
    // Delete Pages projects per environment
    for (const env of ["des", "pre", "pro"] as const) {
      const pagesName = pagesProjectName(name, env);
      try {
        await cf.getPagesProject(pagesName);
        deleted.pages.push(pagesName);
      } catch {
        // Project doesn't exist for this env
      }
    }
  } else if (deployTarget === "cf-workers") {
    // Delete Workers per environment
    for (const env of ["des", "pre", "pro"] as const) {
      const workerName = env === "pro" ? name : `${name}-${env}`;
      try {
        await cf.deleteWorker(workerName);
        deleted.workers.push(workerName);
      } catch {
        // Worker doesn't exist for this env
      }
    }
  }

  // Delete DNS records
  try {
    const dnsRecords = await cf.listDnsRecords();
    const projectRecords = dnsRecords.filter((r) => r.name.includes(name));
    for (const record of projectRecords) {
      await cf.deleteDnsRecord(record.id);
      deleted.dns.push(record.name);
    }
  } catch (err) {
    log.warn({ project: name, error: err instanceof Error ? err.message : "unknown" }, "failed to clean DNS records");
  }

  // Archive the repo
  try {
    await gh.archiveRepo(name);
    deleted.repoArchived = true;
  } catch (err) {
    log.warn({ project: name, error: err instanceof Error ? err.message : "unknown" }, "failed to archive repo");
  }

  // Clean config
  store.deleteProjectSettings(name);
  store.addAuditEntry("project_delete", name);
  c.get("cachedData").invalidateProject(name);

  return c.json({ success: true, deleted });
});
