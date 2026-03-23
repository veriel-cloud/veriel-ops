import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EnvironmentBadge } from "@/components/EnvironmentBadge";
import { StatusDot } from "@/components/StatusDot";
import { DeployTable } from "@/components/DeployTable";
import { Skeleton, SkeletonTable } from "@/components/ui/Skeleton";
import { useFetch } from "@/hooks/useFetch";
import { timeAgo, formatDate, cn } from "@/lib/utils";

export function ProjectDetail() {
  const { name } = useParams<{ name: string }>();
  const { data, loading, error } = useFetch<{ project: any }>(`/api/projects/${name}`);
  const { data: deploysData, loading: loadingDeploys } = useFetch<{ deploys: any[] }>(`/api/projects/${name}/deploys`);
  const { data: buildsData, loading: loadingBuilds } = useFetch<{ builds: any[] }>(`/api/projects/${name}/builds`);

  const project = data?.project;
  const deploys = deploysData?.deploys ?? [];
  const builds = buildsData?.builds ?? [];

  if (error) {
    return (
      <Card className="border-red-500/20 bg-red-500/5">
        <p className="text-sm text-red-400">Error: {error}</p>
      </Card>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-surface-500 mb-6">
        <Link to="/projects" className="hover:text-surface-300 transition-colors">Proyectos</Link>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6l-6 6" />
        </svg>
        <span className="text-surface-300">{name}</span>
      </nav>

      {loading ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-surface-700 bg-surface-800 p-5 space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        </div>
      ) : project && (
        <>
          <Header
            title={project.name}
            description={project.description || project.domain}
            actions={
              <div className="flex items-center gap-2">
                <a href={`https://github.com/${project.repo}`} target="_blank" rel="noopener">
                  <Button variant="secondary" icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5" />
                    </svg>
                  }>Repositorio</Button>
                </a>
              </div>
            }
          />

          {/* Environments */}
          <section className="mb-8">
            <h2 className="text-base font-semibold text-white mb-4">Entornos</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {(["des", "pre", "pro"] as const).map((env) => {
                const envData = project.environments?.[env];
                const envConfig = {
                  des: { label: "Desarrollo", color: "border-sky-500/20 bg-sky-500/5" },
                  pre: { label: "Pre-produccion", color: "border-amber-500/20 bg-amber-500/5" },
                  pro: { label: "Produccion", color: "border-emerald-500/20 bg-emerald-500/5" },
                };
                const config = envConfig[env];

                return (
                  <div key={env} className={cn("rounded-xl border p-5", config.color)}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <StatusDot status={envData?.status ?? "idle"} pulse={envData?.status === "healthy"} />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-surface-200">{env.toUpperCase()}</h3>
                        <span className="text-xs text-surface-500">{config.label}</span>
                      </div>
                      {envData?.url && (
                        <a href={envData.url} target="_blank" rel="noopener" className="text-surface-400 hover:text-surface-200 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" /><path d="M11 13l9 -9" /><path d="M15 4h5v5" />
                          </svg>
                        </a>
                      )}
                    </div>
                    {envData?.status === "idle" || !envData?.version ? (
                      <div className="text-center py-4">
                        <p className="text-xs text-surface-500">Sin despliegues</p>
                      </div>
                    ) : (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-xs text-surface-500">Version</span>
                          <span className="font-mono text-xs text-white">{envData.version}</span>
                        </div>
                        {envData.commitSha && (
                          <div className="flex justify-between">
                            <span className="text-xs text-surface-500">Commit</span>
                            <code className="text-[11px] bg-surface-800 px-1.5 py-0.5 rounded text-surface-300">{envData.commitSha}</code>
                          </div>
                        )}
                        {envData.lastDeployAt && (
                          <div className="flex justify-between">
                            <span className="text-xs text-surface-500">Desplegado</span>
                            <span className="text-xs text-surface-300">{timeAgo(envData.lastDeployAt)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Workflow Runs */}
          {project.workflowRuns?.length > 0 && (
            <section className="mb-8">
              <h2 className="text-base font-semibold text-white mb-4">GitHub Actions</h2>
              <Card padding={false}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700 text-left">
                      <th className="pb-2.5 pt-3 pl-4 pr-2 text-[11px] font-medium text-surface-500 uppercase tracking-wider">Workflow</th>
                      <th className="pb-2.5 pt-3 px-2 text-[11px] font-medium text-surface-500 uppercase tracking-wider">Branch</th>
                      <th className="pb-2.5 pt-3 px-2 text-[11px] font-medium text-surface-500 uppercase tracking-wider">Commit</th>
                      <th className="pb-2.5 pt-3 px-2 text-[11px] font-medium text-surface-500 uppercase tracking-wider">Estado</th>
                      <th className="pb-2.5 pt-3 px-2 pr-4 text-[11px] font-medium text-surface-500 uppercase tracking-wider">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.workflowRuns.slice(0, 10).map((run: any) => (
                      <tr key={run.id} className="border-b border-surface-700/30 hover:bg-surface-800/50 transition-colors">
                        <td className="py-2.5 pl-4 pr-2">
                          <a href={run.html_url} target="_blank" rel="noopener" className="text-[13px] text-surface-200 hover:text-brand-400 transition-colors">
                            {run.name}
                          </a>
                        </td>
                        <td className="py-2.5 px-2">
                          <code className="text-[11px] bg-surface-700/70 px-1.5 py-0.5 rounded text-surface-300">{run.head_branch}</code>
                        </td>
                        <td className="py-2.5 px-2">
                          <code className="text-[11px] bg-surface-700/70 px-1.5 py-0.5 rounded text-surface-300">{run.head_sha?.slice(0, 7)}</code>
                        </td>
                        <td className="py-2.5 px-2">
                          <span className={cn(
                            "text-xs font-medium",
                            run.conclusion === "success" ? "text-emerald-400" :
                            run.conclusion === "failure" ? "text-red-400" :
                            "text-amber-400",
                          )}>
                            {run.conclusion ?? run.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 pr-4">
                          <span className="text-xs text-surface-400">{formatDate(run.created_at)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </section>
          )}

          {/* Deploy History */}
          <section className="mb-8">
            <h2 className="text-base font-semibold text-white mb-4">Historial de deploys</h2>
            <Card padding={false}>
              {loadingDeploys ? <SkeletonTable /> : <DeployTable deploys={deploys} showProject={false} />}
            </Card>
          </section>

          {/* Builds */}
          <section>
            <h2 className="text-base font-semibold text-white mb-4">Builds almacenadas</h2>
            <Card padding={false}>
              {loadingBuilds ? <SkeletonTable rows={3} /> : builds.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700 text-left">
                      <th className="pb-2.5 pt-3 pl-4 pr-2 text-[11px] font-medium text-surface-500 uppercase tracking-wider">Entorno</th>
                      <th className="pb-2.5 pt-3 px-2 text-[11px] font-medium text-surface-500 uppercase tracking-wider">Version</th>
                      <th className="pb-2.5 pt-3 px-2 text-[11px] font-medium text-surface-500 uppercase tracking-wider">Commit</th>
                      <th className="pb-2.5 pt-3 px-2 text-[11px] font-medium text-surface-500 uppercase tracking-wider">Tamano</th>
                      <th className="pb-2.5 pt-3 px-2 pr-4 text-[11px] font-medium text-surface-500 uppercase tracking-wider">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {builds.map((b: any, i: number) => (
                      <tr key={i} className="border-b border-surface-700/30 hover:bg-surface-800/50 transition-colors">
                        <td className="py-2.5 pl-4 pr-2"><EnvironmentBadge environment={b.environment} status="healthy" /></td>
                        <td className="py-2.5 px-2"><span className="font-mono text-xs text-surface-300">{b.version}</span></td>
                        <td className="py-2.5 px-2"><code className="text-[11px] bg-surface-700/70 px-1.5 py-0.5 rounded text-surface-300">{b.commitSha}</code></td>
                        <td className="py-2.5 px-2"><span className="text-xs text-surface-400">{b.size}</span></td>
                        <td className="py-2.5 px-2 pr-4"><span className="text-xs text-surface-400">{timeAgo(b.lastModified)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-8 text-center text-sm text-surface-500">No hay builds almacenadas</div>
              )}
            </Card>
          </section>
        </>
      )}
    </>
  );
}
