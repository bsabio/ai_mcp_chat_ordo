/**
 * Status count cards row for admin Browse pages.
 * Renders one card per status with count + optional active highlight.
 * Items with filterHref render as clickable <a> links (D9.5).
 */

export interface StatusCountItem {
  label: string;
  count: number;
  filterHref?: string;
  active?: boolean;
}

interface AdminStatusCountsProps {
  items: StatusCountItem[];
}

export function AdminStatusCounts({ items }: AdminStatusCountsProps) {
  return (
    <div className="flex flex-wrap gap-(--space-2)" data-admin-status-counts="true">
      {items.map((item) => {
        const baseClass = `min-h-[44px] flex flex-col items-center justify-center min-w-[5.5rem] rounded-xl border px-(--space-3) py-(--space-2) transition ${
          item.active
            ? "border-foreground/20 bg-foreground/6 text-foreground shadow-sm ring-2 ring-primary"
            : "border-foreground/8 text-foreground/60"
        }`;
        const inner = (
          <>
            <span className="text-2xl font-bold tabular-nums">{item.count}</span>
            <span className="text-xs font-(--font-label) tracking-wide">{item.label}</span>
          </>
        );

        if (item.filterHref) {
          return (
            <a
              key={item.label}
              href={item.filterHref}
              aria-current={item.active ? "page" : undefined}
              className={baseClass}
            >
              {inner}
            </a>
          );
        }

        return (
          <div key={item.label} className={baseClass}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
