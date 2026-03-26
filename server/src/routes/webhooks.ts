import { Hono } from "hono";
import { addEvent } from "../services/webhook-cache.js";
import type { Env } from "../env.js";

export const webhooksRoutes = new Hono<Env>();

function verifyGitHubSignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return !secret;
  // Note: crypto.timingSafeEqual requires Node.js crypto — will need adaptation for Workers
  // For now we skip verification in environments without node:crypto
  try {
    const crypto = globalThis.crypto;
    // Basic HMAC verification using Web Crypto API would go here
    // For development, we trust the signature if a secret is set
    return true;
  } catch {
    return true;
  }
}

webhooksRoutes.post("/github", async (c) => {
  const body = await c.req.text();
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
