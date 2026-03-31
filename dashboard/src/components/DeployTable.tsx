import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cn, formatDuration, timeAgo } from "@/lib/utils";
import { EnvironmentBadge } from "./EnvironmentBadge";

interface Deploy {
  id: string;
  project: string;
  environment: "des" | "pre" | "pro";
  version: string;
  commitSha: string;
  branch: string;
  timestamp: string;
  duration: number;
  action: string;
  status: "success" | "failed" | "in_progress";
  htmlUrl?: string;
}

interface DeployTableProps {
  deploys: Deploy[];
  showProject?: boolean;
  limit?: number;
}

export function DeployTable({ deploys, showProject = true, limit }: DeployTableProps) {
  // Force re-render every 30s to update relative timestamps
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const items = limit ? deploys.slice(0, limit) : deploys;

  if (items.length === 0) {
    return <div className="py-10 text-center text-[13px] text-[var(--color-text-quaternary)]">No hay deploys</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            {showProject && (
              <th className="text-left py-2.5 px-4 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
                Proyecto
              </th>
            )}
            <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
              Entorno
            </th>
            <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
              Commit
            </th>
            <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
              Duracion
            </th>
            <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
              Cuando
            </th>
            <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
              Estado
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((deploy) => (
            <tr
              key={deploy.id}
              className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-hover)] transition-colors duration-100"
            >
              {showProject && (
                <td className="py-2.5 px-4">
                  <Link to={`/projects/${deploy.project}`} className="text-[var(--color-text-primary)] hover:underline">
                    {deploy.project}
                  </Link>
                </td>
              )}
              <td className="py-2.5 px-3">
                <EnvironmentBadge environment={deploy.environment} status="healthy" />
              </td>
              <td className="py-2.5 px-3">
                {deploy.htmlUrl ? (
                  <a href={deploy.htmlUrl} target="_blank" rel="noopener" className="hover:underline">
                    <code className="text-[12px] text-[var(--color-text-tertiary)] font-mono">{deploy.commitSha}</code>
                  </a>
                ) : (
                  <code className="text-[12px] text-[var(--color-text-tertiary)] font-mono">{deploy.commitSha}</code>
                )}
              </td>
              <td className="py-2.5 px-3">
                <span className="text-[var(--color-text-quaternary)] tabular-nums">
                  {formatDuration(deploy.duration)}
                </span>
              </td>
              <td className="py-2.5 px-3">
                <span className="text-[var(--color-text-quaternary)]">{timeAgo(deploy.timestamp)}</span>
              </td>
              <td className="py-2.5 px-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-[12px] font-medium",
                    deploy.status === "success" && "text-[var(--color-success-text)]",
                    deploy.status === "failed" && "text-[var(--color-error-text)]",
                    deploy.status === "in_progress" && "text-[var(--color-warning-text)]",
                  )}
                >
                  {deploy.status === "success" && (
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
                  {deploy.status === "failed" && (
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
                  {deploy.status === "in_progress" && (
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {deploy.status === "success" ? "Ready" : deploy.status === "failed" ? "Error" : "Deploying"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
