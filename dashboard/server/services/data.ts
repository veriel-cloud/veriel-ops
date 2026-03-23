import * as github from "./github.js";
import * as cloudflare from "./cloudflare.js";
import * as r2 from "./r2.js";

type Environment = "des" | "pre" | "pro";
type HealthStatus = "healthy" | "degraded" | "down" | "idle";
type DeployAction = "deploy" | "rollback" | "promote";

interface Project {
  name: string;
  type: string;
  repo: string;
  domain: string;
  customDomain: boolean;
  coverage: number;
  coverageThreshold: number;
  environments: Record<Environment, { version: string | null; commitSha: string | null; url: string; status: HealthStatus; lastDeployAt: string | null }>;
  createdAt: string;
}

interface DeployEntry {
  id: string;
  project: string;
  environment: Environment;
  version: string;
  commitSha: string;
  branch: string;
  timestamp: string;
  coverage: number;
  duration: number;
  action: DeployAction;
  triggeredBy: string;
  status: "success" | "failed" | "in_progress";
}

interface BuildArtifact {
  name: string;
  project: string;
  environment: Environment;
  version: string;
  commitSha: string;
  size: string;
  timestamp: string;
  coverage: number;
}

interface SystemStats {
  totalProjects: number;
  totalDeploys: number;
  avgCoverage: number;
  activeEnvironments: number;
  successRate: number;
  buildsStored: number;
}

// ─── Fetch & transform to dashboard types ───────────────────────────

export async function getProjects(): Promise<Project[]> {
  const [repos, pagesProjects, allBuilds] = await Promise.all([
    github.listOrgRepos(),
    cloudflare.listPagesProjects().catch(() => []),
    r2.listAllProjectBuilds().catch(() => []),
  ]);

  const pagesMap = new Map(
    pagesProjects.map((p) => [p.name, p]),
  );

  return repos
    .filter((repo) => repo.name !== ".github")
    .map((repo) => {
      const pages = pagesMap.get(repo.name);
      const projectBuilds = allBuilds.filter((b) => b.project === repo.name);
      const baseDomain = pages?.domains?.[0] ?? `${repo.name}.veriel.dev`;
      const latestDeploy = pages?.latest_deployment;

      return {
        name: repo.name,
        type: "astro-static" as const,
        repo: repo.full_name,
        domain: baseDomain,
        customDomain: (pages?.domains?.length ?? 0) > 0,
        coverage: 0,
        coverageThreshold: 80,
        environments: {
          des: {
            version: null,
            commitSha: null,
            url: `https://dev.${baseDomain}`,
            status: (pages ? "healthy" : "idle") as HealthStatus,
            lastDeployAt: null,
          },
          pre: {
            version: null,
            commitSha: null,
            url: `https://pre.${baseDomain}`,
            status: "idle" as HealthStatus,
            lastDeployAt: null,
          },
          pro: {
            version: latestDeploy
              ? latestDeploy.deployment_trigger?.metadata?.commit_hash?.slice(0, 7) ?? null
              : null,
            commitSha: latestDeploy?.deployment_trigger?.metadata?.commit_hash?.slice(0, 7) ?? null,
            url: `https://${baseDomain}`,
            status: latestDeploy?.latest_stage?.status === "success"
              ? "healthy" as HealthStatus
              : pages
                ? "idle" as HealthStatus
                : "idle" as HealthStatus,
            lastDeployAt: latestDeploy?.created_on ?? null,
          },
        },
        createdAt: repo.created_at ?? "",
      };
    });
}

