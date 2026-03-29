import { useState } from "react";
import { useBranches } from "@/hooks/queries";
import { useCreateBranch } from "@/hooks/mutations";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";

interface BranchListProps {
  projectName: string;
}

export function BranchList({ projectName }: BranchListProps) {
  const { data, isLoading: loading, refetch } = useBranches(projectName);
  const [showCreate, setShowCreate] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [fromBranch, setFromBranch] = useState("develop");

  const createBranch = useCreateBranch(projectName);
  const branches = data?.branches ?? [];

  async function handleCreate() {
    try {
      const result = await createBranch.mutateAsync({ branch: branchName, from: fromBranch });
      if (result?.success) {
        setBranchName("");
        setShowCreate(false);
        refetch();
      }
    } catch {
      // error is available via createBranch.error
    }
  }

  return (
    <>
      <Card padding={false}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
          <span className="text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
            {branches.length} branches
          </span>
          <Button variant="secondary" size="sm" onClick={() => setShowCreate(true)}>
            New branch
          </Button>
        </div>
        {loading ? (
          <div className="px-4 py-6 text-center">
            <span className="text-[12px] text-[var(--color-text-quaternary)]">Loading...</span>
          </div>
        ) : branches.length === 0 ? (
          <EmptyState title="No branches found" />
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {branches.map((branch) => (
              <div key={branch} className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--color-bg-hover)] transition-colors">
                <code className="text-[13px] text-[var(--color-text-primary)]">{branch}</code>
                {(branch === "main" || branch === "develop") && (
                  <span className="text-[10px] text-[var(--color-text-quaternary)] bg-[var(--color-bg-hover)] px-1.5 py-0.5 rounded">
                    {branch === "main" ? "default" : "dev"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Branch">
        <div className="space-y-4">
          {createBranch.error && (
            <div className="rounded-md bg-[var(--color-error-light)] border border-[var(--color-error)]/10 p-3">
              <p className="text-[13px] text-[var(--color-error-text)]">{createBranch.error.message}</p>
            </div>
          )}
          <Input
            id="branch-name"
            label="Branch name"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            placeholder="release/v1.0.0"
          />
          <Select
            id="from-branch"
            label="From"
            value={fromBranch}
            onChange={(e) => setFromBranch(e.target.value)}
            options={branches.map((b) => ({ value: b, label: b }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate} loading={createBranch.isPending} disabled={!branchName}>
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
