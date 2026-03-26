import { Hono } from "hono";
import type { Env } from "../env.js";

export const systemRoutes = new Hono<Env>();

async function checkService(name: string, fn: () => Promise<unknown>) {
  const start = Date.now();
  try {
    await fn();
    return { name, status: "connected", message: "OK", latency: Date.now() - start };
  } catch (error) {
    return { name, status: "error", message: error instanceof Error ? error.message : "Unknown", latency: Date.now() - start };
  }
}

systemRoutes.get("/status", async (c) => {
  const github = c.get("github");
  const cloudflare = c.get("cloudflare");
  const r2 = c.get("r2");

  const checks = await Promise.all([
    checkService("GitHub API", () => github.listOrgRepos()),
    checkService("Cloudflare Pages", () => cloudflare.listPagesProjects()),
    checkService("Cloudflare DNS", () => cloudflare.listDnsRecords()),
    checkService("R2 Storage", () => r2.listAllProjectBuilds()),
  ]);

  return c.json({
    status: checks.every((ch) => ch.status === "connected") ? "healthy" : "degraded",
    services: checks,
    timestamp: new Date().toISOString(),
  });
});
