import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { DeployTable } from "@/components/DeployTable";
import { EnvironmentBadge } from "@/components/EnvironmentBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonTable, SkeletonStats } from "@/components/ui/Skeleton";
import { useFetch } from "@/hooks/useFetch";
import { timeAgo } from "@/lib/utils";

export function Dashboard() {
  const { data: projectsData, loading: lp, error } = useFetch<{ projects: any[] }>("/api/projects");
  const { data: deploysData, loading: ld } = useFetch<{ deploys: any[] }>("/api/deploys");

  const projects = projectsData?.projects ?? [];
  const deploys = deploysData?.deploys ?? [];

  const totalBuilds = projects.reduce((sum: number, p: any) =>
    sum + (p.builds?.des ?? 0) + (p.builds?.pre ?? 0) + (p.builds?.pro ?? 0), 0);
  const successDeploys = deploys.filter((d: any) => d.status === "success").length;
  const successRate = deploys.length > 0 ? Math.round((successDeploys / deploys.length) * 100) : 0;

  return (
    <>
      <Header
        title="Overview"
        actions={
          <Link to="/projects/new">
            <Button size="sm">New Project</Button>
          </Link>
        }
      />

      {error && (
        <Card className="mb-6 border-[var(--color-error)]/10 bg-[var(--color-error-light)]">
          <p className="text-[13px] text-[var(--color-error-text)]">{error}</p>
          <p className="text-[11px] text-[var(--color-text-quaternary)] mt-1">Verifica las variables de entorno en .env</p>
        </Card>
      )}

      {/* Stats */}
      {lp ? (
        <div className="mb-8"><SkeletonStats count={5} /></div>
      ) : (
        <div className="grid grid-cols-5 gap-3 mb-8">
          <StatsCard label="Projects" value={projects.length} />
          <StatsCard label="Deployments" value={deploys.length} />
          <StatsCard label="Success rate" value={successRate} suffix="%" />
          <StatsCard label="Builds stored" value={totalBuilds} />
          <StatsCard label="Environments" value={projects.length * 3} />
        </div>
      )}

      {/* Projects table */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-medium text-[var(--color-text-primary)]">Projects</h2>
          <Link to="/projects" className="text-[12px] text-[var(--color-text-quaternary)] hover:text-[var(--color-text-secondary)] transition-colors">
            View all →
          </Link>
        </div>

        {lp ? (
          <Card padding={false}><SkeletonTable rows={3} /></Card>
        ) : projects.length === 0 ? (
          <Card padding={false}>
            <EmptyState
              title="No projects yet"
              description="Create your first project to get started"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[var(--color-text-quaternary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 4h3l2 2h5a2 2 0 0 1 2 2v7a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2" />
                </svg>
              }
              action={<Link to="/projects/new"><Button size="sm">New Project</Button></Link>}
            />
          </Card>
        ) : (
          <Card padding={false}>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-2.5 px-4 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">Project</th>
                  <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">Environments</th>
                  <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">Domain</th>
                  <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">Last deploy</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p: any) => {
                  const latest = Object.values(p.environments as Record<string, any>)
                    .filter((e: any) => e.lastDeployAt)
                    .sort((a: any, b: any) => new Date(b.lastDeployAt).getTime() - new Date(a.lastDeployAt).getTime())[0] as any;

                  return (
                    <tr key={p.name} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-hover)] transition-colors duration-100">
                      <td className="py-3 px-4">
                        <Link to={`/projects/${p.name}`} className="group flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-[var(--color-bg-tertiary)] flex items-center justify-center flex-shrink-0">
                            <span className="text-[11px] font-semibold text-[var(--color-text-tertiary)]">
                              {p.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[var(--color-text-primary)] group-hover:underline font-medium">{p.name}</span>
                            <span className="block text-[11px] text-[var(--color-text-quaternary)]">{p.repo}</span>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          {(["des", "pre", "pro"] as const).map((env) => (
                            <EnvironmentBadge
                              key={env}
                              environment={env}
                              status={p.environments?.[env]?.status ?? "idle"}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[12px] text-[var(--color-text-quaternary)]">{p.domain}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[12px] text-[var(--color-text-quaternary)]">
                          {latest?.lastDeployAt ? timeAgo(latest.lastDeployAt) : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* Recent deploys */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-medium text-[var(--color-text-primary)]">Recent Deployments</h2>
          <Link to="/deploys" className="text-[12px] text-[var(--color-text-quaternary)] hover:text-[var(--color-text-secondary)] transition-colors">
            View all →
          </Link>
        </div>
        <Card padding={false}>
          {ld ? <SkeletonTable rows={5} /> : <DeployTable deploys={deploys} limit={6} />}
        </Card>
      </section>
    </>
  );
}
