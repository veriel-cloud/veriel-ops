import { Hono } from "hono";
import { addEvent } from "../services/webhook-cache.js";
import type { Env } from "../env.js";

export const webhooksRoutes = new Hono<Env>();

webhooksRoutes.post("/github", async (c) => {
  const body = await c.req.text();
  const event = c.req.header("x-github-event") ?? "unknown";
  const payload = JSON.parse(body);

  addEvent({ source: "github", type: event, project: payload.repository?.name ?? "unknown", data: payload });
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
