import { Link } from "react-router-dom";
import { EnvironmentBadge } from "./EnvironmentBadge";
import { CoverageBar } from "./CoverageBar";
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

const typeColors: Record<string, string> = {
  "astro-static": "bg-orange-500/10 text-orange-400",
  "astro-ssr": "bg-orange-500/10 text-orange-400",
  "react-spa": "bg-cyan-500/10 text-cyan-400",
  "backend-worker": "bg-purple-500/10 text-purple-400",
};

export function ProjectCard({ project }: ProjectCardProps) {
  const mostRecent = Object.values(project.environments)
    .filter((env) => env.lastDeployAt)
    .sort((a, b) => new Date(b.lastDeployAt!).getTime() - new Date(a.lastDeployAt!).getTime())[0];

  return (
    <Link
      to={`/projects/${project.name}`}
      className="block rounded-xl border border-surface-700 bg-surface-800 p-4 transition-all duration-200 hover:border-surface-600 hover:shadow-lg hover:shadow-black/20 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-surface-700 flex items-center justify-center group-hover:bg-surface-600 transition-colors">
            <span className="text-sm font-bold text-surface-300">
              {project.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white group-hover:text-brand-400 transition-colors leading-tight">
              {project.name}
            </h3>
            <p className="text-[11px] text-surface-500">{project.domain}</p>
          </div>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${typeColors[project.type] ?? "bg-surface-700 text-surface-300"}`}>
          {typeLabels[project.type] ?? project.type}
        </span>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        {(["des", "pre", "pro"] as const).map((env) => (
          <EnvironmentBadge
            key={env}
            environment={env}
            status={project.environments[env]?.status as "healthy" | "degraded" | "down" | "idle" ?? "idle"}
            version={project.environments[env]?.version}
          />
        ))}
      </div>

      {project.coverage > 0 && (
        <div className="mb-3">
          <CoverageBar percentage={project.coverage} />
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-surface-500">
        <span>{project.repo}</span>
        {mostRecent?.lastDeployAt && <span>{timeAgo(mostRecent.lastDeployAt)}</span>}
      </div>
    </Link>
  );
}
