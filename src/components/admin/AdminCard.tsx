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
    ? "jobs-status-succeeded"
    : status === "warning"
      ? "jobs-status-failed"
      : "jobs-count-pill";

  return (
    <article className="jobs-panel-surface p-(--space-inset-panel)">
      <div className="flex items-start justify-between gap-(--space-cluster-default)">
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
      <div className="mt-(--space-stack-default)">{children}</div>
    </article>
  );
}