import { Octokit } from "octokit";
import {
  DEFAULT_COVERAGE_THRESHOLD,
  PER_PAGE_REPOS,
  PER_PAGE_RUNS,
  PROJECT_TYPE_CONFIG,
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
    const typeKey = (options.type ?? "static") as keyof typeof PROJECT_TYPE_CONFIG;
    const templateRepo = PROJECT_TYPE_CONFIG[typeKey]?.template ?? "template-astro";
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

  async function addWorkflowCallers(repo: string, projectName: string, deployTarget?: string) {
    for (const caller of buildWorkflowCallerFiles(org, projectName, deployTarget ?? "cf-pages")) {
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

  async function deleteRepo(name: string) {
    logger?.info({ repo: name }, "deleting repository");
    await octokit.rest.repos.delete({ owner: org, repo: name });
  }

  async function getTree(repo: string, branch = "main") {
    const { data: ref } = await octokit.rest.git.getRef({ owner: org, repo, ref: `heads/${branch}` });
    const { data: tree } = await octokit.rest.git.getTree({
      owner: org,
      repo,
      tree_sha: ref.object.sha,
      recursive: "true",
    });
    return tree.tree
      .filter((item) => item.type === "blob")
      .map((item) => ({ path: item.path!, sha: item.sha!, size: item.size ?? 0 }));
  }

  async function getFileContent(repo: string, path: string, branch = "main") {
    const { data } = await octokit.rest.repos.getContent({ owner: org, repo, path, ref: branch });
    if ("content" in data) {
      return { content: atob(data.content), sha: data.sha, encoding: data.encoding };
    }
    throw new Error("Not a file");
  }

  async function createMultiFileCommit(
    repo: string,
    branch: string,
    message: string,
    files: { path: string; content: string }[],
  ) {
    logger?.info({ repo, branch, fileCount: files.length }, "creating multi-file commit");

    const { data: ref } = await octokit.rest.git.getRef({ owner: org, repo, ref: `heads/${branch}` });
    const parentSha = ref.object.sha;

    const blobs = await Promise.all(
      files.map((f) => octokit.rest.git.createBlob({ owner: org, repo, content: f.content, encoding: "utf-8" })),
    );

    const { data: tree } = await octokit.rest.git.createTree({
      owner: org,
      repo,
      base_tree: parentSha,
      tree: files.map((f, i) => ({
        path: f.path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blobs[i].data.sha,
      })),
    });

    const { data: commit } = await octokit.rest.git.createCommit({
      owner: org,
      repo,
      message,
      tree: tree.sha,
      parents: [parentSha],
    });

    await octokit.rest.git.updateRef({ owner: org, repo, ref: `heads/${branch}`, sha: commit.sha });
    return { sha: commit.sha, message: commit.message };
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
    getTree,
    getFileContent,
    createMultiFileCommit,
    archiveRepo,
    deleteRepo,
    createWebhook,
  };
}

// ─── Workflow caller YAML templates ───────────────────────────────────

function buildWorkflowCallerFiles(org: string, projectName: string, deployTarget: string) {
  const uses = (workflow: string) => `${org}/.github/.github/workflows/${workflow}@main`;

  // Workflow prefix per deploy target: deploy-des, deploy-worker-des, deploy-container-des
  const prefix: Record<string, string> = {
    "cf-pages": "deploy",
    "cf-workers": "deploy-worker",
    container: "deploy-container",
  };
  const dp = prefix[deployTarget] ?? "deploy";

  const ciCaller = {
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
  };

  const desCaller = {
    path: ".github/workflows/deploy-des.yml",
    content: `${[
      "name: Deploy DES",
      "on:",
      "  workflow_dispatch:",
      "  push:",
      "    branches: [develop]",
      "jobs:",
      "  deploy:",
      `    uses: ${uses(`${dp}-des.yml`)}`,
      "    with:",
      `      project_name: "${projectName}"`,
      "    secrets: inherit",
    ].join("\n")}\n`,
  };

  const preCaller = {
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
      `    uses: ${uses(`${dp}-pre.yml`)}`,
      "    with:",
      `      project_name: "${projectName}"`,
      `      coverage_threshold: ${DEFAULT_COVERAGE_THRESHOLD}`,
      "    secrets: inherit",
    ].join("\n")}\n`,
  };

  const proCaller = {
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
      `    uses: ${uses(`${dp}-pro.yml`)}`,
      "    with:",
      `      project_name: "${projectName}"`,
      `      coverage_threshold: ${DEFAULT_COVERAGE_THRESHOLD}`,
      "    secrets: inherit",
    ].join("\n")}\n`,
  };

  const rollbackCaller = {
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
  };

  return [ciCaller, desCaller, preCaller, proCaller, rollbackCaller];
}

export type GitHubService = ReturnType<typeof createGitHubService>;
