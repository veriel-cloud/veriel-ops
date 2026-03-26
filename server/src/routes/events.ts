import { Hono } from "hono";
import { getEvents, getLastUpdated } from "../services/webhook-cache.js";

export const eventsRoutes = new Hono();

eventsRoutes.get("/", (c) => {
  const events = getEvents(c.req.query("since"), c.req.query("project"));
  return c.json({ events, lastUpdated: getLastUpdated(), count: events.length });
});
