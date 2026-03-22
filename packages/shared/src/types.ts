/** Entornos de despliegue disponibles */
export type Environment = "des" | "pre" | "pro";

/** Tipos de proyecto soportados */
export type ProjectType =
  | "astro-static"
  | "astro-ssr"
  | "react-spa"
  | "backend-worker";

/** Configuración de un proyecto registrado */
export interface ProjectConfig {
  name: string;
  type: ProjectType;
  repo: string;
  domain: DomainConfig;
  coverageThreshold: number;
  createdAt: string;
}

/** Configuración de dominio de un proyecto */
export interface DomainConfig {
  base: string;
  custom: boolean;
  des: string;
  pre: string;
  pro: string;
}

/** Metadata de una build almacenada */
export interface BuildMetadata {
  project: string;
  environment: Environment;
  version: string;
  commitSha: string;
  branch: string;
  timestamp: string;
  coverage: CoverageReport;
  buildDuration: number;
  deployer: string;
  isRollback: boolean;
}

/** Reporte de cobertura */
export interface CoverageReport {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
  global: number;
}

/** Estado de un entorno */
export interface EnvironmentStatus {
  environment: Environment;
  currentBuild: BuildMetadata | null;
  url: string;
  healthy: boolean;
  lastDeployAt: string | null;
}

/** Estado completo de un proyecto */
export interface ProjectStatus {
  project: ProjectConfig;
  environments: Record<Environment, EnvironmentStatus>;
  latestCoverage: CoverageReport | null;
}

/** Resultado de una operación de deploy */
export interface DeployResult {
  success: boolean;
  project: string;
  environment: Environment;
  url: string;
  version: string;
  commitSha: string;
  coverage: CoverageReport | null;
  error: string | null;
}

/** Resultado de un rollback */
export interface RollbackResult {
  success: boolean;
  project: string;
  environment: Environment;
  fromVersion: string;
  toVersion: string;
  url: string;
  error: string | null;
}

/** Registro DNS */
export interface DnsRecord {
  name: string;
  type: "CNAME" | "A" | "AAAA";
  content: string;
  proxied: boolean;
}

/** Entrada del histórico de deploys */
export interface DeployHistoryEntry {
  id: string;
  project: string;
  environment: Environment;
  version: string;
  commitSha: string;
  branch: string;
  timestamp: string;
  coverage: CoverageReport;
  action: "deploy" | "rollback" | "promote";
  triggeredBy: string;
}
