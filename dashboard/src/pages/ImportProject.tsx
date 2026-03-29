import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useProjects } from "@/hooks/queries";
import { useImportProject } from "@/hooks/mutations";
import { cn } from "@/lib/utils";

export function ImportProject() {
  const { data: projectsData, isLoading: lp } = useProjects();
  const [selected, setSelected] = useState<string | null>(null);
  const importProject = useImportProject();
  const navigate = useNavigate();

  const registeredNames = new Set((projectsData?.projects ?? []).map((p: any) => p.name));

  async function handleImport() {
    if (!selected) return;
    try {
      await importProject.mutateAsync({ repoName: selected });
      navigate(`/projects/${selected}`);
    } catch {
      // error handled by mutation state
    }
  }

  return (
    <>
      <nav className="flex items-center gap-2 text-[13px] text-[var(--color-text-quaternary)] mb-6">
        <Link to="/projects" className="hover:text-[var(--color-text-secondary)] transition-colors">
          Projects
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-secondary)]">Import</span>
      </nav>

      <Header title="Import Project" description="Import an existing repository into veriel-ops" />

      <div className="max-w-2xl">
        {importProject.error && (
          <Card className="mb-4 border-[var(--color-error)]/10 bg-[var(--color-error-light)]">
            <p className="text-[13px] text-[var(--color-error-text)]">{importProject.error.message}</p>
          </Card>
        )}

        <Card>
          {lp ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : registeredNames.size > 0 ? (
            <div className="space-y-4">
              <p className="text-[13px] text-[var(--color-text-secondary)]">
                Select a repository to import. It will be configured with Cloudflare Pages, DNS, and CI/CD workflows.
              </p>
              <div className="space-y-1">
                {(projectsData?.projects ?? []).map((p: any) => (
                  <button
                    key={p.name}
                    type="button"
                    disabled={registeredNames.has(p.name)}
                    onClick={() => setSelected(p.name === selected ? null : p.name)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-md text-left transition-colors",
                      p.name === selected
                        ? "bg-[var(--color-bg-hover)] border border-[var(--color-border-active)]"
                        : "hover:bg-[var(--color-bg-hover)] border border-transparent",
                      registeredNames.has(p.name) && "opacity-40 cursor-not-allowed",
                    )}
                  >
                    <div>
                      <p className="text-[13px] text-[var(--color-text-primary)]">{p.name}</p>
                      <p className="text-[11px] text-[var(--color-text-quaternary)]">{p.repo}</p>
                    </div>
                    {registeredNames.has(p.name) && (
                      <span className="text-[11px] text-[var(--color-text-quaternary)]">Already managed</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="No repositories found" />
          )}
        </Card>

        <div className="flex items-center gap-2 mt-4">
          <Button size="sm" onClick={handleImport} loading={importProject.isPending} disabled={!selected}>
            Import Project
          </Button>
          <Link to="/projects">
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}
