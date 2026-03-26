import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ActivityFeed } from "@/components/ActivityFeed";
import { DeployModal } from "@/components/DeployModal";
import { DeployTable } from "@/components/DeployTable";
import { EnvironmentBadge } from "@/components/EnvironmentBadge";
import { EnvironmentCompare } from "@/components/EnvironmentCompare";
import { Header } from "@/components/Header";
import { PromoteModal } from "@/components/PromoteModal";
import { RollbackModal } from "@/components/RollbackModal";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { DomainManager } from "@/components/DomainManager";
import { StatusDot } from "@/components/StatusDot";
import { WorkflowLogViewer } from "@/components/WorkflowLogViewer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonTable } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";

export function ProjectDetail() {
  const { name } = useParams<{ name: string }>();
  const [activeTab, setActiveTab] = useState("deploys");
  const [showPromote, setShowPromote] = useState(false);
  const [showRollback, setShowRollback] = useState(false);
  const [showDeploy, setShowDeploy] = useState(false);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [coverageThreshold, setCoverageThreshold] = useState(80);
  const [savingSettings, setSavingSettings] = useState(false);

  const { data, loading, error, refetch } = useFetch<{ project: any; deploys: any[]; builds: any[] }>(
    `/api/projects/${name}`,
  );
  const { data: buildsData, loading: lb, refetch: refetchBuilds } = useFetch<{ builds: any[] }>(
    `/api/projects/${name}/builds`,
  );

  const project = data?.project;

  useEffect(() => {
    if (project?.coverageThreshold) setCoverageThreshold(project.coverageThreshold);
  }, [project?.coverageThreshold]);

  const deploys = data?.deploys ?? [];
  const builds = buildsData?.builds ?? [];
  const workflowRuns = project?.workflowRuns ?? [];

  const activityItems = deploys.map((d: any) => ({
    type: "deploy" as const,
    environment: d.environment,
    version: d.version,
    commitSha: d.commitSha,
    branch: d.branch,
    status: d.status,
    timestamp: d.timestamp,
  }));

  const tabs = [
    { id: "deploys", label: "Deployments", count: deploys.length },
    { id: "activity", label: "Activity", count: activityItems.length },
    { id: "actions", label: "Actions", count: workflowRuns.length },
    { id: "builds", label: "Builds", count: builds.length },
    { id: "settings", label: "Settings" },
  ];

  if (error) {
    return (
      <Card className="border-[var(--color-error)]/10 bg-[var(--color-error-light)]">
        <p className="text-[13px] text-[var(--color-error-text)]">Error: {error}</p>
      </Card>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[13px] text-[var(--color-text-quaternary)] mb-6">
        <Link to="/projects" className="hover:text-[var(--color-text-secondary)] transition-colors">
          Projects
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-secondary)]">{name}</span>
      </nav>

      {loading ? (
        <div className="space-y-6">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-8 w-28" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 space-y-3"
              >
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        project && (
          <>
            <Header
              title={project.name}
              description={project.description || project.domain || ""}
              actions={
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => setShowDeploy(true)}>
                    Deploy
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setShowPromote(true)}>
                    Promote
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setShowRollback(true)}>
                    Rollback
                  </Button>
                  <a href={`https://github.com/${project.repo}`} target="_blank" rel="noopener">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-3.5 h-3.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5" />
                        </svg>
                      }
                    >
                      Repository
                    </Button>
                  </a>
                </div>
              }
            />

            {/* Environments */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {(["des", "pre", "pro"] as const).map((env) => {
                const envData = project.environments?.[env];
                const config = {
                  des: {
                    label: "Development",
                    border: "border-[var(--color-env-des-border)]",
                    bg: "bg-[var(--color-env-des-bg)]",
                    color: "text-[var(--color-env-des)]",
                  },
                  pre: {
                    label: "Preview",
                    border: "border-[var(--color-env-pre-border)]",
                    bg: "bg-[var(--color-env-pre-bg)]",
                    color: "text-[var(--color-env-pre)]",
                  },
                  pro: {
                    label: "Production",
                    border: "border-[var(--color-env-pro-border)]",
                    bg: "bg-[var(--color-env-pro-bg)]",
                    color: "text-[var(--color-env-pro)]",
                  },
                }[env];

                return (
                  <div key={env} className={cn("rounded-lg border p-4", config.border, config.bg)}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <StatusDot status={envData?.status ?? "idle"} pulse={envData?.status === "healthy"} />
                        <span className={cn("text-[12px] font-semibold uppercase tracking-wider", config.color)}>
                          {env}
                        </span>
                        <span className="text-[11px] text-[var(--color-text-quaternary)]">{config.label}</span>
                      </div>
                      {envData?.url && envData?.status !== "idle" && (
                        <a
                          href={envData.url}
                          target="_blank"
                          rel="noopener"
                          className="text-[var(--color-text-quaternary)] hover:text-[var(--color-text-secondary)] transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" />
                            <path d="M11 13l9 -9" />
                            <path d="M15 4h5v5" />
                          </svg>
                        </a>
                      )}
                    </div>

                    {envData?.status === "idle" || !envData?.version ? (
                      <p className="text-[12px] text-[var(--color-text-quaternary)] text-center py-3">No deployments</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-[11px] text-[var(--color-text-quaternary)]">Version</span>
                          <span className="font-mono text-[12px] text-[var(--color-text-primary)]">
                            {envData.version}
                          </span>
                        </div>
                        {envData.commitSha && (
                          <div className="flex justify-between">
                            <span className="text-[11px] text-[var(--color-text-quaternary)]">Commit</span>
                            <code className="text-[11px] text-[var(--color-text-tertiary)]">{envData.commitSha}</code>
                          </div>
                        )}
                        {envData.lastDeployAt && (
                          <div className="flex justify-between">
                            <span className="text-[11px] text-[var(--color-text-quaternary)]">Deployed</span>
                            <span className="text-[11px] text-[var(--color-text-tertiary)]">
                              {timeAgo(envData.lastDeployAt)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Environment Compare */}
            <div className="mb-8">
              <EnvironmentCompare environments={project.environments} />
            </div>

            {/* Tabs */}
            <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

            <div className="mt-4">
              {/* Deployments tab */}
              {activeTab === "deploys" && (
                <Card padding={false}>
                  {deploys.length > 0 ? (
                    <DeployTable deploys={deploys} showProject={false} />
                  ) : (
                    <EmptyState title="No deployments yet" />
                  )}
                </Card>
              )}

              {/* Activity tab */}
              {activeTab === "activity" && (
                <Card>
                  <ActivityFeed deploys={activityItems} />
                </Card>
              )}

              {/* Actions tab */}
              {activeTab === "actions" && (
                <Card padding={false}>
                  {workflowRuns.length > 0 ? (
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-[var(--color-border)]">
                          <th className="text-left py-2.5 px-4 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
                            Workflow
                          </th>
                          <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
                            Branch
                          </th>
                          <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
                            Commit
                          </th>
                          <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
                            Status
                          </th>
                          <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {workflowRuns.slice(0, 15).map((run: any) => (
                          <tr
                            key={run.id}
                            className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-hover)] transition-colors duration-100 cursor-pointer"
                            onClick={() => setSelectedRun(run)}
                          >
                            <td className="py-2.5 px-4">
                              <a
                                href={run.html_url}
                                target="_blank"
                                rel="noopener"
                                className="text-[var(--color-text-primary)] hover:underline"
                              >
                                {run.name}
                              </a>
                            </td>
                            <td className="py-2.5 px-3">
                              <code className="text-[11px] text-[var(--color-text-tertiary)] font-mono">
                                {run.head_branch}
                              </code>
                            </td>
                            <td className="py-2.5 px-3">
                              <code className="text-[11px] text-[var(--color-text-tertiary)] font-mono">
                                {run.head_sha?.slice(0, 7)}
                              </code>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 text-[12px] font-medium",
                                  run.conclusion === "success" && "text-[var(--color-success-text)]",
                                  run.conclusion === "failure" && "text-[var(--color-error-text)]",
                                  (!run.conclusion || run.status === "in_progress") &&
                                    "text-[var(--color-warning-text)]",
                                )}
                              >
                                {run.conclusion === "success" && (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-3.5 h-3.5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M5 12l5 5l10 -10" />
                                  </svg>
                                )}
                                {run.conclusion === "failure" && (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-3.5 h-3.5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M18 6l-12 12" />
                                    <path d="M6 6l12 12" />
                                  </svg>
                                )}
                                {run.conclusion ?? run.status ?? "pending"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-[12px] text-[var(--color-text-quaternary)]">
                                {timeAgo(run.created_at)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <EmptyState title="No workflow runs" />
                  )}
                </Card>
              )}

              {/* Builds tab */}
              {activeTab === "builds" && (
                <Card padding={false}>
                  {lb ? (
                    <SkeletonTable rows={3} />
                  ) : builds.length > 0 ? (
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-[var(--color-border)]">
                          <th className="text-left py-2.5 px-4 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
                            Environment
                          </th>
                          <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
                            Version
                          </th>
                          <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
                            Commit
                          </th>
                          <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
                            Size
                          </th>
                          <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {builds.map((b: any, i: number) => (
                          <tr
                            key={i}
                            className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-hover)] transition-colors duration-100"
                          >
                            <td className="py-2.5 px-4">
                              <EnvironmentBadge environment={b.environment} status="healthy" />
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono text-[12px] text-[var(--color-text-secondary)]">
                                {b.version}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <code className="text-[11px] text-[var(--color-text-tertiary)]">{b.commitSha}</code>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-[12px] text-[var(--color-text-quaternary)]">
                                {typeof b.size === "number" ? `${(b.size / 1024).toFixed(0)} KB` : b.size}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-[12px] text-[var(--color-text-quaternary)]">
                                {timeAgo(b.lastModified)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <EmptyState title="No builds stored" />
                  )}
                </Card>
              )}

              {/* Settings tab */}
              {activeTab === "settings" && (
                <div className="space-y-4">
                  <Card>
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div className="flex-1 mr-4">
                          <p className="text-[13px] text-[var(--color-text-primary)]">Coverage threshold</p>
                          <p className="text-[11px] text-[var(--color-text-quaternary)]">
                            Minimum coverage to deploy to PRE/PRO
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={coverageThreshold}
                            onChange={(e) => setCoverageThreshold(parseInt(e.target.value, 10) || 0)}
                            className="w-16 h-8 px-2 rounded-md text-[13px] font-mono text-center bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-text-quaternary)]"
                          />
                          <span className="text-[13px] text-[var(--color-text-quaternary)]">%</span>
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={savingSettings}
                            onClick={async () => {
                              setSavingSettings(true);
                              try {
                                await api.put(`/projects/${name}/settings`, { coverageThreshold });
                              } finally {
                                setSavingSettings(false);
                              }
                            }}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                      <div className="border-t border-[var(--color-border)] pt-4">
                        <DomainManager projectName={name!} currentDomain={project.domain} />
                      </div>
                      <div className="border-t border-[var(--color-border)] pt-4 flex justify-between items-center">
                        <div>
                          <p className="text-[13px] text-[var(--color-text-primary)]">Repository</p>
                          <p className="text-[11px] text-[var(--color-text-quaternary)]">{project.repo}</p>
                        </div>
                        <a href={`https://github.com/${project.repo}`} target="_blank" rel="noopener">
                          <Button variant="ghost" size="sm">
                            Open →
                          </Button>
                        </a>
                      </div>
                    </div>
                  </Card>
                  <Card>
                    <div>
                      <p className="text-[13px] text-[var(--color-error-text)]">Danger zone</p>
                      <p className="text-[11px] text-[var(--color-text-quaternary)] mt-1">
                        Archive the repository and remove DNS records. This cannot be undone.
                      </p>
                    </div>
                    <Button variant="danger" size="sm" className="mt-3" onClick={() => setShowDelete(true)}>
                      Delete project
                    </Button>
                  </Card>
                </div>
              )}
            </div>
          </>
        )
      )}

      {name && (
        <ConfirmDeleteModal open={showDelete} onClose={() => setShowDelete(false)} projectName={name} />
      )}

      {selectedRun && name && (
        <WorkflowLogViewer
          open={!!selectedRun}
          onClose={() => setSelectedRun(null)}
          repo={name}
          runId={selectedRun.id}
          runName={selectedRun.name}
          initialStatus={selectedRun.status}
          initialConclusion={selectedRun.conclusion}
        />
      )}

      {project && name && (
        <>
          <DeployModal
            open={showDeploy}
            onClose={() => setShowDeploy(false)}
            projectName={name}
            onSuccess={() => {
              refetch();
            }}
          />
          <PromoteModal
            open={showPromote}
            onClose={() => setShowPromote(false)}
            projectName={name}
            environments={project.environments}
            onSuccess={() => {
              refetch();
              refetchBuilds();
            }}
          />
          <RollbackModal
            open={showRollback}
            onClose={() => setShowRollback(false)}
            projectName={name}
            builds={builds}
            onSuccess={() => {
              refetch();
              refetchBuilds();
            }}
          />
        </>
      )}
    </>
  );
}
