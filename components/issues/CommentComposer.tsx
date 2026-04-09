"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { MAX_COMMENT_LENGTH } from "@/lib/constants";
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
}: CommentComposerProps) {
  const [content, setContent] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setContent(initialValue);
  }, [initialValue]);

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
        <textarea
          autoFocus={autoFocus}
          className="min-h-32 rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-blue-100"
          maxLength={MAX_COMMENT_LENGTH}
          onChange={(event) => setContent(event.target.value)}
          placeholder={placeholder}
          value={content}
        />
      </label>

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
