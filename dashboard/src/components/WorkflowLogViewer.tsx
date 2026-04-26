import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { API_BASE } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Step {
  name: string;
  status: string;
  conclusion: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

interface Job {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  startedAt: string | null;
  completedAt: string | null;
  steps?: Step[];
}

interface RunState {
  status: string;
  conclusion: string | null;
  jobs: Job[];
}

interface WorkflowLogViewerProps {
  open: boolean;
  onClose: () => void;
  repo: string;
  runId: number;
  runName: string;
  initialStatus: string;
  initialConclusion: string | null;
}

function StepIcon({ status, conclusion }: { status: string; conclusion: string | null }) {
  if (status === "in_progress") return <Spinner size="sm" />;
  if (conclusion === "success")
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-[var(--color-success)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12l5 5l10 -10" />
      </svg>
    );
  if (conclusion === "failure")
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-[var(--color-error)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6l-12 12" />
        <path d="M6 6l12 12" />
      </svg>
    );
  if (conclusion === "skipped")
    return <div className="w-3.5 h-3.5 flex items-center justify-center text-[var(--color-text-quaternary)]">—</div>;
  return <div className="w-2 h-2 rounded-full bg-[var(--color-text-quaternary)]" />;
}

function formatStepDuration(started: string | null, completed: string | null): string | null {
  if (!started || !completed) return null;
  const ms = new Date(completed).getTime() - new Date(started).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function WorkflowLogViewer({ open, onClose, repo, runId, runName, initialStatus, initialConclusion }: WorkflowLogViewerProps) {
  const [state, setState] = useState<RunState | null>(null);
  const [done, setDone] = useState(initialStatus === "completed");
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!open) return;

    if (initialStatus === "completed") {
      const token = localStorage.getItem("veriel-ops-token");
      fetch(`${API_BASE}/actions/${repo}/${runId}/logs`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((r) => r.json())
        .then((data) => {
          setState({
            status: data.run.status,
            conclusion: data.run.conclusion,
            jobs: data.jobs.map((j: any) => ({
              id: j.id,
              name: j.name,
              status: j.status,
              conclusion: j.conclusion,
              startedAt: j.started_at,
              completedAt: j.completed_at,
              steps: j.steps,
            })),
          });
          setDone(true);
        });
      return;
    }

    const es = new EventSource(`/api/actions/${repo}/${runId}/stream`);
    eventSourceRef.current = es;

    es.addEventListener("update", (e) => {
      setState(JSON.parse(e.data));
    });

    es.addEventListener("done", () => {
      setDone(true);
      es.close();
    });

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [open, repo, runId, initialStatus]);

  function handleClose() {
    eventSourceRef.current?.close();
    setState(null);
    setDone(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={runName} className="max-w-lg">
      <div className="space-y-3">
        {!state && (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        )}

        {state?.jobs.map((job) => (
          <div key={job.id} className="rounded-md border border-[var(--color-border)] overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-bg-hover)]">
              <StepIcon status={job.status} conclusion={job.conclusion} />
              <span className="text-[13px] font-medium text-[var(--color-text-primary)]">{job.name}</span>
              {job.startedAt && job.completedAt && (
                <span className="text-[11px] text-[var(--color-text-quaternary)] ml-auto">
                  {formatStepDuration(job.startedAt, job.completedAt)}
                </span>
              )}
            </div>
            {job.steps && job.steps.length > 0 && (
              <div className="divide-y divide-[var(--color-border)]">
                {job.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                    <StepIcon status={step.status} conclusion={step.conclusion} />
                    <span
                      className={cn(
                        "text-[12px] flex-1",
                        step.conclusion === "failure" ? "text-[var(--color-error-text)]" : "text-[var(--color-text-tertiary)]",
                      )}
                    >
                      {step.name}
                    </span>
                    {step.startedAt && step.completedAt && (
                      <span className="text-[10px] text-[var(--color-text-quaternary)] tabular-nums">
                        {formatStepDuration(step.startedAt, step.completedAt)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {state && !done && (
          <p className="text-[11px] text-[var(--color-text-quaternary)] text-center">
            Streaming live updates...
          </p>
        )}
      </div>
    </Modal>
  );
}
