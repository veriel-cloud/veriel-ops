import { Hono } from "hono";
import type { Env } from "../env.js";
import { addNotification } from "../services/notifications.js";
import { addEvent } from "../services/webhook-cache.js";

export const webhooksRoutes = new Hono<Env>();

webhooksRoutes.post("/github", async (c) => {
  const body = await c.req.text();
  const event = c.req.header("x-github-event") ?? "unknown";
  const payload = JSON.parse(body);

  const project = payload.repository?.name ?? "unknown";
  addEvent({ source: "github", type: event, project, data: payload });

  if (event === "workflow_run" && payload.action === "completed") {
    const conclusion = payload.workflow_run?.conclusion;
    if (conclusion === "failure") {
      addNotification("workflow_failed", project, `Workflow "${payload.workflow_run?.name}" failed`);
    }
  }

  return c.json({ ok: true });
});

webhooksRoutes.post("/cloudflare", async (c) => {
  const body = await c.req.json();

  addEvent({
    source: "cloudflare",
    type: "deployment",
    project: body.project?.name ?? body.deployment?.project_name ?? "unknown",
    data: body,
  });
  return c.json({ ok: true });
});
