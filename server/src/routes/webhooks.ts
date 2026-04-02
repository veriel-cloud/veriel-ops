import { Hono } from "hono";
import { env } from "hono/adapter";
import type { Env } from "../env.js";
import { extractCoverageFromWorkflow } from "../services/coverage.js";

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

  if (event === "workflow_run") {
    const tracker = c.get("deployTracker");
    const workflowName = payload.workflow_run?.name ?? "";

    if (workflowName.startsWith("Deploy")) {
      if (payload.action === "requested" || payload.action === "in_progress") {
        tracker.markActive(project);
        c.get("logger").info({ project, action: payload.action }, "deploy tracker: marked active");
      } else if (payload.action === "completed") {
        tracker.markDone(project);
        c.get("logger").info({ project, action: payload.action }, "deploy tracker: marked done");
      }
    }

    if (payload.action === "completed" && workflowName.startsWith("Deploy")) {
      const run = payload.workflow_run;
      const conclusion = run?.conclusion;
      const runId = run?.id as number;
      const envMatch = workflowName.match(/Deploy (DES|PRE|PRO)/i);
      const deployEnv = envMatch?.[1]?.toLowerCase() ?? "des";
      const log = c.get("logger");

      log.info({ project, workflowName, conclusion, runId, deployEnv }, "deploy workflow completed");

      if (conclusion === "success") {
        const envLabel = deployEnv.toUpperCase();
        store.addNotification("deploy_success", project, `Deploy to ${envLabel} succeeded`);

        const gh = c.get("github");
        extractCoverageFromWorkflow(gh, project, runId, log)
          .then((coverage) => {
            log.info({ project, runId, coverage }, "coverage extraction result");
            store.addDeployRecord({
              id: String(runId),
              project,
              environment: deployEnv,
              version: run?.head_sha?.slice(0, 7) ?? "",
              commitSha: run?.head_sha?.slice(0, 7) ?? "",
              branch: run?.head_branch ?? "",
              timestamp: new Date().toISOString(),
              coverage,
              duration: 0,
              status: "success",
              action: "deploy",
              triggeredBy: run?.event ?? "webhook",
            });
            log.info({ project, environment: deployEnv, coverage }, "deploy record stored");

            // Check coverage threshold for PRE/PRO
            if (coverage > 0 && (deployEnv === "pre" || deployEnv === "pro")) {
              const settings = store.getProjectSettings(project);
              const threshold = settings?.coverageThreshold ?? 80;
              if (coverage < threshold) {
                store.addNotification(
                  "coverage_low",
                  project,
                  `Coverage ${coverage}% is below threshold ${threshold}% on ${envLabel}`,
                );
              }
            }
          })
          .catch((err) => {
            log.error(
              { project, runId, error: err instanceof Error ? err.message : String(err) },
              "coverage extraction failed",
            );
          });
      } else if (conclusion === "failure") {
        store.addNotification("deploy_failed", project, `Deploy to ${deployEnv.toUpperCase()} failed`);
      }
    } else if (payload.action === "completed") {
      const conclusion = payload.workflow_run?.conclusion;
      if (conclusion === "failure") {
        store.addNotification("workflow_failed", project, `Workflow "${payload.workflow_run?.name}" failed`);
      }
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
