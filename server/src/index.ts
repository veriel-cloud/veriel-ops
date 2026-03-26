import { config } from "dotenv";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "hono/adapter";

config({ path: ".dev.vars" });
import { createGitHubService } from "./services/github.js";
import { createCloudflareService } from "./services/cloudflare.js";
import { createR2Service } from "./services/r2.js";
import { projectsRoutes } from "./routes/projects.js";
import { deploysRoutes } from "./routes/deploys.js";
import { actionsRoutes } from "./routes/actions.js";
import { systemRoutes } from "./routes/system.js";
import { webhooksRoutes } from "./routes/webhooks.js";
import { eventsRoutes } from "./routes/events.js";
import { DEFAULT_ORG, DEFAULT_BUCKET } from "./constants.js";
import type { Env } from "./env.js";

const app = new Hono<Env>();

app.use("/*", cors());

app.use("/*", async (c, next) => {
  const e = env(c);

  c.set("github", createGitHubService({
    token: e.GITHUB_TOKEN,
    org: e.GITHUB_ORG || DEFAULT_ORG,
  }));

  c.set("cloudflare", createCloudflareService({
    apiToken: e.CLOUDFLARE_API_TOKEN,
    accountId: e.CLOUDFLARE_ACCOUNT_ID,
    zoneId: e.CLOUDFLARE_ZONE_ID,
  }));

  c.set("r2", createR2Service({
    accessKeyId: e.R2_ACCESS_KEY_ID,
    secretAccessKey: e.R2_SECRET_ACCESS_KEY,
    accountId: e.CLOUDFLARE_ACCOUNT_ID,
    bucketName: e.R2_BUCKET_NAME || DEFAULT_BUCKET,
  }));

  await next();
});

app.route("/api/projects", projectsRoutes);
app.route("/api/deploys", deploysRoutes);
app.route("/api/actions", actionsRoutes);
app.route("/api/system", systemRoutes);
app.route("/api/webhooks", webhooksRoutes);
app.route("/api/events", eventsRoutes);

const port = 3001;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[server] API running on http://localhost:${info.port}`);
});
