import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4", className)}>
      {icon && (
        <div className="w-10 h-10 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <p className="text-[13px] text-[var(--color-text-secondary)]">{title}</p>
      {description && (
        <p className="text-[12px] text-[var(--color-text-quaternary)] mt-1">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
