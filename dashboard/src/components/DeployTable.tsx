import { Link } from "react-router-dom";
import { EnvironmentBadge } from "./EnvironmentBadge";
import { timeAgo, formatDuration, cn } from "@/lib/utils";

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
}

interface DeployTableProps {
  deploys: Deploy[];
  showProject?: boolean;
  limit?: number;
}

const actionColors: Record<string, string> = {
  deploy: "text-brand-400",
  rollback: "text-amber-400",
  promote: "text-emerald-400",
};

export function DeployTable({ deploys, showProject = true, limit }: DeployTableProps) {
  const items = limit ? deploys.slice(0, limit) : deploys;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-700 text-left">
            {showProject && <th className="pb-2.5 pt-3 pl-4 pr-2 text-[11px] font-medium text-surface-500 uppercase tracking-wider">Proyecto</th>}
            <th className="pb-2.5 pt-3 px-2 text-[11px] font-medium text-surface-500 uppercase tracking-wider">Entorno</th>
            <th className="pb-2.5 pt-3 px-2 text-[11px] font-medium text-surface-500 uppercase tracking-wider">Version</th>
            <th className="pb-2.5 pt-3 px-2 text-[11px] font-medium text-surface-500 uppercase tracking-wider">Commit</th>
            <th className="pb-2.5 pt-3 px-2 text-[11px] font-medium text-surface-500 uppercase tracking-wider">Accion</th>
            <th className="pb-2.5 pt-3 px-2 text-[11px] font-medium text-surface-500 uppercase tracking-wider">Duracion</th>
            <th className="pb-2.5 pt-3 px-2 text-[11px] font-medium text-surface-500 uppercase tracking-wider">Cuando</th>
            <th className="pb-2.5 pt-3 px-2 pr-4 text-[11px] font-medium text-surface-500 uppercase tracking-wider">Estado</th>
          </tr>
        </thead>
        <tbody>
          {items.map((deploy) => (
            <tr key={deploy.id} className="border-b border-surface-700/30 hover:bg-surface-800/50 transition-colors duration-100">
              {showProject && (
                <td className="py-2.5 pl-4 pr-2">
                  <Link to={`/projects/${deploy.project}`} className="font-medium text-surface-200 hover:text-brand-400 transition-colors text-[13px]">
                    {deploy.project}
                  </Link>
                </td>
              )}
              <td className="py-2.5 px-2">
                <EnvironmentBadge environment={deploy.environment} status="healthy" />
              </td>
              <td className="py-2.5 px-2">
                <span className="font-mono text-xs text-surface-300">{deploy.version}</span>
              </td>
              <td className="py-2.5 px-2">
                <code className="text-[11px] bg-surface-700/70 px-1.5 py-0.5 rounded text-surface-300">{deploy.commitSha}</code>
              </td>
              <td className="py-2.5 px-2">
                <span className={cn("text-xs font-medium capitalize", actionColors[deploy.action] ?? "text-surface-400")}>
                  {deploy.action}
                </span>
              </td>
              <td className="py-2.5 px-2">
                <span className="text-xs text-surface-400 tabular-nums">{formatDuration(deploy.duration)}</span>
              </td>
              <td className="py-2.5 px-2">
                <span className="text-xs text-surface-400">{timeAgo(deploy.timestamp)}</span>
              </td>
              <td className="py-2.5 px-2 pr-4">
                <span className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium",
                  deploy.status === "success" ? "text-emerald-400" :
                  deploy.status === "failed" ? "text-red-400" : "text-amber-400",
                )}>
                  {deploy.status === "success" && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5l10 -10" />
                    </svg>
                  )}
                  {deploy.status === "failed" && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6l-12 12" /><path d="M6 6l12 12" />
                    </svg>
                  )}
                  {deploy.status === "success" ? "Exitoso" : deploy.status === "failed" ? "Fallido" : "En curso"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && (
        <div className="py-8 text-center text-sm text-surface-500">No hay deploys</div>
      )}
    </div>
  );
}
