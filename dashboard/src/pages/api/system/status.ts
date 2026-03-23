import type { APIRoute } from "astro";
import { github, cloudflare, r2 } from "@/lib/services/index.js";

interface ServiceStatus {
  name: string;
  status: "connected" | "error";
  message: string;
  latency: number;
}

async function checkService(
  name: string,
  fn: () => Promise<unknown>,
): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    await fn();
    return {
      name,
      status: "connected",
      message: "OK",
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      name,
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
      latency: Date.now() - start,
    };
  }
}

export const GET: APIRoute = async () => {
  const checks = await Promise.all([
    checkService("GitHub API", () => github.listOrgRepos()),
    checkService("Cloudflare Pages", () => cloudflare.listPagesProjects()),
    checkService("Cloudflare DNS", () => cloudflare.listDnsRecords()),
    checkService("R2 Storage", () => r2.listAllProjectBuilds()),
  ]);

  const allConnected = checks.every((c) => c.status === "connected");

  return new Response(
    JSON.stringify({
      status: allConnected ? "healthy" : "degraded",
      services: checks,
      timestamp: new Date().toISOString(),
    }),
    { headers: { "Content-Type": "application/json" } },
  );
};
