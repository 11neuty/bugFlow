export const ACCESS_TOKEN_TTL_SECONDS = 60 * 15;
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
export const REFRESH_TOKEN_COOKIE = "bugflow_refresh_token";
export const MAX_ACTIVE_REFRESH_TOKENS = 5;
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;

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
