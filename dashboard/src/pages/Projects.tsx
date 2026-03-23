import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { ProjectCard } from "@/components/ProjectCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { EnvironmentBadge } from "@/components/EnvironmentBadge";
import { useFetch } from "@/hooks/useFetch";
import { timeAgo } from "@/lib/utils";

export function Projects() {
  const { data, loading, error } = useFetch<{ projects: any[] }>("/api/projects");
  const projects = data?.projects ?? [];

  return (
    <>
      <Header
        title="Proyectos"
        description={`${projects.length} proyectos registrados`}
        actions={
          <Link to="/projects/new">
            <Button icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5l0 14" /><path d="M5 12l14 0" />
              </svg>
            }>
              Nuevo proyecto
            </Button>
          </Link>
        }
      />

      {error && (
        <Card className="mb-6 border-red-500/20 bg-red-500/5">
          <p className="text-sm text-red-400">Error: {error}</p>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : projects.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {projects.map((p: any) => <ProjectCard key={p.name} project={p} />)}
          </div>

          <h2 className="text-base font-semibold text-white mb-4">Vista detallada</h2>
          <Card padding={false}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700 text-left">
                  <th className="pb-2.5 pt-3 pl-4 pr-2 text-[11px] font-medium text-surface-500 uppercase tracking-wider">Proyecto</th>
                  <th className="pb-2.5 pt-3 px-2 text-[11px] font-medium text-surface-500 uppercase tracking-wider">DES</th>
                  <th className="pb-2.5 pt-3 px-2 text-[11px] font-medium text-surface-500 uppercase tracking-wider">PRE</th>
                  <th className="pb-2.5 pt-3 px-2 text-[11px] font-medium text-surface-500 uppercase tracking-wider">PRO</th>
                  <th className="pb-2.5 pt-3 px-2 text-[11px] font-medium text-surface-500 uppercase tracking-wider">Dominio</th>
                  <th className="pb-2.5 pt-3 px-2 pr-4 text-[11px] font-medium text-surface-500 uppercase tracking-wider">Creado</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p: any) => (
                  <tr key={p.name} className="border-b border-surface-700/30 hover:bg-surface-800/50 transition-colors">
                    <td className="py-2.5 pl-4 pr-2">
                      <Link to={`/projects/${p.name}`} className="font-medium text-surface-200 hover:text-brand-400 transition-colors text-[13px]">
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-2.5 px-2"><EnvironmentBadge environment="des" status={p.environments?.des?.status ?? "idle"} /></td>
                    <td className="py-2.5 px-2"><EnvironmentBadge environment="pre" status={p.environments?.pre?.status ?? "idle"} /></td>
                    <td className="py-2.5 px-2"><EnvironmentBadge environment="pro" status={p.environments?.pro?.status ?? "idle"} /></td>
                    <td className="py-2.5 px-2"><span className="text-xs text-surface-400">{p.domain}</span></td>
                    <td className="py-2.5 px-2 pr-4"><span className="text-xs text-surface-400">{p.createdAt ? timeAgo(p.createdAt) : "—"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      ) : (
        <Card className="text-center py-16">
          <div className="w-14 h-14 mx-auto rounded-full bg-surface-700 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-surface-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 4h3l2 2h5a2 2 0 0 1 2 2v7a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2" />
            </svg>
          </div>
          <p className="text-surface-400 mb-4">No hay proyectos registrados</p>
          <Link to="/projects/new"><Button>Crear primer proyecto</Button></Link>
        </Card>
      )}
    </>
  );
}
