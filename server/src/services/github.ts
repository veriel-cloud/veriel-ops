import { Octokit } from "octokit";
import {
  DEFAULT_COVERAGE_THRESHOLD,
  PER_PAGE_REPOS,
  PER_PAGE_RUNS,
  PROJECT_TEMPLATES,
  REPO_CREATION_DELAY_MS,
  WEBHOOK_GITHUB_EVENTS,
  WORKFLOW_POLL_INTERVAL_MS,
  WORKFLOW_POLL_TIMEOUT_MS,
} from "../constants.js";
import type { Logger } from "../lib/logger.js";
import type { GitHubConfig } from "../types.js";

export function createGitHubService(config: GitHubConfig, logger?: Logger) {
  const octokit = new Octokit({ auth: config.token });
  const { org } = config;

  // ─── Repos ────────────────────────────────────────────────────

  const listOrgRepos = () =>
    octokit.rest.repos.listForOrg({ org, sort: "updated", per_page: PER_PAGE_REPOS }).then((r) => r.data);

  const getRepo = (name: string) => octokit.rest.repos.get({ owner: org, repo: name }).then((r) => r.data);

  const getRepoBranches = (name: string) =>
    octokit.rest.repos.listBranches({ owner: org, repo: name, per_page: PER_PAGE_REPOS }).then((r) => r.data);

  // ─── Workflow runs ────────────────────────────────────────────

  const getWorkflowRuns = (repo: string, perPage = PER_PAGE_RUNS) =>
    octokit.rest.actions
      .listWorkflowRunsForRepo({ owner: org, repo, per_page: perPage })
      .then((r) => r.data.workflow_runs);

  const getWorkflowRunsByBranch = (repo: string, branch: string, perPage = 5) =>
    octokit.rest.actions
      .listWorkflowRunsForRepo({ owner: org, repo, branch, per_page: perPage })
      .then((r) => r.data.workflow_runs);

  const getWorkflowRun = (repo: string, runId: number) =>
    octokit.rest.actions.getWorkflowRun({ owner: org, repo, run_id: runId }).then((r) => r.data);

  const getWorkflowRunJobs = (repo: string, runId: number) =>
    octokit.rest.actions.listJobsForWorkflowRun({ owner: org, repo, run_id: runId }).then((r) => r.data.jobs);

  async function waitForWorkflowRun(repo: string, branch: string, createdAfter: Date): Promise<number | null> {
    const deadline = Date.now() + WORKFLOW_POLL_TIMEOUT_MS;
    logger?.debug({ repo, branch }, "polling for workflow run");

    while (Date.now() < deadline) {
      const runs = await getWorkflowRunsByBranch(repo, branch, 5);
      const run = runs.find((r) => new Date(r.created_at) >= createdAfter);
      if (run) {
        logger?.info({ repo, branch, runId: run.id }, "workflow run found");
        return run.id;
      }
      await new Promise((r) => setTimeout(r, WORKFLOW_POLL_INTERVAL_MS));
    }

    logger?.warn({ repo, branch }, "workflow run poll timed out");
    return null;
  }

  // ─── Repo setup ───────────────────────────────────────────────

  async function createRepo(name: string, options: { description?: string; isPrivate?: boolean; type?: string } = {}) {
    const templateRepo = PROJECT_TEMPLATES[options.type ?? "astro-static"] ?? "template-astro";
    logger?.info({ name, templateRepo }, "creating repository from template");

    const { data } = await octokit.rest.repos.createUsingTemplate({
      template_owner: org,
      template_repo: templateRepo,
      owner: org,
      name,
      description: options.description ?? `Project ${name} managed by veriel-ops`,
      private: options.isPrivate ?? true,
      include_all_branches: false,
    });

    await new Promise((resolve) => setTimeout(resolve, REPO_CREATION_DELAY_MS));
    return data;
  }

  async function createBranch(repo: string, branch: string, fromBranch = "main") {
    logger?.info({ repo, branch, fromBranch }, "creating branch");
    const { data: ref } = await octokit.rest.git.getRef({ owner: org, repo, ref: `heads/${fromBranch}` });
    await octokit.rest.git.createRef({ owner: org, repo, ref: `refs/heads/${branch}`, sha: ref.object.sha });
  }

  async function addFileToRepo(repo: string, path: string, content: string, message: string, branch = "main") {
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: org,
      repo,
      path,
      message,
      branch,
      content: btoa(content),
    });
  }

  async function addWorkflowCallers(repo: string, projectName: string) {
    for (const caller of buildWorkflowCallerFiles(org, projectName)) {
      await addFileToRepo(repo, caller.path, caller.content, `ci: add ${caller.path}`);
    }
  }

  const dispatchWorkflow = (repo: string, workflowId: string, inputs: Record<string, string>, ref = "main") =>
    octokit.rest.actions.createWorkflowDispatch({ owner: org, repo, workflow_id: workflowId, ref, inputs });

  const listPullRequests = (repo: string, state: "open" | "closed" | "all" = "open") =>
    octokit.rest.pulls.list({ owner: org, repo, state, per_page: PER_PAGE_RUNS }).then((r) => r.data);

  async function archiveRepo(name: string) {
    logger?.info({ repo: name }, "archiving repository");
    await octokit.rest.repos.update({ owner: org, repo: name, archived: true });
  }

  async function createWebhook(repo: string, webhookUrl: string, secret: string) {
    logger?.info({ repo }, "creating webhook");
    await octokit.rest.repos.createWebhook({
      owner: org,
      repo,
      active: true,
      config: { url: `${webhookUrl}/api/webhooks/github`, content_type: "json", secret },
      events: WEBHOOK_GITHUB_EVENTS,
    });
  }

  return {
    listOrgRepos,
    getRepo,
    getRepoBranches,
    getWorkflowRuns,
    getWorkflowRunsByBranch,
    getWorkflowRun,
    getWorkflowRunJobs,
    waitForWorkflowRun,
    createRepo,
    createBranch,
    addFileToRepo,
    addWorkflowCallers,
    dispatchWorkflow,
    listPullRequests,
    archiveRepo,
    createWebhook,
  };
}

