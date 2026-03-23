import { Header } from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { DeployTable } from "@/components/DeployTable";
import { SkeletonStats, SkeletonTable } from "@/components/ui/Skeleton";
import { useFetch } from "@/hooks/useFetch";

export function Deploys() {
  const { data, loading, error } = useFetch<{ deploys: any[] }>("/api/deploys");
  const deploys = data?.deploys ?? [];

  const totalSuccess = deploys.filter((d: any) => d.status === "success").length;
  const totalFailed = deploys.filter((d: any) => d.status === "failed").length;
  const avgDuration = deploys.length > 0
    ? Math.round(deploys.reduce((sum: number, d: any) => sum + d.duration, 0) / deploys.length)
    : 0;

  return (
    <>
      <Header title="Deploys" description="Historial completo de despliegues" />

      {error && (
        <Card className="mb-6 border-red-500/20 bg-red-500/5">
          <p className="text-sm text-red-400">Error: {error}</p>
        </Card>
      )}

      {loading ? (
        <div className="mb-8"><SkeletonStats /></div>
      ) : (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card>
            <span className="text-[11px] text-surface-500 uppercase tracking-wider">Total</span>
            <p className="text-2xl font-bold text-white mt-1">{deploys.length}</p>
          </Card>
          <Card>
            <span className="text-[11px] text-surface-500 uppercase tracking-wider">Exitosos</span>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{totalSuccess}</p>
          </Card>
          <Card>
            <span className="text-[11px] text-surface-500 uppercase tracking-wider">Fallidos</span>
            <p className="text-2xl font-bold text-red-400 mt-1">{totalFailed}</p>
          </Card>
          <Card>
            <span className="text-[11px] text-surface-500 uppercase tracking-wider">Duracion media</span>
            <p className="text-2xl font-bold text-white mt-1">{avgDuration}s</p>
          </Card>
        </div>
      )}

      <section>
        <h2 className="text-base font-semibold text-white mb-4">Historial</h2>
        <Card padding={false}>
          {loading ? <SkeletonTable rows={8} /> : <DeployTable deploys={deploys} />}
        </Card>
      </section>
    </>
  );
}
