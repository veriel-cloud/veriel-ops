import { useState } from "react";
import { usePromoteProject } from "@/hooks/mutations";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface EnvironmentState {
  version: string | null;
  status: string;
}

interface PromoteResult {
  from: string;
  to: string;
  branch?: string;
  message?: string;
  url?: string;
  repo?: string;
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
  const [result, setResult] = useState<PromoteResult | null>(null);

  const promote = usePromoteProject(projectName);

  const desActive = environments.des?.status !== "idle";
  const preActive = environments.pre?.status !== "idle";

  async function handlePromote(from: "des" | "pre") {
    const body = from === "des" ? { from, version } : { from };
    try {
      const res = await promote.mutateAsync(body);

      if (res?.success) {
        setResult({
          from: res.from,
          to: res.to,
          branch: res.branch,
          message: res.message,
          url: res.url,
          repo: res.repo,
        });
        setVersion("");
        onSuccess();
      }
    } catch {
      // error is available via promote.error
    }
  }

  function handleClose() {
    setResult(null);
    setVersion("");
    onClose();
  }

  const envLabel = { des: "DES", pre: "PRE", pro: "PRO" } as const;

  return (
    <Modal open={open} onClose={handleClose} title={result ? "Promote Complete" : "Promote"}>
      <div className="space-y-5">
        {result ? (
          <div className="rounded-md bg-[var(--color-success-light)] border border-[var(--color-success)]/10 p-4 space-y-3">
            <p className="text-[13px] font-medium text-[var(--color-success-text)]">
              {envLabel[result.from as keyof typeof envLabel]} → {envLabel[result.to as keyof typeof envLabel]}
            </p>

            <div className="space-y-1.5 text-[13px]">
              {result.branch && (
                <p>
                  <span className="text-[var(--color-text-quaternary)]">Branch </span>
                  <code className="text-[12px] text-[var(--color-text-secondary)]">{result.branch}</code>
                </p>
              )}

              {result.url && (
                <p>
                  <span className="text-[var(--color-text-quaternary)]">URL </span>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-accent-text)] hover:underline"
                  >
                    {result.url}
                  </a>
                </p>
              )}

              {result.repo && (
                <p>
                  <span className="text-[var(--color-text-quaternary)]">Repository </span>
                  <a
                    href={`https://github.com/${result.repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-accent-text)] hover:underline"
                  >
                    {result.repo}
                  </a>
                </p>
              )}

              {result.message && (
                <p className="text-[12px] text-[var(--color-text-tertiary)] mt-2">{result.message}</p>
              )}
            </div>

            <div className="pt-2">
              <Button size="sm" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <>
            {promote.error && (
              <div className="rounded-md bg-[var(--color-error-light)] border border-[var(--color-error)]/10 p-3">
                <p className="text-[13px] text-[var(--color-error-text)]">{promote.error.message}</p>
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
                    loading={promote.isPending}
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
                    loading={promote.isPending}
                  >
                    Promote
                  </Button>
                </div>
              ) : (
                <p className="text-[12px] text-[var(--color-text-quaternary)]">No active deploy in PRE</p>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
