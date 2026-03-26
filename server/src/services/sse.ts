import { GH_ACTIONS_POLL_INTERVAL_MS, GH_ACTIONS_POLL_TIMEOUT_MS } from "../constants.js";
import type { PipelineJob } from "../types.js";
import type { GitHubService } from "./github.js";

type SSEWriter = { writeSSE: (msg: { data: string; event: string }) => Promise<void> };

function emit(stream: SSEWriter, event: string, data: Record<string, unknown>) {
  return stream.writeSSE({ event, data: JSON.stringify(data) });
}

/**
 * Executes a pipeline of jobs/steps via SSE, emitting events for each state change.
 * Returns the timestamp when the "create-branches" step started (for workflow polling).
 */
export async function executeSetupPipeline(
  stream: SSEWriter,
  jobs: PipelineJob[],
  globalStart: number,
): Promise<{ branchCreatedAt: Date | null; failed: boolean }> {
  let branchCreatedAt: Date | null = null;

  for (const job of jobs) {
    await emit(stream, "job", { jobId: job.id, status: "running" });

    const jobStart = Date.now();
    let jobFailed = false;

    for (let si = 0; si < job.steps.length; si++) {
      const step = job.steps[si];
      await emit(stream, "step", { jobId: job.id, stepId: step.id, status: "running" });

      const stepStart = Date.now();

      try {
        if (step.id === "create-branches") branchCreatedAt = new Date();

        const result = await step.fn();
        await emit(stream, "step", {
          jobId: job.id,
          stepId: step.id,
          status: "success",
          detail: result.detail,
          logs: result.logs,
          duration: Date.now() - stepStart,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        await emit(stream, "step", {
          jobId: job.id,
          stepId: step.id,
          status: "error",
          detail: message,
          logs: [`Error: ${message}`],
          duration: Date.now() - stepStart,
        });

        // Skip remaining steps
        for (let rs = si + 1; rs < job.steps.length; rs++) {
          await emit(stream, "step", { jobId: job.id, stepId: job.steps[rs].id, status: "skipped" });
        }
        jobFailed = true;
        break;
      }
    }

    await emit(stream, "job", {
      jobId: job.id,
      status: jobFailed ? "error" : "success",
      duration: Date.now() - jobStart,
    });

    if (jobFailed) {
      await emit(stream, "error", {
        error: "Pipeline failed",
        failedJob: job.id,
        totalDuration: Date.now() - globalStart,
      });
      return { branchCreatedAt, failed: true };
    }
  }

  return { branchCreatedAt, failed: false };
}

/**
 * Polls a GitHub Actions workflow run and emits SSE events with real job/step progress.
 */
export async function pollWorkflowRun(
  stream: SSEWriter,
  gh: GitHubService,
  repo: string,
  branchCreatedAt: Date | null,
  globalStart: number,
) {
  const deployJobId = "deploy-des";

  await emit(stream, "job", { jobId: deployJobId, status: "running" });
  await emit(stream, "step", {
    jobId: deployJobId,
    stepId: "waiting-run",
    status: "running",
    detail: "Polling GitHub Actions...",
  });

  const searchFrom = branchCreatedAt ?? new Date(globalStart);
  const runId = await gh.waitForWorkflowRun(repo, "develop", searchFrom);

  if (!runId) {
    await emitDeployError(stream, "Timeout waiting for GitHub Actions workflow run", globalStart);
    return null;
  }

  await emit(stream, "step", {
    jobId: deployJobId,
    stepId: "waiting-run",
    status: "success",
    detail: `Run #${runId}`,
    duration: Date.now() - (branchCreatedAt?.getTime() ?? globalStart),
  });

  // Poll until the run completes
  const runStart = Date.now();
  const sentJobs = new Map<number, string>();
  const ghJobIdMap = new Map<number, string>();
  let lastRunStatus = "";

  while (Date.now() - runStart < GH_ACTIONS_POLL_TIMEOUT_MS) {
    const [run, jobs] = await Promise.all([gh.getWorkflowRun(repo, runId), gh.getWorkflowRunJobs(repo, runId)]);

    for (const ghJob of jobs) {
      // Register new jobs dynamically
      if (!ghJobIdMap.has(ghJob.id)) {
        const stepId = `gh-job-${ghJob.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        ghJobIdMap.set(ghJob.id, stepId);
        await emit(stream, "step", { jobId: deployJobId, stepId, status: "pending", label: ghJob.name });
      }

      const stepId = ghJobIdMap.get(ghJob.id)!;
      const status =
        ghJob.status === "completed"
          ? ghJob.conclusion === "success"
            ? "success"
            : "error"
          : ghJob.status === "in_progress"
            ? "running"
            : "pending";

      if (sentJobs.get(ghJob.id) !== status) {
        sentJobs.set(ghJob.id, status);

        const duration =
          ghJob.completed_at && ghJob.started_at
            ? new Date(ghJob.completed_at).getTime() - new Date(ghJob.started_at).getTime()
            : undefined;

        const detail =
          ghJob.conclusion === "success" && ghJob.steps
            ? `${ghJob.steps.length} steps completed`
            : ghJob.conclusion === "failure" && ghJob.steps
              ? `Failed at: ${ghJob.steps.find((s) => s.conclusion === "failure")?.name ?? "unknown"}`
              : undefined;

        const logs = ghJob.steps?.map((s) => {
          const icon =
            s.conclusion === "success"
              ? "✓"
              : s.conclusion === "failure"
                ? "✗"
                : s.status === "in_progress"
                  ? "●"
                  : "○";
          const dur =
            s.completed_at && s.started_at
              ? (() => {
                  const ms = new Date(s.completed_at).getTime() - new Date(s.started_at).getTime();
                  return ms < 1000 ? ` (${ms}ms)` : ` (${(ms / 1000).toFixed(1)}s)`;
                })()
              : "";
          return `${icon} ${s.name}${dur}`;
        });

        await emit(stream, "step", { jobId: deployJobId, stepId, status, detail, duration, logs });
      }
    }

    if (run.status === "completed") {
      lastRunStatus = run.conclusion ?? "unknown";
      break;
    }

    await new Promise((r) => setTimeout(r, GH_ACTIONS_POLL_INTERVAL_MS));
  }

  // Final run status
  const finalRun = await gh.getWorkflowRun(repo, runId);
  const ghRunDuration =
    finalRun.updated_at && finalRun.run_started_at
      ? new Date(finalRun.updated_at).getTime() - new Date(finalRun.run_started_at).getTime()
      : undefined;

  const success = lastRunStatus === "success";
  await emit(stream, "job", { jobId: deployJobId, status: success ? "success" : "error", duration: ghRunDuration });

  if (!success) {
    await emit(stream, "error", {
      error: `GitHub Actions workflow ${lastRunStatus || "timed out"}`,
      failedJob: deployJobId,
      totalDuration: Date.now() - globalStart,
    });
    return null;
  }

  return { runId, commit: finalRun.head_sha?.substring(0, 7) ?? "", htmlUrl: finalRun.html_url };
}

async function emitDeployError(stream: SSEWriter, message: string, globalStart: number) {
  await emit(stream, "step", {
    jobId: "deploy-des",
    stepId: "waiting-run",
    status: "error",
    detail: message,
    logs: [`Error: ${message}`],
  });
  await emit(stream, "job", { jobId: "deploy-des", status: "error" });
  await emit(stream, "error", { error: message, failedJob: "deploy-des", totalDuration: Date.now() - globalStart });
}
