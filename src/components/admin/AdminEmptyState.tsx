import type { ReactNode } from "react";

/**
 * Consistent empty state for admin pages.
 * Centered layout with optional icon, heading, description, and action.
 */

interface AdminEmptyStateProps {
  icon?: ReactNode;
  heading: string;
  description: string;
  action?: ReactNode;
}

export function AdminEmptyState({ icon, heading, description, action }: AdminEmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-(--space-3) py-(--space-16) text-center"
      data-admin-empty-state="true"
    >
      {icon && <div className="text-3xl text-foreground/25">{icon}</div>}
      <h2 className="text-lg font-semibold text-foreground/70">{heading}</h2>
      <p className="max-w-sm text-sm text-foreground/50">{description}</p>
      {action && <div className="mt-(--space-2)">{action}</div>}
    </div>
  );
}
