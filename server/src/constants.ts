// Re-export shared constants for backwards compatibility within server/
export {
  BASE_DOMAIN,
  DEFAULT_BUCKET,
  DEFAULT_COVERAGE_THRESHOLD,
  DEFAULT_ORG,
  DEFAULT_PROJECT_TYPE,
  domainForEnv,
  ENV_BRANCHES,
  PROJECT_TYPE_CONFIG,
  pagesProjectName,
  urlForEnv,
} from "@veriel-ops/shared";

// ─── Cloudflare (server-only) ────────────────────────────────────────

export const CF_API_URL = "https://api.cloudflare.com/client/v4";

// ─── Polling (server-only) ───────────────────────────────────────────

export const REPO_CREATION_DELAY_MS = 3_000;
export const WORKFLOW_POLL_INTERVAL_MS = 4_000;
export const WORKFLOW_POLL_TIMEOUT_MS = 120_000;
export const GH_ACTIONS_POLL_INTERVAL_MS = 5_000;
export const GH_ACTIONS_POLL_TIMEOUT_MS = 600_000;

// ─── Pagination (server-only) ────────────────────────────────────────

export const PER_PAGE_REPOS = 50;
export const PER_PAGE_RUNS = 20;
export const PER_PAGE_DNS = 100;

// ─── Webhook (server-only) ───────────────────────────────────────────

export const MAX_WEBHOOK_EVENTS = 100;
export const WEBHOOK_GITHUB_EVENTS = ["push", "workflow_run", "pull_request", "create"];
