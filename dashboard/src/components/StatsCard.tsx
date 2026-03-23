import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "warning" | "danger";

interface StatsCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  default: "from-brand-600/8 to-transparent border-brand-600/15",
  success: "from-emerald-600/8 to-transparent border-emerald-600/15",
  warning: "from-amber-600/8 to-transparent border-amber-600/15",
  danger: "from-red-600/8 to-transparent border-red-600/15",
};

export function StatsCard({ label, value, suffix, variant = "default" }: StatsCardProps) {
  return (
    <div className={cn("rounded-xl border bg-gradient-to-br p-4", variants[variant])}>
      <p className="text-[11px] font-medium text-surface-500 uppercase tracking-wider">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-white tabular-nums">{value}</span>
        {suffix && <span className="text-xs text-surface-400">{suffix}</span>}
      </div>
    </div>
  );
}
