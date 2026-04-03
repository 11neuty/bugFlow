"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { MAX_PROJECT_NAME_LENGTH } from "@/lib/constants";

interface ProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { name: string }) => Promise<void>;
}

const initialState = {
  name: "",
};

export function ProjectModal({
  open,
  onClose,
  onSubmit,
}: ProjectModalProps) {
  const [formState, setFormState] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormState(initialState);
    setIsSubmitting(false);
  }, [open]);

  return (
    <Modal
      description="Create a workspace for a product area, squad, or release stream. Every issue will stay grouped under a project."
      onClose={() => {
        if (!isSubmitting) {
          onClose();
        }
      }}
      open={open}
      title="Create project"
    >
      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          setIsSubmitting(true);

          try {
            await onSubmit({
              name: formState.name,
            });
            onClose();
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <Input
          autoFocus
          label="Project name"
          maxLength={MAX_PROJECT_NAME_LENGTH}
          onChange={(event) =>
            setFormState({
              name: event.target.value,
            })
          }
          placeholder="Example: Mobile App"
          value={formState.name}
        />

        <div className="flex justify-end gap-3">
          <Button onClick={onClose} type="button" variant="ghost">
            Cancel
          </Button>
          <Button loading={isSubmitting} type="submit">
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
