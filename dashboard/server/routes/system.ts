import { Hono } from "hono";
import * as github from "../services/github.js";
import * as cloudflare from "../services/cloudflare.js";
import * as r2 from "../services/r2.js";

export const systemRoutes = new Hono();

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
