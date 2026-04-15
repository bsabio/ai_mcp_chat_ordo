import Link from "next/link";

import type { JobHistoryEntry } from "@/lib/jobs/job-event-history";
import type { JobStatusSnapshot } from "@/lib/jobs/job-read-model";

import { JobHistoryTimeline } from "@/components/jobs/JobHistoryTimeline";
import {
  type JobAction,
  formatJobFailureClass,
  formatJobSummary,
  formatJobTimestamp,
  getJobAction,
  getJobArtifactLink,
  getStatusTone,
  STATUS_LABELS,
} from "@/components/jobs/job-workspace-helpers";

interface JobDetailPanelProps {
  job: JobStatusSnapshot | null;
  history: JobHistoryEntry[];
  isHistoryLoading: boolean;
  isPending: boolean;
  onJobAction: (jobId: string, action: JobAction) => void;
  onCopySummary: (job: JobStatusSnapshot) => void;
  onCopyFailure: (job: JobStatusSnapshot) => void;
  onExportLog: (job: JobStatusSnapshot, history: JobHistoryEntry[]) => void;
}

export function JobDetailPanel({
  job,
  history,
  isHistoryLoading,
  isPending,
  onJobAction,
  onCopySummary,
  onCopyFailure,
  onExportLog,
}: JobDetailPanelProps) {
  if (!job) {
    return (
      <aside className="jobs-panel-surface px-(--space-inset-default) py-(--space-inset-default) sm:px-(--space-inset-panel) sm:py-(--space-inset-panel)" data-jobs-detail-panel="true">
        <h2 className="text-xl font-semibold text-foreground/75">Select a job</h2>
        <p className="mt-(--space-3) text-sm leading-6 text-foreground/55">
          Pick a job from the list to inspect its current status and durable event history.
        </p>
      </aside>
    );
  }

  const action = getJobAction(job.part.status);
  const title = job.part.title ?? job.part.label;
  const artifactLink = getJobArtifactLink(job);
  const failureClass = formatJobFailureClass(job.part.failureClass);

  return (
    <aside className="jobs-panel-surface px-(--space-inset-default) py-(--space-inset-default) sm:px-(--space-inset-panel) sm:py-(--space-inset-panel)" data-testid="job-detail-panel" data-jobs-detail-panel="true">
      <div className="flex flex-wrap items-start justify-between gap-(--space-3)">
        <div className="flex flex-wrap items-center gap-(--space-2)">
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] ${getStatusTone(job.part.status)}`}>
            {STATUS_LABELS[job.part.status]}
          </span>
          <span className="jobs-metric-pill inline-flex rounded-full px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-foreground/55">
            {job.part.toolName}
          </span>
        </div>
        <span className="text-xs text-foreground/45">Updated {formatJobTimestamp(job.part.updatedAt)}</span>
      </div>

      <div className="mt-(--space-4) space-y-(--space-2)">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        {job.part.subtitle ? (
          <p className="text-sm text-foreground/55">{job.part.subtitle}</p>
        ) : null}
      </div>

      <p className="mt-(--space-4) text-sm leading-6 text-foreground/72">{formatJobSummary(job)}</p>

      <dl className="mt-(--space-4) grid gap-x-(--space-4) gap-y-(--space-2) text-sm text-foreground/60 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/45">Job ID</dt>
          <dd className="mt-1 break-all text-foreground/72">{job.part.jobId}</dd>
        </div>
        {job.conversationId ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/45">Conversation</dt>
            <dd className="mt-1 break-all text-foreground/72">{job.conversationId}</dd>
          </div>
        ) : null}
        {failureClass ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/45">Failure class</dt>
            <dd className="mt-1 text-foreground/72">{failureClass}</dd>
          </div>
        ) : null}
        {job.part.recoveryMode ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/45">Recovery mode</dt>
            <dd className="mt-1 text-foreground/72">{job.part.recoveryMode === "rerun" ? "Replay from start" : job.part.recoveryMode}</dd>
          </div>
        ) : null}
        {job.part.replayedFromJobId ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/45">Replayed from</dt>
            <dd className="mt-1 break-all text-foreground/72">Job {job.part.replayedFromJobId}</dd>
          </div>
        ) : null}
        {job.part.supersededByJobId ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/45">Superseded by</dt>
            <dd className="mt-1 break-all text-foreground/72">Job {job.part.supersededByJobId}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-(--space-4) flex flex-wrap items-center gap-(--space-3) text-sm">
        {job.conversationId && (
          <Link
            href={`/?conversationId=${encodeURIComponent(job.conversationId)}`}
            className="underline decoration-foreground/24 underline-offset-4 transition hover:text-foreground"
          >
            Open conversation
          </Link>
        )}
        {artifactLink && (
          <Link
            href={artifactLink.href}
            className="underline decoration-foreground/24 underline-offset-4 transition hover:text-foreground"
          >
            {artifactLink.label}
          </Link>
        )}
      </div>

      {job.part.progressPercent != null && (
        <div className="mt-(--space-4) space-y-2">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-foreground/45">
            <span>Progress</span>
            <span>{Math.round(job.part.progressPercent)}%</span>
          </div>
          <div className="jobs-progress-track h-2 overflow-hidden rounded-full">
            <div
              className="jobs-progress-fill h-full rounded-full"
              style={{ width: `${Math.max(0, Math.min(100, job.part.progressPercent))}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-(--space-4) flex flex-wrap items-center gap-(--space-2)">
        {action && (
          <button
            type="button"
            className="jobs-action-primary rounded-full px-4 py-2 text-sm font-semibold"
            onClick={() => onJobAction(job.part.jobId, action.action)}
            disabled={isPending}
            aria-label={`${action.label} ${title}`}
          >
            {isPending ? `${action.label}ing…` : action.label}
          </button>
        )}
        <button
          type="button"
          className="rounded-full border border-foreground/15 px-3 py-2 text-sm font-medium text-foreground/72 transition hover:border-foreground/30 hover:text-foreground"
          onClick={() => onCopySummary(job)}
          aria-label={`Copy summary for ${title}`}
        >
          Copy summary
        </button>
        {job.part.error && (
          <button
            type="button"
            className="rounded-full border border-foreground/15 px-3 py-2 text-sm font-medium text-foreground/72 transition hover:border-foreground/30 hover:text-foreground"
            onClick={() => onCopyFailure(job)}
            aria-label={`Copy failure for ${title}`}
          >
            Copy failure
          </button>
        )}
        <button
          type="button"
          className="rounded-full border border-foreground/15 px-3 py-2 text-sm font-medium text-foreground/72 transition hover:border-foreground/30 hover:text-foreground"
          onClick={() => onExportLog(job, history)}
          aria-label={`Export log for ${title}`}
        >
          Export log
        </button>
      </div>

      <div className="mt-(--space-6) space-y-(--space-3)">
        <div>
          <h3 className="text-lg font-semibold text-foreground/78">History</h3>
          <p className="mt-1 text-sm text-foreground/55">
            {isHistoryLoading ? "Loading durable history for this job." : "Durable owner-visible events for this job."}
          </p>
        </div>
        <JobHistoryTimeline events={history} />
      </div>
    </aside>
  );
}