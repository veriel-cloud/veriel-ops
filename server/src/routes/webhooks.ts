import { Hono } from "hono";
import { env } from "hono/adapter";
import type { Env } from "../env.js";

export const webhooksRoutes = new Hono<Env>();

async function verifyGitHubSignature(body: string, signature: string | undefined, secret: string): Promise<boolean> {
  if (!secret || !signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expected = `sha256=${Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;

  return signature === expected;
}

webhooksRoutes.post("/github", async (c) => {
  const body = await c.req.text();
  const e = env(c);

  const secret = e.GITHUB_WEBHOOK_SECRET;
  if (secret) {
    const signature = c.req.header("x-hub-signature-256");
    const valid = await verifyGitHubSignature(body, signature, secret);
    if (!valid) {
      c.get("logger").warn("Invalid GitHub webhook signature");
      return c.json({ error: "Invalid signature" }, 401);
    }
  } else {
    c.get("logger").warn("GITHUB_WEBHOOK_SECRET not configured — webhook signature not verified");
  }

  const event = c.req.header("x-github-event") ?? "unknown";
  const payload = JSON.parse(body);
  const store = c.get("store");

  const project = payload.repository?.name ?? "unknown";
  store.addEvent({ source: "github", type: event, project, data: payload });
  c.get("cachedData").invalidateProject(project);

  if (event === "workflow_run" && payload.action === "completed") {
    const conclusion = payload.workflow_run?.conclusion;
    if (conclusion === "failure") {
      store.addNotification("workflow_failed", project, `Workflow "${payload.workflow_run?.name}" failed`);
    }
  }

  return c.json({ ok: true });
});

webhooksRoutes.post("/cloudflare", async (c) => {
  const body = await c.req.json();
  const store = c.get("store");

  store.addEvent({
    source: "cloudflare",
    type: "deployment",
    project: body.project?.name ?? body.deployment?.project_name ?? "unknown",
    data: body,
  });
  return c.json({ ok: true });
});
