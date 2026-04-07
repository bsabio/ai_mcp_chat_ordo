import type { ReactNode } from "react";

export function AdminCard({
  title,
  description,
  status = "neutral",
  children,
}: {
  title: string;
  description?: string;
  status?: "neutral" | "ok" | "warning";
  children: ReactNode;
}) {
  const statusTone = status === "ok"
    ? "admin-status-ok"
    : status === "warning"
      ? "admin-status-warning"
      : "admin-status-neutral";

  return (
    <article className="admin-panel-surface admin-card p-(--space-inset-default) sm:p-(--space-inset-panel)" data-admin-card="true">
      <div className="admin-card-heading">
        <div className="grid gap-(--space-2)">
          <div className="flex items-center gap-(--space-cluster-tight)">
            <span className={`inline-flex items-center rounded-full border px-(--space-2) py-[0.18rem] text-[0.68rem] font-semibold uppercase tracking-[0.16em] ${statusTone}`}>
              {status === "ok" ? "Stable" : status === "warning" ? "Needs review" : "Overview"}
            </span>
            <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
          </div>
          {description ? (
            <p className="text-sm leading-6 text-foreground/62">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="admin-card-body">{children}</div>
    </article>
  );
}