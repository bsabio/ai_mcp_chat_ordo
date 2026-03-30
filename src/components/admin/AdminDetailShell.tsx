import type { ReactNode } from "react";

/**
 * 2-column detail layout for admin Read/Edit pages.
 * Main panel ~65%, sidebar ~35% on desktop; stacked on mobile.
 */

interface AdminDetailShellProps {
  main: ReactNode;
  sidebar?: ReactNode;
  sidebarLabel?: string;
  backHref?: string;
  backLabel?: string;
}

export function AdminDetailShell({ main, sidebar, sidebarLabel, backHref, backLabel }: AdminDetailShellProps) {
  return (
    <div
      className="grid grid-cols-1 gap-(--space-section-default) lg:grid-cols-[minmax(0,1fr)_320px]"
      data-admin-detail-shell="true"
    >
      <div className="min-w-0">
        {backHref && (
          <a
            href={backHref}
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4"
          >
            ← {backLabel ?? "Back"}
          </a>
        )}
        {main}
      </div>
      {sidebar && (
        <aside aria-label={sidebarLabel ?? "Details"} className="min-w-0">{sidebar}</aside>
      )}
    </div>
  );
}
