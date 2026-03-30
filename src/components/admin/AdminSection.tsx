import type { ReactNode } from "react";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import type { BreadcrumbItem } from "@/components/admin/AdminBreadcrumb";

export function AdminSection({
  title,
  description,
  children,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}) {
  return (
    <section className="grid gap-(--space-section-default)">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <AdminBreadcrumb items={breadcrumbs} />
      )}
      <header className="jobs-hero-surface overflow-hidden px-(--space-inset-panel) py-(--space-inset-panel)">
        <div className="grid gap-(--space-3)">
          <p className="shell-section-heading text-foreground/46">Admin platform</p>
          <h2 className="text-[clamp(1.9rem,3vw,2.6rem)] font-semibold tracking-[-0.04em] text-foreground">{title}</h2>
          {description ? (
            <p className="max-w-3xl text-sm leading-6 text-foreground/62 sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
      </header>
      {children}
    </section>
  );
}