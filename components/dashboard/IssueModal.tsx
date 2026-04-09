"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/providers/ToastProvider";
import { Modal } from "@/components/ui/Modal";
import {
  MAX_ISSUE_DESCRIPTION_LENGTH,
  MAX_ISSUE_TITLE_LENGTH,
} from "@/lib/constants";
import type {
  IssueSummary,
  ProjectMemberUserSummary,
  ProjectRole,
  ProjectSummary,
} from "@/lib/types";

interface IssueModalProps {
  open: boolean;
  members: ProjectMemberUserSummary[];
  project: ProjectSummary | null;
  currentUserRole: ProjectRole;
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    description: string;
    priority: IssueSummary["priority"];
    severity: IssueSummary["severity"];
    projectId: string;
    assigneeId?: string;
  }) => Promise<void>;
}

const initialState = {
  title: "",
  description: "",
  priority: "MEDIUM" as IssueSummary["priority"],
  severity: "MEDIUM" as IssueSummary["severity"],
  assigneeId: "",
};

const initialErrors = {
  title: "",
  description: "",
  project: "",
  assigneeId: "",
};

export function IssueModal({
  open,
  members,
  project,
  currentUserRole,
  onClose,
  onSubmit,
}: IssueModalProps) {
  const { pushToast } = useToast();
  const [formState, setFormState] = useState(initialState);
  const [errors, setErrors] = useState(initialErrors);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const assignableMembers = members.filter(
    (member) => currentUserRole === "DEVELOPER" || member.projectRole !== "ADMIN",
  );

  useEffect(() => {
    if (open) {
      setFormState(initialState);
      setErrors(initialErrors);
      setIsSubmitting(false);
    }
  }, [open]);

  return (
    <Modal
      description="Capture enough detail for the assignee to act immediately. BugFlow will assign the next issue key automatically."
      onClose={() => {
        if (!isSubmitting) {
          onClose();
        }
      }}
      open={open}
      title="Create issue"
    >
      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const nextErrors = {
            title: formState.title.trim() ? "" : "Title is required.",
            description: formState.description.trim()
              ? ""
              : "Description is required.",
            project: project?.id ? "" : "Select a project first.",
            assigneeId:
              !formState.assigneeId ||
              assignableMembers.some((member) => member.id === formState.assigneeId)
                ? ""
                : "Select a valid assignee from this project.",
          };

          setErrors(nextErrors);

          if (Object.values(nextErrors).some(Boolean) || !project?.id) {
            return;
          }

          setIsSubmitting(true);

          try {
            await onSubmit({
              title: formState.title.trim(),
              description: formState.description.trim(),
              priority: formState.priority,
              severity: formState.severity,
              projectId: project.id,
              assigneeId:
                typeof formState.assigneeId === "string" && formState.assigneeId
                  ? formState.assigneeId
                  : undefined,
            });
            onClose();
          } catch (submitError) {
            pushToast({
              title: "Unable to create issue",
              description:
                submitError instanceof Error
                  ? submitError.message
                  : "Check the issue details and try again.",
              tone: "error",
            });
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Project
          </p>
          <p className="mt-2 text-sm font-medium text-slate-950">
            {project?.name ?? "Select a project first"}
          </p>
          {errors.project ? (
            <p className="mt-2 text-sm text-red-600">{errors.project}</p>
          ) : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Input
            error={errors.title}
            label="Title"
            maxLength={MAX_ISSUE_TITLE_LENGTH}
            onChange={(event) =>
              {
                setFormState((current) => ({
                  ...current,
                  title: event.target.value,
                }));
                setErrors((current) => ({
                  ...current,
                  title: "",
                }));
              }
            }
            placeholder="Example: Login redirect loops after refresh"
            value={formState.title}
          />

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Assignee</span>
            <select
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[color:var(--color-primary)]"
              onChange={(event) =>
                {
                  setFormState((current) => ({
                    ...current,
                    assigneeId: event.target.value,
                  }));
                  setErrors((current) => ({
                    ...current,
                    assigneeId: "",
                  }));
                }
              }
              value={formState.assigneeId}
            >
              <option value="">Unassigned</option>
              {assignableMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.projectRole})
                </option>
              ))}
            </select>
            {errors.assigneeId ? (
              <span className="text-xs text-red-600">{errors.assigneeId}</span>
            ) : null}
            {currentUserRole !== "DEVELOPER" ? (
              <span className="text-xs text-slate-500">
                Admin users cannot be assigned by Admin or QA accounts.
              </span>
            ) : null}
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Description</span>
          <textarea
            className="min-h-36 rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-blue-100"
            maxLength={MAX_ISSUE_DESCRIPTION_LENGTH}
            onChange={(event) =>
              {
                setFormState((current) => ({
                  ...current,
                  description: event.target.value,
                }));
                setErrors((current) => ({
                  ...current,
                  description: "",
                }));
              }
            }
            placeholder="What happened, where it happened, and what the expected behavior should be."
            value={formState.description}
          />
          {errors.description ? (
            <span className="text-sm text-red-600">{errors.description}</span>
          ) : null}
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Priority</span>
            <select
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[color:var(--color-primary)]"
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  priority: event.target.value as IssueSummary["priority"],
                }))
              }
              value={formState.priority}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Severity</span>
            <select
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[color:var(--color-primary)]"
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  severity: event.target.value as IssueSummary["severity"],
                }))
              }
              value={formState.severity}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </label>
        </div>

        <div className="flex justify-end gap-3">
          <Button onClick={onClose} type="button" variant="ghost">
            Cancel
          </Button>
          <Button disabled={!project} loading={isSubmitting} type="submit">
            Create issue
          </Button>
        </div>
      </form>
    </Modal>
  );
}
