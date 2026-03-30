import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { requireAdminPageAccess } from "@/lib/journal/admin-journal";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminPageAccess();

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background text-foreground" data-admin-shell="true">
      {/* D10.1: Skip-to-content link */}
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded focus:shadow-md"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-(--space-frame-default) py-(--space-frame-default) sm:px-(--space-frame-wide) sm:py-(--space-frame-default)">
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-(--space-section-default) sm:grid-cols-[248px_minmax(0,1fr)] sm:items-start">
          <AdminSidebar />
          {/* D10.4: no legacy layout class; D10.6: semantic <main>; D10.1: id="admin-main" */}
          <main
            id="admin-main"
            className="min-h-0 min-w-0 overflow-y-auto rounded-[2rem] border border-foreground/8 px-(--space-frame-default) py-(--space-frame-default) shadow-[0_24px_60px_-42px_color-mix(in_srgb,var(--shadow-base)_16%,transparent)] sm:px-(--space-frame-wide) sm:py-(--space-frame-default) sm:pb-(--space-frame-wide)"
            data-admin-scroll-region="true"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}