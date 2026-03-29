export type Environment = "des" | "pre" | "pro";
export type HealthStatus = "healthy" | "degraded" | "down" | "idle";
export type DeployStatus = "success" | "failed" | "in_progress";

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
  description?: string;
}

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
  action: string;
  triggeredBy: string;
  status: DeployStatus;
}

export interface BuildArtifact {
  name: string;
  project: string;
  environment: Environment;
  version: string;
  commitSha: string;
  size: number;
  timestamp: string;
  lastModified: string;
  coverage: number;
}

export interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  branch: string;
  commit: string;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface Notification {
  id: string;
  type: string;
  project: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface ServiceCheck {
  name: string;
  status: string;
  message: string;
  latency: number;
}

export interface DnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  branch: string;
  baseBranch: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
  draft: boolean;
}

// ─── API Responses ───────────────────────────────────────────────────

export interface ProjectsResponse {
  projects: Project[];
}

export interface ProjectDetailResponse {
  project: Project;
  deploys: DeployEntry[];
  builds: BuildArtifact[];
  workflowRuns: WorkflowRun[];
}

export interface DeploysResponse {
  deploys: DeployEntry[];
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export interface SystemStatusResponse {
  status: string;
  services: ServiceCheck[];
  timestamp: string;
}

export interface BranchesResponse {
  branches: string[];
}

export interface PullRequestsResponse {
  pullRequests: PullRequest[];
}

export interface DnsRecordsResponse {
  records: DnsRecord[];
}

export interface BuildsResponse {
  builds: BuildArtifact[];
}

export interface FilesResponse {
  files: { path: string; sha: string; size: number }[];
}
