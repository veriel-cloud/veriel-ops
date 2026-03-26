import { useMemo, useState } from "react";
import { useAction } from "@/hooks/useAction";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";

interface Build {
  name: string;
  project: string;
  environment: string;
  version: string;
  commitSha: string;
  size: number;
  lastModified: string;
}

interface RollbackModalProps {
  open: boolean;
  onClose: () => void;
  projectName: string;
  builds: Build[];
  onSuccess: () => void;
}

export function RollbackModal({ open, onClose, projectName, builds, onSuccess }: RollbackModalProps) {
  const [environment, setEnvironment] = useState("");
  const [buildArtifact, setBuildArtifact] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const rollback = useAction<{ success: boolean }>(`/projects/${projectName}/rollback`);

  const filteredBuilds = useMemo(
    () => (environment ? builds.filter((b) => b.environment === environment) : []),
    [builds, environment],
  );

  const buildOptions = filteredBuilds.map((b) => ({
    value: b.name,
    label: `${b.version} (${b.commitSha.slice(0, 7)})`,
  }));

  async function handleRollback() {
    const result = await rollback.execute({ environment, buildArtifact });

    if (result?.success) {
      setSuccessMessage(`Rollback triggered for ${environment.toUpperCase()} → ${buildArtifact}`);
      setEnvironment("");
      setBuildArtifact("");
      onSuccess();
    }
  }

  function handleClose() {
    setSuccessMessage(null);
    setEnvironment("");
    setBuildArtifact("");
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Rollback">
      <div className="space-y-4">
        {successMessage && (
          <div className="rounded-md bg-[var(--color-success-light)] border border-[var(--color-success)]/10 p-3">
            <p className="text-[13px] text-[var(--color-success-text)]">{successMessage}</p>
          </div>
        )}

        {rollback.error && (
          <div className="rounded-md bg-[var(--color-error-light)] border border-[var(--color-error)]/10 p-3">
            <p className="text-[13px] text-[var(--color-error-text)]">{rollback.error}</p>
          </div>
        )}

        <Select
          id="env"
          label="Environment"
          value={environment}
          onChange={(e) => {
            setEnvironment(e.target.value);
            setBuildArtifact("");
          }}
          placeholder="Select environment"
          options={[
            { value: "des", label: "DES" },
            { value: "pre", label: "PRE" },
            { value: "pro", label: "PRO" },
          ]}
        />

        {environment && (
          <Select
            id="build"
            label="Build artifact"
            value={buildArtifact}
            onChange={(e) => setBuildArtifact(e.target.value)}
            placeholder={filteredBuilds.length ? "Select build" : "No builds available"}
            options={buildOptions}
            disabled={!filteredBuilds.length}
            hint={filteredBuilds.length ? `${filteredBuilds.length} builds available` : undefined}
          />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleRollback}
            loading={rollback.loading}
            disabled={!environment || !buildArtifact}
          >
            Rollback
          </Button>
        </div>
      </div>
    </Modal>
  );
}
