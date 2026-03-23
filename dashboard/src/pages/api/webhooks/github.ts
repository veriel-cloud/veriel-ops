import type { APIRoute } from "astro";
import crypto from "node:crypto";
import { addEvent } from "@/lib/services/webhook-cache";

function verifySignature(
  payload: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature || !secret) return !secret;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export const POST: APIRoute = async ({ request }) => {
  const secret = import.meta.env.GITHUB_WEBHOOK_SECRET ?? "";
  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (secret && !verifySignature(body, signature, secret)) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const event = request.headers.get("x-github-event") ?? "unknown";
  const payload = JSON.parse(body);

  const repoName = payload.repository?.name ?? "unknown";

  switch (event) {
    case "push": {
      const branch = payload.ref?.replace("refs/heads/", "") ?? "";
      addEvent({
        source: "github",
        type: "push",
        project: repoName,
        data: {
          branch,
          commitSha: payload.after?.slice(0, 7),
          commitMessage: payload.head_commit?.message,
          pusher: payload.pusher?.name,
        },
      });
      break;
    }

    case "workflow_run": {
      const action = payload.action;
      const run = payload.workflow_run;
      addEvent({
        source: "github",
        type: `workflow_run.${action}`,
        project: repoName,
        data: {
          workflowName: run?.name,
          status: run?.status,
          conclusion: run?.conclusion,
          branch: run?.head_branch,
          commitSha: run?.head_sha?.slice(0, 7),
          url: run?.html_url,
        },
      });
      break;
    }

    case "pull_request": {
      const action = payload.action;
      const pr = payload.pull_request;
      addEvent({
        source: "github",
        type: `pull_request.${action}`,
        project: repoName,
        data: {
          title: pr?.title,
          number: pr?.number,
          state: pr?.state,
          branch: pr?.head?.ref,
          author: pr?.user?.login,
          url: pr?.html_url,
        },
      });
      break;
    }

    case "create": {
      addEvent({
        source: "github",
        type: "branch_created",
        project: repoName,
        data: {
          refType: payload.ref_type,
          ref: payload.ref,
        },
      });
      break;
    }

    default: {
      addEvent({
        source: "github",
        type: event,
        project: repoName,
        data: { action: payload.action },
      });
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
