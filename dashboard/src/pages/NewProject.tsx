import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Timeline, type TimelineStepStatus } from "@/components/ui/Timeline";

interface Step {
  label: string;
  status: TimelineStepStatus;
  detail?: string;
  duration?: number;
}

export function NewProject() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("astro-static");
  const [domainType, setDomainType] = useState<"default" | "custom">("default");
  const [customDomain, setCustomDomain] = useState("");
  const [creating, setCreating] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setResult(null);
    setSteps([]);

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

        for (const line of lines) {
          if (line.startsWith("data:")) {
            const jsonStr = line.slice(5).trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr);
              const eventLine = lines.find((l) => l.startsWith("event:"));
              const event = eventLine?.slice(6).trim() ?? "step";

              if (event === "step") {
                setSteps((prev) => {
                  const updated = [...prev];
                  while (updated.length <= data.step) {
                    updated.push({ label: "", status: "pending" });
                  }
                  updated[data.step] = {
                    label: data.label,
                    status: data.status as TimelineStepStatus,
                    detail: data.detail,
                    duration: data.duration,
                  };
                  return updated;
                });
              } else if (event === "complete") {
                setResult(data);
              } else if (event === "error") {
                setError(data.error);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setCreating(false);
    }
  }, [name, type, description, domainType, customDomain]);

  return (
    <>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[13px] text-[var(--color-text-quaternary)] mb-6">
        <Link to="/projects" className="hover:text-[var(--color-text-secondary)] transition-colors">Projects</Link>
        <span>/</span>
        <span className="text-[var(--color-text-secondary)]">New</span>
      </nav>

      <Header title="New Project" description="Create and deploy a new project" />

      <div className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Project info */}
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
                <input type="radio" checked={domainType === "default"} onChange={() => setDomainType("default")} className="accent-white" />
                <span className="text-[13px] text-[var(--color-text-secondary)]">veriel.dev subdomain</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={domainType === "custom"} onChange={() => setDomainType("custom")} className="accent-white" />
                <span className="text-[13px] text-[var(--color-text-secondary)]">Custom domain</span>
              </label>
            </div>

            {domainType === "default" && name && (
              <div className="bg-[var(--color-bg-secondary)] rounded-md p-3 space-y-1 border border-[var(--color-border)]">
                <p className="text-[12px] text-[var(--color-env-des)]">DES → dev.{name}.veriel.dev</p>
                <p className="text-[12px] text-[var(--color-env-pre)]">PRE → pre.{name}.veriel.dev</p>
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

          {/* Timeline */}
          {steps.length > 0 && (
            <Card>
              <p className="text-[13px] text-[var(--color-text-secondary)] mb-4">
                {creating ? "Creating project..." : result ? "Project created" : "Creation failed"}
              </p>
              <Timeline steps={steps} />
            </Card>
          )}

          {/* Result */}
          {result && (
            <Card className="border-[var(--color-success)]/10 bg-[var(--color-success-light)]">
              <p className="text-[13px] font-medium text-[var(--color-success-text)] mb-3">Project created successfully</p>
              <div className="space-y-1.5 text-[13px]">
                <p>
                  <span className="text-[var(--color-text-quaternary)]">Repository </span>
                  <a href={result.project?.github} target="_blank" className="text-[var(--color-accent-text)] hover:underline">{result.project?.repo}</a>
                </p>
                <p>
                  <span className="text-[var(--color-text-quaternary)]">DES </span>
                  <span className="text-[var(--color-env-des)]">{result.project?.urls?.des}</span>
                </p>
                <p>
                  <span className="text-[var(--color-text-quaternary)]">PRE </span>
                  <span className="text-[var(--color-env-pre)]">{result.project?.urls?.pre}</span>
                </p>
                <p>
                  <span className="text-[var(--color-text-quaternary)]">PRO </span>
                  <span className="text-[var(--color-env-pro)]">{result.project?.urls?.pro}</span>
                </p>
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
              <Button type="submit" loading={creating} disabled={!name} size="sm">
                {creating ? "Creating..." : "Create Project"}
              </Button>
              <Link to="/projects"><Button variant="ghost" size="sm">Cancel</Button></Link>
            </div>
          )}
        </form>
      </div>
    </>
  );
}
