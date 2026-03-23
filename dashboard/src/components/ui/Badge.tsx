import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "purple" | "accent";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border-[var(--color-border)]",
  success: "bg-[var(--color-success-light)] text-[var(--color-success-text)] border-transparent",
  warning: "bg-[var(--color-warning-light)] text-[var(--color-warning-text)] border-transparent",
  danger: "bg-[var(--color-error-light)] text-[var(--color-error-text)] border-transparent",
  info: "bg-[var(--color-info-light)] text-[var(--color-info-text)] border-transparent",
  purple: "bg-[var(--color-purple-light)] text-[#a78bfa] border-transparent",
  accent: "bg-[var(--color-accent-light)] text-[var(--color-accent-text)] border-transparent",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-[var(--color-text-quaternary)]",
  success: "bg-[var(--color-success)]",
  warning: "bg-[var(--color-warning)]",
  danger: "bg-[var(--color-error)]",
  info: "bg-[var(--color-info)]",
  purple: "bg-[var(--color-purple)]",
  accent: "bg-[var(--color-accent)]",
};

export function Badge({ children, variant = "default", className, dot = false }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border",
        variants[variant],
        className,
      )}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", dotColors[variant])} />}
      {children}
    </span>
  );
}
