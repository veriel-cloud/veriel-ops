import type { DeployTarget, Environment, ProjectRuntime, ProjectType } from "./types.js";

// ─── Domain ───────────────────────────────────────────────────────────

export const BASE_DOMAIN = "veriel.dev";

export const ENV_BRANCHES: Record<Environment, string> = {
  des: "develop",
  pre: "release",
  pro: "main",
};

// ─── Defaults ─────────────────────────────────────────────────────────

export const DEFAULT_COVERAGE_THRESHOLD = 80;
export const DEFAULT_PROJECT_TYPE: ProjectType = "astro-static";
export const DEFAULT_ORG = "veriel-cloud";
export const DEFAULT_BUCKET = "veriel-ops-builds";

// ─── Project type config ──────────────────────────────────────────────

export interface ProjectTypeConfig {
  label: string;
  deployTarget: DeployTarget;
  defaultBuildCommand: string;
  defaultOutputDir: string;
  defaultRuntime: ProjectRuntime;
  template: string;
}

export const PROJECT_TYPE_CONFIG: Record<ProjectType, ProjectTypeConfig> = {
  "astro-static": {
    label: "Astro (Static)",
    deployTarget: "cf-pages",
    defaultBuildCommand: "pnpm build",
    defaultOutputDir: "dist",
    defaultRuntime: "node",
    template: "template-astro",
  },
  "astro-ssr": {
    label: "Astro (SSR)",
    deployTarget: "cf-workers",
    defaultBuildCommand: "pnpm build",
    defaultOutputDir: "dist",
    defaultRuntime: "node",
    template: "template-astro",
  },
  "react-spa": {
    label: "React (SPA)",
    deployTarget: "cf-pages",
    defaultBuildCommand: "pnpm build",
    defaultOutputDir: "dist",
    defaultRuntime: "node",
    template: "template-react",
  },
  "hono-api": {
    label: "Hono (API)",
    deployTarget: "cf-workers",
    defaultBuildCommand: "pnpm build",
    defaultOutputDir: "dist",
    defaultRuntime: "bun",
    template: "template-hono",
  },
  "go-fiber": {
    label: "Go / Fiber (API)",
    deployTarget: "container",
    defaultBuildCommand: "go build -o bin/server ./cmd/server",
    defaultOutputDir: "bin",
    defaultRuntime: "go",
    template: "template-go",
  },
  "spring-boot": {
    label: "Spring Boot (API)",
    deployTarget: "container",
    defaultBuildCommand: "mvn package -DskipTests",
    defaultOutputDir: "target",
    defaultRuntime: "java",
    template: "template-spring",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Returns the Pages project name for a given environment.
 * PRO uses the project name directly, DES/PRE append the env suffix.
 */
export function pagesProjectName(projectName: string, env: Environment): string {
  return env === "pro" ? projectName : `${projectName}-${env}`;
}

/**
 * Returns the custom domain for a given project + environment.
 */
export function domainForEnv(projectName: string, env: Environment, customDomain?: string): string {
  if (customDomain) {
    if (env === "pro") return customDomain;
    return `${env === "des" ? "dev" : "pre"}.${customDomain}`;
  }
  if (env === "pro") return `${projectName}.${BASE_DOMAIN}`;
  return `${projectName}-${env}.${BASE_DOMAIN}`;
}

/**
 * Returns the URL for a given project + environment.
 */
export function urlForEnv(projectName: string, env: Environment, customDomain?: string): string {
  return `https://${domainForEnv(projectName, env, customDomain)}`;
}
