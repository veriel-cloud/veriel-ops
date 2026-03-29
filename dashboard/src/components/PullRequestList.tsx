import { usePullRequests } from "@/hooks/queries";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, timeAgo } from "@/lib/utils";

interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  branch: string;
  baseBranch: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
  draft: boolean;
}

interface PullRequestListProps {
  projectName: string;
}

export function PullRequestList({ projectName }: PullRequestListProps) {
  const { data, isLoading: loading } = usePullRequests(projectName);
  const prs = data?.pullRequests ?? [];

  return (
    <Card padding={false}>
      {loading ? (
        <div className="px-4 py-6 text-center">
          <span className="text-[12px] text-[var(--color-text-quaternary)]">Loading...</span>
        </div>
      ) : prs.length === 0 ? (
        <EmptyState title="No open pull requests" />
      ) : (
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="text-left py-2.5 px-4 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
                Title
              </th>
              <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
                Branch
              </th>
              <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
                Author
              </th>
              <th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
                Updated
              </th>
            </tr>
          </thead>
          <tbody>
            {prs.map((pr) => (
              <tr
                key={pr.id}
                className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-hover)] transition-colors duration-100"
              >
                <td className="py-2.5 px-4">
                  <a
                    href={pr.htmlUrl}
                    target="_blank"
                    rel="noopener"
                    className="text-[var(--color-text-primary)] hover:underline"
                  >
                    <span className={cn(pr.draft && "text-[var(--color-text-tertiary)]")}>
                      {pr.draft && "Draft: "}
                      {pr.title}
                    </span>
                  </a>
                  <span className="text-[11px] text-[var(--color-text-quaternary)] ml-1.5">#{pr.number}</span>
                </td>
                <td className="py-2.5 px-3">
                  <code className="text-[11px] text-[var(--color-text-tertiary)]">
                    {pr.branch} → {pr.baseBranch}
                  </code>
                </td>
                <td className="py-2.5 px-3">
                  <span className="text-[12px] text-[var(--color-text-secondary)]">{pr.author}</span>
                </td>
                <td className="py-2.5 px-3">
                  <span className="text-[12px] text-[var(--color-text-quaternary)]">{timeAgo(pr.updatedAt)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
