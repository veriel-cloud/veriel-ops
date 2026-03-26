import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { GH_ACTIONS_POLL_INTERVAL_MS } from "../constants.js";
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

actionsRoutes.get("/:repo/:runId/stream", async (c) => {
  const repo = c.req.param("repo");
  const runId = parseInt(c.req.param("runId"), 10);
  const gh = c.get("github");
  const log = c.get("logger");

  return streamSSE(c, async (stream) => {
    let lastState = "";

    while (true) {
      const [run, jobs] = await Promise.all([gh.getWorkflowRun(repo, runId), gh.getWorkflowRunJobs(repo, runId)]);

      const state = JSON.stringify({
        status: run.status,
        conclusion: run.conclusion,
        jobs: jobs.map((j) => ({
          id: j.id,
          name: j.name,
          status: j.status,
          conclusion: j.conclusion,
          startedAt: j.started_at,
          completedAt: j.completed_at,
          steps: j.steps?.map((s) => ({
            name: s.name,
            status: s.status,
            conclusion: s.conclusion,
            startedAt: s.started_at,
            completedAt: s.completed_at,
          })),
        })),
      });

      if (state !== lastState) {
        lastState = state;
        await stream.writeSSE({
          event: "update",
          data: state,
        });
      }

      if (run.status === "completed") {
        log.info({ repo, runId, conclusion: run.conclusion }, "workflow stream completed");
        await stream.writeSSE({
          event: "done",
          data: JSON.stringify({ conclusion: run.conclusion }),
        });
        break;
      }

      await new Promise((r) => setTimeout(r, GH_ACTIONS_POLL_INTERVAL_MS));
    }
  });
});
