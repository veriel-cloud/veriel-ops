import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDnsRecords } from "@/hooks/queries";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface DnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
}

interface DomainManagerProps {
  projectName: string;
  currentDomain: string;
}

export function DomainManager({ projectName, currentDomain }: DomainManagerProps) {
  const queryClient = useQueryClient();
  const { data, isLoading: loading } = useDnsRecords(projectName);
  const [customDomain, setCustomDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const records = data?.records ?? [];

  async function handleSetDomain() {
    setSaving(true);
    setMessage(null);
    try {
      const result = await api.put<{ success: boolean; domains: { env: string; domain: string }[] }>(
        `/projects/${projectName}/domain`,
        { customDomain },
      );
      setMessage(`Configured ${result.domains.length} domain(s)`);
      setCustomDomain("");
      queryClient.invalidateQueries({ queryKey: ["dns", projectName] });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRecord(recordId: string) {
    setDeleting(recordId);
    try {
      await api.delete(`/projects/${projectName}/domain/${recordId}`);
      queryClient.invalidateQueries({ queryKey: ["dns", projectName] });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] text-[var(--color-text-primary)]">Current domain</p>
        <p className="text-[11px] text-[var(--color-text-quaternary)] mt-0.5">{currentDomain}</p>
      </div>

      <div className="border-t border-[var(--color-border)] pt-4">
        <p className="text-[13px] text-[var(--color-text-primary)] mb-2">Custom domain</p>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="example.com"
              hint="Sets up DNS + custom domain for all environments"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={handleSetDomain} loading={saving} disabled={!customDomain}>
            Apply
          </Button>
        </div>
        {message && <p className="text-[11px] text-[var(--color-text-quaternary)] mt-2">{message}</p>}
      </div>

      <div className="border-t border-[var(--color-border)] pt-4">
        <p className="text-[13px] text-[var(--color-text-primary)] mb-2">DNS Records</p>
        {loading ? (
          <p className="text-[11px] text-[var(--color-text-quaternary)]">Loading...</p>
        ) : records.length === 0 ? (
          <p className="text-[11px] text-[var(--color-text-quaternary)]">No DNS records found</p>
        ) : (
          <div className="space-y-1">
            {records.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between px-3 py-2 rounded-md bg-[var(--color-bg)] border border-[var(--color-border)]"
              >
                <div>
                  <p className="text-[12px] text-[var(--color-text-primary)]">{r.name}</p>
                  <p className="text-[11px] text-[var(--color-text-quaternary)]">
                    {r.type} → {r.content} {r.proxied && "(proxied)"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteRecord(r.id)}
                  loading={deleting === r.id}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
