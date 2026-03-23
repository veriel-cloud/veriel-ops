import type { APIRoute } from "astro";
import { cloudflare } from "@/lib/services/index.js";

export const GET: APIRoute = async ({ params, url }) => {
  const { name } = params;

  if (!name) {
    return new Response(JSON.stringify({ error: "Project name required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const perPage = parseInt(url.searchParams.get("per_page") ?? "20", 10);

  try {
    const deployments = await cloudflare.getDeployments(name, perPage);

    return new Response(JSON.stringify({ deployments }), {
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
