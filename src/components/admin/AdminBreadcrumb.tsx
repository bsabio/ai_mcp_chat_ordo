import Link from "next/link";

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
    <nav aria-label="Breadcrumb" className="min-w-0" data-admin-breadcrumb="true">
      <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[0.72rem] font-medium uppercase tracking-[0.14em] text-foreground/46">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2">
            {index > 0 && (
              <span aria-hidden="true" className="select-none text-foreground/26">
                / 
              </span>
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="truncate text-foreground/52 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="truncate text-foreground/84">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
