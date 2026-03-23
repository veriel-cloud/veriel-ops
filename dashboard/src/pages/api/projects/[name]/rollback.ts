import type { APIRoute } from "astro";
import { github } from "@/lib/services/index.js";

export const POST: APIRoute = async ({ params, request }) => {
  const { name } = params;

  if (!name) {
    return new Response(JSON.stringify({ error: "Project name required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const { environment, buildArtifact } = body;

    if (!environment || !buildArtifact) {
      return new Response(
        JSON.stringify({
          error: "environment and buildArtifact are required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Trigger the rollback workflow via GitHub Actions
    await github.dispatchWorkflow(name, "rollback.yml", {
      environment,
      build_artifact: buildArtifact,
    });

    return new Response(
      JSON.stringify({
        success: true,
        action: "rollback",
        project: name,
        environment,
        buildArtifact,
        message: "Rollback workflow triggered",
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
