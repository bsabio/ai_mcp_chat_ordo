/**
 * Paginated user loaders for admin index.
 * Sprint 11 — D11.2.
 */

import type { AdminPaginationParams } from "@/lib/admin/admin-pagination";
import { getUserDataMapper } from "@/adapters/RepositoryFactory";
import type { UserAdminFilters, UserAdminRecord } from "@/adapters/UserDataMapper";
import { parseAdminUserFilters, type AdminUserListFilters } from "./admin-users";
import { getAdminUsersDetailPath } from "./admin-users-routes";

export interface AdminUserListPageResult {
  items: ReturnType<typeof toListEntry>[];
  total: number;
  page: number;
  pageSize: number;
  filters: AdminUserListFilters;
  counts: Record<string, number>;
}

function toListEntry(record: UserAdminRecord) {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    createdAt: record.createdAt,
    referralCode: record.referralCode,
    detailHref: getAdminUsersDetailPath(record.id),
  };
}

export async function loadAdminUserListPaginated(
  pagination: AdminPaginationParams,
  rawSearchParams: Record<string, string | string[] | undefined>,
): Promise<AdminUserListPageResult> {
  const filters = parseAdminUserFilters(rawSearchParams);
  const mapper = getUserDataMapper();

  const queryFilters: UserAdminFilters = {
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.role !== "all" ? { role: filters.role } : {}),
  };
  const baseFilters: Omit<UserAdminFilters, "role"> = {
    ...(filters.search ? { search: filters.search } : {}),
  };

  const [total, counts, users] = await Promise.all([
    mapper.countForAdmin(queryFilters),
    mapper.countByRole(baseFilters),
    mapper.listForAdmin({ ...queryFilters, limit: pagination.limit, offset: pagination.offset }),
  ]);

  return {
    items: users.map(toListEntry),
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    filters,
    counts,
  };
}
