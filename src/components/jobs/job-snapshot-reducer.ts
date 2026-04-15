import type { StreamEvent } from "@/core/entities/chat-stream";
import type { JobStatusMessagePart } from "@/core/entities/message-parts";
import type { JobHistoryEntry } from "@/lib/jobs/job-event-history";
import { getJobMessageId } from "@/lib/jobs/job-status";
import type { JobStatusSnapshot } from "@/lib/jobs/job-read-model";
import type { UserJobsWorkspaceData } from "@/lib/jobs/load-user-jobs-workspace";
import { sortUserJobSnapshots } from "@/lib/jobs/user-jobs-workspace";

export type JobsWorkspaceStreamEvent = Extract<
  StreamEvent,
  {
    type:
      | "job_queued"
      | "job_started"
      | "job_progress"
      | "job_completed"
      | "job_failed"
      | "job_canceled";
  }
>;

export type JobsWorkspaceState = UserJobsWorkspaceData;

function toTimestamp(value: string | undefined): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

function compareSnapshotFreshness(left: JobStatusSnapshot, right: JobStatusSnapshot): number {
  const leftSequence = left.part.sequence ?? -1;
  const rightSequence = right.part.sequence ?? -1;

  if (leftSequence !== rightSequence) {
    return leftSequence - rightSequence;
  }

  return toTimestamp(left.part.updatedAt) - toTimestamp(right.part.updatedAt);
}

function pickFresherSnapshot(
  current: JobStatusSnapshot | null,
  incoming: JobStatusSnapshot | null,
): JobStatusSnapshot | null {
  if (!current) {
    return incoming;
  }

  if (!incoming) {
    return current;
  }

  return compareSnapshotFreshness(current, incoming) > 0 ? current : incoming;
}

function mapStreamEventStatus(event: JobsWorkspaceStreamEvent): JobStatusSnapshot["part"]["status"] {
  switch (event.type) {
    case "job_queued":
      return "queued";
    case "job_started":
    case "job_progress":
      return "running";
    case "job_completed":
      return "succeeded";
    case "job_failed":
      return "failed";
    case "job_canceled":
      return "canceled";
  }
}

function mapStreamEventType(event: JobsWorkspaceStreamEvent): JobHistoryEntry["eventType"] {
  switch (event.type) {
    case "job_queued":
      return "queued";
    case "job_started":
      return "started";
    case "job_progress":
      return "progress";
    case "job_completed":
      return "result";
    case "job_failed":
      return "failed";
    case "job_canceled":
      return "canceled";
  }
}

function buildJobPartFromStreamEvent(event: JobsWorkspaceStreamEvent): JobStatusMessagePart {
  if (event.part) {
    return {
      ...event.part,
      sequence: event.sequence,
    };
  }

  return {
    type: "job_status",
    jobId: event.jobId,
    toolName: event.toolName,
    label: event.label,
    title: event.title,
    subtitle: event.subtitle,
    status: mapStreamEventStatus(event),
    sequence: event.sequence,
    progressPercent: event.type === "job_progress" ? event.progressPercent ?? null : null,
    progressLabel: event.type === "job_progress" ? event.progressLabel ?? null : null,
    summary: event.type === "job_completed" ? event.summary : undefined,
    error: event.type === "job_failed" ? event.error : undefined,
    updatedAt: event.updatedAt,
    resultPayload: event.type === "job_completed" ? event.resultPayload : undefined,
  };
}

export function buildJobSnapshotFromStreamEvent(event: JobsWorkspaceStreamEvent): JobStatusSnapshot {
  return {
    messageId: event.messageId ?? getJobMessageId(event.jobId),
    conversationId: event.conversationId,
    part: buildJobPartFromStreamEvent(event),
  };
}

export function buildJobHistoryEntryFromStreamEvent(event: JobsWorkspaceStreamEvent): JobHistoryEntry {
  return {
    id: `${event.jobId}_${event.sequence}`,
    jobId: event.jobId,
    conversationId: event.conversationId,
    sequence: event.sequence,
    eventType: mapStreamEventType(event),
    createdAt: event.updatedAt ?? new Date().toISOString(),
    part: buildJobPartFromStreamEvent(event),
  };
}

export function buildOptimisticJobHistoryEntry(
  snapshot: JobStatusSnapshot,
  eventType: JobHistoryEntry["eventType"],
  sequence?: number,
): JobHistoryEntry {
  return {
    id: `${snapshot.part.jobId}_${sequence ?? snapshot.part.sequence ?? "optimistic"}`,
    jobId: snapshot.part.jobId,
    conversationId: snapshot.conversationId ?? "",
    sequence: sequence ?? snapshot.part.sequence ?? 0,
    eventType,
    createdAt: snapshot.part.updatedAt ?? new Date().toISOString(),
    part: {
      ...snapshot.part,
      sequence: sequence ?? snapshot.part.sequence,
    },
  };
}

function upsertJobSnapshot(jobs: JobStatusSnapshot[], nextSnapshot: JobStatusSnapshot): JobStatusSnapshot[] {
  const index = jobs.findIndex((job) => job.part.jobId === nextSnapshot.part.jobId);
  if (index === -1) {
    return sortUserJobSnapshots([nextSnapshot, ...jobs]);
  }

  if (compareSnapshotFreshness(jobs[index], nextSnapshot) > 0) {
    return sortUserJobSnapshots(jobs);
  }

  const nextJobs = [...jobs];
  nextJobs[index] = nextSnapshot;
  return sortUserJobSnapshots(nextJobs);
}

