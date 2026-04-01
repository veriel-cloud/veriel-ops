import { useRef, useState } from "react";
import { usePromoteProject } from "@/hooks/mutations";
import { useDeploysStream } from "@/hooks/useDeploysStream";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { Environment } from "@veriel-ops/shared";

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
  const promoteTimestamp = useRef<string | null>(null);

  const promote = usePromoteProject(projectName);

  // Only connect to SSE after a successful promote
  const { deploys } = useDeploysStream(!!result);

  // Find a deploy that started AFTER the promote for the target env
  const targetDeploy = result
    ? deploys.find(
        (d) =>
          d.project === projectName &&
          d.environment === (result.to as Environment) &&
          promoteTimestamp.current &&
          d.timestamp > promoteTimestamp.current,
      )
    : null;

  const desActive = environments.des?.status !== "idle";
  const preActive = environments.pre?.status !== "idle";

  async function handlePromote(from: "des" | "pre") {
    const body = from === "des" ? { from, version } : { from };
    try {
      const res = await promote.mutateAsync(body);

      if (res?.success) {
        promoteTimestamp.current = new Date().toISOString();
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
    promoteTimestamp.current = null;
    setVersion("");
    onClose();
  }

  const envLabel = { des: "DES", pre: "PRE", pro: "PRO" } as const;

  return (
    <Modal open={open} onClose={handleClose} title={result ? "Promote Complete" : "Promote"}>
      <div className="space-y-5">
        {result ? (
          <>
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
            </div>

            {/* Deploy tracking */}
            <DeployStatus deploy={targetDeploy} />

            <div className="flex justify-end">
              <Button size="sm" onClick={handleClose}>
                Close
              </Button>
            </div>
          </>
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

function DeployStatus({ deploy }: { deploy: { status: string; duration: number; htmlUrl: string } | null | undefined }) {
  if (!deploy) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] p-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-text-quaternary)] opacity-50" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-text-quaternary)]" />
        </span>
        <span className="text-[12px] text-[var(--color-text-tertiary)]">Waiting for deploy to start...</span>
      </div>
    );
  }

  if (deploy.status === "in_progress") {
    return (
      <div className="flex items-center gap-2 rounded-md bg-[var(--color-warning-light)] border border-[var(--color-warning)]/10 p-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-warning)] opacity-50" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-warning)]" />
        </span>
        <span className="text-[12px] text-[var(--color-warning-text)]">Deploying...</span>
        {deploy.htmlUrl && (
          <a
            href={deploy.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-[11px] text-[var(--color-accent-text)] hover:underline"
          >
            View workflow →
          </a>
        )}
      </div>
    );
  }

  if (deploy.status === "success") {
    const seconds = deploy.duration > 0 ? Math.round(deploy.duration / 1000) : null;
    return (
      <div className="flex items-center gap-2 rounded-md bg-[var(--color-success-light)] border border-[var(--color-success)]/10 p-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-3.5 h-3.5 text-[var(--color-success)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12l5 5l10 -10" />
        </svg>
        <span className="text-[12px] text-[var(--color-success-text)]">
          Deploy complete{seconds ? ` in ${seconds}s` : ""}
        </span>
        {deploy.htmlUrl && (
          <a
            href={deploy.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-[11px] text-[var(--color-accent-text)] hover:underline"
          >
            View workflow →
          </a>
        )}
      </div>
    );
  }

  // failed
  return (
    <div className="flex items-center gap-2 rounded-md bg-[var(--color-error-light)] border border-[var(--color-error)]/10 p-3">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-3.5 h-3.5 text-[var(--color-error)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 6l-12 12" />
        <path d="M6 6l12 12" />
      </svg>
      <span className="text-[12px] text-[var(--color-error-text)]">Deploy failed</span>
      {deploy.htmlUrl && (
        <a
          href={deploy.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-[11px] text-[var(--color-accent-text)] hover:underline"
        >
          View workflow →
        </a>
      )}
    </div>
  );
}
