import Link from "next/link";

import type { JobHistoryEntry } from "@/lib/jobs/job-event-history";
import type { JobStatusSnapshot } from "@/lib/jobs/job-read-model";

import { JobHistoryTimeline } from "@/components/jobs/JobHistoryTimeline";
import {
  type JobAction,
  formatJobSummary,
  formatJobTimestamp,
  getJobAction,
  getStatusTone,
  STATUS_LABELS,
} from "@/components/jobs/job-workspace-helpers";

interface JobDetailPanelProps {
  job: JobStatusSnapshot | null;
  history: JobHistoryEntry[];
  isHistoryLoading: boolean;
  isPending: boolean;
  onJobAction: (jobId: string, action: JobAction) => void;
}

function getArtifactHref(job: JobStatusSnapshot | null): string | null {
  if (!job || typeof job.part.resultPayload !== "object" || job.part.resultPayload === null) {
    return null;
  }

  const payload = job.part.resultPayload as Record<string, unknown>;
  if (payload.status === "published" && typeof payload.slug === "string") {
    return `/journal/${payload.slug}`;
  }

  return null;
}

export function JobDetailPanel({
  job,
  history,
  isHistoryLoading,
  isPending,
  onJobAction,
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
  const artifactHref = getArtifactHref(job);

  return (
    <aside className="jobs-panel-surface px-(--space-inset-default) py-(--space-inset-default) sm:px-(--space-inset-panel) sm:py-(--space-inset-panel)" data-testid="job-detail-panel" data-jobs-detail-panel="true">
      <div className="flex flex-wrap items-center gap-(--space-2)">
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] ${getStatusTone(job.part.status)}`}>
          {STATUS_LABELS[job.part.status]}
        </span>
        <span className="jobs-metric-pill inline-flex rounded-full px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-foreground/55">
          {job.part.toolName}
        </span>
      </div>

      <div className="mt-(--space-4)">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        {job.part.subtitle && (
          <p className="mt-(--space-2) text-sm text-foreground/55">{job.part.subtitle}</p>
        )}
      </div>

      <div className="mt-(--space-4) grid gap-(--space-2) text-sm text-foreground/60">
        <p>Job ID {job.part.jobId}</p>
        <p>Updated {formatJobTimestamp(job.part.updatedAt)}</p>
        {job.conversationId && <p>Conversation {job.conversationId}</p>}
      </div>

      <div className="mt-(--space-4) flex flex-wrap items-center gap-(--space-3) text-sm">
        {job.conversationId && (
          <Link
            href={`/?conversationId=${encodeURIComponent(job.conversationId)}`}
            className="underline decoration-foreground/24 underline-offset-4 transition hover:text-foreground"
          >
            Open conversation
          </Link>
        )}
        {artifactHref && (
          <Link
            href={artifactHref}
            className="underline decoration-foreground/24 underline-offset-4 transition hover:text-foreground"
          >
            Open artifact
          </Link>
        )}
      </div>

      <p className="mt-(--space-4) text-sm leading-6 text-foreground/72">{formatJobSummary(job)}</p>

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

      {action && (
        <div className="mt-(--space-4)">
          <button
            type="button"
            className="jobs-action-primary rounded-full px-4 py-2 text-sm font-semibold"
            onClick={() => onJobAction(job.part.jobId, action.action)}
            disabled={isPending}
            aria-label={`${action.label} ${title}`}
          >
            {isPending ? `${action.label}ing…` : action.label}
          </button>
        </div>
      )}

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