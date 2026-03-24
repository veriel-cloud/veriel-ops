import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { StatsCard } from "@/components/StatsCard";
import { DeployTable } from "@/components/DeployTable";
import { SkeletonTable, SkeletonStats } from "@/components/ui/Skeleton";
import { useFetch } from "@/hooks/useFetch";

export function Deploys() {
  const { data, loading, error } = useFetch<{ deploys: any[] }>("/api/deploys");
  const [filter, setFilter] = useState<string>("all");

  const allDeploys = data?.deploys ?? [];
  const deploys = filter === "all"
    ? allDeploys
    : allDeploys.filter((d: any) => d.environment === filter || d.status === filter);

  const totalSuccess = allDeploys.filter((d: any) => d.status === "success").length;
  const totalFailed = allDeploys.filter((d: any) => d.status === "failed").length;
  const avgDuration = allDeploys.length > 0
    ? Math.round(allDeploys.reduce((sum: number, d: any) => sum + d.duration, 0) / allDeploys.length)
    : 0;

  const filters = [
    { id: "all", label: "All" },
    { id: "des", label: "DES" },
    { id: "pre", label: "PRE" },
    { id: "pro", label: "PRO" },
    { id: "failed", label: "Failed" },
  ];

  return (
    <>
      <Header title="Deployments" description="Deployment history across all projects" />

      {error && (
        <Card className="mb-6 border-[var(--color-error)]/10 bg-[var(--color-error-light)]">
          <p className="text-[13px] text-[var(--color-error-text)]">{error}</p>
        </Card>
      )}

      {loading ? (
        <div className="mb-6"><SkeletonStats count={4} /></div>
      ) : (
        <div className="grid grid-cols-4 gap-3 mb-6">
          <StatsCard label="Total" value={allDeploys.length} />
          <StatsCard label="Successful" value={totalSuccess} />
          <StatsCard label="Failed" value={totalFailed} />
          <StatsCard label="Avg duration" value={avgDuration} suffix="s" />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-1 mb-4">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
              filter === f.id
                ? "bg-[var(--color-text-primary)] text-[var(--color-bg)]"
                : "text-[var(--color-text-quaternary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card padding={false}>
        {loading ? <SkeletonTable rows={8} /> : <DeployTable deploys={deploys} />}
      </Card>
    </>
  );
}
