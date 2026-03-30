import type { Logger } from "./lib/logger.js";
import type { CachedData } from "./services/cached-data.js";
import type { CloudflareService } from "./services/cloudflare.js";
import type { DbStore } from "./services/db-store.js";
import type { GitHubService } from "./services/github.js";
import type { R2Service } from "./services/r2.js";

export interface Bindings {
  GITHUB_TOKEN: string;
  GITHUB_ORG: string;
  GITHUB_WEBHOOK_SECRET: string;
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_ZONE_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
  WORKERS_SUBDOMAIN: string;
  WEBHOOK_URL: string;
  PORT: string;
  [key: string]: string;
}

export interface Variables {
  logger: Logger;
  store: DbStore;
  cachedData: CachedData;
  github: GitHubService;
  cloudflare: CloudflareService;
  r2: R2Service;
}

export type Env = { Bindings: Bindings; Variables: Variables };
