import { Header } from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useFetch } from "@/hooks/useFetch";

export function Settings() {
  const { data: status, loading } = useFetch<{ status: string; services: any[] }>("/api/system/status");

  return (
    <>
      <Header title="Settings" description="System configuration" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* General */}
          <Card>
            <h2 className="text-[13px] font-medium text-[var(--color-text-primary)] mb-4">General</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]">
                <span className="text-[13px] text-[var(--color-text-secondary)]">Organization</span>
                <span className="text-[13px] text-[var(--color-text-primary)] font-mono">veriel-cloud</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]">
                <span className="text-[13px] text-[var(--color-text-secondary)]">Base domain</span>
                <span className="text-[13px] text-[var(--color-text-primary)] font-mono">veriel.dev</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]">
                <span className="text-[13px] text-[var(--color-text-secondary)]">Coverage threshold</span>
                <span className="text-[13px] text-[var(--color-text-primary)] font-mono">80%</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[13px] text-[var(--color-text-secondary)]">Build retention</span>
                <span className="text-[13px] text-[var(--color-text-quaternary)]">DES: 10 · PRE: 20 · PRO: all</span>
              </div>
            </div>
          </Card>

          {/* Workflows */}
          <Card>
            <h2 className="text-[13px] font-medium text-[var(--color-text-primary)] mb-4">Reusable Workflows</h2>
            <div className="space-y-0">
              {[
                { name: "ci.yml", desc: "Lint + tests + coverage" },
                { name: "deploy-des.yml", desc: "Build + deploy to DES" },
                { name: "deploy-pre.yml", desc: "Gate + deploy to PRE" },
                { name: "deploy-pro.yml", desc: "Gate + deploy to PRO + tag" },
                { name: "rollback.yml", desc: "Restore build from R2" },
                { name: "setup-dns.yml", desc: "Create DNS records" },
                { name: "cleanup-builds.yml", desc: "Apply retention policy" },
              ].map((wf, i) => (
                <div key={wf.name} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t border-[var(--color-border)]" : ""}`}>
                  <div className="flex items-center gap-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-[var(--color-text-quaternary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
                    </svg>
                    <code className="text-[12px] text-[var(--color-text-primary)]">{wf.name}</code>
                  </div>
                  <span className="text-[11px] text-[var(--color-text-quaternary)]">{wf.desc}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          {/* System status */}
          <Card>
            <h3 className="text-[13px] font-medium text-[var(--color-text-primary)] mb-4">System Status</h3>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                ))}
              </div>
            ) : status?.services ? (
              <div className="space-y-3">
                {status.services.map((svc: any) => (
                  <div key={svc.name} className="flex items-center justify-between">
                    <span className="text-[13px] text-[var(--color-text-secondary)]">{svc.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[var(--color-text-quaternary)] tabular-nums">{svc.latency}ms</span>
                      <Badge variant={svc.status === "connected" ? "success" : "danger"} dot>
                        {svc.status === "connected" ? "OK" : "Error"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-[var(--color-text-quaternary)]">Could not check status</p>
            )}
          </Card>

          {/* Templates */}
          <Card>
            <h3 className="text-[13px] font-medium text-[var(--color-text-primary)] mb-4">Project Templates</h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[var(--color-text-secondary)]">Astro</span>
                <Badge variant="default">template-astro</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[var(--color-text-secondary)]">React</span>
                <Badge variant="default">template-react</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
