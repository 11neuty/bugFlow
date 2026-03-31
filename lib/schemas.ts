import { z } from "zod";

import { ISSUE_SORT_FIELDS, MAX_PAGE_SIZE } from "@/lib/constants";

const optionalString = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(64),
  email: z.string().trim().email("Enter a valid email address.").toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72),
  role: z.enum(["ADMIN", "QA", "DEVELOPER"]).default("DEVELOPER"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").toLowerCase(),
  password: z.string().min(1, "Password is required."),
});

export const createIssueSchema = z.object({
  title: z.string().trim().min(3, "Title is required.").max(120),
  description: z.string().trim().min(10, "Description is required.").max(4000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  severity: z.enum(["LOW", "MEDIUM", "CRITICAL"]).default("MEDIUM"),
  assigneeId: optionalString,
});

export const updateIssueSchema = z
  .object({
    title: optionalString,
    description: optionalString,
    status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
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
  content: z.string().trim().min(1, "Comment cannot be empty.").max(1000),
});

export const issueQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(12),
  q: optionalString,
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  severity: z.enum(["LOW", "MEDIUM", "CRITICAL"]).optional(),
  assigneeId: optionalString,
  sortBy: z.enum(ISSUE_SORT_FIELDS).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
