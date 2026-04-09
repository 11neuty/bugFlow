import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  AuthUser,
  IssueStatus,
  MetricsOverviewPayload,
  TrendPoint,
} from "@/lib/types";
import { requireProjectMembership } from "@/services/project-members-service";
import { serializeProject } from "@/services/serializers";

const METRIC_STATUSES: IssueStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "CLOSED",
  "REJECTED",
];

interface ResolutionAggregateRow {
  averageResolutionHours: number | string | Prisma.Decimal | null;
  resolutionSampleSize: bigint | number;
}

interface TrendAggregateRow {
  day: Date;
  count: bigint | number;
}

function toNumber(value: bigint | number) {
  return typeof value === "bigint" ? Number(value) : value;
}

function toNullableNumber(value: number | string | Prisma.Decimal | null) {
  if (value === null) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number.parseFloat(value.toString());
  return Number.isFinite(parsed) ? parsed : null;
}

function formatTrendDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getUtcStartOfDay(date = new Date()) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function buildTrend(
  trendStart: Date,
  createdRows: TrendAggregateRow[],
  resolvedRows: TrendAggregateRow[],
): TrendPoint[] {
  const createdMap = new Map(
    createdRows.map((row) => [formatTrendDate(row.day), toNumber(row.count)]),
  );
  const resolvedMap = new Map(
    resolvedRows.map((row) => [formatTrendDate(row.day), toNumber(row.count)]),
  );

  const start = new Date(trendStart);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    const key = formatTrendDate(day);

    return {
      date: key,
      created: createdMap.get(key) ?? 0,
      resolved: resolvedMap.get(key) ?? 0,
    };
  });
}

export async function getMetricsOverview(
  user: AuthUser,
  projectId: string,
): Promise<MetricsOverviewPayload> {
  const membership = await requireProjectMembership(prisma, user.id, projectId);
  const trendStart = getUtcStartOfDay();
  trendStart.setUTCDate(trendStart.getUTCDate() - 6);

  const [statusRows, resolutionRows, createdRows, resolvedRows] = await Promise.all([
    prisma.issue.groupBy({
      by: ["status"],
      where: {
        projectId,
        deletedAt: null,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.$queryRaw<ResolutionAggregateRow[]>(Prisma.sql`
      SELECT
        AVG(EXTRACT(EPOCH FROM ("done_at"."firstDoneAt" - i."createdAt")) / 3600.0) AS "averageResolutionHours",
        COUNT(*)::bigint AS "resolutionSampleSize"
      FROM "Issue" i
      JOIN LATERAL (
        SELECT MIN(al."createdAt") AS "firstDoneAt"
        FROM "AuditLog" al
        WHERE al."issueId" = i."id"
          AND al."action" = 'STATUS_CHANGED'
          AND al."metadata" ->> 'to' = 'DONE'
      ) AS "done_at" ON "done_at"."firstDoneAt" IS NOT NULL
      WHERE i."projectId" = ${projectId}
        AND i."deletedAt" IS NULL
    `),
    prisma.$queryRaw<TrendAggregateRow[]>(Prisma.sql`
      SELECT
        DATE_TRUNC('day', i."createdAt")::date AS "day",
        COUNT(*)::bigint AS "count"
      FROM "Issue" i
      WHERE i."projectId" = ${projectId}
        AND i."deletedAt" IS NULL
        AND i."createdAt" >= ${trendStart}
      GROUP BY 1
      ORDER BY 1 ASC
    `),
    prisma.$queryRaw<TrendAggregateRow[]>(Prisma.sql`
      SELECT
        DATE_TRUNC('day', "done_at"."firstDoneAt")::date AS "day",
        COUNT(*)::bigint AS "count"
      FROM "Issue" i
      JOIN LATERAL (
        SELECT MIN(al."createdAt") AS "firstDoneAt"
        FROM "AuditLog" al
        WHERE al."issueId" = i."id"
          AND al."action" = 'STATUS_CHANGED'
          AND al."metadata" ->> 'to' = 'DONE'
      ) AS "done_at" ON "done_at"."firstDoneAt" IS NOT NULL
      WHERE i."projectId" = ${projectId}
        AND i."deletedAt" IS NULL
        AND "done_at"."firstDoneAt" >= ${trendStart}
      GROUP BY 1
      ORDER BY 1 ASC
    `),
  ]);

  const countByStatus = new Map<IssueStatus, number>(
    statusRows.map((row) => [row.status as IssueStatus, row._count._all]),
  );

  const totalIssues = Array.from(countByStatus.values()).reduce(
    (sum, count) => sum + count,
    0,
  );
  const activeIssues =
    totalIssues - (countByStatus.get("CLOSED") ?? 0) - (countByStatus.get("REJECTED") ?? 0);
  const completedIssues = countByStatus.get("DONE") ?? 0;
  const resolutionAggregate = resolutionRows[0];
  const averageResolutionHours = toNullableNumber(
    resolutionAggregate?.averageResolutionHours ?? null,
  );

  return {
    project: serializeProject(membership.project, {
      currentUserRole: membership.role,
    }),
    totalIssues,
    activeIssues,
    completedIssues,
    averageResolutionHours,
    averageResolutionDays:
      averageResolutionHours === null
        ? null
        : Number.parseFloat((averageResolutionHours / 24).toFixed(2)),
    resolutionSampleSize: resolutionAggregate
      ? toNumber(resolutionAggregate.resolutionSampleSize)
      : 0,
    statusBreakdown: METRIC_STATUSES.map((status) => ({
      status,
      count: countByStatus.get(status) ?? 0,
    })),
    trend: buildTrend(trendStart, createdRows, resolvedRows),
  };
}
