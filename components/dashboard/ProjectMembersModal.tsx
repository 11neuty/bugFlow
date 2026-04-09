"use client";

import { useState } from "react";
import { ShieldCheck, Trash2, UserPlus2 } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type {
  ProjectMemberRecord,
  ProjectRole,
  ProjectSummary,
  UserSummary,
} from "@/lib/types";

interface ProjectMembersModalProps {
  open: boolean;
  project: ProjectSummary | null;
  currentUserRole: ProjectRole | null;
  members: ProjectMemberRecord[];
  availableUsers: UserSummary[];
  isLoading: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onAddMember: (input: { userId: string; role: ProjectRole }) => Promise<void>;
  onUpdateMemberRole: (memberId: string, role: ProjectRole) => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
}

const projectRoles: ProjectRole[] = ["ADMIN", "QA", "DEVELOPER", "VIEWER"];

function badgeToneForRole(role: ProjectRole) {
  switch (role) {
    case "ADMIN":
      return "red";
    case "QA":
      return "blue";
    case "DEVELOPER":
      return "green";
    default:
      return "neutral";
  }
}

export function ProjectMembersModal({
  open,
  project,
  currentUserRole,
  members,
  availableUsers,
  isLoading,
  isSubmitting,
  onClose,
  onAddMember,
  onUpdateMemberRole,
  onRemoveMember,
}: ProjectMembersModalProps) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<ProjectRole>("DEVELOPER");

  const canManage = currentUserRole === "ADMIN";

  return (
    <Modal
      description={
        project
          ? `Manage access for ${project.name}. Admin members can invite teammates, change roles, and archive the project.`
          : "Manage project access."
      }
      onClose={() => {
        if (!isSubmitting) {
          onClose();
        }
      }}
      open={open}
      title="Project access"
    >
      <div className="space-y-6">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Your project role
              </p>
              <p className="mt-2 text-base font-semibold text-slate-950">
                {currentUserRole ?? "Unknown"}
              </p>
            </div>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
              <ShieldCheck className="size-5" />
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {canManage
              ? "You can add members, update roles, and remove access from this workspace."
              : "You can view team access here, but only project admins can make changes."}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Members</h3>
              <p className="text-sm text-slate-500">
                One role per user inside this project.
              </p>
            </div>
            <Badge tone="neutral">{members.length} members</Badge>
          </div>

          <div className="max-h-[340px] space-y-3 overflow-y-auto pr-1">
            {isLoading ? (
              Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  className="min-h-24 animate-pulse rounded-[24px] bg-slate-100/80"
                />
              ))
            ) : members.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                No members found for this project.
              </div>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="rounded-[24px] border border-slate-200 px-4 py-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {member.user.name}
                      </p>
                      <p className="text-sm text-slate-500">{member.user.email}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Badge tone={badgeToneForRole(member.role)}>{member.role}</Badge>

                      <select
                        className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[color:var(--color-primary)] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        disabled={!canManage || isSubmitting}
                        onChange={(event) =>
                          void onUpdateMemberRole(
                            member.id,
                            event.target.value as ProjectRole,
                          )
                        }
                        value={member.role}
                      >
                        {projectRoles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>

                      <Button
                        disabled={!canManage || isSubmitting}
                        leadingIcon={<Trash2 className="size-4" />}
                        onClick={() => void onRemoveMember(member.id)}
                        variant="ghost"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Add member</h3>
              <p className="text-sm text-slate-500">
                Invite an existing account into this project.
              </p>
            </div>
            <UserPlus2 className="size-5 text-slate-400" />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_auto]">
            <select
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[color:var(--color-primary)] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              disabled={!canManage || isSubmitting || availableUsers.length === 0}
              onChange={(event) => setSelectedUserId(event.target.value)}
              value={selectedUserId}
            >
              <option value="">
                {availableUsers.length === 0 ? "No users available" : "Select a user"}
              </option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>

            <select
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[color:var(--color-primary)] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              disabled={!canManage || isSubmitting}
              onChange={(event) => setSelectedRole(event.target.value as ProjectRole)}
              value={selectedRole}
            >
              {projectRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>

            <Button
              disabled={!canManage || !selectedUserId || isSubmitting}
              onClick={() => void onAddMember({ userId: selectedUserId, role: selectedRole })}
            >
              Add
            </Button>
          </div>

          {!canManage ? (
            <p className="mt-3 text-xs text-slate-500">
              Only project admins can modify access.
            </p>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
