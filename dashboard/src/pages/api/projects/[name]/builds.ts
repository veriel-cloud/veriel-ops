import type { APIRoute } from "astro";
import { r2 } from "@/lib/services/index.js";

export const GET: APIRoute = async ({ params, url }) => {
  const { name } = params;

  if (!name) {
    return new Response(JSON.stringify({ error: "Project name required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const environment = url.searchParams.get("environment") ?? undefined;

  try {
    const builds = await r2.listBuilds(name, environment);

    return new Response(JSON.stringify({ builds }), {
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
