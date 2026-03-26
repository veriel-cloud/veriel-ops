import { Octokit } from "octokit";

export interface GitHubConfig {
  token: string;
  org: string;
}

export function createGitHubService(config: GitHubConfig) {
  const octokit = new Octokit({ auth: config.token });
  const { org } = config;

  // ─── Read operations ──────────────────────────────────────────

  async function listOrgRepos() {
    const { data } = await octokit.rest.repos.listForOrg({ org, sort: "updated", per_page: 50 });
    return data;
  }

  async function getRepo(name: string) {
    const { data } = await octokit.rest.repos.get({ owner: org, repo: name });
    return data;
  }

  async function getRepoBranches(name: string) {
    const { data } = await octokit.rest.repos.listBranches({ owner: org, repo: name, per_page: 50 });
    return data;
  }

  async function getWorkflowRuns(repo: string, perPage = 20) {
    const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({ owner: org, repo, per_page: perPage });
    return data.workflow_runs;
  }

  async function getWorkflowRunsByBranch(repo: string, branch: string, perPage = 5) {
    const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({ owner: org, repo, branch, per_page: perPage });
    return data.workflow_runs;
  }

  async function waitForWorkflowRun(
    repo: string,
    branch: string,
    createdAfter: Date,
    timeoutMs = 120_000,
    pollMs = 3_000,
  ): Promise<number | null> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const runs = await getWorkflowRunsByBranch(repo, branch, 5);
      const run = runs.find((r) => new Date(r.created_at) >= createdAfter);
      if (run) return run.id;
      await new Promise((r) => setTimeout(r, pollMs));
    }

    return null;
  }

  async function getWorkflowRun(repo: string, runId: number) {
    const { data } = await octokit.rest.actions.getWorkflowRun({ owner: org, repo, run_id: runId });
    return data;
  }

  async function getWorkflowRunJobs(repo: string, runId: number) {
    const { data } = await octokit.rest.actions.listJobsForWorkflowRun({ owner: org, repo, run_id: runId });
    return data.jobs;
  }

  async function getWorkflowRunLogs(repo: string, runId: number) {
    const { data } = await octokit.rest.actions.downloadWorkflowRunLogs({ owner: org, repo, run_id: runId });
    return data;
  }

  // ─── Write operations ─────────────────────────────────────────

  const TEMPLATES: Record<string, string> = {
    "astro-static": "template-astro",
    "astro-ssr": "template-astro",
    "react-spa": "template-react",
    "backend-worker": "template-astro",
  };

  async function createRepo(
    name: string,
    options: { description?: string; isPrivate?: boolean; type?: string } = {},
  ) {
    const templateRepo = TEMPLATES[options.type ?? "astro-static"] ?? "template-astro";

    const { data } = await octokit.rest.repos.createUsingTemplate({
      template_owner: org,
      template_repo: templateRepo,
      owner: org,
      name,
      description: options.description ?? `Project ${name} managed by veriel-ops`,
      private: options.isPrivate ?? true,
      include_all_branches: false,
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));
    return data;
  }

  async function createBranch(repo: string, branch: string, fromBranch = "main") {
    const { data: ref } = await octokit.rest.git.getRef({ owner: org, repo, ref: `heads/${fromBranch}` });
    const { data } = await octokit.rest.git.createRef({ owner: org, repo, ref: `refs/heads/${branch}`, sha: ref.object.sha });
    return data;
  }

  async function addFileToRepo(repo: string, path: string, content: string, message: string, branch = "main") {
    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
      owner: org,
      repo,
      path,
      message,
      content: btoa(content),
      branch,
    });
    return data;
  }

  async function addWorkflowCallers(repo: string, projectName: string) {
    const callers = getWorkflowCallerFiles(projectName);
    for (const caller of callers) {
      await addFileToRepo(repo, caller.path, caller.content, `ci: add ${caller.path}`);
    }
  }

  async function dispatchWorkflow(repo: string, workflowId: string, inputs: Record<string, string>) {
    await octokit.rest.actions.createWorkflowDispatch({ owner: org, repo, workflow_id: workflowId, ref: "main", inputs });
  }

  async function createWebhook(repo: string, webhookUrl: string, secret: string) {
    const { data } = await octokit.rest.repos.createWebhook({
      owner: org,
      repo,
      config: { url: `${webhookUrl}/api/webhooks/github`, content_type: "json", secret },
      events: ["push", "workflow_run", "pull_request", "create"],
      active: true,
    });
    return data;
  }

  async function setDefaultBranch(repo: string, branch: string) {
    await octokit.rest.repos.update({ owner: org, repo, default_branch: branch });
  }

  // ─── Workflow caller templates ────────────────────────────────

  function getWorkflowCallerFiles(projectName: string) {
    return [
      {
        path: ".github/workflows/ci.yml",
        content: `name: CI\n\non:\n  pull_request:\n    branches: [develop, main, "release/**"]\n\njobs:\n  ci:\n    uses: ${org}/.github/.github/workflows/ci.yml@main\n    with:\n      coverage_threshold: 80\n`,
      },
      {
        path: ".github/workflows/deploy-des.yml",
        content: `name: Deploy DES\n\non:\n  push:\n    branches: [develop]\n\njobs:\n  deploy:\n    uses: ${org}/.github/.github/workflows/deploy-des.yml@main\n    with:\n      project_name: "${projectName}"\n    secrets: inherit\n`,
      },
      {
        path: ".github/workflows/deploy-pre.yml",
        content: `name: Deploy PRE\n\non:\n  push:\n    branches: ["release/**"]\n\npermissions:\n  contents: write\n  pull-requests: write\n\njobs:\n  deploy:\n    uses: ${org}/.github/.github/workflows/deploy-pre.yml@main\n    with:\n      project_name: "${projectName}"\n      coverage_threshold: 80\n    secrets: inherit\n`,
      },
      {
        path: ".github/workflows/deploy-pro.yml",
        content: `name: Deploy PRO\n\non:\n  push:\n    branches: [main]\n    paths-ignore:\n      - ".github/**"\n      - "*.md"\n      - "package.json"\n\npermissions:\n  contents: write\n  pull-requests: write\n\njobs:\n  deploy:\n    uses: ${org}/.github/.github/workflows/deploy-pro.yml@main\n    with:\n      project_name: "${projectName}"\n      coverage_threshold: 80\n    secrets: inherit\n`,
      },
      {
        path: ".github/workflows/rollback.yml",
        content: `name: Rollback\n\non:\n  workflow_dispatch:\n    inputs:\n      environment:\n        description: "Target environment"\n        required: true\n        type: choice\n        options:\n          - des\n          - pre\n          - pro\n      build_artifact:\n        description: "Build artifact name (e.g., v1.2.0_abc1234)"\n        required: true\n        type: string\n\njobs:\n  rollback:\n    uses: ${org}/.github/.github/workflows/rollback.yml@main\n    with:\n      project_name: "${projectName}"\n      environment: \${{ inputs.environment }}\n      build_artifact: \${{ inputs.build_artifact }}\n    secrets: inherit\n`,
      },
    ];
  }

  return {
    listOrgRepos,
    getRepo,
    getRepoBranches,
    getWorkflowRuns,
    getWorkflowRunsByBranch,
    waitForWorkflowRun,
    getWorkflowRun,
    getWorkflowRunJobs,
    getWorkflowRunLogs,
    createRepo,
    createBranch,
    addFileToRepo,
    addWorkflowCallers,
    dispatchWorkflow,
    createWebhook,
    setDefaultBranch,
  };
}

export type GitHubService = ReturnType<typeof createGitHubService>;
