"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { JobDetailPanel } from "@/components/jobs/JobDetailPanel";
import {
  type JobAction,
  buildJobFailureClipboardText,
  buildJobLogExport,
  buildJobSummaryClipboardText,
  formatJobSummary,
  formatJobTimestamp,
  getJobLogExportFileName,
  getStatusTone,
  STATUS_LABELS,
} from "@/components/jobs/job-workspace-helpers";
import type { JobHistoryEntry } from "@/lib/jobs/job-event-history";
import type { JobRequest } from "@/core/entities/job";
import { buildJobStatusSnapshot } from "@/lib/jobs/job-read-model";
import type { JobStatusSnapshot } from "@/lib/jobs/job-read-model";
import {
  applyJobsWorkspaceEvent,
  applyOptimisticJobSnapshot,
  buildOptimisticJobHistoryEntry,
  createJobsWorkspaceState,
  getJobsWorkspaceMaxSequence,
  reconcileSelectedJobsWorkspaceJob,
  replaceJobsWorkspaceState,
  selectJobsWorkspaceJob,
  type JobsWorkspaceState,
} from "@/components/jobs/job-snapshot-reducer";
import { useJobsEventStream } from "@/components/jobs/useJobsEventStream";

interface JobsWorkspaceProps {
  jobs: JobStatusSnapshot[];
  selectedJob: JobStatusSnapshot | null;
  selectedJobHistory: JobHistoryEntry[];
  selectedJobId: string | null;
  userName: string;
}

interface JobSelectionResponse {
  job?: JobStatusSnapshot;
}

interface JobHistoryResponse {
  events?: JobHistoryEntry[];
}

interface JobActionResponse {
  job?: JobRequest;
  eventSequence?: number;
  deduped?: boolean;
  replay?: {
    outcome: "queued" | "deduped";
    sourceJobId: string;
    targetJobId: string;
    dedupeKey: string;
  };
}

async function writeTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function downloadJsonDocument(payload: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  queueMicrotask(() => URL.revokeObjectURL(objectUrl));
}

function getSyncLabel(syncState: ReturnType<typeof useJobsEventStream>): string {
  switch (syncState) {
    case "live":
      return "Live updates connected.";
    case "fallback":
      return "Live updates unavailable. Using periodic refresh fallback.";
    case "reconnecting":
    default:
      return "Live updates reconnecting. Recent state is being refreshed.";
  }
}

