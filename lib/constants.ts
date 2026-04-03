export const ACCESS_TOKEN_TTL_SECONDS = 60 * 15;
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
export const REFRESH_TOKEN_COOKIE = "bugflow_refresh_token";
export const MAX_ACTIVE_REFRESH_TOKENS = 5;
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;
export const MAX_NAME_LENGTH = 64;
export const MAX_PROJECT_NAME_LENGTH = 80;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_PASSWORD_LENGTH = 72;
export const MAX_ISSUE_TITLE_LENGTH = 120;
export const MAX_ISSUE_DESCRIPTION_LENGTH = 4000;
export const MAX_COMMENT_LENGTH = 1000;
export const ACTIVITY_LOG_LIMIT = 50;
export const NOTIFICATION_LIMIT = 20;

export const ISSUE_SORT_FIELDS = ["createdAt", "updatedAt", "priority"] as const;

export const RATE_LIMITS = {
  api: {
    limit: 100,
    windowMs: 5 * 60 * 1000,
  },
  login: {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  },
} as const;
