import type { GitHubService } from "./github.js";
import type { CloudflareService } from "./cloudflare.js";
import type { R2Service } from "./r2.js";
import type { BuildArtifact, DeployEntry, DeployStatus, Environment, HealthStatus, PagesDeployment, Project, SystemStats } from "../types.js";
import { DEFAULT_COVERAGE_THRESHOLD, urlForEnv } from "../constants.js";

export interface Services {
  github: GitHubService;
  cloudflare: CloudflareService;
  r2: R2Service;
}

// ─── Queries ──────────────────────────────────────────────────────────

export async function getProjects(s: Services): Promise<Project[]> {
  const [repos, pagesProjects, allBuilds] = await Promise.all([
    s.github.listOrgRepos(),
    s.cloudflare.listPagesProjects().catch(() => []),
    s.r2.listAllProjectBuilds().catch(() => []),
  ]);

  const pagesMap = new Map(pagesProjects.map((p) => [p.name, p]));

  return repos
    .filter((repo) => repo.name !== ".github")
    .map((repo) => {
      const pages = pagesMap.get(repo.name);
      const domain = pages?.domains?.[0] ?? `${repo.name}.veriel.dev`;
      const latest = pages?.latest_deployment;

      return {
        name: repo.name,
        type: "astro-static",
        repo: repo.full_name,
        domain,
        customDomain: (pages?.domains?.length ?? 0) > 0,
        coverage: 0,
        coverageThreshold: DEFAULT_COVERAGE_THRESHOLD,
        environments: {
          des: envState(pages ? "healthy" : "idle", urlForEnv(repo.name, "des")),
          pre: envState("idle", urlForEnv(repo.name, "pre")),
          pro: envState(
            latest?.latest_stage?.status === "success" ? "healthy" : "idle",
            `https://${domain}`,
            commitShort(latest?.deployment_trigger?.metadata?.commit_hash),
            latest?.created_on,
          ),
        },
        createdAt: repo.created_at ?? "",
      };
    });
}

export async function getProjectDetail(name: string, s: Services) {
  const [repo, pages, deployments, workflowRuns, builds] = await Promise.all([
    s.github.getRepo(name),
    s.cloudflare.getPagesProject(name).catch(() => null),
    s.cloudflare.getDeployments(name, 30).catch(() => []),
    s.github.getWorkflowRuns(name),
    s.r2.listBuilds(name).catch(() => []),
  ]);

  const domain = pages?.domains?.[0] ?? `${name}.veriel.dev`;

  const byEnv = {
    des: deployments.filter((d) => d.deployment_trigger?.metadata?.branch === "develop"),
    pre: deployments.filter((d) => d.deployment_trigger?.metadata?.branch?.startsWith("release")),
    pro: deployments.filter((d) => d.environment === "production"),
  };

  const latestOf = (env: Environment) => {
    const d = byEnv[env][0];
    if (!d) return envState("idle", urlForEnv(name, env));
    return envState(
      d.latest_stage?.status === "success" ? "healthy" : "degraded",
      urlForEnv(name, env),
      commitShort(d.deployment_trigger?.metadata?.commit_hash),
      d.created_on,
    );
  };

  const project: Project = {
    name: repo.name,
    type: "astro-static",
    repo: repo.full_name,
    domain,
    customDomain: (pages?.domains?.length ?? 0) > 0,
    coverage: 0,
    coverageThreshold: DEFAULT_COVERAGE_THRESHOLD,
    environments: { des: latestOf("des"), pre: latestOf("pre"), pro: latestOf("pro") },
    createdAt: repo.created_at ?? "",
  };

  const deploys = deduplicateByCommit(deployments).map(toDeployEntry(name));

  const buildArtifacts: BuildArtifact[] = builds.map((b) => ({
    name: b.name,
    project: b.project,
    environment: b.environment as Environment,
    version: b.version,
    commitSha: b.commitSha,
    size: formatBytes(b.size),
    timestamp: b.lastModified,
    coverage: 0,
  }));

  return { project, deploys, builds: buildArtifacts, workflowRuns };
}

