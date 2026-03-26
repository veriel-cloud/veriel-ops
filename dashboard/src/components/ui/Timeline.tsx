import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

export type TimelineStepStatus = "pending" | "loading" | "success" | "error";

interface TimelineStep {
  label: string;
  status: TimelineStepStatus;
  detail?: string;
  duration?: number;
}

interface TimelineProps {
  steps: TimelineStep[];
}

export function Timeline({ steps }: TimelineProps) {
  const _currentStep = steps.findIndex((s) => s.status === "loading" || s.status === "pending");
  const totalDone = steps.filter((s) => s.status === "success").length;

  return (
    <div>
      <div className="space-y-0">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                    step.status === "pending" && "border border-[var(--color-border-hover)] bg-transparent",
                    step.status === "loading" && "border-2 border-[var(--color-accent)] bg-[var(--color-accent-light)]",
                    step.status === "success" &&
                      "bg-[var(--color-success-light)] border border-[var(--color-success)]/20",
                    step.status === "error" && "bg-[var(--color-error-light)] border border-[var(--color-error)]/20",
                  )}
                >
                  {step.status === "pending" && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-quaternary)]" />
                  )}
                  {step.status === "loading" && <Spinner size="sm" className="text-[var(--color-accent)]" />}
                  {step.status === "success" && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-3 h-3 text-[var(--color-success)]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12l5 5l10 -10" />
                    </svg>
                  )}
                  {step.status === "error" && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-3 h-3 text-[var(--color-error)]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6l-12 12" />
                      <path d="M6 6l12 12" />
                    </svg>
                  )}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "w-px flex-1 min-h-5",
                      step.status === "success" ? "bg-[var(--color-success)]/20" : "bg-[var(--color-border)]",
                    )}
                  />
                )}
              </div>
              <div className={cn("pb-5 pt-0.5", isLast && "pb-0")}>
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      "text-[13px]",
                      step.status === "pending" && "text-[var(--color-text-quaternary)]",
                      step.status === "loading" && "text-[var(--color-text-primary)] font-medium",
                      step.status === "success" && "text-[var(--color-text-secondary)]",
                      step.status === "error" && "text-[var(--color-error-text)]",
                    )}
                  >
                    {step.label}
                  </p>
                  {step.duration !== undefined && step.status === "success" && (
                    <span className="text-[11px] text-[var(--color-text-quaternary)] tabular-nums">
                      {(step.duration / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
                {step.detail && <p className="text-[11px] text-[var(--color-text-quaternary)] mt-0.5">{step.detail}</p>}
              </div>
            </div>
          );
        })}
      </div>
      {totalDone > 0 && totalDone < steps.length && (
        <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
          <p className="text-[11px] text-[var(--color-text-quaternary)]">
            Paso {totalDone + 1} de {steps.length}
          </p>
        </div>
      )}
    </div>
  );
}
