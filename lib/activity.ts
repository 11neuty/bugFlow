import type { AuditAction, AuditLogRecord } from "@/lib/types";

function humanizeValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Unassigned";
  }

  if (typeof value === "string" && /^[A-Z0-9_]+$/.test(value)) {
    return value
      .toLowerCase()
      .split("_")
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");
  }

  return String(value);
}

function readMetadataValue(
  metadata: AuditLogRecord["metadata"],
  key: string,
) {
  return metadata && key in metadata ? metadata[key] : undefined;
}

export function getActivityDateLabel(date: string | Date) {
  const target = new Date(date);
  const now = new Date();
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round(
    (today.getTime() - targetDay.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: target.getFullYear() === now.getFullYear() ? undefined : "numeric",
  }).format(target);
}

export function describeActivityAction(action: AuditAction) {
  switch (action) {
    case "ISSUE_CREATED":
      return "Issue created";
    case "STATUS_CHANGED":
      return "Status changed";
    case "ASSIGNED":
    case "ASSIGNMENT_CHANGED":
      return "Assignment changed";
    case "PRIORITY_CHANGED":
      return "Priority changed";
    case "COMMENT_ADDED":
      return "Comment added";
    case "ISSUE_DELETED":
      return "Issue deleted";
    default:
      return "Activity updated";
  }
}

export function formatActivity(
  log: AuditLogRecord,
  options: { currentUserId?: string } = {},
) {
  const actor =
    options.currentUserId && log.user.id === options.currentUserId ? "You" : log.user.name;

  switch (log.action) {
    case "ISSUE_CREATED": {
      const issueKey = readMetadataValue(log.metadata, "issueKey");
      const title = readMetadataValue(log.metadata, "title");
      const subject = [issueKey, title].filter(Boolean).join(" ");
      return subject ? `${actor} created ${subject}` : `${actor} created the issue`;
    }
    case "STATUS_CHANGED":
      return `${actor} changed status from ${humanizeValue(
        readMetadataValue(log.metadata, "from"),
      )} to ${humanizeValue(readMetadataValue(log.metadata, "to"))}`;
    case "ASSIGNED":
    case "ASSIGNMENT_CHANGED": {
      const from = humanizeValue(readMetadataValue(log.metadata, "from"));
      const to = humanizeValue(readMetadataValue(log.metadata, "to"));

      if (from === "Unassigned") {
        return `${actor} assigned the issue to ${to}`;
      }

      if (to === "Unassigned") {
        return `${actor} unassigned the issue from ${from}`;
      }

      return `${actor} reassigned the issue from ${from} to ${to}`;
    }
    case "PRIORITY_CHANGED":
      return `${actor} changed priority from ${humanizeValue(
        readMetadataValue(log.metadata, "from"),
      )} to ${humanizeValue(readMetadataValue(log.metadata, "to"))}`;
    case "COMMENT_ADDED":
      return `${actor} added a comment`;
    case "ISSUE_DELETED": {
      const title = readMetadataValue(log.metadata, "title");
      return title ? `${actor} deleted ${title}` : `${actor} deleted the issue`;
    }
    default:
      return `${actor} updated the issue`;
  }
}
