import { describe, expect, it } from "vitest";
import { parseCoverageSummary } from "../coverage.js";

describe("parseCoverageSummary", () => {
  it("calculates average from all four metrics", () => {
    const json = JSON.stringify({
      total: {
        statements: { pct: 80 },
        branches: { pct: 70 },
        functions: { pct: 90 },
        lines: { pct: 85 },
      },
    });
    expect(parseCoverageSummary(json)).toBe(81.25);
  });

  it("returns 0 for 100% across all metrics rounds correctly", () => {
    const json = JSON.stringify({
      total: {
        statements: { pct: 100 },
        branches: { pct: 100 },
        functions: { pct: 100 },
        lines: { pct: 100 },
      },
    });
    expect(parseCoverageSummary(json)).toBe(100);
  });

  it("returns 0 for all zeros", () => {
    const json = JSON.stringify({
      total: {
        statements: { pct: 0 },
        branches: { pct: 0 },
        functions: { pct: 0 },
        lines: { pct: 0 },
      },
    });
    expect(parseCoverageSummary(json)).toBe(0);
  });

  it("handles decimal percentages", () => {
    const json = JSON.stringify({
      total: {
        statements: { pct: 85.71 },
        branches: { pct: 66.67 },
        functions: { pct: 100 },
        lines: { pct: 87.5 },
      },
    });
    const result = parseCoverageSummary(json);
    expect(result).toBe(84.97);
  });

  it("returns 0 for invalid JSON", () => {
    expect(parseCoverageSummary("not json")).toBe(0);
  });

  it("returns 0 for missing total", () => {
    expect(parseCoverageSummary(JSON.stringify({}))).toBe(0);
  });

  it("returns 0 for empty string", () => {
    expect(parseCoverageSummary("")).toBe(0);
  });
});
