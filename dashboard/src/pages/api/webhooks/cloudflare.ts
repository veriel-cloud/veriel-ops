import type { APIRoute } from "astro";
import { addEvent } from "@/lib/services/webhook-cache";

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  const projectName = body.project?.name ?? body.deployment?.project_name ?? "unknown";
  const deploymentId = body.deployment?.id ?? "";
  const environment = body.deployment?.environment ?? "";
  const url = body.deployment?.url ?? "";
  const status = body.deployment?.latest_stage?.status ?? "";
  const branch = body.deployment?.deployment_trigger?.metadata?.branch ?? "";

  let type = "deployment";
  if (status === "success") type = "deployment.success";
  else if (status === "failure") type = "deployment.failure";
  else if (status === "active") type = "deployment.started";

  addEvent({
    source: "cloudflare",
    type,
    project: projectName,
    data: {
      deploymentId,
      environment,
      url,
      status,
      branch,
    },
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