function mergeJobHistoryEntry(history: JobHistoryEntry[], nextEntry: JobHistoryEntry): JobHistoryEntry[] {
  const index = history.findIndex(
    (entry) => entry.jobId === nextEntry.jobId && entry.sequence === nextEntry.sequence,
  );

  if (index === -1) {
    return [...history, nextEntry].sort((left, right) => left.sequence - right.sequence);
  }

  const nextHistory = [...history];
  nextHistory[index] = nextEntry;
  return nextHistory;
}

export function createJobsWorkspaceState(data: UserJobsWorkspaceData): JobsWorkspaceState {
  return {
    jobs: sortUserJobSnapshots(data.jobs),
    selectedJobId: data.selectedJobId,
    selectedJob: data.selectedJob,
    selectedJobHistory: [...data.selectedJobHistory].sort((left, right) => left.sequence - right.sequence),
  };
}

export function replaceJobsWorkspaceState(
  currentState: JobsWorkspaceState,
  nextState: UserJobsWorkspaceData,
): JobsWorkspaceState {
  const jobs = nextState.jobs.reduce(
    (merged, snapshot) => upsertJobSnapshot(merged, snapshot),
    sortUserJobSnapshots(currentState.jobs),
  );

  const selectedJobId = nextState.selectedJobId;
  const selectedJob = selectedJobId
    ? pickFresherSnapshot(
      currentState.selectedJobId === selectedJobId ? currentState.selectedJob : null,
      nextState.selectedJob,
    )
    : nextState.selectedJob;

  const historyMap = new Map<string, JobHistoryEntry>();
  for (const entry of currentState.selectedJobHistory) {
    historyMap.set(`${entry.jobId}:${entry.sequence}`, entry);
  }
  for (const entry of nextState.selectedJobHistory) {
    historyMap.set(`${entry.jobId}:${entry.sequence}`, entry);
  }

  return {
    jobs,
    selectedJobId,
    selectedJob,
    selectedJobHistory: Array.from(historyMap.values())
      .filter((entry) => !selectedJobId || entry.jobId === selectedJobId)
      .sort((left, right) => left.sequence - right.sequence),
  };
}

export function selectJobsWorkspaceJob(
  state: JobsWorkspaceState,
  jobId: string,
  selectedJobHistory: JobHistoryEntry[] = [],
): JobsWorkspaceState {
  const selectedJob = state.jobs.find((job) => job.part.jobId === jobId) ?? state.selectedJob;

  return {
    ...state,
    selectedJobId: jobId,
    selectedJob: selectedJob?.part.jobId === jobId ? selectedJob : null,
    selectedJobHistory: [...selectedJobHistory].sort((left, right) => left.sequence - right.sequence),
  };
}

export function reconcileSelectedJobsWorkspaceJob(
  state: JobsWorkspaceState,
  jobId: string,
  selectedJob: JobStatusSnapshot | null,
  selectedJobHistory: JobHistoryEntry[],
): JobsWorkspaceState {
  const currentSelected = state.selectedJobId === jobId ? state.selectedJob : null;
  const freshestSelected = pickFresherSnapshot(currentSelected, selectedJob);
  const jobs = freshestSelected ? upsertJobSnapshot(state.jobs, freshestSelected) : state.jobs;

  const historyMap = new Map<string, JobHistoryEntry>();
  for (const entry of state.selectedJobHistory) {
    if (entry.jobId === jobId) {
      historyMap.set(`${entry.jobId}:${entry.sequence}`, entry);
    }
  }
  for (const entry of selectedJobHistory) {
    if (entry.jobId === jobId) {
      historyMap.set(`${entry.jobId}:${entry.sequence}`, entry);
    }
  }

  return {
    jobs,
    selectedJobId: jobId,
    selectedJob: freshestSelected,
    selectedJobHistory: Array.from(historyMap.values()).sort((left, right) => left.sequence - right.sequence),
  };
}

export function applyJobsWorkspaceEvent(
  state: JobsWorkspaceState,
  event: JobsWorkspaceStreamEvent,
): JobsWorkspaceState {
  const snapshot = buildJobSnapshotFromStreamEvent(event);
  const jobs = upsertJobSnapshot(state.jobs, snapshot);

  if (state.selectedJobId !== snapshot.part.jobId) {
    return {
      ...state,
      jobs,
    };
  }

  return {
    jobs,
    selectedJobId: state.selectedJobId,
    selectedJob: pickFresherSnapshot(state.selectedJob, snapshot),
    selectedJobHistory: mergeJobHistoryEntry(
      state.selectedJobHistory,
      buildJobHistoryEntryFromStreamEvent(event),
    ),
  };
}

export function applyOptimisticJobSnapshot(
  state: JobsWorkspaceState,
  snapshot: JobStatusSnapshot,
  options?: {
    selectJob?: boolean;
    optimisticHistoryEntry?: JobHistoryEntry;
  },
): JobsWorkspaceState {
  const jobs = upsertJobSnapshot(state.jobs, snapshot);
  const selectJob = options?.selectJob ?? state.selectedJobId === snapshot.part.jobId;

  if (!selectJob) {
    return {
      ...state,
      jobs,
    };
  }

  return {
    jobs,
    selectedJobId: snapshot.part.jobId,
    selectedJob: snapshot,
    selectedJobHistory: options?.optimisticHistoryEntry
      ? mergeJobHistoryEntry(state.selectedJobHistory, options.optimisticHistoryEntry)
      : state.selectedJobHistory,
  };
}

export function getJobsWorkspaceMaxSequence(state: JobsWorkspaceState): number {
  return Math.max(
    0,
    ...state.jobs.map((job) => job.part.sequence ?? 0),
    ...state.selectedJobHistory.map((entry) => entry.sequence),
    state.selectedJob?.part.sequence ?? 0,
  );
}