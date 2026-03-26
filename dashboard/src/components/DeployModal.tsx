import { useState } from "react";
import { useAction } from "@/hooks/useAction";
import { useFetch } from "@/hooks/useFetch";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";

interface DeployModalProps {
  open: boolean;
  onClose: () => void;
  projectName: string;
  onSuccess: () => void;
}

export function DeployModal({ open, onClose, projectName, onSuccess }: DeployModalProps) {
  const [environment, setEnvironment] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data } = useFetch<{ branches: string[] }>(`/api/projects/${projectName}/branches`);
  const deploy = useAction<{ success: boolean }>(`/projects/${projectName}/deploy`);

  const branches = data?.branches ?? [];

  const envBranch: Record<string, string> = {
    des: "develop",
    pre: branches.find((b) => b.startsWith("release")) ?? "release/*",
    pro: "main",
  };

  async function handleDeploy() {
    const result = await deploy.execute({ environment });

    if (result?.success) {
      setSuccessMessage(`Deploy triggered for ${environment.toUpperCase()} (workflow dispatched)`);
      setEnvironment("");
      onSuccess();
    }
  }

  function handleClose() {
    setSuccessMessage(null);
    setEnvironment("");
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Manual Deploy">
      <div className="space-y-4">
        {successMessage && (
          <div className="rounded-md bg-[var(--color-success-light)] border border-[var(--color-success)]/10 p-3">
            <p className="text-[13px] text-[var(--color-success-text)]">{successMessage}</p>
          </div>
        )}

        {deploy.error && (
          <div className="rounded-md bg-[var(--color-error-light)] border border-[var(--color-error)]/10 p-3">
            <p className="text-[13px] text-[var(--color-error-text)]">{deploy.error}</p>
          </div>
        )}

        <Select
          id="env"
          label="Environment"
          value={environment}
          onChange={(e) => setEnvironment(e.target.value)}
          placeholder="Select environment"
          options={[
            { value: "des", label: "DES — Development" },
            { value: "pre", label: "PRE — Preview" },
            { value: "pro", label: "PRO — Production" },
          ]}
        />

        {environment && (
          <div className="rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] p-3 space-y-1.5">
            <p className="text-[12px] text-[var(--color-text-quaternary)]">
              Workflow: <span className="text-[var(--color-text-secondary)]">deploy-{environment}.yml</span>
            </p>
            <p className="text-[12px] text-[var(--color-text-quaternary)]">
              Branch: <code className="text-[var(--color-text-secondary)]">{envBranch[environment]}</code>
            </p>
            {branches.length > 0 && (
              <p className="text-[11px] text-[var(--color-text-quaternary)]">
                {branches.length} branches in repo
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleDeploy}
            loading={deploy.loading}
            disabled={!environment}
          >
            Deploy
          </Button>
        </div>
      </div>
    </Modal>
  );
}
