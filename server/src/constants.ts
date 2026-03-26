import type { Environment } from "./types.js";

// ─── Domain ───────────────────────────────────────────────────────────

export const BASE_DOMAIN = "veriel.dev";

export const ENV_BRANCHES: Record<Environment, string> = {
  des: "develop",
  pre: "release",
  pro: "main",
};

// ─── Cloudflare ───────────────────────────────────────────────────────

export const CF_API_URL = "https://api.cloudflare.com/client/v4";

export const PAGES_BUILD_COMMAND = "pnpm build";
export const PAGES_BUILD_OUTPUT = "dist";

// ─── Defaults ─────────────────────────────────────────────────────────

export const DEFAULT_COVERAGE_THRESHOLD = 80;
export const DEFAULT_PROJECT_TYPE = "astro-static";
export const DEFAULT_ORG = "veriel-cloud";
export const DEFAULT_BUCKET = "veriel-ops-builds";

// ─── Templates ────────────────────────────────────────────────────────

export const PROJECT_TEMPLATES: Record<string, string> = {
  "astro-static": "template-astro",
  "astro-ssr": "template-astro",
  "react-spa": "template-react",
  "backend-worker": "template-astro",
};

// ─── Polling ──────────────────────────────────────────────────────────

export const REPO_CREATION_DELAY_MS = 3_000;
export const WORKFLOW_POLL_INTERVAL_MS = 4_000;
export const WORKFLOW_POLL_TIMEOUT_MS = 120_000;
export const GH_ACTIONS_POLL_INTERVAL_MS = 5_000;
export const GH_ACTIONS_POLL_TIMEOUT_MS = 600_000;

// ─── Pagination ───────────────────────────────────────────────────────

export const PER_PAGE_REPOS = 50;
export const PER_PAGE_RUNS = 20;
export const PER_PAGE_DNS = 100;

// ─── Webhook ──────────────────────────────────────────────────────────

export const MAX_WEBHOOK_EVENTS = 100;
export const WEBHOOK_GITHUB_EVENTS = ["push", "workflow_run", "pull_request", "create"];

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
