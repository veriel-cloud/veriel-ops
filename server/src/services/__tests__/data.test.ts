import { describe, expect, it } from "vitest";
import { commitShort, formatBytes, formatDuration, timeAgo, workflowRunsToDeploys } from "../data.js";

// ─── Helpers to build mock workflow runs ─────────────────────────────

function mockWorkflowRun(overrides: Record<string, unknown> = {}) {
  return {
    id: 12345,
    name: "Deploy DES",
    status: "completed",
    conclusion: "success",
    head_branch: "develop",
    head_sha: "abc1234567890def",
    created_at: "2026-03-29T10:00:00Z",
    updated_at: "2026-03-29T10:02:30Z",
    html_url: "https://github.com/veriel-cloud/test/actions/runs/12345",
    event: "push",
    ...overrides,
  };
}

// ─── commitShort ─────────────────────────────────────────────────────

describe("commitShort", () => {
  it("returns first 7 chars of a hash", () => {
    expect(commitShort("abc1234567890def")).toBe("abc1234");
  });

  it("returns null for undefined", () => {
    expect(commitShort(undefined)).toBeNull();
  });

  it("returns null for null", () => {
    expect(commitShort(null)).toBeNull();
  });

  it("handles short hashes", () => {
    expect(commitShort("abc")).toBe("abc");
  });
});

// ─── formatBytes ─────────────────────────────────────────────────────

describe("formatBytes", () => {
  it("returns '0 B' for zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats bytes", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(1048576)).toBe("1 MB");
  });

  it("formats gigabytes", () => {
    expect(formatBytes(1073741824)).toBe("1 GB");
  });
});

// ─── formatDuration ──────────────────────────────────────────────────

describe("formatDuration", () => {
  it("returns dash for zero", () => {
    expect(formatDuration(0)).toBe("—");
  });

  it("formats seconds", () => {
    expect(formatDuration(45)).toBe("45s");
  });

  it("formats minutes", () => {
    expect(formatDuration(120)).toBe("2m");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(90)).toBe("1m 30s");
  });
});

// ─── timeAgo ─────────────────────────────────────────────────────────

describe("timeAgo", () => {
  it("shows seconds for recent times", () => {
    const now = new Date(Date.now() - 30_000).toISOString();
    expect(timeAgo(now)).toBe("hace 30s");
  });

  it("shows minutes", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(timeAgo(fiveMinAgo)).toBe("hace 5min");
  });

  it("shows hours and minutes", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600_000 - 15 * 60_000).toISOString();
    expect(timeAgo(twoHoursAgo)).toBe("hace 2h 15min");
  });

  it("shows days for older times", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400_000).toISOString();
    expect(timeAgo(threeDaysAgo)).toMatch(/hace 3d/);
  });

  it("shows date for times older than a week", () => {
    const result = timeAgo("2025-01-15T10:00:00Z");
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2025/);
  });
});

// ─── workflowRunsToDeploys ──────────────────────────────────────────

describe("workflowRunsToDeploys", () => {
  it("maps a successful DES workflow run to DeployEntry", () => {
    const runs = [mockWorkflowRun()];
    const result = workflowRunsToDeploys(runs, "my-project");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "12345",
      project: "my-project",
      environment: "des",
      version: "abc1234",
      commitSha: "abc1234",
      branch: "develop",
      timestamp: "2026-03-29T10:00:00Z",
      coverage: 0,
      duration: 150,
      action: "deploy",
      triggeredBy: "push",
      status: "success",
      htmlUrl: "https://github.com/veriel-cloud/test/actions/runs/12345",
    });
  });

  it("maps PRE workflow run", () => {
    const runs = [mockWorkflowRun({ name: "Deploy PRE", head_branch: "release/1.0.0" })];
    const result = workflowRunsToDeploys(runs, "my-project");
    expect(result[0].environment).toBe("pre");
  });

  it("maps PRO workflow run", () => {
    const runs = [mockWorkflowRun({ name: "Deploy PRO", head_branch: "main" })];
    const result = workflowRunsToDeploys(runs, "my-project");
    expect(result[0].environment).toBe("pro");
  });

  it("filters out non-deploy workflows (CI, rollback)", () => {
    const runs = [
      mockWorkflowRun({ name: "CI" }),
      mockWorkflowRun({ name: "Rollback" }),
      mockWorkflowRun({ name: "Deploy DES" }),
    ];
    const result = workflowRunsToDeploys(runs, "my-project");
    expect(result).toHaveLength(1);
    expect(result[0].environment).toBe("des");
  });

  it("maps in_progress status", () => {
    const runs = [mockWorkflowRun({ status: "in_progress", conclusion: null, updated_at: null })];
    const result = workflowRunsToDeploys(runs, "my-project");
    expect(result[0].status).toBe("in_progress");
    expect(result[0].duration).toBe(0);
  });

  it("maps failed status", () => {
    const runs = [mockWorkflowRun({ status: "completed", conclusion: "failure" })];
    const result = workflowRunsToDeploys(runs, "my-project");
    expect(result[0].status).toBe("failed");
  });

  it("maps queued status as in_progress", () => {
    const runs = [mockWorkflowRun({ status: "queued", conclusion: null })];
    const result = workflowRunsToDeploys(runs, "my-project");
    expect(result[0].status).toBe("in_progress");
  });

  it("calculates duration for completed runs", () => {
    const runs = [
      mockWorkflowRun({
        created_at: "2026-03-29T10:00:00Z",
        updated_at: "2026-03-29T10:05:00Z",
      }),
    ];
    const result = workflowRunsToDeploys(runs, "my-project");
    expect(result[0].duration).toBe(300);
  });

  it("returns 0 duration for in-progress runs", () => {
    const runs = [mockWorkflowRun({ status: "in_progress", conclusion: null })];
    const result = workflowRunsToDeploys(runs, "my-project");
    expect(result[0].duration).toBe(0);
  });

  it("maps workflow_dispatch trigger", () => {
    const runs = [mockWorkflowRun({ event: "workflow_dispatch" })];
    const result = workflowRunsToDeploys(runs, "my-project");
    expect(result[0].triggeredBy).toBe("workflow_dispatch");
  });

  it("handles empty runs array", () => {
    expect(workflowRunsToDeploys([], "my-project")).toEqual([]);
  });
});
