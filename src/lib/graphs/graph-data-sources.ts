import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import {
  resolveAnalyticsDataset,
  type AnalyticsDatasetResult,
  type AnalyticsDatasetSourceType,
} from "@/lib/analytics/analytics-dataset-registry";

export type GraphSourceType = AnalyticsDatasetSourceType;

export type GraphDataSourceInput = {
  sourceType: GraphSourceType;
  params?: Record<string, string | number | boolean>;
};

export type ResolvedGraphDataSource = AnalyticsDatasetResult;

export async function resolveGraphDataSource(
  input: GraphDataSourceInput,
  context: ToolExecutionContext,
): Promise<ResolvedGraphDataSource> {
  return resolveAnalyticsDataset(input, context, "graph");
}