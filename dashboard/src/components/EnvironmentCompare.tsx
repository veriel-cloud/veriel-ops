import { cn } from "@/lib/utils";

interface EnvironmentState {
  version: string | null;
  commitSha: string | null;
  status: string;
  lastDeployAt: string | null;
}

interface EnvironmentCompareProps {
  environments: Record<"des" | "pre" | "pro", EnvironmentState>;
}

const envConfig = {
  des: { label: "DES", color: "text-[var(--color-env-des)]", border: "border-[var(--color-env-des)]" },
  pre: { label: "PRE", color: "text-[var(--color-env-pre)]", border: "border-[var(--color-env-pre)]" },
  pro: { label: "PRO", color: "text-[var(--color-env-pro)]", border: "border-[var(--color-env-pro)]" },
} as const;

function isAhead(source: EnvironmentState, target: EnvironmentState): boolean {
  if (source.status === "idle" || target.status === "idle") return false;
  if (!source.lastDeployAt || !target.lastDeployAt) return false;
  return source.commitSha !== target.commitSha && new Date(source.lastDeployAt) > new Date(target.lastDeployAt);
}

export function EnvironmentCompare({ environments }: EnvironmentCompareProps) {
  const envs = ["des", "pre", "pro"] as const;
  const desAheadOfPre = isAhead(environments.des, environments.pre);
  const preAheadOfPro = isAhead(environments.pre, environments.pro);

  return (
    <div className="flex items-center gap-2 px-1">
      {envs.map((env, i) => {
        const config = envConfig[env];
        const data = environments[env];
        const isIdle = data.status === "idle";
        const showAhead =
          (env === "des" && desAheadOfPre) ||
          (env === "pre" && preAheadOfPro);

        return (
          <div key={env} className="flex items-center gap-2 flex-1">
            <div
              className={cn(
                "flex-1 rounded-md border px-3 py-2",
                isIdle ? "border-[var(--color-border)] opacity-50" : `border-[var(--color-border)]`,
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn("text-[11px] font-semibold uppercase tracking-wider", config.color)}>
                  {config.label}
                </span>
                {showAhead && (
                  <span className="text-[10px] font-medium text-[var(--color-warning-text)] bg-[var(--color-warning-text)]/10 px-1.5 py-0.5 rounded">
                    Ahead
                  </span>
                )}
              </div>
              {isIdle ? (
                <p className="text-[11px] text-[var(--color-text-quaternary)]">No deploy</p>
              ) : (
                <code className="text-[11px] text-[var(--color-text-tertiary)]">
                  {data.commitSha ?? data.version ?? "—"}
                </code>
              )}
            </div>

            {i < envs.length - 1 && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-3.5 h-3.5 text-[var(--color-text-quaternary)] flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 6l6 6l-6 6" />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}
