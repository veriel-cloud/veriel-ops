import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

export type TimelineStepStatus = "pending" | "loading" | "success" | "error";

interface TimelineStep {
  label: string;
  status: TimelineStepStatus;
  detail?: string;
}

interface TimelineProps {
  steps: TimelineStep[];
}

export function Timeline({ steps }: TimelineProps) {
  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3">
          {/* Line + Icon */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2",
                step.status === "pending" && "border-surface-600 bg-surface-800",
                step.status === "loading" && "border-brand-500 bg-brand-500/10",
                step.status === "success" && "border-emerald-500 bg-emerald-500/10",
                step.status === "error" && "border-red-500 bg-red-500/10",
              )}
            >
              {step.status === "pending" && (
                <div className="w-2 h-2 rounded-full bg-surface-600" />
              )}
              {step.status === "loading" && <Spinner size="sm" />}
              {step.status === "success" && (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5l10 -10" />
                </svg>
              )}
              {step.status === "error" && (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6l-12 12" /><path d="M6 6l12 12" />
                </svg>
              )}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-0.5 flex-1 min-h-6",
                  step.status === "success" ? "bg-emerald-500/30" : "bg-surface-700",
                )}
              />
            )}
          </div>

          {/* Content */}
          <div className="pb-6 pt-0.5">
            <p
              className={cn(
                "text-sm font-medium",
                step.status === "pending" && "text-surface-500",
                step.status === "loading" && "text-brand-400",
                step.status === "success" && "text-surface-200",
                step.status === "error" && "text-red-400",
              )}
            >
              {step.label}
            </p>
            {step.detail && (
              <p className="text-xs text-surface-500 mt-0.5">{step.detail}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
