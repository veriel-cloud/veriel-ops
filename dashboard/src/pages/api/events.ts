import type { APIRoute } from "astro";
import { getEvents, getLastUpdated } from "@/lib/services/webhook-cache";

export const GET: APIRoute = async ({ url }) => {
  const since = url.searchParams.get("since") ?? undefined;
  const project = url.searchParams.get("project") ?? undefined;

  let events = getEvents(since);

  if (project) {
    events = events.filter((e) => e.project === project);
  }

  return new Response(
    JSON.stringify({
      events,
      lastUpdated: getLastUpdated(),
      count: events.length,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
};
