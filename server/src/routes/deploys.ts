import { Hono } from "hono";
import type { Env } from "../env.js";
import { getDeploys } from "../services/data.js";

export const deploysRoutes = new Hono<Env>();

deploysRoutes.get("/", async (c) => {
  try {
    const deploys = await getDeploys({
      github: c.get("github"),
      cloudflare: c.get("cloudflare"),
      r2: c.get("r2"),
    });
    return c.json({ deploys });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});