export async function getDeploys(s: Services): Promise<DeployEntry[]> {
  const [repos, pagesProjects] = await Promise.all([
    s.github.listOrgRepos(),
    s.cloudflare.listPagesProjects().catch(() => []),
  ]);

  const repoNames = new Set(repos.map((r) => r.name));
  const all: DeployEntry[] = [];

  for (const project of pagesProjects.filter((p) => repoNames.has(p.name))) {
    const deployments = await s.cloudflare.getDeployments(project.name, 10).catch(() => []);
    all.push(...deduplicateByCommit(deployments).map(toDeployEntry(project.name)));
  }

  return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function getSystemStats(s: Services): Promise<SystemStats> {
  const [projects, allBuilds] = await Promise.all([
    getProjects(s),
    s.r2.listAllProjectBuilds().catch(() => []),
  ]);

  return {
    totalProjects: projects.length,
    totalDeploys: 0,
    avgCoverage: 0,
    activeEnvironments: projects.reduce((n, p) => n + Object.values(p.environments).filter((e) => e.status !== "idle").length, 0),
    successRate: 0,
    buildsStored: allBuilds.length,
  };
}

// ─── Mappers ──────────────────────────────────────────────────────────

function toDeployEntry(projectName: string) {
  return (d: PagesDeployment): DeployEntry => ({
    id: d.id,
    project: projectName,
    environment: resolveEnv(d),
    version: commitShort(d.deployment_trigger?.metadata?.commit_hash) ?? d.short_id,
    commitSha: commitShort(d.deployment_trigger?.metadata?.commit_hash) ?? "",
    branch: d.deployment_trigger?.metadata?.branch ?? "",
    timestamp: d.created_on,
    coverage: 0,
    duration: durationSecs(d),
    action: "deploy",
    triggeredBy: d.deployment_trigger?.type ?? "unknown",
    status: deployStatus(d),
  });
}

function envState(status: HealthStatus, url: string, commitSha?: string | null, lastDeployAt?: string | null) {
  return { version: commitSha ?? null, commitSha: commitSha ?? null, url, status, lastDeployAt: lastDeployAt ?? null };
}

// ─── Helpers ──────────────────────────────────────────────────────────

function resolveEnv(d: PagesDeployment): Environment {
  const branch = d.deployment_trigger?.metadata?.branch ?? "";
  if (branch === "develop") return "des";
  if (branch.startsWith("release")) return "pre";
  if (branch === "main") return "pro";
  return d.environment === "production" ? "pro" : "des";
}

function deployStatus(d: PagesDeployment): DeployStatus {
  const s = d.latest_stage?.status;
  if (s === "success") return "success";
  if (s === "active") return "in_progress";
  return "failed";
}

function deduplicateByCommit(deployments: PagesDeployment[]): PagesDeployment[] {
  const seen = new Map<string, PagesDeployment>();

  for (const d of deployments) {
    const key = `${d.deployment_trigger?.metadata?.commit_hash ?? d.short_id}-${resolveEnv(d)}`;
    const existing = seen.get(key);
    if (!existing || durationSecs(d) > durationSecs(existing)) {
      seen.set(key, d);
    }
  }

  return Array.from(seen.values());
}

function durationSecs(d: PagesDeployment): number {
  if (!d.latest_stage?.ended_on || !d.latest_stage?.started_on) return 0;
  const diff = (new Date(d.latest_stage.ended_on).getTime() - new Date(d.latest_stage.started_on).getTime()) / 1000;
  return Math.max(0, Math.round(diff));
}

function commitShort(hash?: string | null): string | null {
  return hash?.slice(0, 7) ?? null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${units[i]}`;
}

// ─── Format helpers (used by routes) ──────────────────────────────────

export function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (secs < 60) return `hace ${secs}s`;
  if (mins < 60) return `hace ${mins}min`;
  if (hours < 24) return mins % 60 > 0 ? `hace ${hours}h ${mins % 60}min` : `hace ${hours}h`;
  if (days < 7) return hours % 24 > 0 ? `hace ${days}d ${hours % 24}h` : `hace ${days}d`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDuration(seconds: number): string {
  if (seconds === 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}
