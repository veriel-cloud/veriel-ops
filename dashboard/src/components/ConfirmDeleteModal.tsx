import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDeleteProject } from "@/hooks/mutations";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  projectName: string;
}

export function ConfirmDeleteModal({ open, onClose, projectName }: ConfirmDeleteModalProps) {
  const [confirmation, setConfirmation] = useState("");
  const navigate = useNavigate();
  const deleteProject = useDeleteProject(projectName);

  async function handleDelete() {
    try {
      await deleteProject.mutateAsync();
      navigate("/projects");
    } catch {
      // error handled by mutation state
    }
  }

  function handleClose() {
    setConfirmation("");
    deleteProject.reset();
    onClose();
  }

  const confirmed = confirmation === projectName;

  return (
    <Modal open={open} onClose={handleClose} title="Delete Project">
      <div className="space-y-4">
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          This will archive the GitHub repository, remove DNS records, and clean up project configuration.
          This action cannot be undone.
        </p>

        {deleteProject.error && (
          <div className="rounded-md bg-[var(--color-error-light)] border border-[var(--color-error)]/10 p-3">
            <p className="text-[13px] text-[var(--color-error-text)]">{deleteProject.error.message}</p>
          </div>
        )}

        <Input
          id="confirm"
          label={`Type "${projectName}" to confirm`}
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder={projectName}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            loading={deleteProject.isPending}
            disabled={!confirmed}
          >
            Delete project
          </Button>
        </div>
      </div>
    </Modal>
  );
}
