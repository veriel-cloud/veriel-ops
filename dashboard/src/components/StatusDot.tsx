import { cn } from "@/lib/utils";

type Status = "healthy" | "degraded" | "down" | "idle";

interface StatusDotProps {
  status: Status;
  pulse?: boolean;
}

const colors: Record<Status, string> = {
  healthy: "bg-emerald-400",
  degraded: "bg-amber-400",
  down: "bg-red-400",
  idle: "bg-surface-500",
};

export function StatusDot({ status, pulse = false }: StatusDotProps) {
  return (
    <span className="relative flex h-2 w-2">
      {pulse && status === "healthy" && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      )}
      <span className={cn("relative inline-flex rounded-full h-2 w-2", colors[status])} />
    </span>
  );
}
