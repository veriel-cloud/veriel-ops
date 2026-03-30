import type { DeployTarget, ProjectType } from "./types.js";
import { PROJECT_TYPE_CONFIG } from "./constants.js";

// ─── UI Config ───────────────────────────────────────────────────────

export interface ProjectTypeUIConfig {
  label: string;
  description: string;
  deployTarget: DeployTarget;
  deployTargetLabel: string;
}

const DEPLOY_TARGET_LABELS: Record<DeployTarget, string> = {
  "cf-pages": "Cloudflare Pages",
  "cf-workers": "Cloudflare Workers",
  container: "Container (VPS)",
};

export const PROJECT_TYPE_UI: Record<ProjectType, ProjectTypeUIConfig> = {
  "astro-static": {
    label: "Astro (Static)",
    description: "Static site pre-rendered and served from CDN",
    deployTarget: "cf-pages",
    deployTargetLabel: DEPLOY_TARGET_LABELS["cf-pages"],
  },
  "astro-ssr": {
    label: "Astro (SSR)",
    description: "Server-side rendered Astro on Workers",
    deployTarget: "cf-workers",
    deployTargetLabel: DEPLOY_TARGET_LABELS["cf-workers"],
  },
  "react-spa": {
    label: "React (SPA)",
    description: "Single-page React app served from CDN",
    deployTarget: "cf-pages",
    deployTargetLabel: DEPLOY_TARGET_LABELS["cf-pages"],
  },
  "hono-api": {
    label: "Hono (API)",
    description: "Lightweight API on Cloudflare Workers",
    deployTarget: "cf-workers",
    deployTargetLabel: DEPLOY_TARGET_LABELS["cf-workers"],
  },
  "go-fiber": {
    label: "Go / Fiber (API)",
    description: "Go HTTP API deployed as container",
    deployTarget: "container",
    deployTargetLabel: DEPLOY_TARGET_LABELS.container,
  },
  "spring-boot": {
    label: "Spring Boot (API)",
    description: "Java API deployed as container",
    deployTarget: "container",
    deployTargetLabel: DEPLOY_TARGET_LABELS.container,
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────

export const ALL_PROJECT_TYPES = Object.keys(PROJECT_TYPE_UI) as ProjectType[];

export function getTypeLabel(type: string): string {
  return PROJECT_TYPE_UI[type as ProjectType]?.label ?? type;
}

export function getDeployTargetLabel(target: string): string {
  return DEPLOY_TARGET_LABELS[target as DeployTarget] ?? target;
}

export function getTypeDefaults(type: ProjectType) {
  const config = PROJECT_TYPE_CONFIG[type];
  return {
    buildCommand: config.defaultBuildCommand,
    outputDir: config.defaultOutputDir,
    runtime: config.defaultRuntime,
    deployTarget: config.deployTarget,
  };
}
