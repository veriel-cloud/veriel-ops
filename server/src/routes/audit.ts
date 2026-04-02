import { Hono } from "hono";
import type { Env } from "../env.js";

export const auditRoutes = new Hono<Env>();

auditRoutes.get("/", (c) => {
  const resource = c.req.query("resource");
  const limit = Number(c.req.query("limit") || "50");
  const entries = c.get("store").getAuditLog(resource, limit);
  return c.json({ entries });
});
