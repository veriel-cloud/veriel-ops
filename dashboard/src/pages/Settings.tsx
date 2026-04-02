import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSystemSettings, useSystemStatus } from "@/hooks/queries";
import { THEMES, useTheme } from "@/lib/theme-context";

export function Settings() {
  const { data: status, isLoading: statusLoading } = useSystemStatus();
  const { data: settings, isLoading: settingsLoading } = useSystemSettings();
  const { theme, setTheme } = useTheme();

  return (
    <>
      <Header title="Settings" description="System configuration" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* General */}
          <Card>
            <h2 className="text-[13px] font-medium text-[var(--color-text-primary)] mb-4">General</h2>
            {settingsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3.5 w-20" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]">
                  <span className="text-[13px] text-[var(--color-text-secondary)]">Organization</span>
                  <span className="text-[13px] text-[var(--color-text-primary)] font-mono">{settings?.org}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]">
                  <span className="text-[13px] text-[var(--color-text-secondary)]">Base domain</span>
                  <span className="text-[13px] text-[var(--color-text-primary)] font-mono">{settings?.baseDomain}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]">
                  <span className="text-[13px] text-[var(--color-text-secondary)]">Coverage threshold</span>
                  <span className="text-[13px] text-[var(--color-text-primary)] font-mono">
                    {settings?.coverageThreshold}%
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-[13px] text-[var(--color-text-secondary)]">Build retention</span>
                  <span className="text-[13px] text-[var(--color-text-quaternary)]">
                    DES: {settings?.buildRetention.des} · PRE: {settings?.buildRetention.pre} · PRO:{" "}
                    {settings?.buildRetention.pro ?? "all"}
                  </span>
                </div>
              </div>
            )}
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
                <div
                  key={wf.name}
                  className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t border-[var(--color-border)]" : ""}`}
                >
                  <div className="flex items-center gap-2.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-3.5 h-3.5 text-[var(--color-text-quaternary)]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                      <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
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
          {/* Theme */}
          <Card>
            <h3 className="text-[13px] font-medium text-[var(--color-text-primary)] mb-4">Theme</h3>
            <div className="space-y-1">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors ${
                    theme === t.id
                      ? "text-[var(--color-text-primary)] bg-[var(--color-bg-hover)]"
                      : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
                  }`}
                >
                  <span
                    className={`w-3 h-3 rounded-full border-2 ${theme === t.id ? "border-[var(--color-accent)] bg-[var(--color-accent)]" : "border-[var(--color-text-quaternary)]"}`}
                  />
                  {t.label}
                </button>
              ))}
            </div>
          </Card>

          {/* System status */}
          <Card>
            <h3 className="text-[13px] font-medium text-[var(--color-text-primary)] mb-4">System Status</h3>
            {statusLoading ? (
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
                      <span className="text-[11px] text-[var(--color-text-quaternary)] tabular-nums">
                        {svc.latency}ms
                      </span>
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
            {settingsLoading ? (
              <div className="space-y-2.5">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-20" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {settings?.templates.map((t) => (
                  <div key={t.type} className="flex items-center justify-between">
                    <span className="text-[13px] text-[var(--color-text-secondary)]">{t.label}</span>
                    <Badge variant="default">{t.template}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
