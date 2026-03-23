import { Hono } from "hono";
import crypto from "node:crypto";
import { addEvent } from "../services/webhook-cache.js";

export const webhooksRoutes = new Hono();

function verifyGitHubSignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return !secret;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

webhooksRoutes.post("/github", async (c) => {
  const secret = process.env.GITHUB_WEBHOOK_SECRET ?? "";
  const body = await c.req.text();
  const signature = c.req.header("x-hub-signature-256") ?? null;

  if (secret && !verifyGitHubSignature(body, signature, secret)) {
    return c.json({ error: "Invalid signature" }, 401);
  }

  const event = c.req.header("x-github-event") ?? "unknown";
  const payload = JSON.parse(body);
  const repoName = payload.repository?.name ?? "unknown";

  addEvent({ source: "github", type: event, project: repoName, data: payload });

  return c.json({ ok: true });
});

webhooksRoutes.post("/cloudflare", async (c) => {
  const body = await c.req.json();
  const projectName = body.project?.name ?? body.deployment?.project_name ?? "unknown";

  addEvent({ source: "cloudflare", type: "deployment", project: projectName, data: body });

  return c.json({ ok: true });
});
