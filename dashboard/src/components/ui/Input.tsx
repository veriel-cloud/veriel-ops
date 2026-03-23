import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, className, id, ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-[13px] text-[var(--color-text-secondary)] mb-1.5">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "w-full h-9 px-3 rounded-md text-[13px]",
          "bg-[var(--color-bg)] border border-[var(--color-border)]",
          "text-[var(--color-text-primary)] placeholder-[var(--color-text-quaternary)]",
          "focus:outline-none focus:ring-1 focus:ring-[var(--color-text-quaternary)] focus:border-[var(--color-border-active)]",
          "transition-colors duration-150",
          error && "border-[var(--color-error)]/50 focus:ring-[var(--color-error)]/30",
          className,
        )}
        {...props}
      />
      {hint && !error && (
        <p className="mt-1 text-[11px] text-[var(--color-text-quaternary)]">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-[11px] text-[var(--color-error-text)]">{error}</p>
      )}
    </div>
  );
}
