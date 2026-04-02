"use client";

import { Plus, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { IssueFilters } from "@/lib/types";

interface IssueFilterBarProps {
  filters: IssueFilters;
  search: string;
  isRefreshing: boolean;
  onSearchChange: (value: string) => void;
  onFiltersChange: (nextFilters: Partial<IssueFilters>) => void;
  onRefresh: () => void;
  onCreateIssue: () => void;
}

export function IssueFilterBar({
  filters,
  search,
  isRefreshing,
  onSearchChange,
  onFiltersChange,
  onRefresh,
  onCreateIssue,
}: IssueFilterBarProps) {
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px_220px_auto_auto]">
      <Input
        className="bg-white"
        label="Search"
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search title, description, or DF-0001"
        value={search}
      />

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">Priority</span>
        <select
          className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[color:var(--color-primary)]"
          onChange={(event) =>
            onFiltersChange({
              priority: (event.target.value || undefined) as IssueFilters["priority"],
            })
          }
          value={filters.priority ?? ""}
        >
          <option value="">All priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">Status</span>
        <select
          className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[color:var(--color-primary)]"
          onChange={(event) =>
            onFiltersChange({
              status: (event.target.value || undefined) as IssueFilters["status"],
            })
          }
          value={filters.status ?? ""}
        >
          <option value="">All statuses</option>
          <option value="TODO">Todo</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="DONE">Done</option>
          <option value="CLOSED">Closed</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">Sort</span>
        <select
          className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[color:var(--color-primary)]"
          onChange={(event) => {
            const [sortBy, sortOrder] = event.target.value.split(":");
            onFiltersChange({
              sortBy: sortBy as IssueFilters["sortBy"],
              sortOrder: sortOrder as IssueFilters["sortOrder"],
            });
          }}
          value={`${filters.sortBy ?? "updatedAt"}:${filters.sortOrder ?? "desc"}`}
        >
          <option value="updatedAt:desc">Recently updated</option>
          <option value="updatedAt:asc">Oldest updated</option>
          <option value="createdAt:desc">Recently created</option>
          <option value="createdAt:asc">Oldest created</option>
          <option value="priority:desc">Priority high to low</option>
          <option value="priority:asc">Priority low to high</option>
        </select>
      </label>

      <Button
        variant="secondary"
        loading={isRefreshing}
        leadingIcon={<RotateCcw className="size-4" />}
        onClick={onRefresh}
      >
        Refresh
      </Button>

      <Button leadingIcon={<Plus className="size-4" />} onClick={onCreateIssue}>
        New issue
      </Button>
    </div>
  );
}
