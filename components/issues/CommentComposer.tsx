"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { MAX_COMMENT_LENGTH } from "@/lib/constants";

interface CommentComposerProps {
  onSubmit: (content: string) => Promise<void>;
}

export function CommentComposer({ onSubmit }: CommentComposerProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      className="space-y-4"
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
        <span className="text-sm font-medium text-slate-700">Add comment</span>
        <textarea
          className="min-h-32 rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-blue-100"
          maxLength={MAX_COMMENT_LENGTH}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Leave a clear handoff note, reproduction hint, or decision."
          value={content}
        />
      </label>

      <Button loading={isSubmitting} type="submit">
        Post comment
      </Button>
    </form>
  );
}
