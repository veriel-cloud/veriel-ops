// Re-export shared types
export type {
  BuildArtifact,
  BuildInfo,
  DeployAction,
  DeployEntry,
  DeployStatus,
  DeployTarget,
  DnsRecord,
  Environment,
  EnvironmentState,
  HealthStatus,
  Project,
  ProjectRuntime,
  ProjectSettings,
  ProjectType,
  SystemStats,
  WebhookEvent,
} from "@veriel-ops/shared";

// ─── Server-only: Cloudflare API responses ───────────────────────────

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

// ─── Server-only: SSE Pipeline ───────────────────────────────────────

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

// ─── Server-only: Service configs ────────────────────────────────────

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
