import type { Cache } from "../lib/cache.js";
import type { DeployEntry, Project, SystemStats } from "../types.js";
import type { Services } from "./data.js";
import { getDeploys, getProjectDetail, getProjects, getSystemStats } from "./data.js";

const CACHE_KEYS = {
  projects: "projects",
  project: (name: string) => `project:${name}`,
  deploys: "deploys",
  systemStats: "system-stats",
} as const;

export function createCachedData(cache: Cache<unknown>) {
  async function cachedGetProjects(s: Services): Promise<Project[]> {
    const cached = cache.get(CACHE_KEYS.projects) as Project[] | undefined;
    if (cached) return cached;

    const data = await getProjects(s);
    cache.set(CACHE_KEYS.projects, data);
    return data;
  }

  async function cachedGetProjectDetail(name: string, s: Services) {
    const key = CACHE_KEYS.project(name);
    const cached = cache.get(key) as Awaited<ReturnType<typeof getProjectDetail>> | undefined;
    if (cached) return cached;

    const data = await getProjectDetail(name, s);
    cache.set(key, data);
    return data;
  }

  async function cachedGetDeploys(s: Services): Promise<DeployEntry[]> {
    const cached = cache.get(CACHE_KEYS.deploys) as DeployEntry[] | undefined;
    if (cached) return cached;

    const data = await getDeploys(s);
    cache.set(CACHE_KEYS.deploys, data);
    return data;
  }

  async function cachedGetSystemStats(s: Services): Promise<SystemStats> {
    const cached = cache.get(CACHE_KEYS.systemStats) as SystemStats | undefined;
    if (cached) return cached;

    const data = await getSystemStats(s);
    cache.set(CACHE_KEYS.systemStats, data);
    return data;
  }

  function invalidateProject(name: string) {
    cache.invalidate(CACHE_KEYS.projects);
    cache.invalidate(CACHE_KEYS.project(name));
    cache.invalidate(CACHE_KEYS.deploys);
    cache.invalidate(CACHE_KEYS.systemStats);
  }

  function invalidateAll() {
    cache.clear();
  }

  return {
    getProjects: cachedGetProjects,
    getProjectDetail: cachedGetProjectDetail,
    getDeploys: cachedGetDeploys,
    getSystemStats: cachedGetSystemStats,
    invalidateProject,
    invalidateAll,
    stats: () => cache.stats(),
  };
}

export type CachedData = ReturnType<typeof createCachedData>;
