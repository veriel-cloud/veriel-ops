import { cn } from "@/lib/utils";

type Status = "healthy" | "degraded" | "down" | "idle";

interface StatusDotProps {
  status: Status;
  pulse?: boolean;
}

const colors: Record<Status, string> = {
  healthy: "bg-[var(--color-success)]",
  degraded: "bg-[var(--color-warning)]",
  down: "bg-[var(--color-error)]",
  idle: "bg-[var(--color-text-quaternary)]",
};

export function StatusDot({ status, pulse = false }: StatusDotProps) {
  return (
    <span className="relative flex h-2 w-2">
      {pulse && status === "healthy" && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-50" />
      )}
      <span className={cn("relative inline-flex rounded-full h-2 w-2", colors[status])} />
    </span>
  );
}
