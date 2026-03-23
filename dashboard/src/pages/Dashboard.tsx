import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { ProjectCard } from "@/components/ProjectCard";
import { DeployTable } from "@/components/DeployTable";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SkeletonCard, SkeletonStats, SkeletonTable } from "@/components/ui/Skeleton";
import { useFetch } from "@/hooks/useFetch";

export function Dashboard() {
  const { data: projectsData, loading: loadingProjects, error: projectsError } = useFetch<{ projects: any[] }>("/api/projects");
  const { data: deploysData, loading: loadingDeploys } = useFetch<{ deploys: any[] }>("/api/deploys");

  const projects = projectsData?.projects ?? [];
  const deploys = deploysData?.deploys ?? [];

  const totalBuilds = projects.reduce((sum: number, p: any) => sum + (p.builds?.des ?? 0) + (p.builds?.pre ?? 0) + (p.builds?.pro ?? 0), 0);

  return (
    <>
      <Header
        title="Dashboard"
        description="Vista general de todos los proyectos y despliegues"
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

      {projectsError && (
        <Card className="mb-8 border-red-500/20 bg-red-500/5">
          <p className="text-sm text-red-400">Error cargando datos: {projectsError}</p>
          <p className="text-xs text-surface-500 mt-1">Verifica las variables de entorno en .env</p>
        </Card>
      )}

      {/* Stats */}
      {loadingProjects ? (
        <div className="mb-8"><SkeletonStats /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
          <StatsCard label="Proyectos" value={projects.length} />
          <StatsCard label="Deploys recientes" value={deploys.length} />
          <StatsCard label="Cobertura media" value="—" />
          <StatsCard label="Entornos activos" value={`${projects.length * 3}`} variant="success" />
          <StatsCard label="Tasa de exito" value="—" />
          <StatsCard label="Builds almacenadas" value={totalBuilds} />
        </div>
      )}

      {/* Projects */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Proyectos</h2>
          <Link to="/projects" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">Ver todos</Link>
        </div>
        {loadingProjects ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((p: any) => <ProjectCard key={p.name} project={p} />)}
          </div>
        ) : (
          <Card className="text-center py-12">
            <p className="text-surface-500 mb-4">No hay proyectos registrados</p>
            <Link to="/projects/new"><Button>Crear primer proyecto</Button></Link>
          </Card>
        )}
      </section>

      {/* Recent deploys */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Deploys recientes</h2>
          <Link to="/deploys" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">Ver todos</Link>
        </div>
        <Card padding={false}>
          {loadingDeploys ? <SkeletonTable /> : <DeployTable deploys={deploys} limit={8} />}
        </Card>
      </section>
    </>
  );
}
