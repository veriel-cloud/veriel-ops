import { DEFAULT_COVERAGE_THRESHOLD, DEFAULT_PROJECT_TYPE, PROJECT_TYPE_CONFIG, urlForEnv } from "../constants.js";
import type {
  BuildArtifact,
  DeployEntry,
  DeployStatus,
  Environment,
  HealthStatus,
  Project,
  SystemStats,
} from "../types.js";
import type { CloudflareService } from "./cloudflare.js";
import type { DbStore } from "./db-store.js";
import type { GitHubService } from "./github.js";
import type { R2Service } from "./r2.js";

export interface Services {
  github: GitHubService;
  cloudflare: CloudflareService;
  r2: R2Service;
  store: DbStore;
}

// ─── Queries ──────────────────────────────────────────────────────────

export async function getProjects(s: Services): Promise<Project[]> {
  const [repos, pagesProjects, _allBuilds] = await Promise.all([
    s.github.listOrgRepos(),
    s.cloudflare.listPagesProjects().catch(() => []),
    s.r2.listAllProjectBuilds().catch(() => []),
  ]);

  const pagesMap = new Map(pagesProjects.map((p) => [p.name, p]));

  return repos
    .filter((repo) => repo.name !== ".github" && !repo.archived)
    .map((repo) => {
      const pages = pagesMap.get(repo.name);
      const domain = pages?.domains?.[0] ?? `${repo.name}.veriel.dev`;
      const latest = pages?.latest_deployment;
      const settings = s.store.getProjectSettings(repo.name);
      const projectType = settings?.projectType ?? DEFAULT_PROJECT_TYPE;
      const typeConfig = PROJECT_TYPE_CONFIG[projectType];

      return {
        name: repo.name,
        type: projectType,
        repo: repo.full_name,
        domain,
        customDomain: (pages?.domains?.length ?? 0) > 0,
        coverage: 0,
        coverageThreshold: settings?.coverageThreshold ?? DEFAULT_COVERAGE_THRESHOLD,
        deployTarget: typeConfig.deployTarget,
        runtime: typeConfig.defaultRuntime,
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
  const [repo, pages, workflowRuns, builds] = await Promise.all([
    s.github.getRepo(name),
    s.cloudflare.getPagesProject(name).catch(() => null),
    s.github.getWorkflowRuns(name),
    s.r2.listBuilds(name).catch(() => []),
  ]);

  const domain = pages?.domains?.[0] ?? `${name}.veriel.dev`;

  const deploys = workflowRunsToDeploys(workflowRuns, name);

  const latestOf = (env: Environment) => {
    const d = deploys.find((d) => d.environment === env);
    if (!d) return envState("idle", urlForEnv(name, env));
    return envState(
      d.status === "success" ? "healthy" : d.status === "in_progress" ? "degraded" : "idle",
      urlForEnv(name, env),
      d.commitSha || null,
      d.timestamp,
    );
  };

  const settings = s.store.getProjectSettings(name);
  const projectType = settings?.projectType ?? DEFAULT_PROJECT_TYPE;
  const typeConfig = PROJECT_TYPE_CONFIG[projectType];

  const project: Project = {
    name: repo.name,
    type: projectType,
    repo: repo.full_name,
    domain,
    customDomain: (pages?.domains?.length ?? 0) > 0,
    coverage: 0,
    coverageThreshold: settings?.coverageThreshold ?? DEFAULT_COVERAGE_THRESHOLD,
    deployTarget: typeConfig.deployTarget,
    runtime: typeConfig.defaultRuntime,
    environments: { des: latestOf("des"), pre: latestOf("pre"), pro: latestOf("pro") },
    createdAt: repo.created_at ?? "",
  };

  const buildArtifacts: BuildArtifact[] = builds.map((b) => ({
    name: b.name,
    project: b.project,
    environment: b.environment as Environment,
    version: b.version,
    commitSha: b.commitSha,
    size: b.size,
    timestamp: b.lastModified,
    lastModified: b.lastModified,
    coverage: 0,
  }));

  const fullSettings = {
    coverageThreshold: settings?.coverageThreshold ?? DEFAULT_COVERAGE_THRESHOLD,
    projectType: projectType,
    deployTarget: typeConfig.deployTarget,
    buildCommand: settings?.buildCommand ?? typeConfig.defaultBuildCommand,
    outputDir: settings?.outputDir ?? typeConfig.defaultOutputDir,
    runtime: settings?.runtime ?? typeConfig.defaultRuntime,
  };

  return { project, deploys, builds: buildArtifacts, workflowRuns, settings: fullSettings };
}

export async function getDeploys(s: Services): Promise<DeployEntry[]> {
  const repos = await s.github.listOrgRepos();
  const repoNames = repos.filter((r) => r.name !== ".github" && !r.archived).map((r) => r.name);

  const runsPerRepo = await Promise.all(
    repoNames.map((name) =>
      s.github
        .getWorkflowRuns(name, 20)
        .then((runs) => ({ name, runs }))
        .catch(() => ({ name, runs: [] })),
    ),
  );

  const all: DeployEntry[] = [];
  for (const { name, runs } of runsPerRepo) {
    all.push(...workflowRunsToDeploys(runs, name));
  }

  return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function getSystemStats(s: Services): Promise<SystemStats> {
  const [projects, allBuilds] = await Promise.all([getProjects(s), s.r2.listAllProjectBuilds().catch(() => [])]);

  return {
    totalProjects: projects.length,
    totalDeploys: 0,
    avgCoverage: 0,
    activeEnvironments: projects.reduce(
      (n, p) => n + Object.values(p.environments).filter((e) => e.status !== "idle").length,
      0,
    ),
    successRate: 0,
    buildsStored: allBuilds.length,
  };
}

// ─── Mappers ──────────────────────────────────────────────────────────

// biome-ignore lint/suspicious/noExplicitAny: GitHub Octokit workflow run type
type GHWorkflowRun = any;

const DEPLOY_WORKFLOW_PREFIX = "Deploy";

function envFromWorkflowName(name: string): Environment | null {
  const upper = name.toUpperCase();
  if (upper.includes("DES")) return "des";
  if (upper.includes("PRE")) return "pre";
  if (upper.includes("PRO")) return "pro";
  return null;
}

function runStatus(run: GHWorkflowRun): DeployStatus {
  if (run.status === "completed") {
    return run.conclusion === "success" ? "success" : "failed";
  }
  return "in_progress";
}

function runDurationSecs(run: GHWorkflowRun): number {
  if (run.status !== "completed" || !run.updated_at || !run.created_at) return 0;
  const diff = (new Date(run.updated_at).getTime() - new Date(run.created_at).getTime()) / 1000;
  return Math.max(0, Math.round(diff));
}

export function workflowRunsToDeploys(runs: GHWorkflowRun[], projectName: string): DeployEntry[] {
  return runs
    .filter((r: GHWorkflowRun) => r.name?.startsWith(DEPLOY_WORKFLOW_PREFIX))
    .map((r: GHWorkflowRun) => {
      const env = envFromWorkflowName(r.name) ?? "des";
      return {
        id: String(r.id),
        project: projectName,
        environment: env,
        version: r.head_sha?.slice(0, 7) ?? "",
        commitSha: r.head_sha?.slice(0, 7) ?? "",
        branch: r.head_branch ?? "",
        timestamp: r.created_at,
        coverage: 0,
        duration: runDurationSecs(r),
        action: "deploy",
        triggeredBy: r.event ?? "unknown",
        status: runStatus(r),
        htmlUrl: r.html_url ?? "",
      };
    });
}

function envState(status: HealthStatus, url: string, commitSha?: string | null, lastDeployAt?: string | null) {
  return { version: commitSha ?? null, commitSha: commitSha ?? null, url, status, lastDeployAt: lastDeployAt ?? null };
}

export function commitShort(hash?: string | null): string | null {
  return hash?.slice(0, 7) ?? null;
}

export function formatBytes(bytes: number): string {
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
