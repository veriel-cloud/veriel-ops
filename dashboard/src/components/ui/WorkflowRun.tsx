import { useState } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

export type StepStatus = "pending" | "running" | "success" | "error" | "skipped";
export type JobStatus = "pending" | "queued" | "running" | "success" | "error";

export interface WorkflowStep {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
  duration?: number;
  logs?: string[];
}

export interface WorkflowJob {
  id: string;
  label: string;
  status: JobStatus;
  steps: WorkflowStep[];
  duration?: number;
}

export interface WorkflowRunData {
  title: string;
  status: JobStatus;
  jobs: WorkflowJob[];
  startedAt?: string;
  totalDuration?: number;
}

interface WorkflowRunProps {
  data: WorkflowRunData;
}

function StatusIcon({ status, size = "md" }: { status: StepStatus | JobStatus; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  if (status === "pending" || status === "queued") {
    return (
      <div className={cn(dim, "rounded-full border-2 border-[var(--color-border-hover)] flex-shrink-0")} />
    );
  }

  if (status === "running") {
    return <Spinner size="sm" className={cn(dim, "text-[var(--color-warning)] flex-shrink-0")} />;
  }

  if (status === "success") {
    return (
      <div className={cn(dim, "rounded-full bg-[var(--color-success)] flex items-center justify-center flex-shrink-0")}>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5l10 -10" />
        </svg>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={cn(dim, "rounded-full bg-[var(--color-error)] flex items-center justify-center flex-shrink-0")}>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6l-12 12" /><path d="M6 6l12 12" />
        </svg>
      </div>
    );
  }

  if (status === "skipped") {
    return (
      <div className={cn(dim, "rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center flex-shrink-0")}>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 text-[var(--color-text-quaternary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 5l14 14" />
        </svg>
      </div>
    );
  }

  return null;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const secs = ms / 1000;
  if (secs < 60) return `${secs.toFixed(1)}s`;
  const mins = Math.floor(secs / 60);
  const remainSecs = Math.floor(secs % 60);
  return `${mins}m ${remainSecs}s`;
}

function JobConnector({ status }: { status: JobStatus }) {
  return (
    <div className={cn(
      "w-0.5 h-5 mx-auto",
      status === "success" ? "bg-[var(--color-success)]/40" :
      status === "error" ? "bg-[var(--color-error)]/40" :
      "bg-[var(--color-border)]",
    )} />
  );
}

function ProgressBar({ jobs, status }: { jobs: WorkflowJob[]; status: JobStatus }) {
  const total = jobs.length;
  const done = jobs.filter((j) => j.status === "success").length;
  const failed = jobs.filter((j) => j.status === "error").length;
  const pct = total > 0 ? ((done + failed) / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-[var(--color-bg-tertiary)] overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            failed > 0 ? "bg-[var(--color-error)]" :
            status === "running" ? "bg-[var(--color-warning)]" :
            "bg-[var(--color-success)]",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-[var(--color-text-quaternary)] tabular-nums flex-shrink-0">
        {done + failed}/{total} jobs
      </span>
    </div>
  );
}

function JobCard({ job }: { job: WorkflowJob }) {
  const [expanded, setExpanded] = useState(() =>
    job.status === "running" || job.status === "error"
  );

  const completedSteps = job.steps.filter((s) => s.status === "success").length;
  const totalSteps = job.steps.length;

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden transition-all",
      job.status === "running" && "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/[0.03] shadow-[0_0_0_1px_rgba(210,153,34,0.08)]",
      job.status === "success" && "border-[var(--color-border)] hover:border-[var(--color-border-hover)]",
      job.status === "error" && "border-[var(--color-error)]/30 bg-[var(--color-error)]/[0.03] shadow-[0_0_0_1px_rgba(248,81,73,0.08)]",
      (job.status === "pending" || job.status === "queued") && "border-[var(--color-border)] opacity-50",
    )}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <StatusIcon status={job.status} />
        <span className={cn(
          "text-[13px] font-medium flex-1",
          (job.status === "pending" || job.status === "queued") ? "text-[var(--color-text-quaternary)]" : "text-[var(--color-text-primary)]",
        )}>
          {job.label}
        </span>

        {job.status === "running" && (
          <span className="text-[11px] text-[var(--color-text-quaternary)] tabular-nums">
            {completedSteps}/{totalSteps}
          </span>
        )}

        {job.duration !== undefined && job.status !== "pending" && job.status !== "queued" && (
          <span className="text-[11px] text-[var(--color-text-quaternary)] tabular-nums">
            {formatMs(job.duration)}
          </span>
        )}

        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={cn(
            "w-4 h-4 text-[var(--color-text-quaternary)] transition-transform duration-200",
            expanded && "rotate-90",
          )}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 6l6 6l-6 6" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-[var(--color-border)] bg-white/[0.01]">
          {job.steps.map((step, i) => (
            <StepRow key={step.id} step={step} isLast={i === job.steps.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function StepRow({ step, isLast }: { step: WorkflowStep; isLast: boolean }) {
  const [showLogs, setShowLogs] = useState(false);
  const hasLogs = step.logs && step.logs.length > 0;

  return (
    <div className={cn(!isLast && "border-b border-[var(--color-border)]/40")}>
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 pl-8 transition-colors",
          hasLogs && "cursor-pointer hover:bg-white/[0.03]",
        )}
        onClick={() => hasLogs && setShowLogs(!showLogs)}
      >
        <StatusIcon status={step.status} size="sm" />
        <span className={cn(
          "text-[12px] flex-1",
          step.status === "pending" && "text-[var(--color-text-quaternary)]",
          step.status === "running" && "text-[var(--color-text-primary)]",
          step.status === "success" && "text-[var(--color-text-secondary)]",
          step.status === "error" && "text-[var(--color-error-text)]",
          step.status === "skipped" && "text-[var(--color-text-quaternary)] line-through",
        )}>
          {step.label}
        </span>

        {step.detail && step.status !== "pending" && (
          <span className="text-[11px] text-[var(--color-text-quaternary)] max-w-[200px] truncate">
            {step.detail}
          </span>
        )}

        {step.duration !== undefined && (step.status === "success" || step.status === "error") && (
          <span className="text-[11px] text-[var(--color-text-quaternary)] tabular-nums flex-shrink-0">
            {formatMs(step.duration)}
          </span>
        )}

        {hasLogs && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={cn(
              "w-3 h-3 text-[var(--color-text-quaternary)] transition-transform duration-200 flex-shrink-0",
              showLogs && "rotate-90",
            )}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6l6 6l-6 6" />
          </svg>
        )}
      </div>

      {showLogs && hasLogs && (
        <div className="mx-4 mb-2.5 ml-8 rounded-md bg-[#0d1117] border border-[var(--color-border)] overflow-x-auto">
          <pre className="p-3 text-[11px] leading-relaxed font-mono text-[#c9d1d9]">
            {step.logs!.map((line, i) => (
              <div key={i} className="flex">
                <span className="text-[#484f58] select-none w-8 text-right mr-3 flex-shrink-0">{i + 1}</span>
                <span className="break-all">{line}</span>
              </div>
            ))}
          </pre>
        </div>
      )}
    </div>
  );
}

export function WorkflowRun({ data }: WorkflowRunProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <StatusIcon status={data.status} />
        <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)] flex-1">
          {data.title}
        </h3>
        {data.totalDuration !== undefined && data.status !== "pending" && (
          <span className="text-[12px] text-[var(--color-text-quaternary)] tabular-nums">
            {formatMs(data.totalDuration)}
          </span>
        )}
      </div>

      {/* Progress bar — always visible */}
      <ProgressBar jobs={data.jobs} status={data.status} />

      {/* Jobs */}
      <div className="space-y-0">
        {data.jobs.map((job, i) => (
          <div key={job.id}>
            {i > 0 && <JobConnector status={data.jobs[i - 1].status} />}
            <JobCard job={job} />
          </div>
        ))}
      </div>
    </div>
  );
}
