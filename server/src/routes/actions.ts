import { Hono } from "hono";
import type { Env } from "../env.js";

export const actionsRoutes = new Hono<Env>();

actionsRoutes.get("/:repo/runs", async (c) => {
  const repo = c.req.param("repo");
  try {
    const runs = await c.get("github").getWorkflowRuns(repo);
    return c.json({ runs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

actionsRoutes.get("/:repo/:runId/logs", async (c) => {
  const repo = c.req.param("repo");
  const runId = parseInt(c.req.param("runId"), 10);
  try {
    const [run, jobs] = await Promise.all([
      c.get("github").getWorkflowRun(repo, runId),
      c.get("github").getWorkflowRunJobs(repo, runId),
    ]);
    return c.json({ run, jobs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});
