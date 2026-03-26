import { useState } from "react";
import { Link } from "react-router-dom";
import { EnvironmentBadge } from "@/components/EnvironmentBadge";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useFetch } from "@/hooks/useFetch";
import { timeAgo } from "@/lib/utils";

const typeLabels: Record<string, string> = {
  "astro-static": "Astro",
  "astro-ssr": "Astro SSR",
  "react-spa": "React",
  "backend-worker": "Worker",
};

export function Projects() {
  const { data, loading, error } = useFetch<{ projects: any[] }>("/api/projects");
  const [search, setSearch] = useState("");

  const allProjects = data?.projects ?? [];
  const projects = search
    ? allProjects.filter(
        (p: any) =>
          p.name.toLowerCase().includes(search.toLowerCase()) || p.domain.toLowerCase().includes(search.toLowerCase()),
      )
    : allProjects;

  return (
    <>
      <Header
        title="Projects"
        description={`${allProjects.length} project${allProjects.length !== 1 ? "s" : ""}`}
        actions={
          <Link to="/projects/new">
            <Button size="sm">New Project</Button>
          </Link>
        }
      />

      {error && (
        <Card className="mb-6 border-[var(--color-error)]/10 bg-[var(--color-error-light)]">
          <p className="text-[13px] text-[var(--color-error-text)]">{error}</p>
        </Card>
      )}

      {/* Search */}
      {allProjects.length > 0 && (
        <div className="mb-4">
          <div className="relative max-w-xs">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-quaternary)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="10" cy="10" r="7" />
              <path d="M21 21l-6 -6" />
            </svg>
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-md text-[13px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-quaternary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-text-quaternary)] transition-colors"
            />
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <Card padding={false}>
          <SkeletonTable rows={5} />
        </Card>
      ) : projects.length === 0 && !search ? (
        <Card padding={false}>
          <EmptyState
            title="No projects yet"
            description="Create your first project to get started"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-[var(--color-text-quaternary)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 4h3l2 2h5a2 2 0 0 1 2 2v7a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2" />
              </svg>
            }
            action={
              <Link to="/projects/new">
                <Button size="sm">New Project</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Card padding={false}>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2.5 px-4 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
                  Project
                </th>
                <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
                  Environments
                </th>
                <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
                  Domain
                </th>
                <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
                  Created
                </th>
                <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
                  Last deploy
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p: any) => {
                const latest = Object.values(p.environments as Record<string, any>)
                  .filter((e: any) => e.lastDeployAt)
                  .sort(
                    (a: any, b: any) => new Date(b.lastDeployAt).getTime() - new Date(a.lastDeployAt).getTime(),
                  )[0] as any;

                return (
                  <tr
                    key={p.name}
                    className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-hover)] transition-colors duration-100"
                  >
                    <td className="py-3 px-4">
                      <Link to={`/projects/${p.name}`} className="group flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-[var(--color-bg-tertiary)] flex items-center justify-center flex-shrink-0">
                          <span className="text-[11px] font-semibold text-[var(--color-text-tertiary)]">
                            {p.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[var(--color-text-primary)] group-hover:underline font-medium">
                          {p.name}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[12px] text-[var(--color-text-quaternary)]">
                        {typeLabels[p.type] ?? p.type}
                      </span>
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
                        {p.createdAt ? timeAgo(p.createdAt) : "—"}
                      </span>
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
          {projects.length === 0 && search && (
            <div className="py-8 text-center text-[13px] text-[var(--color-text-quaternary)]">
              No projects matching "{search}"
            </div>
          )}
        </Card>
      )}
    </>
  );
}
