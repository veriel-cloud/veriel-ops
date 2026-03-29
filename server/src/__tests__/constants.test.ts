import { describe, expect, it } from "vitest";
import { domainForEnv, pagesProjectName, urlForEnv } from "../constants.js";

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
