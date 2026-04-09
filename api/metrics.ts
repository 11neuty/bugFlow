import type { AuthorizedFetcher } from "@/api/issues";
import type { MetricsOverviewPayload } from "@/lib/types";

export function fetchMetricsOverview(
  authorizedFetch: AuthorizedFetcher,
  projectId: string,
) {
  return authorizedFetch<MetricsOverviewPayload>(
    `/api/v1/metrics/overview?projectId=${encodeURIComponent(projectId)}`,
  );
}
