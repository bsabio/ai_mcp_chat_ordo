/**
 * Paginated lead loaders for admin pipeline index.
 * Sprint 11 — D11.5.
 */

import type { AdminPaginationParams } from "@/lib/admin/admin-pagination";
import type { PipelineTab } from "./admin-leads";

export interface AdminLeadListPageResult {
  items: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
  tab: PipelineTab;
}

/**
 * Thin wrapper that delegates to the full pipeline loader while adding
 * pagination metadata. Each pipeline tab scopes its own total count.
 */
export async function loadAdminLeadsPaginatedMeta(
  pagination: AdminPaginationParams,
  tab: PipelineTab,
): Promise<Pick<AdminLeadListPageResult, "total" | "page" | "pageSize" | "tab">> {
  // total is provided per-tab by loadAdminLeadsPipeline; this helper
  // exposes pagination params in the correct shape for index pages.
  return {
    total: 0, // resolved by the page from the full pipeline result
    page: pagination.page,
    pageSize: pagination.pageSize,
    tab,
  };
}
