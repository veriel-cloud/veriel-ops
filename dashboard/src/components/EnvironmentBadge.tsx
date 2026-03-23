import { cn } from "@/lib/utils";

type Environment = "des" | "pre" | "pro";
type Status = "healthy" | "degraded" | "down" | "idle";

interface EnvironmentBadgeProps {
  environment: Environment;
  status: Status;
  version?: string | null;
}

const envColors: Record<Environment, string> = {
  des: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  pre: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  pro: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const statusDots: Record<Status, string> = {
  healthy: "bg-emerald-400",
  degraded: "bg-amber-400",
  down: "bg-red-400",
  idle: "bg-surface-500",
};

export function EnvironmentBadge({ environment, status, version }: EnvironmentBadgeProps) {
  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-1", envColors[environment])}>
      <span className={cn("w-1.5 h-1.5 rounded-full", statusDots[status])} />
      <span className="text-[11px] font-semibold uppercase">{environment}</span>
      {version && <span className="text-[10px] opacity-60 font-mono">{version}</span>}
    </div>
  );
}
