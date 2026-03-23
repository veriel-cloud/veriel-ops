import { Hono } from "hono";
import { getDeploys } from "../services/data.js";

export const deploysRoutes = new Hono();

deploysRoutes.get("/", async (c) => {
  try {
    const deploys = await getDeploys();
    return c.json({ deploys });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});