// ─── Workflow caller YAML templates ───────────────────────────────────

function buildWorkflowCallerFiles(org: string, projectName: string) {
  const uses = (workflow: string) => `${org}/.github/.github/workflows/${workflow}@main`;

  return [
    {
      path: ".github/workflows/ci.yml",
      content: `${[
        "name: CI",
        "on:",
        "  pull_request:",
        '    branches: [develop, main, "release/**"]',
        "jobs:",
        "  ci:",
        `    uses: ${uses("ci.yml")}`,
        "    with:",
        `      coverage_threshold: ${DEFAULT_COVERAGE_THRESHOLD}`,
      ].join("\n")}\n`,
    },
    {
      path: ".github/workflows/deploy-des.yml",
      content: `${[
        "name: Deploy DES",
        "on:",
        "  workflow_dispatch:",
        "  push:",
        "    branches: [develop]",
        "jobs:",
        "  deploy:",
        `    uses: ${uses("deploy-des.yml")}`,
        "    with:",
        `      project_name: "${projectName}"`,
        "    secrets: inherit",
      ].join("\n")}\n`,
    },
    {
      path: ".github/workflows/deploy-pre.yml",
      content: `${[
        "name: Deploy PRE",
        "on:",
        "  workflow_dispatch:",
        "  push:",
        '    branches: ["release/**"]',
        "permissions:",
        "  contents: write",
        "  pull-requests: write",
        "jobs:",
        "  deploy:",
        `    uses: ${uses("deploy-pre.yml")}`,
        "    with:",
        `      project_name: "${projectName}"`,
        `      coverage_threshold: ${DEFAULT_COVERAGE_THRESHOLD}`,
        "    secrets: inherit",
      ].join("\n")}\n`,
    },
    {
      path: ".github/workflows/deploy-pro.yml",
      content: `${[
        "name: Deploy PRO",
        "on:",
        "  workflow_dispatch:",
        "  push:",
        "    branches: [main]",
        "    paths-ignore:",
        '      - ".github/**"',
        '      - "*.md"',
        '      - "package.json"',
        "permissions:",
        "  contents: write",
        "  pull-requests: write",
        "jobs:",
        "  deploy:",
        `    uses: ${uses("deploy-pro.yml")}`,
        "    with:",
        `      project_name: "${projectName}"`,
        `      coverage_threshold: ${DEFAULT_COVERAGE_THRESHOLD}`,
        "    secrets: inherit",
      ].join("\n")}\n`,
    },
    {
      path: ".github/workflows/rollback.yml",
      content: `${[
        "name: Rollback",
        "on:",
        "  workflow_dispatch:",
        "    inputs:",
        "      environment:",
        '        description: "Target environment"',
        "        required: true",
        "        type: choice",
        "        options: [des, pre, pro]",
        "      build_artifact:",
        '        description: "Build artifact name (e.g., v1.2.0_abc1234)"',
        "        required: true",
        "        type: string",
        "jobs:",
        "  rollback:",
        `    uses: ${uses("rollback.yml")}`,
        "    with:",
        `      project_name: "${projectName}"`,
        "      environment: ${{ inputs.environment }}",
        "      build_artifact: ${{ inputs.build_artifact }}",
        "    secrets: inherit",
      ].join("\n")}\n`,
    },
  ];
}

export type GitHubService = ReturnType<typeof createGitHubService>;
