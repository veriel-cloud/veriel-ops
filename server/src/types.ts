// ─── Domain types ─────────────────────────────────────────────────────

export type Environment = "des" | "pre" | "pro";
export type HealthStatus = "healthy" | "degraded" | "down" | "idle";
export type DeployAction = "deploy" | "rollback" | "promote";
export type DeployStatus = "success" | "failed" | "in_progress";

// ─── Project ──────────────────────────────────────────────────────────

export interface EnvironmentState {
  version: string | null;
  commitSha: string | null;
  url: string;
  status: HealthStatus;
  lastDeployAt: string | null;
}

export interface Project {
  name: string;
  type: string;
  repo: string;
  domain: string;
  customDomain: boolean;
  coverage: number;
  coverageThreshold: number;
  environments: Record<Environment, EnvironmentState>;
  createdAt: string;
}

// ─── Deploy ───────────────────────────────────────────────────────────

export interface DeployEntry {
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
  status: DeployStatus;
}

// ─── Build ────────────────────────────────────────────────────────────

export interface BuildArtifact {
  name: string;
  project: string;
  environment: Environment;
  version: string;
  commitSha: string;
  size: string;
  timestamp: string;
  coverage: number;
}

export interface BuildInfo {
  name: string;
  project: string;
  environment: string;
  size: number;
  lastModified: string;
  version: string;
  commitSha: string;
}

// ─── System ───────────────────────────────────────────────────────────

export interface SystemStats {
  totalProjects: number;
  totalDeploys: number;
  avgCoverage: number;
  activeEnvironments: number;
  successRate: number;
  buildsStored: number;
}

// ─── Cloudflare API responses ─────────────────────────────────────────

export interface PagesProject {
  name: string;
  subdomain: string;
  domains: string[];
  production_branch: string;
  created_on: string;
  latest_deployment: PagesDeployment | null;
  source: {
    type: string;
    config: { owner: string; repo_name: string; production_branch: string };
  };
}

export interface PagesDeployment {
  id: string;
  short_id: string;
  project_name: string;
  environment: string;
  url: string;
  created_on: string;
  modified_on: string;
  latest_stage: {
    name: string;
    status: string;
    started_on: string;
    ended_on: string;
  };
  deployment_trigger: {
    type: string;
    metadata: { branch: string; commit_hash: string; commit_message: string };
  };
  source: {
    type: string;
    config: { owner: string; repo_name: string };
  };
}

export interface DnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
  created_on: string;
  modified_on: string;
}

// ─── Webhook ──────────────────────────────────────────────────────────

export interface WebhookEvent {
  source: "github" | "cloudflare";
  type: string;
  project: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// ─── SSE Pipeline ─────────────────────────────────────────────────────

export interface PipelineStep {
  id: string;
  label: string;
  fn: () => Promise<{ detail?: string; logs?: string[] }>;
}

export interface PipelineJob {
  id: string;
  label: string;
  steps: PipelineStep[];
}

// ─── Service configs ──────────────────────────────────────────────────

export interface GitHubConfig {
  token: string;
  org: string;
}

export interface CloudflareConfig {
  apiToken: string;
  accountId: string;
  zoneId: string;
}

export interface R2Config {
  accessKeyId: string;
  secretAccessKey: string;
  accountId: string;
  bucketName: string;
}
