/**
 * AdminPagination — numeric pagination controls for admin index pages.
 * Server component — no interactivity needed, all state lives in the URL.
 * Resolves UX-08 (zero pagination on any admin index page).
 */

export interface AdminPaginationProps {
  page: number;
  total: number;
  pageSize: number;
  baseHref: string;
}

export function AdminPagination({
  page,
  total,
  pageSize,
  baseHref,
}: AdminPaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  function pageUrl(p: number): string {
    return `${baseHref}?page=${p}`;
  }

  // Visible page numbers — show all when few pages, otherwise window around current
  const pages: number[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 4) pages.push(-1);
    const start = Math.max(2, page - 2);
    const end = Math.min(totalPages - 1, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 3) pages.push(-2);
    pages.push(totalPages);
  }

  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center gap-1 text-sm"
    >
      <a
        href={pageUrl(Math.max(1, page - 1))}
        aria-label="Previous page"
        aria-disabled={isFirst ? "true" : undefined}
        className={`rounded border px-2.5 py-1 text-xs transition ${
          isFirst
            ? "pointer-events-none border-foreground/5 text-foreground/30"
            : "border-foreground/12 text-foreground hover:bg-foreground/5"
        }`}
      >
        ←
      </a>

      {pages.map((p, i) =>
        p < 0 ? (
          <span key={`ellipsis-${i}`} className="px-1 text-foreground/30" aria-hidden="true">
            …
          </span>
        ) : p === page ? (
          <span
            key={p}
            aria-current="page"
            className="rounded border border-foreground/20 bg-foreground/8 px-2.5 py-1 text-xs font-medium"
          >
            {p}
          </span>
        ) : (
          <a
            key={p}
            href={pageUrl(p)}
            className="rounded border border-foreground/12 px-2.5 py-1 text-xs hover:bg-foreground/5"
          >
            {p}
          </a>
        ),
      )}

      <a
        href={pageUrl(Math.min(totalPages, page + 1))}
        aria-label="Next page"
        aria-disabled={isLast ? "true" : undefined}
        className={`rounded border px-2.5 py-1 text-xs transition ${
          isLast
            ? "pointer-events-none border-foreground/5 text-foreground/30"
            : "border-foreground/12 text-foreground hover:bg-foreground/5"
        }`}
      >
        →
      </a>
    </nav>
  );
}
