import type { APIRoute } from "astro";
import { github, cloudflare } from "@/lib/services/index.js";

export const GET: APIRoute = async ({ params }) => {
  const { name } = params;

  if (!name) {
    return new Response(JSON.stringify({ error: "Project name required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const [repo, branches, pages, deployments, workflowRuns] =
      await Promise.all([
        github.getRepo(name),
        github.getRepoBranches(name),
        cloudflare.getPagesProject(name).catch(() => null),
        cloudflare.getDeployments(name).catch(() => []),
        github.getWorkflowRuns(name),
      ]);

    return new Response(
      JSON.stringify({
        project: {
          name: repo.name,
          repo: repo.full_name,
          description: repo.description,
          defaultBranch: repo.default_branch,
          createdAt: repo.created_at,
          updatedAt: repo.updated_at,
          branches: branches.map((b) => b.name),
          pages,
          deployments,
          workflowRuns,
        },
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
