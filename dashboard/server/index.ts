import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { projectsRoutes } from "./routes/projects.js";
import { deploysRoutes } from "./routes/deploys.js";
import { actionsRoutes } from "./routes/actions.js";
import { systemRoutes } from "./routes/system.js";
import { webhooksRoutes } from "./routes/webhooks.js";
import { eventsRoutes } from "./routes/events.js";

const app = new Hono();

app.use("/*", cors());

app.route("/api/projects", projectsRoutes);
app.route("/api/deploys", deploysRoutes);
app.route("/api/actions", actionsRoutes);
app.route("/api/system", systemRoutes);
app.route("/api/webhooks", webhooksRoutes);
app.route("/api/events", eventsRoutes);

const port = parseInt(process.env.PORT ?? "3001", 10);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[server] API running on http://localhost:${info.port}`);
});
