import type { APIRoute } from "astro";
import { github } from "@/lib/services/index.js";

export const GET: APIRoute = async ({ params, url }) => {
  const { repo } = params;

  if (!repo) {
    return new Response(JSON.stringify({ error: "Repo name required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const perPage = parseInt(url.searchParams.get("per_page") ?? "20", 10);

  try {
    const runs = await github.getWorkflowRuns(repo, perPage);

    return new Response(JSON.stringify({ runs }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
