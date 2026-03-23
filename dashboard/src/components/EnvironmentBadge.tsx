import { cn } from "@/lib/utils";

type Environment = "des" | "pre" | "pro";
type Status = "healthy" | "degraded" | "down" | "idle";

interface EnvironmentBadgeProps {
  environment: Environment;
  status: Status;
  version?: string | null;
}

const envStyles: Record<Environment, { bg: string; text: string; border: string; dot: string }> = {
  des: {
    bg: "bg-[var(--color-env-des-bg)]",
    text: "text-[var(--color-env-des)]",
    border: "border-[var(--color-env-des-border)]",
    dot: "bg-[var(--color-env-des)]",
  },
  pre: {
    bg: "bg-[var(--color-env-pre-bg)]",
    text: "text-[var(--color-env-pre)]",
    border: "border-[var(--color-env-pre-border)]",
    dot: "bg-[var(--color-env-pre)]",
  },
  pro: {
    bg: "bg-[var(--color-env-pro-bg)]",
    text: "text-[var(--color-env-pro)]",
    border: "border-[var(--color-env-pro-border)]",
    dot: "bg-[var(--color-env-pro)]",
  },
};

const statusDotOverride: Record<Status, string | null> = {
  healthy: null,
  degraded: "bg-[var(--color-warning)]",
  down: "bg-[var(--color-error)]",
  idle: "bg-[var(--color-text-quaternary)]",
};

export function EnvironmentBadge({ environment, status, version }: EnvironmentBadgeProps) {
  const style = envStyles[environment];
  const dotColor = statusDotOverride[status] ?? style.dot;

  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5", style.bg, style.text, style.border)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotColor)} />
      <span className="text-[11px] font-semibold uppercase tracking-wide">{environment}</span>
      {version && <span className="text-[10px] opacity-50 font-mono">{version}</span>}
    </div>
  );
}
