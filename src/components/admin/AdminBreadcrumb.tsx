/**
 * AdminBreadcrumb — wayfinding trail for admin pages.
 * Sprint 8 implementation target. This stub satisfies the module contract so
 * test files that import it can compile before the full implementation lands.
 *
 * UX-02: No breadcrumbs on any admin page.
 */

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminBreadcrumbProps {
  items: BreadcrumbItem[];
}

export function AdminBreadcrumb({ items }: AdminBreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 text-xs text-foreground/50">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1">
            {index > 0 && (
              <span aria-hidden="true" className="select-none">
                /
              </span>
            )}
            {item.href ? (
              <a href={item.href} className="hover:text-foreground transition">
                {item.label}
              </a>
            ) : (
              <span aria-current="page" className="truncate text-foreground/80">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
