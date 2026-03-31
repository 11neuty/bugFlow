"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
} from "@/lib/constants";
import type { Role } from "@/lib/types";

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    email: string;
    password: string;
    role: Role;
  }) => Promise<void>;
}

const initialState = {
  name: "",
  email: "",
  password: "",
  role: "DEVELOPER" as Role,
};

export function UserModal({ open, onClose, onSubmit }: UserModalProps) {
  const [formState, setFormState] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormState(initialState);
      setIsSubmitting(false);
    }
  }, [open]);

  return (
    <Modal
      description="Create a workspace account with the right role from the start."
      onClose={() => {
        if (!isSubmitting) {
          onClose();
        }
      }}
      open={open}
      title="Create user"
    >
      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          setIsSubmitting(true);

          try {
            await onSubmit(formState);
            onClose();
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Input
            label="Name"
            maxLength={MAX_NAME_LENGTH}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            placeholder="Example: Sarah Chen"
            required
            value={formState.name}
          />

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Role</span>
            <select
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[color:var(--color-primary)]"
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  role: event.target.value as Role,
                }))
              }
              value={formState.role}
            >
              <option value="DEVELOPER">Developer</option>
              <option value="QA">QA</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
        </div>

        <Input
          autoComplete="email"
          label="Email"
          maxLength={MAX_EMAIL_LENGTH}
          onChange={(event) =>
            setFormState((current) => ({
              ...current,
              email: event.target.value,
            }))
          }
          placeholder="name@company.com"
          required
          type="email"
          value={formState.email}
        />

        <Input
          autoComplete="new-password"
          hint="Passwords use bcrypt, so they are capped at 72 characters."
          label="Password"
          maxLength={MAX_PASSWORD_LENGTH}
          minLength={8}
          onChange={(event) =>
            setFormState((current) => ({
              ...current,
              password: event.target.value,
            }))
          }
          placeholder="Set a temporary password"
          required
          type="password"
          value={formState.password}
        />

        <div className="flex justify-end gap-3">
          <Button onClick={onClose} type="button" variant="ghost">
            Cancel
          </Button>
          <Button loading={isSubmitting} type="submit">
            Create user
          </Button>
        </div>
      </form>
    </Modal>
  );
}
