/**
 * Paginated job loaders for admin index.
 * Sprint 11 — D11.3.
 * Default page size: 50.
 */

import type { AdminPaginationParams } from "@/lib/admin/admin-pagination";
import { getJobQueueDataMapper } from "@/adapters/RepositoryFactory";
import { parseAdminJobFilters, type AdminJobListFilters } from "./admin-jobs";

export const JOB_DEFAULT_PAGE_SIZE = 50;

export interface AdminJobListPageResult {
  items: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
  filters: AdminJobListFilters;
  statusCounts: Record<string, number>;
  toolNameCounts: Record<string, number>;
}

export async function loadAdminJobListPaginated(
  pagination: AdminPaginationParams,
  rawSearchParams: Record<string, string | string[] | undefined>,
): Promise<AdminJobListPageResult> {
  const filters = parseAdminJobFilters(rawSearchParams);
  const mapper = getJobQueueDataMapper();

  const queryFilters = {
    ...(filters.status !== "all" ? { status: filters.status } : {}),
    ...(filters.toolName ? { toolName: filters.toolName } : {}),
  };

  const [total, statusCounts, toolNameCounts, jobs] = await Promise.all([
    mapper.countForAdmin(queryFilters),
    mapper.countByStatus(),
    mapper.countByToolName(),
    mapper.listForAdmin({ ...queryFilters, limit: pagination.limit, offset: pagination.offset }),
  ]);

  return {
    items: jobs as unknown as Record<string, unknown>[],
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    filters,
    statusCounts,
    toolNameCounts,
  };
}
