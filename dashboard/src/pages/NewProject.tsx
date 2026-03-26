import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { type JobStatus, type StepStatus, WorkflowRun, type WorkflowRunData } from "@/components/ui/WorkflowRun";

export function NewProject() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("astro-static");
  const [domainType, setDomainType] = useState<"default" | "custom">("default");
  const [customDomain, setCustomDomain] = useState("");
  const [creating, setCreating] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowRunData | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setCreating(true);
      setError(null);
      setResult(null);
      setWorkflow(null);

      try {
        const response = await fetch("/api/projects/create-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            type,
            description: description || undefined,
            customDomain: domainType === "custom" ? customDomain : undefined,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? "Error creating project");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error("No response stream");

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          // Parse SSE events (event: + data: pairs)
          let currentEvent = "step";
          for (const line of lines) {
            if (line.startsWith("event:")) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              const jsonStr = line.slice(5).trim();
              if (!jsonStr) continue;

              try {
                const data = JSON.parse(jsonStr);
                handleSSEEvent(currentEvent, data);
              } catch {
                // ignore parse errors
              }
              currentEvent = "step"; // reset
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setCreating(false);
      }
    },
    [name, type, description, domainType, customDomain, handleSSEEvent],
  );

  const handleSSEEvent = useCallback((event: string, data: any) => {
    if (event === "init") {
      // Initialize the full workflow with all jobs/steps pending
      setWorkflow({
        title: data.title,
        status: "running",
        jobs: data.jobs.map((job: any) => ({
          ...job,
          steps: job.steps.map((step: any) => ({ ...step })),
        })),
      });
    } else if (event === "job") {
      // Update a job's status/duration
      setWorkflow((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          jobs: prev.jobs.map((job) =>
            job.id === data.jobId
              ? { ...job, status: data.status as JobStatus, duration: data.duration ?? job.duration }
              : job,
          ),
        };
      });
    } else if (event === "step") {
      // Update a step within a job, or add it dynamically (GitHub Actions steps)
      setWorkflow((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          jobs: prev.jobs.map((job) => {
            if (job.id !== data.jobId) return job;

            const existingStep = job.steps.find((s) => s.id === data.stepId);

            if (existingStep) {
              return {
                ...job,
                steps: job.steps.map((step) =>
                  step.id === data.stepId
                    ? {
                        ...step,
                        status: data.status as StepStatus,
                        detail: data.detail ?? step.detail,
                        logs: data.logs ?? step.logs,
                        duration: data.duration ?? step.duration,
                      }
                    : step,
                ),
              };
            }

            // New step discovered from GitHub Actions — add it
            return {
              ...job,
              steps: [
                ...job.steps,
                {
                  id: data.stepId,
                  label: data.label ?? data.stepId,
                  status: data.status as StepStatus,
                  detail: data.detail,
                  logs: data.logs,
                  duration: data.duration,
                },
              ],
            };
          }),
        };
      });
    } else if (event === "complete") {
      setResult(data);
      setWorkflow((prev) =>
        prev ? { ...prev, status: "success" as JobStatus, totalDuration: data.totalDuration } : prev,
      );
    } else if (event === "error") {
      setError(data.error);
      setWorkflow((prev) =>
        prev ? { ...prev, status: "error" as JobStatus, totalDuration: data.totalDuration } : prev,
      );
    }
  }, []);

  return (
    <>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[13px] text-[var(--color-text-quaternary)] mb-6">
        <Link to="/projects" className="hover:text-[var(--color-text-secondary)] transition-colors">
          Projects
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-secondary)]">New</span>
      </nav>

      <Header title="New Project" description="Create and deploy a new project" />

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Project info */}
          {!workflow && (
            <>
              <Card>
                <div className="space-y-4">
                  <Input
                    id="name"
                    label="Project name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    pattern="[a-z0-9-]+"
                    placeholder="my-project"
                    hint="Lowercase letters, numbers and hyphens only"
                  />
                  <Input
                    id="desc"
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                  <div>
                    <label htmlFor="type" className="block text-[13px] text-[var(--color-text-secondary)] mb-1.5">
                      Framework
                    </label>
                    <select
                      id="type"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full h-9 px-3 rounded-md text-[13px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-text-quaternary)] transition-colors appearance-none cursor-pointer"
                    >
                      <option value="astro-static">Astro</option>
                      <option value="react-spa">React</option>
                    </select>
                  </div>
                </div>
              </Card>

              {/* Domain */}
              <Card>
                <p className="text-[13px] text-[var(--color-text-secondary)] mb-3">Domain</p>
                <div className="flex items-center gap-6 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={domainType === "default"}
                      onChange={() => setDomainType("default")}
                      className="accent-white"
                    />
                    <span className="text-[13px] text-[var(--color-text-secondary)]">veriel.dev subdomain</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={domainType === "custom"}
                      onChange={() => setDomainType("custom")}
                      className="accent-white"
                    />
                    <span className="text-[13px] text-[var(--color-text-secondary)]">Custom domain</span>
                  </label>
                </div>

                {domainType === "default" && name && (
                  <div className="bg-[var(--color-bg-secondary)] rounded-md p-3 space-y-1 border border-[var(--color-border)]">
                    <p className="text-[12px] text-[var(--color-env-des)]">DES → {name}-des.veriel.dev</p>
                    <p className="text-[12px] text-[var(--color-env-pre)]">PRE → {name}-pre.veriel.dev</p>
                    <p className="text-[12px] text-[var(--color-env-pro)]">PRO → {name}.veriel.dev</p>
                  </div>
                )}

                {domainType === "custom" && (
                  <Input
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="example.com"
                    hint="Domain must be added to Cloudflare first"
                  />
                )}
              </Card>
            </>
          )}

          {/* Workflow Run (GitHub Actions style) */}
          {workflow && (
            <Card>
              <WorkflowRun data={workflow} />
            </Card>
          )}

          {/* Result */}
          {result && (
            <Card className="border-[var(--color-success)]/10 bg-[var(--color-success-light)]">
              <p className="text-[13px] font-medium text-[var(--color-success-text)] mb-3">Deploy DES Complete</p>
              <div className="space-y-1.5 text-[13px]">
                <p>
                  <span className="text-[var(--color-text-quaternary)]">Repository </span>
                  <a
                    href={result.project?.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-accent-text)] hover:underline"
                  >
                    {result.project?.repo}
                  </a>
                </p>
                {result.project?.commit && (
                  <p>
                    <span className="text-[var(--color-text-quaternary)]">Commit </span>
                    <code className="text-[12px] text-[var(--color-text-secondary)]">{result.project.commit}</code>
                  </p>
                )}
                <p>
                  <span className="text-[var(--color-text-quaternary)]">DES </span>
                  <span className="text-[var(--color-env-des)]">{result.project?.urls?.des}</span>
                </p>
                {result.ghRunUrl && (
                  <p>
                    <span className="text-[var(--color-text-quaternary)]">Workflow </span>
                    <a
                      href={result.ghRunUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-accent-text)] hover:underline"
                    >
                      View on GitHub →
                    </a>
                  </p>
                )}
              </div>
              <div className="mt-4">
                <Link to={`/projects/${name}`}>
                  <Button size="sm">View project →</Button>
                </Link>
              </div>
            </Card>
          )}

          {error && !creating && (
            <Card className="border-[var(--color-error)]/10 bg-[var(--color-error-light)]">
              <p className="text-[13px] text-[var(--color-error-text)]">{error}</p>
            </Card>
          )}

          {/* Actions */}
          {!result && (
            <div className="flex items-center gap-2">
              {!workflow ? (
                <>
                  <Button type="submit" loading={creating} disabled={!name} size="sm">
                    Create Project
                  </Button>
                  <Link to="/projects">
                    <Button variant="ghost" size="sm">
                      Cancel
                    </Button>
                  </Link>
                </>
              ) : creating ? (
                <p className="text-[12px] text-[var(--color-text-quaternary)]">
                  Pipeline running — do not close this page
                </p>
              ) : error ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setWorkflow(null);
                    setError(null);
                  }}
                >
                  Try again
                </Button>
              ) : null}
            </div>
          )}
        </form>
      </div>
    </>
  );
}
