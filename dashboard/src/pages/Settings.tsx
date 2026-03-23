import { Header } from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useFetch } from "@/hooks/useFetch";

export function Settings() {
  const { data: status, loading } = useFetch<{ status: string; services: any[] }>("/api/system/status");

  return (
    <>
      <Header title="Settings" description="Configuracion del sistema veriel-ops" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="text-sm font-semibold text-white mb-4">General</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-surface-400 block mb-1.5">Organizacion GitHub</label>
                <input type="text" value="veriel-cloud" readOnly className="w-full px-3 py-2 bg-surface-900 border border-surface-700 rounded-lg text-surface-200 text-sm" />
              </div>
              <div>
                <label className="text-xs text-surface-400 block mb-1.5">Dominio base</label>
                <input type="text" value="veriel.dev" readOnly className="w-full px-3 py-2 bg-surface-900 border border-surface-700 rounded-lg text-surface-200 text-sm" />
              </div>
              <div>
                <label className="text-xs text-surface-400 block mb-1.5">Cobertura minima</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={80} readOnly className="w-20 px-3 py-2 bg-surface-900 border border-surface-700 rounded-lg text-surface-200 text-sm" />
                  <span className="text-sm text-surface-500">%</span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-white mb-4">Politica de retencion</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-surface-400 block mb-1.5">DES</label>
                <span className="text-sm text-white">10 builds</span>
              </div>
              <div>
                <label className="text-xs text-surface-400 block mb-1.5">PRE</label>
                <span className="text-sm text-white">20 builds</span>
              </div>
              <div>
                <label className="text-xs text-surface-400 block mb-1.5">PRO</label>
                <span className="text-sm text-white">Todas</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">Estado del sistema</h3>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : status?.services ? (
              <div className="space-y-3">
                {status.services.map((svc: any) => (
                  <div key={svc.name} className="flex items-center justify-between">
                    <span className="text-sm text-surface-400">{svc.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-surface-500">{svc.latency}ms</span>
                      <Badge variant={svc.status === "connected" ? "success" : "danger"}>
                        {svc.status === "connected" ? "OK" : "Error"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-surface-500">No se pudo verificar</p>
            )}
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">Workflows</h3>
            <div className="space-y-1.5">
              {["ci.yml", "deploy-des.yml", "deploy-pre.yml", "deploy-pro.yml", "rollback.yml", "setup-dns.yml", "cleanup-builds.yml"].map((wf) => (
                <div key={wf} className="flex items-center gap-2 py-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-surface-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
                  </svg>
                  <code className="text-xs text-surface-300">{wf}</code>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
