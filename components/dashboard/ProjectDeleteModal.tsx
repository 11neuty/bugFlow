"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { ProjectSummary } from "@/lib/types";

interface ProjectDeleteModalProps {
  open: boolean;
  isSubmitting?: boolean;
  project: ProjectSummary | null;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}

export function ProjectDeleteModal({
  open,
  isSubmitting = false,
  project,
  onClose,
  onSubmit,
}: ProjectDeleteModalProps) {
  if (!project) {
    return null;
  }

  return (
    <Modal
      description={`All issues in ${project.name} will be moved into Default Project before this workspace is archived.`}
      onClose={() => {
        if (!isSubmitting) {
          onClose();
        }
      }}
      open={open}
      title="Delete project"
    >
      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          await onSubmit();
        }}
      >
        <div className="rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">This action cannot be undone.</p>
          <p className="mt-2">
            The project will be soft-deleted, hidden from the selector, and every
            linked issue will be reassigned safely.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button disabled={isSubmitting} onClick={onClose} type="button" variant="ghost">
            Cancel
          </Button>
          <Button loading={isSubmitting} type="submit" variant="danger">
            Delete project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
