import type { APIRoute } from "astro";
import { github } from "@/lib/services/index.js";

export const GET: APIRoute = async ({ params }) => {
  const { repo, runId } = params;

  if (!repo || !runId) {
    return new Response(
      JSON.stringify({ error: "Repo and runId required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const [run, jobs] = await Promise.all([
      github.getWorkflowRun(repo, parseInt(runId, 10)),
      github.getWorkflowRunJobs(repo, parseInt(runId, 10)),
    ]);

    return new Response(
      JSON.stringify({
        run: {
          id: run.id,
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
          createdAt: run.created_at,
          updatedAt: run.updated_at,
          headBranch: run.head_branch,
          headSha: run.head_sha,
          event: run.event,
          url: run.html_url,
        },
        jobs: jobs.map((job) => ({
          id: job.id,
          name: job.name,
          status: job.status,
          conclusion: job.conclusion,
          startedAt: job.started_at,
          completedAt: job.completed_at,
          steps: job.steps?.map((step) => ({
            name: step.name,
            status: step.status,
            conclusion: step.conclusion,
            number: step.number,
            startedAt: step.started_at,
            completedAt: step.completed_at,
          })),
        })),
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
