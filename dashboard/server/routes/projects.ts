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
projectsRoutes.post("/create-stream", async (c) => {
  const body = await c.req.json();
  const { name, type, description, customDomain } = body;

  if (!name) {
    return c.json({ error: "Project name is required" }, 400);
  }

  const org = process.env.GITHUB_ORG ?? "veriel-cloud";
  const baseDomain = customDomain ?? `${name}.veriel.dev`;

  return streamSSE(c, async (stream) => {
    const sendStep = async (step: number, label: string, status: string, detail?: string, duration?: number) => {
      await stream.writeSSE({
        data: JSON.stringify({ step, label, status, detail, duration }),
        event: "step",
      });
    };

    const steps = [
      { label: "Crear repositorio en GitHub", fn: async () => {
        const repo = await github.createRepo(name, {
          description: description ?? `${type ?? "web"} project managed by veriel-ops`,
          isPrivate: true,
          type: type ?? "astro-static",
        });
        return { detail: repo.full_name };
      }},
      { label: "Añadir workflows CI/CD", fn: async () => {
        await github.addWorkflowCallers(name, name);
        return { detail: "5 workflow callers" };
      }},
      { label: "Crear branch develop", fn: async () => {
        await github.createBranch(name, "develop", "main");
        return { detail: "develop desde main" };
      }},
      { label: "Crear proyecto en Cloudflare Pages", fn: async () => {
        const pages = await cloudflare.createPagesProject(name, org, name);
        return { detail: `${pages.subdomain}.pages.dev` };
      }},
      { label: "Configurar registros DNS", fn: async () => {
        const records = await cloudflare.setupProjectDns(name, customDomain);
        return { detail: `${records.length} registros CNAME` };
      }},
      { label: "Añadir custom domains", fn: async () => {
        await cloudflare.setupCustomDomains(name, customDomain);
        return { detail: `dev.${baseDomain}, pre.${baseDomain}, ${baseDomain}` };
      }},
    ];

    // Add webhook step if configured
    const webhookUrl = process.env.WEBHOOK_URL;
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookUrl && webhookSecret) {
      steps.push({
        label: "Configurar webhook",
        fn: async () => {
          await github.createWebhook(name, webhookUrl, webhookSecret);
          return { detail: "GitHub webhook activo" };
        },
      });
    }

    for (let i = 0; i < steps.length; i++) {
      await sendStep(i, steps[i].label, "loading");
      const start = Date.now();

      try {
        const result = await steps[i].fn();
        const duration = Date.now() - start;
        await sendStep(i, steps[i].label, "success", result.detail, duration);
      } catch (err) {
        const duration = Date.now() - start;
        const message = err instanceof Error ? err.message : "Unknown error";
        await sendStep(i, steps[i].label, "error", message, duration);

        // Send final error event
        await stream.writeSSE({
          data: JSON.stringify({ error: message, failedStep: i }),
          event: "error",
        });
        return;
      }
    }

    // Send complete event
    await stream.writeSSE({
      data: JSON.stringify({
        success: true,
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
