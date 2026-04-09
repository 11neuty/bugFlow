"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { MAX_COMMENT_LENGTH } from "@/lib/constants";
import {
  COMMENT_MENTION_REGEX,
  extractMentionUsernames,
  findActiveMentionQuery,
  replaceTrailingMention,
} from "@/lib/comments";
import type { ProjectMemberUserSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CommentComposerProps {
  onSubmit: (content: string) => Promise<void>;
  initialValue?: string;
  label?: string;
  placeholder?: string;
  submitLabel?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
  className?: string;
  teamMembers?: ProjectMemberUserSummary[];
}

function renderMentionPreview(
  content: string,
  validMentions: ReadonlySet<string>,
) {
  const matches = Array.from(content.matchAll(COMMENT_MENTION_REGEX));

  if (matches.length === 0) {
    return content;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  matches.forEach((match, index) => {
    const mentionText = match[0];
    const username = match[1]?.toLowerCase() ?? "";
    const start = match.index ?? 0;

    if (start > cursor) {
      nodes.push(content.slice(cursor, start));
    }

    if (validMentions.has(username)) {
      nodes.push(
        <span
          className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700"
          key={`${mentionText}-${index}`}
        >
          {mentionText}
        </span>,
      );
    } else {
      nodes.push(mentionText);
    }

    cursor = start + mentionText.length;
  });

  if (cursor < content.length) {
    nodes.push(content.slice(cursor));
  }

  return nodes;
}

export function CommentComposer({
  onSubmit,
  initialValue = "",
  label = "Add comment",
  placeholder = "Leave a clear handoff note, reproduction hint, or decision.",
  submitLabel = "Post comment",
  onCancel,
  autoFocus = false,
  className,
  teamMembers = [],
}: CommentComposerProps) {
  const [content, setContent] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<ProjectMemberUserSummary[]>([]);
  const [mentions, setMentions] = useState<string[]>([]);

  const validMentionSet = useMemo(
    () =>
      new Set(teamMembers.map((member) => member.username.toLowerCase())),
    [teamMembers],
  );

  useEffect(() => {
    setContent(initialValue);
    setMentions(
      extractMentionUsernames(initialValue).filter((username) =>
        validMentionSet.has(username),
      ),
    );
    setSuggestions([]);
  }, [initialValue, validMentionSet]);

  const handleChange = (value: string) => {
    setContent(value);

    const nextMentions = extractMentionUsernames(value).filter((username) =>
      validMentionSet.has(username),
    );
    setMentions(nextMentions);

    const keyword = findActiveMentionQuery(value);

    if (keyword === null) {
      setSuggestions([]);
      return;
    }

    const filtered = teamMembers
      .filter((member) =>
        member.username.toLowerCase().includes(keyword),
      )
      .slice(0, 6);

    setSuggestions(filtered);
  };

  const handleSelectUser = (member: ProjectMemberUserSummary) => {
    const nextValue = replaceTrailingMention(content, member.username);
    handleChange(nextValue);
    setSuggestions([]);
  };

  return (
    <form
      className={cn("space-y-4", className)}
      onSubmit={async (event) => {
        event.preventDefault();

        if (!content.trim()) {
          return;
        }

        setIsSubmitting(true);

        try {
          await onSubmit(content);
          setContent("");
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="relative">
          <textarea
            autoFocus={autoFocus}
            className="min-h-32 w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-blue-100"
            maxLength={MAX_COMMENT_LENGTH}
            onBlur={() => {
              window.setTimeout(() => setSuggestions([]), 120);
            }}
            onChange={(event) => handleChange(event.target.value)}
            onFocus={() => {
              const keyword = findActiveMentionQuery(content);
              if (keyword === null) {
                return;
              }

              setSuggestions(
                teamMembers
                  .filter((member) =>
                    member.username.toLowerCase().includes(keyword),
                  )
                  .slice(0, 6),
              );
            }}
            placeholder={placeholder}
            value={content}
          />

          {suggestions.length > 0 ? (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_40px_-28px_rgba(15,23,42,0.35)]">
              {suggestions.map((member) => (
                <button
                  className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-slate-50"
                  key={member.id}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    handleSelectUser(member);
                  }}
                  type="button"
                >
                  <span className="font-medium text-slate-900">
                    {member.name}
                  </span>
                  <span className="text-slate-500">@{member.username}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </label>

      {content.trim() ? (
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Preview
            </span>
            <span className="text-xs text-slate-500">
              {mentions.length} valid mention{mentions.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {renderMentionPreview(content, new Set(mentions))}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button loading={isSubmitting} type="submit">
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
