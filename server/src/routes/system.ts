import { BASE_DOMAIN, DEFAULT_COVERAGE_THRESHOLD, DEFAULT_ORG, PROJECT_TYPE_CONFIG } from "@veriel-ops/shared";
import { Hono } from "hono";
import type { Env } from "../env.js";

export const systemRoutes = new Hono<Env>();

systemRoutes.get("/settings", (c) => {
  const templates = Object.entries(PROJECT_TYPE_CONFIG).map(([type, config]) => ({
    type,
    label: config.label,
    template: config.template,
    deployTarget: config.deployTarget,
  }));

  return c.json({
    org: DEFAULT_ORG,
    baseDomain: BASE_DOMAIN,
    coverageThreshold: DEFAULT_COVERAGE_THRESHOLD,
    buildRetention: { des: 10, pre: 20, pro: null },
    templates,
  });
});

async function checkService(name: string, fn: () => Promise<unknown>) {
  const start = Date.now();
  try {
    await fn();
    return { name, status: "connected", message: "OK", latency: Date.now() - start };
  } catch (error) {
    return {
      name,
      status: "error",
      message: error instanceof Error ? error.message : "Unknown",
      latency: Date.now() - start,
    };
  }
}

systemRoutes.get("/health", (c) => c.json({ status: "ok" }));

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

systemRoutes.get("/cache", (c) => {
  const stats = c.get("cachedData").stats();
  const hitRate = stats.hits + stats.misses > 0 ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100) : 0;
  return c.json({ ...stats, hitRate: `${hitRate}%` });
});
