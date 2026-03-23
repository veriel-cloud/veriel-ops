interface StatsCardProps {
  label: string;
  value: string | number;
  suffix?: string;
}

export function StatsCard({ label, value, suffix }: StatsCardProps) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <p className="text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">{label}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-[var(--color-text-primary)] tabular-nums tracking-tight">{value}</span>
        {suffix && <span className="text-[13px] text-[var(--color-text-quaternary)]">{suffix}</span>}
      </div>
    </div>
  );
}
