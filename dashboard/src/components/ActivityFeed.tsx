import { cn, timeAgo } from "@/lib/utils";

interface ActivityItem {
  type: "deploy" | "promote" | "rollback" | "push" | "workflow";
  environment?: string;
  version?: string;
  commitSha?: string;
  branch?: string;
  status?: string;
  timestamp: string;
  detail?: string;
}

interface ActivityFeedProps {
  deploys: ActivityItem[];
}

const typeConfig: Record<string, { icon: string; label: string; color: string }> = {
  deploy: { icon: "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M12 8l0 4 M12 16l.01 0", label: "Deploy", color: "text-[var(--color-accent)]" },
  promote: { icon: "M12 5l0 14 M18 11l-6-6 M6 11l6-6", label: "Promote", color: "text-[var(--color-env-pre)]" },
  rollback: { icon: "M9 14l-4-4l4-4 M5 10h11a4 4 0 1 1 0 8h-1", label: "Rollback", color: "text-[var(--color-warning-text)]" },
  push: { icon: "M12 5l0 14 M18 13l-6 6 M6 13l6 6", label: "Push", color: "text-[var(--color-text-tertiary)]" },
  workflow: { icon: "M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M12 7a5 5 0 1 0 5 5", label: "Workflow", color: "text-[var(--color-text-tertiary)]" },
};

function ActivityIcon({ type }: { type: string }) {
  const config = typeConfig[type] ?? typeConfig.workflow;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-4 h-4", config.color)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {config.icon.split(" M").map((d, i) => (
        <path key={i} d={i === 0 ? d : `M${d}`} />
      ))}
    </svg>
  );
}

export function ActivityFeed({ deploys }: ActivityFeedProps) {
  if (deploys.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-[13px] text-[var(--color-text-quaternary)]">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {deploys.map((item, i) => {
        const config = typeConfig[item.type] ?? typeConfig.workflow;
        const isLast = i === deploys.length - 1;

        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-[var(--color-bg-hover)] border border-[var(--color-border)]">
                <ActivityIcon type={item.type} />
              </div>
              {!isLast && <div className="w-px flex-1 min-h-4 bg-[var(--color-border)]" />}
            </div>
            <div className={cn("pb-4 pt-0.5 flex-1 min-w-0", isLast && "pb-0")}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[13px] text-[var(--color-text-primary)] font-medium">{config.label}</span>
                  {item.environment && (
                    <span
                      className={cn(
                        "text-[11px] font-medium uppercase",
                        item.environment === "des" && "text-[var(--color-env-des)]",
                        item.environment === "pre" && "text-[var(--color-env-pre)]",
                        item.environment === "pro" && "text-[var(--color-env-pro)]",
                      )}
                    >
                      {item.environment}
                    </span>
                  )}
                  {item.status && (
                    <span
                      className={cn(
                        "text-[11px]",
                        item.status === "success" && "text-[var(--color-success-text)]",
                        item.status === "failed" && "text-[var(--color-error-text)]",
                        item.status === "in_progress" && "text-[var(--color-warning-text)]",
                      )}
                    >
                      {item.status}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[var(--color-text-quaternary)] whitespace-nowrap flex-shrink-0">
                  {timeAgo(item.timestamp)}
                </span>
              </div>
              {(item.version || item.commitSha || item.branch) && (
                <div className="flex items-center gap-2 mt-0.5">
                  {item.version && (
                    <code className="text-[11px] text-[var(--color-text-tertiary)]">{item.version}</code>
                  )}
                  {item.commitSha && (
                    <code className="text-[11px] text-[var(--color-text-quaternary)]">{item.commitSha}</code>
                  )}
                  {item.branch && (
                    <span className="text-[11px] text-[var(--color-text-quaternary)]">{item.branch}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
