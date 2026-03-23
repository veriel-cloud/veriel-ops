import { cn } from "@/lib/utils";

interface CoverageBarProps {
  percentage: number;
  threshold?: number;
  showLabel?: boolean;
}

export function CoverageBar({ percentage, threshold = 80, showLabel = true }: CoverageBarProps) {
  const isAbove = percentage >= threshold;
  const barColor = isAbove
    ? percentage >= 90 ? "bg-emerald-500" : "bg-brand-500"
    : "bg-red-500";
  const textColor = isAbove
    ? percentage >= 90 ? "text-emerald-400" : "text-brand-400"
    : "text-red-400";

  return (
    <div className="flex items-center gap-2.5 w-full">
      <div className="flex-1 h-1.5 bg-surface-700 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn("text-xs font-semibold tabular-nums whitespace-nowrap", textColor)}>
          {percentage}%
        </span>
      )}
    </div>
  );
}
