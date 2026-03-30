import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/AdminSection";
import { AdminDetailShell } from "@/components/admin/AdminDetailShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { requireAdminPageAccess } from "@/lib/journal/admin-journal";
import { loadAdminJobDetail } from "@/lib/admin/jobs/admin-jobs";
import { cancelJobAction, retryJobAction } from "@/lib/admin/jobs/admin-jobs-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Job Detail",
  robots: { index: false, follow: false },
};

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  canceled: "Canceled",
};

export default async function AdminJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPageAccess();
  const { id } = await params;
  const detail = await loadAdminJobDetail(id);
  const { job, events } = detail;

  const canCancel = job.status === "queued" || job.status === "running";
  const canRetry = job.status === "failed" || job.status === "canceled";

  return (
    <AdminSection
      title={`${job.toolName}`}
      description={`Job ${job.id}`}
    >
      <div className="px-(--space-inset-panel)">
        <AdminDetailShell
          main={
            <div className="grid gap-(--space-section-default)">
              {/* Header: status + progress */}
              <AdminCard
                title={STATUS_LABELS[job.status] ?? job.status}
                status={
                  job.status === "succeeded"
                    ? "ok"
                    : job.status === "failed" || job.status === "canceled"
                      ? "warning"
                      : "neutral"
                }
              >
                {job.progressPercent != null && (
                  <div className="grid gap-(--space-2)">
                    <div className="h-2 w-full rounded-full bg-foreground/8">
                      <div
                        className="h-full rounded-full bg-foreground/30 transition-all"
                        style={{ width: `${Math.min(100, job.progressPercent)}%` }}
                      />
                    </div>
                    <p className="text-xs text-foreground/50 tabular-nums">
                      {job.progressPercent}%{job.progressLabel ? ` — ${job.progressLabel}` : ""}
                    </p>
                  </div>
                )}
              </AdminCard>

              {/* Request payload */}
              <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
                <h2 className="text-sm font-semibold text-foreground/60">Request payload</h2>
                <pre className="mt-(--space-3) max-h-80 overflow-auto rounded-lg bg-foreground/3 p-(--space-3) text-xs text-foreground/70">
                  {JSON.stringify(job.requestPayload, null, 2)}
                </pre>
              </section>

              {/* Result payload */}
              {job.resultPayload != null && (
                <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
                  <h2 className="text-sm font-semibold text-foreground/60">Result payload</h2>
                  <pre className="mt-(--space-3) max-h-80 overflow-auto rounded-lg bg-foreground/3 p-(--space-3) text-xs text-foreground/70">
                    {JSON.stringify(job.resultPayload, null, 2)}
                  </pre>
                </section>
              )}

              {/* Error message */}
              {job.errorMessage && (
                <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
                  <h2 className="text-sm font-semibold text-foreground/60">Error</h2>
                  <p className="mt-(--space-3) text-sm text-foreground/70">{job.errorMessage}</p>
                </section>
              )}

              {/* Event timeline */}
              <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
                <h2 className="text-sm font-semibold text-foreground/60">
                  Event timeline ({events.length})
                </h2>
                {events.length === 0 ? (
                  <p className="mt-(--space-2) text-xs text-foreground/40">No events recorded.</p>
                ) : (
                  <ul className="mt-(--space-3) grid gap-(--space-2)">
                    {events.map((evt) => (
                      <li key={evt.id} className="flex items-start gap-(--space-3) border-b border-foreground/5 pb-(--space-2)">
                        <span className="inline-flex shrink-0 rounded-full border border-foreground/12 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em]">
                          {evt.eventType}
                        </span>
                        <div className="min-w-0 flex-1">
                          <pre className="max-h-24 overflow-auto text-xs text-foreground/60">
                            {JSON.stringify(evt.eventPayload, null, 2)}
                          </pre>
                        </div>
                        <time className="shrink-0 text-xs text-foreground/40">{evt.createdAt}</time>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Action bar */}
              {(canCancel || canRetry) && (
                <div className="flex gap-(--space-2)">
                  {canCancel && (
                    <form action={cancelJobAction}>
                      <input type="hidden" name="id" value={job.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-foreground/12 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-foreground/5"
                      >
                        Cancel job
                      </button>
                    </form>
                  )}
                  {canRetry && (
                    <form action={retryJobAction}>
                      <input type="hidden" name="id" value={job.id} />
                      <button
                        type="submit"
                        className="rounded-lg bg-foreground/8 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-foreground/14"
                      >
                        Retry job
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          }
          sidebar={
            <div className="grid gap-(--space-section-default)">
              {/* Metadata */}
              <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
                <h2 className="text-sm font-semibold text-foreground/60">Metadata</h2>
                <dl className="mt-(--space-3) grid gap-(--space-2) text-sm">
                  <div className="flex justify-between">
                    <dt className="text-foreground/50">ID</dt>
                    <dd className="truncate text-foreground text-xs font-mono">{job.id}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-foreground/50">Priority</dt>
                    <dd className="text-foreground">{job.priority}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-foreground/50">Attempts</dt>
                    <dd className="text-foreground">{job.attemptCount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-foreground/50">Initiator</dt>
                    <dd className="text-foreground">{job.initiatorType}</dd>
                  </div>
                  {job.dedupeKey && (
                    <div className="flex justify-between">
                      <dt className="text-foreground/50">Dedupe key</dt>
                      <dd className="truncate text-foreground text-xs">{job.dedupeKey}</dd>
                    </div>
                  )}
                  {job.claimedBy && (
                    <div className="flex justify-between">
                      <dt className="text-foreground/50">Worker</dt>
                      <dd className="truncate text-foreground text-xs">{job.claimedBy}</dd>
                    </div>
                  )}
                  {job.leaseExpiresAt && (
                    <div className="flex justify-between">
                      <dt className="text-foreground/50">Lease expires</dt>
                      <dd className="text-foreground text-xs">{job.leaseExpiresAt}</dd>
                    </div>
                  )}
                </dl>
              </section>

              {/* Timestamps */}
              <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
                <h2 className="text-sm font-semibold text-foreground/60">Timestamps</h2>
                <dl className="mt-(--space-3) grid gap-(--space-2) text-sm">
                  <div className="flex justify-between">
                    <dt className="text-foreground/50">Created</dt>
                    <dd className="text-foreground text-xs">{job.createdAt}</dd>
                  </div>
                  {job.startedAt && (
                    <div className="flex justify-between">
                      <dt className="text-foreground/50">Started</dt>
                      <dd className="text-foreground text-xs">{job.startedAt}</dd>
                    </div>
                  )}
                  {job.completedAt && (
                    <div className="flex justify-between">
                      <dt className="text-foreground/50">Completed</dt>
                      <dd className="text-foreground text-xs">{job.completedAt}</dd>
                    </div>
                  )}
                  {job.duration && (
                    <div className="flex justify-between">
                      <dt className="text-foreground/50">Duration</dt>
                      <dd className="text-foreground">{job.duration}</dd>
                    </div>
                  )}
                </dl>
              </section>

              {/* User info */}
              <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
                <h2 className="text-sm font-semibold text-foreground/60">User</h2>
                <p className="mt-(--space-2) text-xs text-foreground/60">
                  {job.userName ?? "Anonymous / system"}
                </p>
              </section>
            </div>
          }
        />
      </div>
    </AdminSection>
  );
}
