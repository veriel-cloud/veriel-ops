import { useState } from "react";
import { useAction } from "@/hooks/useAction";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface EnvironmentState {
  version: string | null;
  status: string;
}

interface PromoteModalProps {
  open: boolean;
  onClose: () => void;
  projectName: string;
  environments: Record<"des" | "pre" | "pro", EnvironmentState>;
  onSuccess: () => void;
}

export function PromoteModal({ open, onClose, projectName, environments, onSuccess }: PromoteModalProps) {
  const [version, setVersion] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const promote = useAction<{ success: boolean; from: string; to: string; branch?: string; message?: string }>(
    `/projects/${projectName}/promote`,
  );

  const desActive = environments.des?.status !== "idle";
  const preActive = environments.pre?.status !== "idle";

  async function handlePromote(from: "des" | "pre") {
    const body = from === "des" ? { from, version } : { from };
    const result = await promote.execute(body);

    if (result?.success) {
      setSuccessMessage(
        from === "des"
          ? `Branch release/${version} created. Deploy to PRE will start automatically.`
          : result.message ?? "Merge release to main via PR to deploy to PRO.",
      );
      setVersion("");
      onSuccess();
    }
  }

  function handleClose() {
    setSuccessMessage(null);
    setVersion("");
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Promote">
      <div className="space-y-5">
        {successMessage && (
          <div className="rounded-md bg-[var(--color-success-light)] border border-[var(--color-success)]/10 p-3">
            <p className="text-[13px] text-[var(--color-success-text)]">{successMessage}</p>
          </div>
        )}

        {promote.error && (
          <div className="rounded-md bg-[var(--color-error-light)] border border-[var(--color-error)]/10 p-3">
            <p className="text-[13px] text-[var(--color-error-text)]">{promote.error}</p>
          </div>
        )}

        {/* DES → PRE */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-[var(--color-env-des)]">DES</span>
            <span className="text-[var(--color-text-quaternary)]">→</span>
            <span className="text-[12px] font-medium text-[var(--color-env-pre)]">PRE</span>
          </div>

          {desActive ? (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  id="version"
                  label="Version"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="v1.0.0"
                  hint="Creates release/{version} branch from develop"
                />
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handlePromote("des")}
                loading={promote.loading}
                disabled={!version}
              >
                Promote
              </Button>
            </div>
          ) : (
            <p className="text-[12px] text-[var(--color-text-quaternary)]">No active deploy in DES</p>
          )}
        </div>

        <div className="border-t border-[var(--color-border)]" />

        {/* PRE → PRO */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-[var(--color-env-pre)]">PRE</span>
            <span className="text-[var(--color-text-quaternary)]">→</span>
            <span className="text-[12px] font-medium text-[var(--color-env-pro)]">PRO</span>
          </div>

          {preActive ? (
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-[var(--color-text-tertiary)]">
                Merge the release branch to main via Pull Request
              </p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handlePromote("pre")}
                loading={promote.loading}
              >
                Promote
              </Button>
            </div>
          ) : (
            <p className="text-[12px] text-[var(--color-text-quaternary)]">No active deploy in PRE</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