export function JobsWorkspace({
  jobs,
  selectedJob,
  selectedJobHistory,
  selectedJobId,
  userName,
}: JobsWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [workspace, setWorkspace] = useState<JobsWorkspaceState>(() =>
    createJobsWorkspaceState({
      jobs,
      selectedJob,
      selectedJobHistory,
      selectedJobId,
    }),
  );
  const selectionRequestRef = useRef(0);

  useEffect(() => {
    selectionRequestRef.current += 1;
    setIsHistoryLoading(false);
    setWorkspace((current) =>
      replaceJobsWorkspaceState(current, {
        jobs,
        selectedJob,
        selectedJobHistory,
        selectedJobId,
      }),
    );
  }, [jobs, selectedJob, selectedJobHistory, selectedJobId]);

  const syncState = useJobsEventStream({
    initialAfterSequence: getJobsWorkspaceMaxSequence(workspace),
    selectedJobId: workspace.selectedJobId,
    onEvent: (event) => {
      setWorkspace((current) => applyJobsWorkspaceEvent(current, event));
    },
    onReconciled: (payload) => {
      setWorkspace((current) => replaceJobsWorkspaceState(current, payload));
      setIsHistoryLoading(false);
    },
  });

  const activeCount = workspace.jobs.filter((job) => job.part.status === "queued" || job.part.status === "running").length;
  const attentionCount = workspace.jobs.filter((job) => job.part.status === "failed" || job.part.status === "canceled").length;
  const completedCount = workspace.jobs.filter((job) => job.part.status === "succeeded").length;

  async function loadSelectedJob(jobId: string): Promise<void> {
    const requestId = selectionRequestRef.current + 1;
    selectionRequestRef.current = requestId;
    setIsHistoryLoading(true);

    try {
      const [jobResponse, historyResponse] = await Promise.all([
        fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
          credentials: "same-origin",
        }),
        fetch(`/api/jobs/${encodeURIComponent(jobId)}/events?limit=50`, {
          credentials: "same-origin",
        }),
      ]);

      if (selectionRequestRef.current !== requestId) {
        return;
      }

      const jobPayload = jobResponse.ok
        ? await jobResponse.json() as JobSelectionResponse
        : null;
      const historyPayload = historyResponse.ok
        ? await historyResponse.json() as JobHistoryResponse
        : null;

      const nextSelectedJob = jobPayload?.job ?? workspace.jobs.find((job) => job.part.jobId === jobId) ?? null;
      const nextSelectedHistory = Array.isArray(historyPayload?.events) ? historyPayload.events : [];

      setWorkspace((current) =>
        reconcileSelectedJobsWorkspaceJob(current, jobId, nextSelectedJob, nextSelectedHistory),
      );
    } catch (error) {
      void error;
      if (selectionRequestRef.current === requestId) {
        setErrorMessage("Unable to load that job right now.");
      }
    } finally {
      if (selectionRequestRef.current === requestId) {
        setIsHistoryLoading(false);
      }
    }
  }

  function handleSelectJob(jobId: string): void {
    if (jobId === workspace.selectedJobId) {
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setWorkspace((current) => selectJobsWorkspaceJob(current, jobId));

    const params = new URLSearchParams();
    params.set("jobId", jobId);
    router.push(`/jobs?${params.toString()}`);
    void loadSelectedJob(jobId);
  }

  async function runJobAction(jobId: string, action: JobAction): Promise<void> {
    setErrorMessage(null);
    setStatusMessage(null);
    setPendingJobId(jobId);

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? `Unable to ${action} this job right now.`);
      }

      const body = await response.json() as JobActionResponse;
      const nextSnapshot = body.job ? buildJobStatusSnapshot(body.job) : null;

      if (nextSnapshot) {
        const isSelectedJobAction = workspace.selectedJobId === jobId;
        const optimisticEntry = buildOptimisticJobHistoryEntry(
          nextSnapshot,
          action === "cancel" ? "canceled" : "queued",
          body.eventSequence,
        );

        setWorkspace((current) =>
          applyOptimisticJobSnapshot(current, nextSnapshot, {
            selectJob: isSelectedJobAction,
            optimisticHistoryEntry: isSelectedJobAction ? optimisticEntry : undefined,
          }),
        );

        if (action === "retry" && isSelectedJobAction && nextSnapshot.part.jobId !== jobId) {
          const params = new URLSearchParams();
          params.set("jobId", nextSnapshot.part.jobId);
          router.replace(`/jobs?${params.toString()}`);
          void loadSelectedJob(nextSnapshot.part.jobId);
        }

        if (action === "cancel") {
          setStatusMessage("Job canceled.");
        } else if (body.replay?.outcome === "deduped") {
          setStatusMessage("Equivalent work is already running. Switched to the active job.");
        } else {
          setStatusMessage("Replay queued as a new job.");
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : `Unable to ${action} this job right now.`);
    } finally {
      setPendingJobId(null);
    }
  }

  function handleJobAction(jobId: string, action: JobAction): void {
    startTransition(() => {
      void runJobAction(jobId, action);
    });
  }

  async function handleCopySummary(job: JobStatusSnapshot): Promise<void> {
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      await writeTextToClipboard(buildJobSummaryClipboardText(job));
      setStatusMessage("Job summary copied.");
    } catch {
      setErrorMessage("Unable to copy the job summary right now.");
    }
  }

  async function handleCopyFailure(job: JobStatusSnapshot): Promise<void> {
    setErrorMessage(null);
    setStatusMessage(null);

    const failureText = buildJobFailureClipboardText(job);
    if (!failureText) {
      setErrorMessage("No failure details are available for this job.");
      return;
    }

    try {
      await writeTextToClipboard(failureText);
      setStatusMessage("Failure details copied.");
    } catch {
      setErrorMessage("Unable to copy the failure details right now.");
    }
  }

  function handleExportLog(job: JobStatusSnapshot, history: JobHistoryEntry[]): void {
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      downloadJsonDocument(buildJobLogExport(job, history), getJobLogExportFileName(job));
      setStatusMessage("Job log exported.");
    } catch {
      setErrorMessage("Unable to export this job log right now.");
    }
  }

  return (
    <section className="jobs-page-shell" data-testid="jobs-workspace-shell" data-jobs-workspace="true">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-(--space-4) px-(--space-frame-mobile) py-(--space-section-tight) sm:gap-(--space-section-default) sm:px-(--space-frame-default) sm:py-(--space-frame-mobile)">
        <header className="jobs-hero-surface px-(--space-inset-default) py-(--space-inset-default) sm:px-(--space-inset-panel) sm:py-(--space-inset-panel)" data-jobs-hero="true">
          <div className="jobs-hero-grid">
            <div className="max-w-3xl space-y-(--space-2)" data-jobs-hero-copy="true">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-foreground/45">Workspace</p>
              <h1 className="theme-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Your Jobs</h1>
              <p className="max-w-2xl text-sm leading-6 text-foreground/68 sm:text-base">
                Track queued, running, and recent background work tied to this account. Admin-only editorial queues still stay in the admin workspace unless they belong to you.
              </p>
              <div className="jobs-hero-meta">
                <p className="text-sm text-foreground/50">Signed in as {userName}.</p>
                <p className="text-sm text-foreground/50" data-testid="jobs-sync-state">{getSyncLabel(syncState)}</p>
              </div>
            </div>

            <div className="jobs-summary-strip" data-jobs-summary-strip="true">
              <div className="jobs-panel-surface jobs-summary-card min-w-32 px-(--space-3) py-(--space-3)" data-jobs-summary-card="active">
                <p className="text-xs uppercase tracking-[0.18em] text-foreground/45">Active</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{activeCount}</p>
              </div>
              <div className="jobs-panel-surface jobs-summary-card min-w-32 px-(--space-3) py-(--space-3)" data-jobs-summary-card="attention">
                <p className="text-xs uppercase tracking-[0.18em] text-foreground/45">Needs Attention</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{attentionCount}</p>
              </div>
              <div className="jobs-panel-surface jobs-summary-card min-w-32 px-(--space-3) py-(--space-3)" data-jobs-summary-card="completed">
                <p className="text-xs uppercase tracking-[0.18em] text-foreground/45">Completed</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{completedCount}</p>
              </div>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div role="alert" className="jobs-detail-surface px-(--space-4) py-(--space-3) text-sm text-foreground/78" data-jobs-alert="true">
            {errorMessage}
          </div>
        )}

        {statusMessage && (
          <div role="status" className="jobs-detail-surface px-(--space-4) py-(--space-3) text-sm text-foreground/78" data-jobs-status="true">
            {statusMessage}
          </div>
        )}

        {workspace.jobs.length === 0 ? (
          <div className="jobs-empty-state px-(--space-inset-default) py-(--space-10) text-center sm:px-(--space-inset-panel) sm:py-(--space-16)" data-jobs-empty-state="true">
            <h2 className="text-xl font-semibold text-foreground/72">No jobs yet</h2>
            <p className="mx-auto mt-(--space-3) max-w-xl text-sm leading-6 text-foreground/55">
              Background jobs you own will appear here as they queue and complete. If you only use the current admin-only editorial tools, their global queue remains under the admin workspace.
            </p>
          </div>
        ) : (
          <div className="jobs-workspace-grid grid gap-(--space-3) xl:grid-cols-2 sm:gap-(--space-4)" data-jobs-workspace-grid="true">
            <div className="jobs-job-list grid gap-(--space-2) sm:gap-(--space-3)" data-jobs-list="true">
              {workspace.jobs.map((snapshot) => {
                const title = snapshot.part.title ?? snapshot.part.label;
                const isSelected = snapshot.part.jobId === workspace.selectedJobId;
                const summary = formatJobSummary(snapshot);

                return (
                  <button
                    key={snapshot.part.jobId}
                    type="button"
                    className={`jobs-detail-surface w-full px-(--space-inset-default) py-(--space-inset-default) text-left transition sm:px-(--space-inset-panel) sm:py-(--space-inset-panel) ${isSelected ? "jobs-card-selected" : "jobs-card-idle"}`}
                    onClick={() => handleSelectJob(snapshot.part.jobId)}
                    aria-pressed={isSelected}
                    data-testid={`job-card-${snapshot.part.jobId}`}
                    data-jobs-card="true"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-(--space-3)">
                      <div className="flex flex-wrap items-center gap-(--space-2)">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] ${getStatusTone(snapshot.part.status)}`}>
                          {STATUS_LABELS[snapshot.part.status]}
                        </span>
                        <span className="jobs-metric-pill inline-flex rounded-full px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-foreground/55">
                          {snapshot.part.toolName}
                        </span>
                        {isSelected ? (
                          <span className="inline-flex rounded-full border border-foreground/12 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-foreground/50">
                            Selected
                          </span>
                        ) : null}
                      </div>
                      <span className="text-xs text-foreground/45">Updated {formatJobTimestamp(snapshot.part.updatedAt)}</span>
                    </div>
                    <h2 className="mt-(--space-3) text-lg font-semibold tracking-tight text-foreground">{title}</h2>
                    {!isSelected && snapshot.part.subtitle ? (
                      <p className="mt-1 text-sm text-foreground/55">{snapshot.part.subtitle}</p>
                    ) : null}
                    <p className="mt-(--space-3) text-sm leading-6 text-foreground/68">
                      {isSelected ? "Opened in the detail panel. Use the right side for full history and actions." : summary}
                    </p>
                    {snapshot.part.progressPercent != null ? (
                      <div className="mt-(--space-3) space-y-1">
                        <div className="flex items-center justify-between text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-foreground/45">
                          <span>{snapshot.part.progressLabel ?? "Progress"}</span>
                          <span>{Math.round(snapshot.part.progressPercent)}%</span>
                        </div>
                        <div className="jobs-progress-track h-1.5 overflow-hidden rounded-full">
                          <div
                            className="jobs-progress-fill h-full rounded-full"
                            style={{ width: `${Math.max(0, Math.min(100, snapshot.part.progressPercent))}%` }}
                          />
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-(--space-3) flex flex-wrap items-center gap-(--space-2) text-xs text-foreground/50">
                      {isSelected ? (
                        <span>Job {snapshot.part.jobId}</span>
                      ) : (
                        <span>{STATUS_LABELS[snapshot.part.status]} queue item</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <JobDetailPanel
              job={workspace.selectedJob}
              history={workspace.selectedJobHistory}
              isHistoryLoading={isHistoryLoading}
              isPending={pendingJobId === workspace.selectedJobId && isPending}
              onJobAction={handleJobAction}
              onCopySummary={(job) => {
                void handleCopySummary(job);
              }}
              onCopyFailure={(job) => {
                void handleCopyFailure(job);
              }}
              onExportLog={handleExportLog}
            />
          </div>
        )}
      </div>
    </section>
  );
}