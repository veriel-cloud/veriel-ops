import type { DeployTarget, ProjectType } from "./types.js";
import { PROJECT_TYPE_CONFIG } from "./constants.js";

// ─── UI Config ───────────────────────────────────────────────────────

export interface ProjectTypeUIConfig {
  label: string;
  description: string;
  frameworks: string;
  deployTarget: DeployTarget;
  deployTargetLabel: string;
}

const DEPLOY_TARGET_LABELS: Record<DeployTarget, string> = {
  "cf-pages": "Cloudflare Pages",
  "cf-workers": "Cloudflare Workers",
  container: "Container (VPS)",
};

export const PROJECT_TYPE_UI: Record<ProjectType, ProjectTypeUIConfig> = {
  static: {
    label: "Static Site",
    description: "Pre-rendered HTML, CSS and JS served from a CDN",
    frameworks: "Astro, React SPA, Vue, Svelte",
    deployTarget: "cf-pages",
    deployTargetLabel: DEPLOY_TARGET_LABELS["cf-pages"],
  },
  "ssr-edge": {
    label: "SSR Edge",
    description: "Server-side rendering on Cloudflare Workers",
    frameworks: "Astro CF adapter, Next.js OpenNext, Hono",
    deployTarget: "cf-workers",
    deployTargetLabel: DEPLOY_TARGET_LABELS["cf-workers"],
  },
  "ssr-node": {
    label: "SSR Node/Bun",
    description: "Server-side rendering with persistent process",
    frameworks: "Next.js Node, Nuxt Node",
    deployTarget: "container",
    deployTargetLabel: DEPLOY_TARGET_LABELS.container,
  },
  "backend-js": {
    label: "Backend JS/TS",
    description: "JavaScript/TypeScript API server",
    frameworks: "Hono, Express, Fastify",
    deployTarget: "cf-workers",
    deployTargetLabel: DEPLOY_TARGET_LABELS["cf-workers"],
  },
  "backend-go": {
    label: "Backend Go",
    description: "Go HTTP server deployed as container",
    frameworks: "Fiber, Gin, Echo, Chi",
    deployTarget: "container",
    deployTargetLabel: DEPLOY_TARGET_LABELS.container,
  },
  "backend-java": {
    label: "Backend Java",
    description: "Java server deployed as container",
    frameworks: "Spring Boot, Quarkus",
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
