/**
 * Admin pagination utilities — shared data-layer helpers.
 * Sprint 11 implementation target. Resolves UX-08 (zero pagination on any index).
 *
 * These pure functions are used in every admin data loader to parse page params
 * and compute SQL LIMIT / OFFSET values.
 */

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export interface AdminPaginationParams {
  page: number;
  pageSize: number;
  /** Alias for pageSize — the value to pass directly to SQL LIMIT */
  limit: number;
  /** The value to pass directly to SQL OFFSET */
  offset: number;
}

export interface AdminPagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalCount?: number;
}

/**
 * Parse page/pageSize from raw URL search params and return fully resolved
 * pagination primitives ready for use in SQL queries.
 *
 * @param raw   Raw key/value map from URL search params (all values may be strings)
 * @param defaultPageSize  Override the module-level DEFAULT_PAGE_SIZE
 */
export function buildAdminPaginationParams(
  raw: Record<string, string | string[] | undefined>,
  defaultPageSize: number = DEFAULT_PAGE_SIZE,
): AdminPaginationParams {
  const rawPage = raw["page"];
  const rawSize = raw["pageSize"] ?? raw["page_size"];

  const pageInt = parseInt(
    typeof rawPage === "string" ? rawPage : (rawPage?.[0] ?? "1"),
    10,
  );
  const sizeInt = parseInt(
    typeof rawSize === "string" ? rawSize : (rawSize?.[0] ?? String(defaultPageSize)),
    10,
  );

  const page = Number.isFinite(pageInt) && pageInt > 0 ? pageInt : 1;
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Number.isFinite(sizeInt) && sizeInt > 0 ? sizeInt : defaultPageSize,
  );
  const offset = (page - 1) * pageSize;

  return { page, pageSize, limit: pageSize, offset };
}

/**
 * Slice a query result that was fetched with LIMIT = pageSize + 1 (the +1
 * sentinel trick) and derive hasNextPage from the extra row.
 */
export function slicePageResult<T>(
  rows: T[],
  page: number,
  pageSize: number,
): AdminPagedResult<T> {
  const hasNextPage = rows.length > pageSize;
  const items = rows.slice(0, pageSize);
  return {
    items,
    page,
    pageSize,
    hasNextPage,
    hasPrevPage: page > 1,
  };
}
