import { cn } from "@/lib/utils";

interface CoverageBarProps {
  percentage: number;
  threshold?: number;
  showLabel?: boolean;
}

export function CoverageBar({ percentage, threshold = 80, showLabel = true }: CoverageBarProps) {
  const isAbove = percentage >= threshold;
  const barColor = isAbove
    ? percentage >= 90
      ? "bg-[var(--color-success)]"
      : "bg-[var(--color-accent)]"
    : "bg-[var(--color-error)]";
  const textColor = isAbove
    ? percentage >= 90
      ? "text-[var(--color-success-text)]"
      : "text-[var(--color-accent-text)]"
    : "text-[var(--color-error-text)]";

  return (
    <div className="flex items-center gap-2.5 w-full">
      <div className="flex-1 h-1 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {showLabel && <span className={cn("text-[11px] font-medium tabular-nums", textColor)}>{percentage}%</span>}
    </div>
  );
}
