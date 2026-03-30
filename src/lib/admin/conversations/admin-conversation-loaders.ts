/**
 * Paginated conversation loaders for admin index.
 * Sprint 11 — D11.4.
 */

import type { AdminPaginationParams } from "@/lib/admin/admin-pagination";
import { getConversationDataMapper } from "@/adapters/RepositoryFactory";
import type { ConversationFilters } from "./admin-conversations";

export interface AdminConversationListPageResult {
  items: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
  filters: ConversationFilters;
  statusCounts: Record<string, number>;
  laneCounts: Record<string, number>;
}

export async function loadAdminConversationsPaginated(
  pagination: AdminPaginationParams,
  rawSearchParams: Record<string, string | string[] | undefined>,
): Promise<AdminConversationListPageResult> {
  const filters: ConversationFilters = {
    status: typeof rawSearchParams.status === "string" ? rawSearchParams.status : undefined,
    lane: typeof rawSearchParams.lane === "string" ? rawSearchParams.lane : undefined,
    sessionSource: typeof rawSearchParams.sessionSource === "string" ? rawSearchParams.sessionSource : undefined,
  };

  const convMapper = getConversationDataMapper();

  const [rows, total, statusCounts, laneCounts] = await Promise.all([
    convMapper.listForAdmin({ ...filters, limit: pagination.limit, offset: pagination.offset }),
    convMapper.countForAdmin(filters),
    convMapper.countByStatus(),
    convMapper.countByLane(),
  ]);

  return {
    items: rows as unknown as Record<string, unknown>[],
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    filters,
    statusCounts,
    laneCounts,
  };
}
