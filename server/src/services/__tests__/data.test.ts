import { describe, expect, it } from "vitest";
import type { PagesDeployment } from "../../types.js";
import {
  commitShort,
  deduplicateByCommit,
  deployStatus,
  durationSecs,
  formatBytes,
  formatDuration,
  resolveEnv,
  timeAgo,
} from "../data.js";

// ─── Helpers to build mock deployments ───────────────────────────────

function mockDeployment(overrides: Partial<PagesDeployment> = {}): PagesDeployment {
  return {
    id: "deploy-1",
    short_id: "abc1234",
    project_name: "test-project",
    environment: "production",
    url: "https://test.pages.dev",
    created_on: "2026-03-29T10:00:00Z",
    modified_on: "2026-03-29T10:05:00Z",
    latest_stage: {
      name: "deploy",
      status: "success",
      started_on: "2026-03-29T10:00:00Z",
      ended_on: "2026-03-29T10:02:30Z",
    },
    deployment_trigger: {
      type: "push",
      metadata: {
        branch: "main",
        commit_hash: "abc1234567890def",
        commit_message: "fix: something",
      },
    },
    source: { type: "github", config: { owner: "veriel-cloud", repo_name: "test" } },
    ...overrides,
  } as PagesDeployment;
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

// ─── resolveEnv ──────────────────────────────────────────────────────

describe("resolveEnv", () => {
  it("maps develop branch to des", () => {
    expect(
      resolveEnv(
        mockDeployment({
          deployment_trigger: { type: "push", metadata: { branch: "develop", commit_hash: "abc", commit_message: "" } },
        }),
      ),
    ).toBe("des");
  });

  it("maps release branch to pre", () => {
    expect(
      resolveEnv(
        mockDeployment({
          deployment_trigger: {
            type: "push",
            metadata: { branch: "release/1.0", commit_hash: "abc", commit_message: "" },
          },
        }),
      ),
    ).toBe("pre");
  });

  it("maps main branch to pro", () => {
    expect(
      resolveEnv(
        mockDeployment({
          deployment_trigger: { type: "push", metadata: { branch: "main", commit_hash: "abc", commit_message: "" } },
        }),
      ),
    ).toBe("pro");
  });

  it("falls back to production environment", () => {
    const d = mockDeployment({
      environment: "production",
      deployment_trigger: { type: "push", metadata: { branch: "hotfix", commit_hash: "abc", commit_message: "" } },
    });
    expect(resolveEnv(d)).toBe("pro");
  });

  it("falls back to des for unknown branch and non-production", () => {
    const d = mockDeployment({
      environment: "preview",
      deployment_trigger: { type: "push", metadata: { branch: "feature/x", commit_hash: "abc", commit_message: "" } },
    });
    expect(resolveEnv(d)).toBe("des");
  });
});

// ─── deployStatus ────────────────────────────────────────────────────

describe("deployStatus", () => {
  it("returns success for successful deploys", () => {
    expect(deployStatus(mockDeployment())).toBe("success");
  });

  it("returns in_progress for active deploys", () => {
    const d = mockDeployment({ latest_stage: { name: "deploy", status: "active", started_on: "", ended_on: "" } });
    expect(deployStatus(d)).toBe("in_progress");
  });

  it("returns failed for other statuses", () => {
    const d = mockDeployment({ latest_stage: { name: "deploy", status: "failure", started_on: "", ended_on: "" } });
    expect(deployStatus(d)).toBe("failed");
  });
});

// ─── durationSecs ────────────────────────────────────────────────────

describe("durationSecs", () => {
  it("calculates duration from stage times", () => {
    const d = mockDeployment({
      latest_stage: {
        name: "deploy",
        status: "success",
        started_on: "2026-03-29T10:00:00Z",
        ended_on: "2026-03-29T10:02:30Z",
      },
    });
    expect(durationSecs(d)).toBe(150);
  });

  it("returns 0 if ended_on is missing", () => {
    const d = mockDeployment({
      latest_stage: { name: "deploy", status: "active", started_on: "2026-03-29T10:00:00Z", ended_on: "" },
    });
    expect(durationSecs(d)).toBe(0);
  });

  it("returns 0 for negative durations", () => {
    const d = mockDeployment({
      latest_stage: {
        name: "deploy",
        status: "success",
        started_on: "2026-03-29T10:05:00Z",
        ended_on: "2026-03-29T10:00:00Z",
      },
    });
    expect(durationSecs(d)).toBe(0);
  });
});

// ─── deduplicateByCommit ─────────────────────────────────────────────

describe("deduplicateByCommit", () => {
  it("removes duplicate deployments by commit+env", () => {
    const d1 = mockDeployment({ id: "1" });
    const d2 = mockDeployment({ id: "2" });
    const result = deduplicateByCommit([d1, d2]);
    expect(result).toHaveLength(1);
  });

  it("keeps deployments with different commits", () => {
    const d1 = mockDeployment({
      id: "1",
      deployment_trigger: { type: "push", metadata: { branch: "main", commit_hash: "aaa", commit_message: "" } },
    });
    const d2 = mockDeployment({
      id: "2",
      deployment_trigger: { type: "push", metadata: { branch: "main", commit_hash: "bbb", commit_message: "" } },
    });
    const result = deduplicateByCommit([d1, d2]);
    expect(result).toHaveLength(2);
  });

  it("keeps the deployment with longer duration on duplicate", () => {
    const d1 = mockDeployment({
      id: "short",
      latest_stage: {
        name: "deploy",
        status: "success",
        started_on: "2026-03-29T10:00:00Z",
        ended_on: "2026-03-29T10:00:30Z",
      },
    });
    const d2 = mockDeployment({
      id: "long",
      latest_stage: {
        name: "deploy",
        status: "success",
        started_on: "2026-03-29T10:00:00Z",
        ended_on: "2026-03-29T10:05:00Z",
      },
    });
    const result = deduplicateByCommit([d1, d2]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("long");
  });

  it("handles empty array", () => {
    expect(deduplicateByCommit([])).toEqual([]);
  });
});
