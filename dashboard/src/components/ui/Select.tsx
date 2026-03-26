import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({ label, hint, error, options, placeholder, className, id, ...props }: SelectProps) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-[13px] text-[var(--color-text-secondary)] mb-1.5">
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          "w-full h-9 px-3 rounded-md text-[13px]",
          "bg-[var(--color-bg)] border border-[var(--color-border)]",
          "text-[var(--color-text-primary)]",
          "focus:outline-none focus:ring-1 focus:ring-[var(--color-text-quaternary)] focus:border-[var(--color-border-active)]",
          "transition-colors duration-150 appearance-none cursor-pointer",
          error && "border-[var(--color-error)]/50 focus:ring-[var(--color-error)]/30",
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && !error && <p className="mt-1 text-[11px] text-[var(--color-text-quaternary)]">{hint}</p>}
      {error && <p className="mt-1 text-[11px] text-[var(--color-error-text)]">{error}</p>}
    </div>
  );
}
