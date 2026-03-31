import { z } from "zod";

import {
  ISSUE_SORT_FIELDS,
  MAX_COMMENT_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_ISSUE_DESCRIPTION_LENGTH,
  MAX_ISSUE_TITLE_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PAGE_SIZE,
  MAX_PASSWORD_LENGTH,
} from "@/lib/constants";

const optionalString = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(MAX_NAME_LENGTH),
  email: z
    .string()
    .trim()
    .max(MAX_EMAIL_LENGTH, "Email is too long.")
    .email("Enter a valid email address.")
    .toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(MAX_PASSWORD_LENGTH, "Password is too long."),
  role: z.enum(["ADMIN", "QA", "DEVELOPER"]).default("DEVELOPER"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .max(MAX_EMAIL_LENGTH, "Email is too long.")
    .email("Enter a valid email address.")
    .toLowerCase(),
  password: z
    .string()
    .min(1, "Password is required.")
    .max(MAX_PASSWORD_LENGTH, "Password is too long."),
});

export const createIssueSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title is required.")
    .max(MAX_ISSUE_TITLE_LENGTH),
  description: z
    .string()
    .trim()
    .min(10, "Description is required.")
    .max(MAX_ISSUE_DESCRIPTION_LENGTH),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  severity: z.enum(["LOW", "MEDIUM", "CRITICAL"]).default("MEDIUM"),
  assigneeId: optionalString,
});

export const updateIssueSchema = z
  .object({
    title: optionalString,
    description: optionalString,
    status: z.enum(["TODO", "IN_PROGRESS", "CLOSED", "REJECTED"]).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    severity: z.enum(["LOW", "MEDIUM", "CRITICAL"]).optional(),
    assigneeId: z.string().trim().nullable().optional(),
    version: z.number().int().positive("Version is required."),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.description !== undefined ||
      value.status !== undefined ||
      value.priority !== undefined ||
      value.severity !== undefined ||
      value.assigneeId !== undefined,
    {
      message: "Provide at least one field to update.",
    },
  );

export const createCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty.")
    .max(MAX_COMMENT_LENGTH),
});

export const issueQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(12),
  q: optionalString,
  status: z.enum(["TODO", "IN_PROGRESS", "CLOSED", "REJECTED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  severity: z.enum(["LOW", "MEDIUM", "CRITICAL"]).optional(),
  assigneeId: optionalString,
  sortBy: z.enum(ISSUE_SORT_FIELDS).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
