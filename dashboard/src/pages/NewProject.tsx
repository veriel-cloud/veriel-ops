import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Timeline, type TimelineStepStatus } from "@/components/ui/Timeline";

interface Step {
  label: string;
  status: TimelineStepStatus;
  detail?: string;
}

const initialSteps: Step[] = [
  { label: "Crear repositorio en GitHub", status: "pending" },
  { label: "Anadir workflows CI/CD", status: "pending" },
  { label: "Crear branch develop", status: "pending" },
  { label: "Crear proyecto en Cloudflare Pages", status: "pending" },
  { label: "Configurar registros DNS", status: "pending" },
  { label: "Anadir custom domains", status: "pending" },
];

export function NewProject() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("astro-static");
  const [domainType, setDomainType] = useState<"default" | "custom">("default");
  const [customDomain, setCustomDomain] = useState("");
  const [creating, setCreating] = useState(false);
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setResult(null);
    setSteps(initialSteps.map((s) => ({ ...s, status: "pending" })));

    try {
      // Simulate step-by-step progress
      for (let i = 0; i < steps.length; i++) {
        setSteps((prev) =>
          prev.map((s, idx) => ({
            ...s,
            status: idx === i ? "loading" : idx < i ? "success" : "pending",
          })),
        );

        if (i === 0) {
          // Actually create the project on step 0
          const response = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              type,
              description,
              customDomain: domainType === "custom" ? customDomain : undefined,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error ?? "Error creating project");
          }

          setResult(data);
        }

        // Simulate remaining steps completing
        await new Promise((r) => setTimeout(r, 600));
      }

      setSteps((prev) => prev.map((s) => ({ ...s, status: "success" })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setSteps((prev) =>
        prev.map((s) =>
          s.status === "loading" ? { ...s, status: "error" } : s,
        ),
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <nav className="flex items-center gap-2 text-sm text-surface-500 mb-6">
        <Link to="/projects" className="hover:text-surface-300 transition-colors">Proyectos</Link>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6l-6 6" />
        </svg>
        <span className="text-surface-300">Nuevo proyecto</span>
      </nav>

      <Header title="Nuevo proyecto" description="Registrar un nuevo proyecto en veriel-ops" />

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <h2 className="text-sm font-semibold text-white mb-4">Informacion del proyecto</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="text-xs text-surface-400 block mb-1.5">Nombre del proyecto *</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  pattern="[a-z0-9-]+"
                  placeholder="mi-proyecto"
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-700 rounded-lg text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent text-sm transition-all"
                />
                <p className="text-[11px] text-surface-500 mt-1">Solo letras minusculas, numeros y guiones</p>
              </div>
              <div>
                <label htmlFor="desc" className="text-xs text-surface-400 block mb-1.5">Descripcion</label>
                <input
                  type="text"
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripcion del proyecto"
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-700 rounded-lg text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent text-sm transition-all"
                />
              </div>
              <div>
                <label htmlFor="type" className="text-xs text-surface-400 block mb-1.5">Tipo</label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-700 rounded-lg text-surface-200 focus:outline-none focus:ring-2 focus:ring-brand-600 text-sm"
                >
                  <option value="astro-static">Astro Static</option>
                  <option value="astro-ssr">Astro SSR</option>
                  <option value="react-spa">React SPA</option>
                  <option value="backend-worker">Backend Worker</option>
                </select>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-white mb-4">Dominio</h2>
            <div className="flex items-center gap-6 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={domainType === "default"} onChange={() => setDomainType("default")} className="accent-brand-600" />
                <span className="text-sm text-surface-300">Subdominio de veriel.dev</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={domainType === "custom"} onChange={() => setDomainType("custom")} className="accent-brand-600" />
                <span className="text-sm text-surface-300">Dominio custom</span>
              </label>
            </div>

            {domainType === "default" && name && (
              <div className="bg-surface-900 rounded-lg p-4 space-y-1">
                <p className="text-[11px] text-surface-500 mb-2">Subdominios:</p>
                <p className="text-sm"><span className="text-surface-500">DES:</span> <code className="text-sky-400">dev.{name}.veriel.dev</code></p>
                <p className="text-sm"><span className="text-surface-500">PRE:</span> <code className="text-amber-400">pre.{name}.veriel.dev</code></p>
                <p className="text-sm"><span className="text-surface-500">PRO:</span> <code className="text-emerald-400">{name}.veriel.dev</code></p>
              </div>
            )}

            {domainType === "custom" && (
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="mi-dominio.com"
                className="w-full px-3 py-2 bg-surface-900 border border-surface-700 rounded-lg text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-600 text-sm"
              />
            )}
          </Card>

          {/* Timeline (shown during/after creation) */}
          {(creating || result || error) && (
            <Card>
              <h2 className="text-sm font-semibold text-white mb-4">Progreso</h2>
              <Timeline steps={steps} />
            </Card>
          )}

          {/* Result */}
          {result && (
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <h3 className="text-sm font-semibold text-emerald-400 mb-3">Proyecto creado</h3>
              <div className="space-y-1.5 text-sm">
                <p><span className="text-surface-500">GitHub:</span> <a href={result.project?.github} target="_blank" className="text-brand-400 hover:text-brand-300">{result.project?.repo}</a></p>
                <p><span className="text-surface-500">DES:</span> <code className="text-sky-400">{result.project?.urls?.des}</code></p>
                <p><span className="text-surface-500">PRE:</span> <code className="text-amber-400">{result.project?.urls?.pre}</code></p>
                <p><span className="text-surface-500">PRO:</span> <code className="text-emerald-400">{result.project?.urls?.pro}</code></p>
              </div>
              <Link to={`/projects/${name}`} className="mt-4 inline-block">
                <Button>Ver proyecto</Button>
              </Link>
            </Card>
          )}

          {error && !creating && (
            <Card className="border-red-500/20 bg-red-500/5">
              <p className="text-sm text-red-400">{error}</p>
            </Card>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" loading={creating} disabled={!name}>
              {creating ? "Creando proyecto..." : "Crear proyecto"}
            </Button>
            <Link to="/projects"><Button variant="secondary">Cancelar</Button></Link>
          </div>
        </form>
      </div>
    </>
  );
}
