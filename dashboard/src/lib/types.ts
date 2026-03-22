export type Environment = "des" | "pre" | "pro";

export type ProjectType =
  | "astro-static"
  | "astro-ssr"
  | "react-spa"
  | "backend-worker";

export type DeployAction = "deploy" | "rollback" | "promote";

export type HealthStatus = "healthy" | "degraded" | "down" | "idle";

export interface Project {
  name: string;
  type: ProjectType;
  repo: string;
  domain: string;
  customDomain: boolean;
  coverage: number;
  coverageThreshold: number;
  environments: Record<Environment, EnvironmentStatus>;
  createdAt: string;
}

export interface EnvironmentStatus {
  version: string | null;
  commitSha: string | null;
  url: string;
  status: HealthStatus;
  lastDeployAt: string | null;
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
  action: DeployAction;
  triggeredBy: string;
  status: "success" | "failed" | "in_progress";
}

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

export interface SystemStats {
  totalProjects: number;
  totalDeploys: number;
  avgCoverage: number;
  activeEnvironments: number;
  successRate: number;
  buildsStored: number;
}
