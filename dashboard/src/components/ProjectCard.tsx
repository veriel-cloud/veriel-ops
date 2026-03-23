import { Link } from "react-router-dom";
import { EnvironmentBadge } from "./EnvironmentBadge";
import { timeAgo } from "@/lib/utils";

interface ProjectCardProps {
  project: {
    name: string;
    domain: string;
    type: string;
    repo: string;
    coverage: number;
    createdAt: string;
    environments: Record<string, { status: string; version: string | null; lastDeployAt: string | null }>;
  };
}

const typeLabels: Record<string, string> = {
  "astro-static": "Astro",
  "astro-ssr": "Astro SSR",
  "react-spa": "React",
  "backend-worker": "Worker",
};

export function ProjectCard({ project }: ProjectCardProps) {
  const mostRecent = Object.values(project.environments)
    .filter((env) => env.lastDeployAt)
    .sort((a, b) => new Date(b.lastDeployAt!).getTime() - new Date(a.lastDeployAt!).getTime())[0];

  return (
    <Link
      to={`/projects/${project.name}`}
      className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-colors duration-150 hover:border-[var(--color-border-hover)] group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[var(--color-bg-tertiary)] flex items-center justify-center">
            <span className="text-sm font-semibold text-[var(--color-text-tertiary)]">
              {project.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="text-[13px] font-medium text-[var(--color-text-primary)] group-hover:text-white transition-colors leading-tight">
              {project.name}
            </h3>
            <p className="text-[11px] text-[var(--color-text-quaternary)]">{project.domain}</p>
          </div>
        </div>
        <span className="text-[11px] text-[var(--color-text-quaternary)] bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 rounded">
          {typeLabels[project.type] ?? project.type}
        </span>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        {(["des", "pre", "pro"] as const).map((env) => (
          <EnvironmentBadge
            key={env}
            environment={env}
            status={project.environments[env]?.status as "healthy" | "degraded" | "down" | "idle" ?? "idle"}
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-[var(--color-text-quaternary)]">
        <span>{project.repo}</span>
        {mostRecent?.lastDeployAt && <span>{timeAgo(mostRecent.lastDeployAt)}</span>}
      </div>
    </Link>
  );
}
