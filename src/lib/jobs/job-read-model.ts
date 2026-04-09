import type { JobEvent, JobRequest, JobStatus } from "@/core/entities/job";
import type { JobStatusMessagePart } from "@/core/entities/message-parts";
import { buildJobStatusPart, getJobMessageId } from "@/lib/jobs/job-status";

const ACTIVE_JOB_STATUSES: JobStatus[] = ["queued", "running"];
const SNAPSHOT_AUDIT_EVENT_TYPES: ReadonlySet<JobEvent["eventType"]> = new Set([
  "notification_sent",
  "notification_failed",
  "ownership_transferred",
]);

function toEventType(status: JobStatus): JobEvent["eventType"] {
  switch (status) {
    case "queued":
      return "queued";
    case "running":
      return "progress";
    case "succeeded":
      return "result";
    case "failed":
      return "failed";
    case "canceled":
      return "canceled";
  }
}

export interface JobStatusSnapshot {
  messageId: string;
  conversationId?: string;
  part: JobStatusMessagePart;
}

export function getActiveJobStatuses(): JobStatus[] {
  return [...ACTIVE_JOB_STATUSES];
}

export function buildSyntheticJobEvent(job: JobRequest): JobEvent {
  return {
    id: `synthetic_${job.id}`,
    jobId: job.id,
    conversationId: job.conversationId,
    sequence: 0,
    eventType: toEventType(job.status),
    payload: {
      result: job.resultPayload ?? undefined,
      errorMessage: job.errorMessage ?? undefined,
      progressPercent: job.progressPercent ?? undefined,
      progressLabel: job.progressLabel ?? undefined,
    },
    createdAt: job.updatedAt,
  };
}

export function buildJobStatusSnapshot(job: JobRequest, event?: JobEvent | null): JobStatusSnapshot {
  const snapshotEvent = !event || SNAPSHOT_AUDIT_EVENT_TYPES.has(event.eventType)
    ? buildSyntheticJobEvent(job)
    : event;

  return {
    messageId: getJobMessageId(job.id),
    conversationId: job.conversationId,
    part: buildJobStatusPart(job, snapshotEvent),
  };
}