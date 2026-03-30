/**
 * Generic list loader builder for admin Browse pages.
 * Encapsulates: parse filters → parallel queries → map to view model.
 */

export interface AdminListConfig<TFilters, TRow, TViewModel> {
  parseFilters(searchParams: Record<string, string | string[] | undefined>): TFilters;
  countAll(filters: TFilters): Promise<number>;
  countByStatus(filters: TFilters): Promise<Record<string, number>>;
  listFiltered(filters: TFilters): Promise<TRow[]>;
  toViewModel(row: TRow): TViewModel;
}

export interface AdminListResult<TFilters, TViewModel> {
  filters: TFilters;
  total: number;
  counts: Record<string, number>;
  items: TViewModel[];
}

export async function loadAdminList<TFilters, TRow, TViewModel>(
  config: AdminListConfig<TFilters, TRow, TViewModel>,
  searchParams: Record<string, string | string[] | undefined>,
): Promise<AdminListResult<TFilters, TViewModel>> {
  const filters = config.parseFilters(searchParams);
  const [total, counts, rows] = await Promise.all([
    config.countAll(filters),
    config.countByStatus(filters),
    config.listFiltered(filters),
  ]);

  return {
    filters,
    total,
    counts,
    items: rows.map(config.toViewModel),
  };
}
