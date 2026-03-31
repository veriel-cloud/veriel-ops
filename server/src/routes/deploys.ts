import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { GH_ACTIONS_POLL_INTERVAL_MS } from "../constants.js";
import type { Env } from "../env.js";
import { workflowRunsToDeploys } from "../services/data.js";
import type { DeployEntry } from "../types.js";

export const deploysRoutes = new Hono<Env>();

// REST endpoint — returns cached data for initial/historical view
deploysRoutes.get("/", async (c) => {
  try {
    const deploys = await c.get("cachedData").getDeploys({
      github: c.get("github"),
      cloudflare: c.get("cloudflare"),
      r2: c.get("r2"),
      store: c.get("store"),
    });
    return c.json({ deploys });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

const IDLE_POLL_MS = 30_000;

/**
 * SSE stream for deploys.
 *
 * 1. Emits initial snapshot from cached data (cheap, no extra GitHub calls)
 * 2. While there are active deploys (tracked by webhooks):
 *    - Polls ONLY active repos every 5s (not all repos)
 *    - Merges fresh data for active repos with cached data for the rest
 * 3. When no active deploys, polls every 30s for changes
 */
deploysRoutes.get("/stream", async (c) => {
  const gh = c.get("github");
  const log = c.get("logger");
  const tracker = c.get("deployTracker");
  const cachedData = c.get("cachedData");

  return streamSSE(c, async (stream) => {
    let lastState = "";

    // Get full deploy list (uses server cache — cheap)
    async function getBaselineDeploys(): Promise<DeployEntry[]> {
      return cachedData.getDeploys({
        github: gh,
        cloudflare: c.get("cloudflare"),
        r2: c.get("r2"),
        store: c.get("store"),
      });
    }

    // Poll only repos with active deploys (fresh, bypasses cache)
    async function getFreshActiveRepos(): Promise<DeployEntry[]> {
      const activeRepos = tracker.getActiveRepos();
      if (activeRepos.length === 0) return [];

      const results = await Promise.all(
        activeRepos.map((name) =>
          gh
            .getWorkflowRuns(name, 10)
            .then((runs) => workflowRunsToDeploys(runs, name))
            .catch(() => []),
        ),
      );

      return results.flat();
    }

    try {
      log.info("deploys stream opened");

      while (true) {
        const hasActiveRepos = tracker.hasActive();

        let all: DeployEntry[];

        if (hasActiveRepos) {
          // Merge: fresh data for active repos + cached data for the rest
          const activeRepoNames = new Set(tracker.getActiveRepos());
          const [baseline, fresh] = await Promise.all([getBaselineDeploys(), getFreshActiveRepos()]);

          // Remove stale entries for active repos from baseline, replace with fresh
          all = [...baseline.filter((d) => !activeRepoNames.has(d.project)), ...fresh];
        } else {
          all = await getBaselineDeploys();
        }

        all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const state = JSON.stringify(all);
        if (state !== lastState) {
          lastState = state;
          await stream.writeSSE({ event: "update", data: state });
        }

        const pollInterval = hasActiveRepos ? GH_ACTIONS_POLL_INTERVAL_MS : IDLE_POLL_MS;
        await new Promise((r) => setTimeout(r, pollInterval));
      }
    } catch (error) {
      log.error({ error }, "deploys stream error");
    }
  });
});
