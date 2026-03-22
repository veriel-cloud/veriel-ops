export type {
  Environment,
  ProjectType,
  ProjectConfig,
  DomainConfig,
  BuildMetadata,
  CoverageReport,
  EnvironmentStatus,
  ProjectStatus,
  DeployResult,
  RollbackResult,
  DnsRecord,
  DeployHistoryEntry,
} from "./types.js";

/** Umbral de cobertura por defecto */
export const DEFAULT_COVERAGE_THRESHOLD = 80;

/** Dominio base */
export const BASE_DOMAIN = "veriel.dev";

/** Nombre del bucket R2 */
export const R2_BUCKET_NAME = "veriel-ops-builds";

/** Política de retención de builds por entorno */
export const BUILD_RETENTION: Record<string, number> = {
  des: 10,
  pre: 20,
  pro: Infinity,
};

/** Genera los subdominios para un proyecto */
export function getProjectDomains(
  projectName: string,
  customDomain?: string,
): { des: string; pre: string; pro: string } {
  const base = customDomain ?? `${projectName}.${BASE_DOMAIN}`;
  return {
    des: `dev.${base}`,
    pre: `pre.${base}`,
    pro: base,
  };
}

/** Genera la ruta en R2 para una build */
export function getBuildPath(
  project: string,
  environment: string,
  filename: string,
): string {
  return `${project}/${environment}/${filename}`;
}
