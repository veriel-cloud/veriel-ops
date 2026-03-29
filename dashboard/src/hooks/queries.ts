import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<{ projects: any[] }>("/projects"),
  });
}

export function useProjectDetail(name: string) {
  return useQuery({
    queryKey: ["project", name],
    queryFn: () => api.get<{ project: any; deploys: any[]; builds: any[]; workflowRuns: any[] }>(`/projects/${name}`),
    enabled: !!name,
  });
}

export function useProjectBuilds(name: string) {
  return useQuery({
    queryKey: ["project-builds", name],
    queryFn: () => api.get<{ builds: any[] }>(`/projects/${name}/builds`),
    enabled: !!name,
  });
}

export function useDeploys() {
  return useQuery({
    queryKey: ["deploys"],
    queryFn: () => api.get<{ deploys: any[] }>("/deploys"),
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<{ notifications: any[]; unreadCount: number }>("/notifications"),
    refetchInterval: 30_000,
  });
}

export function useSystemStatus() {
  return useQuery({
    queryKey: ["system-status"],
    queryFn: () => api.get<{ status: string; services: any[] }>("/system/status"),
  });
}

export function useBranches(projectName: string) {
  return useQuery({
    queryKey: ["branches", projectName],
    queryFn: () => api.get<{ branches: string[] }>(`/projects/${projectName}/branches`),
    enabled: !!projectName,
  });
}

export function usePullRequests(projectName: string) {
  return useQuery({
    queryKey: ["pull-requests", projectName],
    queryFn: () => api.get<{ pullRequests: any[] }>(`/projects/${projectName}/pull-requests`),
    enabled: !!projectName,
  });
}

export function useDnsRecords(projectName: string) {
  return useQuery({
    queryKey: ["dns", projectName],
    queryFn: () => api.get<{ records: any[] }>(`/projects/${projectName}/dns`),
    enabled: !!projectName,
  });
}

export function useProjectFiles(projectName: string, branch: string, path: string) {
  return useQuery({
    queryKey: ["files", projectName, branch, path],
    queryFn: () => api.get<{ files: any[] }>(`/projects/${projectName}/files?ref=${branch}&path=${path}`),
    enabled: !!projectName && !!branch,
  });
}
