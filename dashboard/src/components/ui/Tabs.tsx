import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex items-center gap-0 border-b border-[var(--color-border)]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "relative px-4 py-2.5 text-[13px] font-medium transition-colors duration-150",
            active === tab.id
              ? "text-[var(--color-text-primary)]"
              : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]",
          )}
        >
          <span className="flex items-center gap-2">
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                "text-[11px] px-1.5 py-0 rounded-full",
                active === tab.id
                  ? "bg-[var(--color-text-primary)] text-[var(--color-bg)]"
                  : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]",
              )}>
                {tab.count}
              </span>
            )}
          </span>
          {active === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-px bg-[var(--color-text-primary)]" />
          )}
        </button>
      ))}
    </div>
  );
}
