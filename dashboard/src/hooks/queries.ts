import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  BranchesResponse,
  BuildsResponse,
  DeploysResponse,
  DnsRecordsResponse,
  FilesResponse,
  NotificationsResponse,
  ProjectDetailResponse,
  ProjectsResponse,
  PullRequestsResponse,
  SystemStatusResponse,
} from "@/types/api";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<ProjectsResponse>("/projects"),
  });
}

export function useProjectDetail(name: string) {
  return useQuery({
    queryKey: ["project", name],
    queryFn: () => api.get<ProjectDetailResponse>(`/projects/${name}`),
    enabled: !!name,
  });
}

export function useProjectBuilds(name: string) {
  return useQuery({
    queryKey: ["project-builds", name],
    queryFn: () => api.get<BuildsResponse>(`/projects/${name}/builds`),
    enabled: !!name,
  });
}

export function useDeploys() {
  return useQuery({
    queryKey: ["deploys"],
    queryFn: () => api.get<DeploysResponse>("/deploys"),
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<NotificationsResponse>("/notifications"),
    refetchInterval: 30_000,
  });
}

export function useSystemStatus() {
  return useQuery({
    queryKey: ["system-status"],
    queryFn: () => api.get<SystemStatusResponse>("/system/status"),
  });
}

export function useBranches(projectName: string) {
  return useQuery({
    queryKey: ["branches", projectName],
    queryFn: () => api.get<BranchesResponse>(`/projects/${projectName}/branches`),
    enabled: !!projectName,
  });
}

export function usePullRequests(projectName: string) {
  return useQuery({
    queryKey: ["pull-requests", projectName],
    queryFn: () => api.get<PullRequestsResponse>(`/projects/${projectName}/pull-requests`),
    enabled: !!projectName,
  });
}

export function useDnsRecords(projectName: string) {
  return useQuery({
    queryKey: ["dns", projectName],
    queryFn: () => api.get<DnsRecordsResponse>(`/projects/${projectName}/dns`),
    enabled: !!projectName,
  });
}

export function useProjectFiles(projectName: string, branch: string, path: string) {
  return useQuery({
    queryKey: ["files", projectName, branch, path],
    queryFn: () => api.get<FilesResponse>(`/projects/${projectName}/files?ref=${branch}&path=${path}`),
    enabled: !!projectName && !!branch,
  });
}
