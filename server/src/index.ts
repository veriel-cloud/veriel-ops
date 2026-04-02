import { Hono } from "hono";
import { env } from "hono/adapter";
import { cors } from "hono/cors";
import { DEFAULT_BUCKET, DEFAULT_ORG } from "./constants.js";
import type { Env } from "./env.js";
import { createCache } from "./lib/cache.js";
import { createDatabase } from "./lib/db.js";
import { authMiddleware } from "./middleware/auth.js";
import { loggerMiddleware } from "./middleware/logger.js";
import { actionsRoutes } from "./routes/actions.js";
import { auditRoutes } from "./routes/audit.js";
import { deploysRoutes } from "./routes/deploys.js";
import { eventsRoutes } from "./routes/events.js";
import { notificationsRoutes } from "./routes/notifications.js";
import { projectsRoutes } from "./routes/projects.js";
import { systemRoutes } from "./routes/system.js";
import { webhooksRoutes } from "./routes/webhooks.js";
import { createCachedData } from "./services/cached-data.js";
import { createCloudflareService } from "./services/cloudflare.js";
import { createDbStore } from "./services/db-store.js";
import { createDeployTracker } from "./services/deploy-tracker.js";
import { createGitHubService } from "./services/github.js";
import { createR2Service } from "./services/r2.js";

const db = createDatabase(`${import.meta.dir}/../data/veriel-ops.db`);
const store = createDbStore(db);
const deployTracker = createDeployTracker();

const apiCache = createCache<unknown>({ ttlMs: 2 * 60_000, maxEntries: 100 });
const cachedData = createCachedData(apiCache);

const app = new Hono<Env>();

app.use(
  "/*",
  cors({
    origin: ["http://localhost:5173", "https://veriel-ops.veriel.dev"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use("/*", loggerMiddleware);

app.use("/*", async (c, next) => {
  const e = env(c);
  const log = c.get("logger");

  c.set("store", store);
  c.set("cachedData", cachedData);
  c.set("deployTracker", deployTracker);

  c.set(
    "github",
    createGitHubService(
      {
        token: e.GITHUB_TOKEN,
        org: e.GITHUB_ORG || DEFAULT_ORG,
      },
      log,
    ),
  );

  c.set(
    "cloudflare",
    createCloudflareService(
      {
        apiToken: e.CLOUDFLARE_API_TOKEN,
        accountId: e.CLOUDFLARE_ACCOUNT_ID,
        zoneId: e.CLOUDFLARE_ZONE_ID,
      },
      log,
    ),
  );

  c.set(
    "r2",
    createR2Service(
      {
        accessKeyId: e.R2_ACCESS_KEY_ID,
        secretAccessKey: e.R2_SECRET_ACCESS_KEY,
        accountId: e.CLOUDFLARE_ACCOUNT_ID,
        bucketName: e.R2_BUCKET_NAME || DEFAULT_BUCKET,
      },
      log,
    ),
  );

  await next();
});

app.use("/*", authMiddleware);

app.route("/api/audit", auditRoutes);
app.route("/api/projects", projectsRoutes);
app.route("/api/deploys", deploysRoutes);
app.route("/api/actions", actionsRoutes);
app.route("/api/system", systemRoutes);
app.route("/api/webhooks", webhooksRoutes);
app.route("/api/events", eventsRoutes);
app.route("/api/notifications", notificationsRoutes);

export default {
  fetch: app.fetch,
  port: 3001,
  idleTimeout: 0,
};
