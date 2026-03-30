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
  const allTypes: ProjectType[] = ["astro-static", "astro-ssr", "react-spa", "hono-api", "go-fiber", "spring-boot"];
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

  it("maps astro-static to cf-pages", () => {
    expect(PROJECT_TYPE_CONFIG["astro-static"].deployTarget).toBe("cf-pages");
  });

  it("maps astro-ssr to cf-workers", () => {
    expect(PROJECT_TYPE_CONFIG["astro-ssr"].deployTarget).toBe("cf-workers");
  });

  it("maps react-spa to cf-pages", () => {
    expect(PROJECT_TYPE_CONFIG["react-spa"].deployTarget).toBe("cf-pages");
  });

  it("maps hono-api to cf-workers", () => {
    expect(PROJECT_TYPE_CONFIG["hono-api"].deployTarget).toBe("cf-workers");
  });

  it("maps go-fiber to container", () => {
    expect(PROJECT_TYPE_CONFIG["go-fiber"].deployTarget).toBe("container");
  });

  it("maps spring-boot to container", () => {
    expect(PROJECT_TYPE_CONFIG["spring-boot"].deployTarget).toBe("container");
  });
});
