import { Hono } from "hono";
import { env } from "hono/adapter";
import { cors } from "hono/cors";
import { DEFAULT_BUCKET, DEFAULT_ORG } from "./constants.js";
import type { Env } from "./env.js";
import { loggerMiddleware } from "./middleware/logger.js";
import { actionsRoutes } from "./routes/actions.js";
import { deploysRoutes } from "./routes/deploys.js";
import { eventsRoutes } from "./routes/events.js";
import { notificationsRoutes } from "./routes/notifications.js";
import { projectsRoutes } from "./routes/projects.js";
import { systemRoutes } from "./routes/system.js";
import { webhooksRoutes } from "./routes/webhooks.js";
import { createCloudflareService } from "./services/cloudflare.js";
import { createGitHubService } from "./services/github.js";
import { createR2Service } from "./services/r2.js";

const app = new Hono<Env>();

app.use("/*", cors());
app.use("/*", loggerMiddleware);

app.use("/*", async (c, next) => {
  const e = env(c);
  const log = c.get("logger");

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
