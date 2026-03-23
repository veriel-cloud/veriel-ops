import { Octokit } from "octokit";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const org = process.env.GITHUB_ORG || "veriel-cloud";

// ─── Read operations ────────────────────────────────────────────────

export async function listOrgRepos() {
  const { data } = await octokit.rest.repos.listForOrg({
    org,
    sort: "updated",
    per_page: 50,
  });
  return data;
}

export async function getRepo(name: string) {
  const { data } = await octokit.rest.repos.get({
    owner: org,
    repo: name,
  });
  return data;
}

export async function getRepoBranches(name: string) {
  const { data } = await octokit.rest.repos.listBranches({
    owner: org,
    repo: name,
    per_page: 50,
  });
  return data;
}

export async function getWorkflowRuns(repo: string, perPage = 20) {
  const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
    owner: org,
    repo,
    per_page: perPage,
  });
  return data.workflow_runs;
}

export async function getWorkflowRun(repo: string, runId: number) {
  const { data } = await octokit.rest.actions.getWorkflowRun({
    owner: org,
    repo,
    run_id: runId,
  });
  return data;
}

export async function getWorkflowRunJobs(repo: string, runId: number) {
  const { data } = await octokit.rest.actions.listJobsForWorkflowRun({
    owner: org,
    repo,
    run_id: runId,
  });
  return data.jobs;
}

export async function getWorkflowRunLogs(repo: string, runId: number) {
  const { data } = await octokit.rest.actions.downloadWorkflowRunLogs({
    owner: org,
    repo,
    run_id: runId,
  });
  return data;
}

// ─── Write operations ───────────────────────────────────────────────

export async function createRepo(
  name: string,
  options: {
    description?: string;
    isPrivate?: boolean;
  } = {},
) {
  const { data } = await octokit.rest.repos.createInOrg({
    org,
    name,
    description: options.description ?? `Project ${name} managed by veriel-ops`,
    private: options.isPrivate ?? true,
    auto_init: true,
  });
  return data;
}

export async function createBranch(
  repo: string,
  branch: string,
  fromBranch = "main",
) {
  const { data: ref } = await octokit.rest.git.getRef({
    owner: org,
    repo,
    ref: `heads/${fromBranch}`,
  });

  const { data } = await octokit.rest.git.createRef({
    owner: org,
    repo,
    ref: `refs/heads/${branch}`,
    sha: ref.object.sha,
  });
  return data;
}

export async function addFileToRepo(
  repo: string,
  path: string,
  content: string,
  message: string,
  branch = "main",
) {
  const { data } = await octokit.rest.repos.createOrUpdateFileContents({
    owner: org,
    repo,
    path,
    message,
    content: Buffer.from(content).toString("base64"),
    branch,
  });
  return data;
}

export async function addInitialPackageJson(
  repo: string,
  projectName: string,
) {
  const content = JSON.stringify(
    {
      name: projectName,
      type: "module",
      version: "0.0.1",
      packageManager: "pnpm@10.6.2",
      engines: { node: ">=22.12.0" },
      scripts: {
        dev: "echo 'Add your dev script'",
        build: "echo 'Add your build script'",
        lint: "echo 'Add your lint script'",
        test: "echo 'Add your test script'",
      },
    },
    null,
    2,
  );

  await addFileToRepo(repo, "package.json", content, "chore: add initial package.json with pnpm version");
}

export async function addWorkflowCallers(
  repo: string,
  projectName: string,
) {
  const callers = getWorkflowCallerFiles(projectName);

  for (const caller of callers) {
    await addFileToRepo(
      repo,
      caller.path,
      caller.content,
      `ci: add ${caller.path}`,
    );
  }
}

export async function dispatchWorkflow(
  repo: string,
  workflowId: string,
  inputs: Record<string, string>,
) {
  await octokit.rest.actions.createWorkflowDispatch({
    owner: org,
    repo,
    workflow_id: workflowId,
    ref: "main",
    inputs,
  });
}

export async function createWebhook(
  repo: string,
  webhookUrl: string,
  secret: string,
) {
  const { data } = await octokit.rest.repos.createWebhook({
    owner: org,
    repo,
    config: {
      url: `${webhookUrl}/api/webhooks/github`,
      content_type: "json",
      secret,
    },
    events: ["push", "workflow_run", "pull_request", "create"],
    active: true,
  });
  return data;
}

export async function setDefaultBranch(repo: string, branch: string) {
  await octokit.rest.repos.update({
    owner: org,
    repo,
    default_branch: branch,
  });
}

// ─── Workflow caller templates ──────────────────────────────────────

function getWorkflowCallerFiles(projectName: string) {
  return [
    {
      path: ".github/workflows/ci.yml",
      content: `name: CI

on:
  pull_request:
    branches: [develop, main, "release/**"]

jobs:
  ci:
    uses: ${org}/.github/.github/workflows/ci.yml@main
    with:
      coverage_threshold: 80
`,
    },
    {
      path: ".github/workflows/deploy-des.yml",
      content: `name: Deploy DES

on:
  push:
    branches: [develop]

jobs:
  deploy:
    uses: ${org}/.github/.github/workflows/deploy-des.yml@main
    with:
      project_name: "${projectName}"
    secrets: inherit
`,
    },
    {
      path: ".github/workflows/deploy-pre.yml",
      content: `name: Deploy PRE

on:
  push:
    branches: ["release/**"]

permissions:
  contents: write
  pull-requests: write

jobs:
  deploy:
    uses: ${org}/.github/.github/workflows/deploy-pre.yml@main
    with:
      project_name: "${projectName}"
      coverage_threshold: 80
    secrets: inherit
`,
    },
    {
      path: ".github/workflows/deploy-pro.yml",
      content: `name: Deploy PRO

on:
  push:
    branches: [main]
    paths-ignore:
      - ".github/**"
      - "*.md"
      - "package.json"

permissions:
  contents: write
  pull-requests: write

jobs:
  deploy:
    uses: ${org}/.github/.github/workflows/deploy-pro.yml@main
    with:
      project_name: "${projectName}"
      coverage_threshold: 80
    secrets: inherit
`,
    },
    {
      path: ".github/workflows/rollback.yml",
      content: `name: Rollback

on:
  workflow_dispatch:
    inputs:
      environment:
        description: "Target environment"
        required: true
        type: choice
        options:
          - des
          - pre
          - pro
      build_artifact:
        description: "Build artifact name (e.g., v1.2.0_abc1234)"
        required: true
        type: string

jobs:
  rollback:
    uses: ${org}/.github/.github/workflows/rollback.yml@main
    with:
      project_name: "${projectName}"
      environment: \${{ inputs.environment }}
      build_artifact: \${{ inputs.build_artifact }}
    secrets: inherit
`,
    },
  ];
}
