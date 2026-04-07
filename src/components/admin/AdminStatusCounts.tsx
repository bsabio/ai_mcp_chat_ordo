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
    <div className="admin-status-counts" data-admin-status-counts="true">
      {items.map((item) => {
        const baseClass = `admin-status-count-card ${item.active ? "admin-status-count-card-active" : "admin-status-count-card-idle"}`;
        const inner = (
          <>
            <span className="admin-status-count-value tabular-nums">{item.count}</span>
            <span className="admin-status-count-label">{item.label}</span>
          </>
        );

        if (item.filterHref) {
          return (
            <a
              key={item.label}
              href={item.filterHref}
              aria-current={item.active ? "page" : undefined}
              className={baseClass}
              data-admin-status-count-card="true"
              data-admin-status-count-active={item.active ? "true" : undefined}
            >
              {inner}
            </a>
          );
        }

        return (
          <div
            key={item.label}
            className={baseClass}
            data-admin-status-count-card="true"
            data-admin-status-count-active={item.active ? "true" : undefined}
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}
