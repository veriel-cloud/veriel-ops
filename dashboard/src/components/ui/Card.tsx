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
        "rounded-xl border border-surface-700 bg-surface-800",
        hover && "transition-all duration-200 hover:border-surface-600 hover:shadow-lg hover:shadow-black/20",
        padding && "p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
