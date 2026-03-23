import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: boolean;
}

export function Card({ children, className, hover = false, padding = true }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]",
        hover && "transition-colors duration-150 hover:border-[var(--color-border-hover)] cursor-pointer",
        padding && "p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
