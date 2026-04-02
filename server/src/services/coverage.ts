import type { Logger } from "../lib/logger.js";
import type { GitHubService } from "./github.js";

interface CoverageSummary {
  total: {
    statements: { pct: number };
    branches: { pct: number };
    functions: { pct: number };
    lines: { pct: number };
  };
}

/**
 * Parse a coverage-summary.json and return the average percentage.
 */
export function parseCoverageSummary(json: string): number {
  try {
    const summary = JSON.parse(json) as CoverageSummary;
    const { statements, branches, functions, lines } = summary.total;
    const avg = (statements.pct + branches.pct + functions.pct + lines.pct) / 4;
    return Math.round(avg * 100) / 100;
  } catch {
    return 0;
  }
}

/**
 * Extract coverage from a workflow run's artifacts.
 * Looks for an artifact named "coverage-report" containing coverage-summary.json.
 */
export async function extractCoverageFromWorkflow(
  github: GitHubService,
  repo: string,
  runId: number,
  logger?: Logger,
): Promise<number> {
  try {
    const artifacts = await github.listWorkflowRunArtifacts(repo, runId);
    const coverageArtifact = artifacts.find((a) => a.name === "coverage-report");

    if (!coverageArtifact) {
      logger?.debug({ repo, runId }, "no coverage-report artifact found");
      return 0;
    }

    const zipBuffer = await github.downloadWorkflowArtifact(repo, coverageArtifact.id);
    const json = await extractJsonFromZip(zipBuffer);

    if (!json) {
      logger?.warn({ repo, runId }, "could not extract coverage-summary.json from artifact");
      return 0;
    }

    const coverage = parseCoverageSummary(json);
    logger?.info({ repo, runId, coverage }, "extracted coverage from workflow artifact");
    return coverage;
  } catch (err) {
    logger?.warn({ repo, runId, error: err instanceof Error ? err.message : "unknown" }, "failed to extract coverage");
    return 0;
  }
}

/**
 * Extract coverage-summary.json from a zip buffer.
 * Uses Bun's native Blob + DecompressionStream approach.
 */
async function extractJsonFromZip(buffer: ArrayBuffer): Promise<string | null> {
  try {
    // GitHub artifact zips contain files at root level
    // We need to find coverage-summary.json inside
    // Use Bun's built-in unzip via subprocess
    const tempDir = `/tmp/coverage-${Date.now()}`;
    const zipPath = `${tempDir}.zip`;

    await Bun.write(zipPath, buffer);

    const result = Bun.spawnSync(["unzip", "-o", zipPath, "-d", tempDir]);
    if (result.exitCode !== 0) return null;

    // Look for coverage-summary.json
    const glob = new Bun.Glob("**/coverage-summary.json");
    for await (const file of glob.scan(tempDir)) {
      const content = await Bun.file(`${tempDir}/${file}`).text();
      // Cleanup
      Bun.spawnSync(["rm", "-rf", tempDir, zipPath]);
      return content;
    }

    Bun.spawnSync(["rm", "-rf", tempDir, zipPath]);
    return null;
  } catch {
    return null;
  }
}
