import type { DeployTarget, ProjectType } from "@veriel-ops/shared";
import { describe, expect, it } from "vitest";
import { domainForEnv, PROJECT_TYPE_CONFIG, pagesProjectName, urlForEnv } from "../constants.js";

describe("pagesProjectName", () => {
  it("returns project name for pro", () => {
    expect(pagesProjectName("my-app", "pro")).toBe("my-app");
  });

  it("appends -des for des", () => {
    expect(pagesProjectName("my-app", "des")).toBe("my-app-des");
  });

  it("appends -pre for pre", () => {
    expect(pagesProjectName("my-app", "pre")).toBe("my-app-pre");
  });
});

describe("domainForEnv", () => {
  it("returns project.veriel.dev for pro without custom domain", () => {
    expect(domainForEnv("my-app", "pro")).toBe("my-app.veriel.dev");
  });

  it("returns project-des.veriel.dev for des without custom domain", () => {
    expect(domainForEnv("my-app", "des")).toBe("my-app-des.veriel.dev");
  });

  it("returns project-pre.veriel.dev for pre without custom domain", () => {
    expect(domainForEnv("my-app", "pre")).toBe("my-app-pre.veriel.dev");
  });

  it("returns custom domain for pro", () => {
    expect(domainForEnv("my-app", "pro", "example.com")).toBe("example.com");
  });

  it("returns dev.customDomain for des", () => {
    expect(domainForEnv("my-app", "des", "example.com")).toBe("dev.example.com");
  });

  it("returns pre.customDomain for pre", () => {
    expect(domainForEnv("my-app", "pre", "example.com")).toBe("pre.example.com");
  });
});

describe("urlForEnv", () => {
  it("returns https URL for domain", () => {
    expect(urlForEnv("my-app", "pro")).toBe("https://my-app.veriel.dev");
  });

  it("returns https URL with custom domain", () => {
    expect(urlForEnv("my-app", "pro", "example.com")).toBe("https://example.com");
  });
});

describe("PROJECT_TYPE_CONFIG", () => {
  const allTypes: ProjectType[] = ["static", "ssr-edge", "ssr-node", "backend-js", "backend-go", "backend-java"];
  const validTargets: DeployTarget[] = ["cf-pages", "cf-workers", "container"];

  it("has an entry for every ProjectType", () => {
    for (const type of allTypes) {
      expect(PROJECT_TYPE_CONFIG[type]).toBeDefined();
    }
  });

  it("every entry has a valid deployTarget", () => {
    for (const type of allTypes) {
      expect(validTargets).toContain(PROJECT_TYPE_CONFIG[type].deployTarget);
    }
  });

  it("every entry has a non-empty template", () => {
    for (const type of allTypes) {
      expect(PROJECT_TYPE_CONFIG[type].template).toBeTruthy();
    }
  });

  it("every entry has a non-empty defaultBuildCommand", () => {
    for (const type of allTypes) {
      expect(PROJECT_TYPE_CONFIG[type].defaultBuildCommand).toBeTruthy();
    }
  });

  it("maps static to cf-pages", () => {
    expect(PROJECT_TYPE_CONFIG.static.deployTarget).toBe("cf-pages");
  });

  it("maps ssr-edge to cf-workers", () => {
    expect(PROJECT_TYPE_CONFIG["ssr-edge"].deployTarget).toBe("cf-workers");
  });

  it("maps backend-go to container", () => {
    expect(PROJECT_TYPE_CONFIG["backend-go"].deployTarget).toBe("container");
  });

  it("maps backend-java to container", () => {
    expect(PROJECT_TYPE_CONFIG["backend-java"].deployTarget).toBe("container");
  });
});
