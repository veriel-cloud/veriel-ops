import { Hono } from "hono";
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
    });

    // Add package.json with pnpm version before workflows (required by GitHub Actions)
    await github.addInitialPackageJson(name, name);
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