export async function getProjectDetail(name: string): Promise<{
  project: Project;
  deploys: DeployEntry[];
  builds: BuildArtifact[];
  workflowRuns: Awaited<ReturnType<typeof github.getWorkflowRuns>>;
}> {
  const [repo, pages, deployments, workflowRuns, builds] = await Promise.all([
    github.getRepo(name),
    cloudflare.getPagesProject(name).catch(() => null),
    cloudflare.getDeployments(name, 30).catch(() => []),
    github.getWorkflowRuns(name, 20),
    r2.listBuilds(name).catch(() => []),
  ]);

  const baseDomain = pages?.domains?.[0] ?? `${name}.veriel.dev`;

  const envDeployments = {
    des: deployments.filter((d) => d.deployment_trigger?.metadata?.branch === "develop"),
    pre: deployments.filter((d) => d.deployment_trigger?.metadata?.branch?.startsWith("release")),
    pro: deployments.filter((d) => d.environment === "production"),
  };

  const latestByEnv = (env: "des" | "pre" | "pro") => {
    const latest = envDeployments[env][0];
    if (!latest) return { version: null, commitSha: null, status: "idle" as HealthStatus, lastDeployAt: null };
    return {
      version: latest.deployment_trigger?.metadata?.commit_hash?.slice(0, 7) ?? null,
      commitSha: latest.deployment_trigger?.metadata?.commit_hash?.slice(0, 7) ?? null,
      status: latest.latest_stage?.status === "success" ? "healthy" as HealthStatus : "degraded" as HealthStatus,
      lastDeployAt: latest.created_on,
    };
  };

  const project: Project = {
    name: repo.name,
    type: "astro-static",
    repo: repo.full_name,
    domain: baseDomain,
    customDomain: (pages?.domains?.length ?? 0) > 0,
    coverage: 0,
    coverageThreshold: 80,
    environments: {
      des: { ...latestByEnv("des"), url: `https://dev.${baseDomain}` },
      pre: { ...latestByEnv("pre"), url: `https://pre.${baseDomain}` },
      pro: { ...latestByEnv("pro"), url: `https://${baseDomain}` },
    },
    createdAt: repo.created_at ?? "",
  };

  const deploys: DeployEntry[] = deduplicateDeployments(deployments).map((d) => {
    const environment = resolveEnvironment(d);

    return {
      id: d.id,
      project: name,
      environment,
      version: d.deployment_trigger?.metadata?.commit_hash?.slice(0, 7) ?? d.short_id,
      commitSha: d.deployment_trigger?.metadata?.commit_hash?.slice(0, 7) ?? "",
      branch: d.deployment_trigger?.metadata?.branch ?? "",
      timestamp: d.created_on,
      coverage: 0,
      duration: computeDuration(d),
      action: "deploy",
      triggeredBy: d.deployment_trigger?.type ?? "unknown",
      status: d.latest_stage?.status === "success" ? "success" : d.latest_stage?.status === "active" ? "in_progress" : "failed",
    };
  });

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

export async function getDeploys(): Promise<DeployEntry[]> {
  const [orgRepos, pagesProjects] = await Promise.all([
    github.listOrgRepos(),
    cloudflare.listPagesProjects().catch(() => []),
  ]);

  const orgRepoNames = new Set(orgRepos.map((r) => r.name));
  const allDeploys: DeployEntry[] = [];

  for (const project of pagesProjects.filter((p) => orgRepoNames.has(p.name))) {
    const deployments = await cloudflare.getDeployments(project.name, 10).catch(() => []);
    const deduplicated = deduplicateDeployments(deployments);

    for (const d of deduplicated) {
      const environment = resolveEnvironment(d);

      allDeploys.push({
        id: d.id,
        project: project.name,
        environment,
        version: d.deployment_trigger?.metadata?.commit_hash?.slice(0, 7) ?? d.short_id,
        commitSha: d.deployment_trigger?.metadata?.commit_hash?.slice(0, 7) ?? "",
        branch: d.deployment_trigger?.metadata?.branch ?? "",
        timestamp: d.created_on,
        coverage: 0,
        duration: computeDuration(d),
        action: "deploy",
        triggeredBy: d.deployment_trigger?.type ?? "unknown",
        status: d.latest_stage?.status === "success" ? "success" : d.latest_stage?.status === "active" ? "in_progress" : "failed",
      });
    }
  }

  return allDeploys.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function getSystemStats(): Promise<SystemStats> {
  const [projects, allBuilds] = await Promise.all([
    getProjects(),
    r2.listAllProjectBuilds().catch(() => []),
  ]);

  return {
    totalProjects: projects.length,
    totalDeploys: 0,
    avgCoverage: 0,
    activeEnvironments: projects.reduce((count, p) => {
      return count + Object.values(p.environments).filter((e) => e.status !== "idle").length;
    }, 0),
    successRate: 0,
    buildsStored: allBuilds.length,
  };
}

// ─── Deployment helpers ─────────────────────────────────────────────

interface DeploymentLike {
  id: string;
  short_id: string;
  environment: string;
  created_on: string;
  deployment_trigger?: {
    type: string;
    metadata: {
      branch: string;
      commit_hash: string;
      commit_message: string;
    };
  };
  latest_stage?: {
    name: string;
    status: string;
    started_on: string;
    ended_on: string;
  };
}

function resolveEnvironment(d: DeploymentLike): Environment {
  const branch = d.deployment_trigger?.metadata?.branch ?? "";

  if (branch === "develop") return "des";
  if (branch.startsWith("release")) return "pre";
  if (branch === "main") return "pro";

  // Fallback to Cloudflare's environment field
  if (d.environment === "production") return "pro";
  return "des";
}

function deduplicateDeployments(deployments: DeploymentLike[]): DeploymentLike[] {
  // Cloudflare creates multiple entries per deploy.
  // Group by commit hash + resolved environment and keep only the one
  // with the longest duration (the actual deploy, not the trigger).
  const seen = new Map<string, DeploymentLike>();

  for (const d of deployments) {
    const commitHash = d.deployment_trigger?.metadata?.commit_hash ?? d.short_id;
    const env = resolveEnvironment(d);
    const key = `${commitHash}-${env}`;

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, d);
    } else {
      // Keep the one with actual duration (non-zero)
      const existingDuration = computeDuration(existing);
      const newDuration = computeDuration(d);
      if (newDuration > existingDuration) {
        seen.set(key, d);
      }
    }
  }

  return Array.from(seen.values());
}

function computeDuration(d: DeploymentLike): number {
  if (!d.latest_stage?.ended_on || !d.latest_stage?.started_on) return 0;
  const start = new Date(d.latest_stage.started_on).getTime();
  const end = new Date(d.latest_stage.ended_on).getTime();
  const diff = Math.round((end - start) / 1000);
  return diff > 0 ? diff : 0;
}

// ─── Format helpers ─────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(iso: string): string {
  const now = new Date();
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return `hace ${diffSecs}s`;
  if (diffMins < 60) return `hace ${diffMins}min`;
  if (diffHours < 24) {
    const mins = diffMins % 60;
    return mins > 0 ? `hace ${diffHours}h ${mins}min` : `hace ${diffHours}h`;
  }
  if (diffDays < 7) {
    const hours = diffHours % 24;
    return hours > 0 ? `hace ${diffDays}d ${hours}h` : `hace ${diffDays}d`;
  }
  return formatDate(iso);
}

export function formatDuration(seconds: number): string {
  if (seconds === 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}
