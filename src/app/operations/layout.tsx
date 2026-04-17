import type { ReactNode } from "react";

import { requireOperationsWorkspaceAccess } from "@/lib/operations/operations-access";

export default async function OperationsLayout({ children }: { children: ReactNode }) {
  await requireOperationsWorkspaceAccess();

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background text-foreground" data-operations-shell="true">
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-(--space-frame-default) py-(--space-frame-default) sm:px-(--space-frame-wide) sm:py-(--space-frame-default)">
        <main
          id="operations-main"
          className="min-h-0 min-w-0 overflow-y-auto"
          data-operations-layout-mode="single-column"
        >
          {children}
        </main>
      </div>
    </div>
  );
}