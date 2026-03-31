/**
 * In-memory tracker for repos with active (in_progress) workflow runs.
 * Fed by GitHub webhooks, consumed by the deploys SSE stream.
 *
 * This avoids polling ALL repos — only repos with known activity get polled.
 */
export function createDeployTracker() {
  const active = new Set<string>();

  return {
    /** Mark a repo as having an active deploy */
    markActive(repo: string) {
      active.add(repo);
    },

    /** Remove a repo from active set */
    markDone(repo: string) {
      active.delete(repo);
    },

    /** Get all repos with active deploys */
    getActiveRepos(): string[] {
      return Array.from(active);
    },

    /** Check if any repo has active deploys */
    hasActive(): boolean {
      return active.size > 0;
    },
  };
}

export type DeployTracker = ReturnType<typeof createDeployTracker>;
