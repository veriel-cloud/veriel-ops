import { useState } from "react";
import { useCommitFiles } from "@/hooks/mutations";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface ModifiedFile {
  path: string;
  content: string;
}

interface CommitFormProps {
  projectName: string;
  branches: string[];
  files: ModifiedFile[];
  onSuccess: () => void;
}

export function CommitForm({ projectName, branches, files, onSuccess }: CommitFormProps) {
  const [branch, setBranch] = useState(branches.includes("develop") ? "develop" : branches[0] ?? "main");
  const [message, setMessage] = useState("");

  const commit = useCommitFiles(projectName);

  async function handleCommit() {
    try {
      const result = await commit.mutateAsync({ branch, message, files });
      if (result?.success) {
        setMessage("");
        onSuccess();
      }
    } catch {
      // error is available via commit.error
    }
  }

  return (
    <div className="space-y-3 border-t border-[var(--color-border)] pt-4">
      <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
        Commit {files.length} file{files.length > 1 ? "s" : ""}
      </p>

      {commit.error && (
        <div className="rounded-md bg-[var(--color-error-light)] border border-[var(--color-error)]/10 p-2">
          <p className="text-[12px] text-[var(--color-error-text)]">{commit.error.message}</p>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Commit message"
          />
        </div>
        <Select
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          options={branches.map((b) => ({ value: b, label: b }))}
          className="w-36"
        />
      </div>

      <div className="space-y-1">
        {files.map((f) => (
          <p key={f.path} className="text-[11px] text-[var(--color-text-tertiary)]">
            <span className="text-[var(--color-success-text)]">M</span> {f.path}
          </p>
        ))}
      </div>

      <Button size="sm" onClick={handleCommit} loading={commit.isPending} disabled={!message || files.length === 0}>
        Commit changes
      </Button>
    </div>
  );
}
