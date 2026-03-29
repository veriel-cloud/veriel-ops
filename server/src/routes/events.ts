import { Hono } from "hono";
import type { Env } from "../env.js";

export const eventsRoutes = new Hono<Env>();

eventsRoutes.get("/", (c) => {
  const store = c.get("store");
  const events = store.getEvents(c.req.query("since"), c.req.query("project"));
  return c.json({ events, lastUpdated: store.getLastUpdated(), count: events.length });
});
