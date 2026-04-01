import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

function useInvalidateProject() {
  const qc = useQueryClient();
  return (name?: string) => {
    qc.invalidateQueries({ queryKey: ["projects"] });
    qc.invalidateQueries({ queryKey: ["deploys"] });
    if (name) {
      qc.invalidateQueries({ queryKey: ["project", name] });
      qc.invalidateQueries({ queryKey: ["project-builds", name] });
    }
  };
}

export function useDeployProject(projectName: string) {
  const invalidate = useInvalidateProject();
  return useMutation({
    mutationFn: (body: { environment: string }) => api.post<{ success: boolean }>(`/projects/${projectName}/deploy`, body),
    onSuccess: () => invalidate(projectName),
  });
}

export function useRollbackProject(projectName: string) {
  const invalidate = useInvalidateProject();
  return useMutation({
    mutationFn: (body: { environment: string; buildArtifact: string }) =>
      api.post<{ success: boolean }>(`/projects/${projectName}/rollback`, body),
    onSuccess: () => invalidate(projectName),
  });
}

export function usePromoteProject(projectName: string) {
  const invalidate = useInvalidateProject();
  return useMutation({
    mutationFn: (body: { from: string; version?: string }) =>
      api.post<{ success: boolean; from: string; to: string; branch?: string; message?: string; url?: string; repo?: string; prUrl?: string }>(
        `/projects/${projectName}/promote`,
        body,
      ),
    onSuccess: () => invalidate(projectName),
  });
}

export function useDeleteProject(projectName: string) {
  const invalidate = useInvalidateProject();
  return useMutation({
    mutationFn: () => api.delete<{ success: boolean }>(`/projects/${projectName}`),
    onSuccess: () => invalidate(projectName),
  });
}

export function useUpdateSettings(projectName: string) {
  const invalidate = useInvalidateProject();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.put<{ success: boolean }>(`/projects/${projectName}/settings`, body),
    onSuccess: () => invalidate(projectName),
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<{ success: boolean }>(`/notifications/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useCreateBranch(projectName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { branch: string; from: string }) => api.post<{ success: boolean }>(`/projects/${projectName}/branches`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branches", projectName] }),
  });
}

export function useCommitFiles(projectName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<{ success: boolean }>(`/projects/${projectName}/commit`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["files", projectName] });
      qc.invalidateQueries({ queryKey: ["project", projectName] });
    },
  });
}

export function useImportProject() {
  const invalidate = useInvalidateProject();
  return useMutation({
    mutationFn: (body: { repoName: string; type?: string }) => api.post<{ success: boolean }>("/projects/import", body),
    onSuccess: () => invalidate(),
  });
}
