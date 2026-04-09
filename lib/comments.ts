import { MAX_COMMENT_MENTIONS } from "@/lib/constants";

export const COMMENT_MENTION_REGEX = /@([a-zA-Z0-9_]+)/g;
const ACTIVE_MENTION_REGEX = /@([a-zA-Z0-9_]*)$/;

export function extractMentionUsernames(content: string) {
  const usernames = new Set<string>();

  for (const match of content.matchAll(COMMENT_MENTION_REGEX)) {
    const username = match[1]?.toLowerCase();

    if (!username) {
      continue;
    }

    usernames.add(username);

    if (usernames.size >= MAX_COMMENT_MENTIONS) {
      break;
    }
  }

  return Array.from(usernames);
}

export function findActiveMentionQuery(content: string) {
  const match = content.match(ACTIVE_MENTION_REGEX);
  return match?.[1]?.toLowerCase() ?? null;
}

export function replaceTrailingMention(content: string, username: string) {
  return content.replace(ACTIVE_MENTION_REGEX, `@${username} `);
}
