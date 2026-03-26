import { Hono } from "hono";
import { getEvents, getLastUpdated } from "../services/webhook-cache.js";

export const eventsRoutes = new Hono();

eventsRoutes.get("/", (c) => {
  const since = c.req.query("since");
  const project = c.req.query("project");

  let events = getEvents(since);
  if (project) {
    events = events.filter((e) => e.project === project);
  }

  return c.json({ events, lastUpdated: getLastUpdated(), count: events.length });
});
