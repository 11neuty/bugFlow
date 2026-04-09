"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, CheckCircle2, Clock3, FolderKanban, TrendingUp } from "lucide-react";

import { fetchMetricsOverview } from "@/api/metrics";
import { Card } from "@/components/ui/Card";
import type { AuthorizedFetcher } from "@/api/issues";
import type { MetricsOverviewPayload } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface ProjectMetricsPanelProps {
  authorizedFetch: AuthorizedFetcher;
  projectId: string | null;
  isActive: boolean;
}

function MetricCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="rounded-[24px] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
          <p className="mt-2 text-sm text-slate-500">{hint}</p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
    </Card>
  );
}

export function ProjectMetricsPanel({
  authorizedFetch,
  projectId,
  isActive,
}: ProjectMetricsPanelProps) {
  const [metrics, setMetrics] = useState<MetricsOverviewPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isActive || !projectId) {
      return;
    }

    let cancelled = false;

    const loadMetrics = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchMetricsOverview(authorizedFetch, projectId);

        if (!cancelled) {
          setMetrics(result);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load project metrics right now.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadMetrics();

    return () => {
      cancelled = true;
    };
  }, [authorizedFetch, isActive, projectId]);

  const peakTrend = useMemo(() => {
    if (!metrics) {
      return 0;
    }

    return metrics.trend.reduce(
      (max, point) => Math.max(max, point.created, point.resolved),
      0,
    );
  }, [metrics]);

  if (!projectId) {
    return (
      <Card className="p-8 text-center">
        <p className="text-lg font-semibold text-slate-950">Select a project first</p>
        <p className="mt-2 text-sm text-slate-500">
          Metrics become available once a workspace is selected.
        </p>
      </Card>
    );
  }

  if (isLoading && !metrics) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index} className="min-h-36 animate-pulse bg-slate-100/80" />
          ))}
        </div>
        <Card className="min-h-80 animate-pulse bg-slate-100/80" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-lg font-semibold text-slate-950">Metrics unavailable</p>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
      </Card>
    );
  }

  if (!metrics || metrics.totalIssues === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-lg font-semibold text-slate-950">
          No data available for this project
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Metrics will appear once this workspace starts tracking issues.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          hint="All active and resolved issues inside this workspace."
          icon={<FolderKanban className="size-5" />}
          label="Total issues"
          value={String(metrics.totalIssues)}
        />
        <MetricCard
          hint="Excludes closed and rejected issues."
          icon={<TrendingUp className="size-5" />}
          label="Active issues"
          value={String(metrics.activeIssues)}
        />
        <MetricCard
          hint="Issues that reached DONE at least once."
          icon={<CheckCircle2 className="size-5" />}
          label="Completed issues"
          value={String(metrics.completedIssues)}
        />
        <MetricCard
          hint={
            metrics.averageResolutionHours === null
              ? "No completed issues yet."
              : `${metrics.resolutionSampleSize} resolved issue${metrics.resolutionSampleSize === 1 ? "" : "s"} measured from created to first DONE.`
          }
          icon={<Clock3 className="size-5" />}
          label="Avg. resolution"
          value={
            metrics.averageResolutionHours === null
              ? "-"
              : `${metrics.averageResolutionHours.toFixed(1)}h`
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Trend
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">
                Created vs resolved
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Last 7 days for {metrics.project.name}.
              </p>
            </div>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <BarChart3 className="size-5" />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {metrics.trend.map((point) => {
              const createdWidth =
                peakTrend === 0 ? 0 : Math.max((point.created / peakTrend) * 100, point.created > 0 ? 8 : 0);
              const resolvedWidth =
                peakTrend === 0 ? 0 : Math.max((point.resolved / peakTrend) * 100, point.resolved > 0 ? 8 : 0);

              return (
                <div key={point.date} className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium text-slate-700">
                      {formatDate(point.date)}
                    </span>
                    <span className="text-slate-400">
                      {point.created} created / {point.resolved} resolved
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-[width] duration-300"
                        style={{ width: `${createdWidth}%` }}
                      />
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
                        style={{ width: `${resolvedWidth}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Status breakdown
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            Current workflow mix
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Snapshot of non-deleted issues in this project.
          </p>

          <div className="mt-6 space-y-3">
            {metrics.statusBreakdown.map((item) => {
              const width =
                metrics.totalIssues === 0
                  ? 0
                  : Math.max((item.count / metrics.totalIssues) * 100, item.count > 0 ? 8 : 0);

              return (
                <div key={item.status} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-slate-700">
                      {item.status.replaceAll("_", " ")}
                    </span>
                    <span className="text-slate-500">{item.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-900 transition-[width] duration-300"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
