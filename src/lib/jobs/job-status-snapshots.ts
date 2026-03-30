import type { StreamEvent } from "@/core/entities/chat-stream";
import type { JobStatusMessagePart } from "@/core/entities/message-parts";
import type { JobStatusSnapshot } from "@/lib/jobs/job-read-model";

function isJobStatusMessagePart(value: unknown): value is JobStatusMessagePart {
  return typeof value === "object"
    && value !== null
    && (value as { type?: unknown }).type === "job_status"
    && typeof (value as { jobId?: unknown }).jobId === "string"
    && typeof (value as { toolName?: unknown }).toolName === "string"
    && typeof (value as { label?: unknown }).label === "string";
}

function isJobStatusSnapshot(value: unknown): value is JobStatusSnapshot {
  return typeof value === "object"
    && value !== null
    && typeof (value as { messageId?: unknown }).messageId === "string"
    && (
      (value as { conversationId?: unknown }).conversationId === undefined
      || typeof (value as { conversationId?: unknown }).conversationId === "string"
    )
    && isJobStatusMessagePart((value as { part?: unknown }).part);
}

export function extractJobStatusSnapshots(value: unknown): JobStatusSnapshot[] {
  if (isJobStatusSnapshot(value)) {
    return [value];
  }

  if (typeof value !== "object" || value === null) {
    return [];
  }

  const record = value as { job?: unknown; jobs?: unknown };
  if (isJobStatusSnapshot(record.job)) {
    return [record.job];
  }

  if (Array.isArray(record.jobs)) {
    return record.jobs.filter(isJobStatusSnapshot);
  }

  return [];
}

export function jobStatusSnapshotToStreamEvent(
  snapshot: JobStatusSnapshot,
  conversationId = "",
): Extract<
  StreamEvent,
  { type: "job_queued" | "job_started" | "job_progress" | "job_completed" | "job_failed" | "job_canceled" }
> {
  const { messageId, part } = snapshot;
  const base = {
    messageId,
    jobId: part.jobId,
    conversationId: snapshot.conversationId ?? conversationId,
    sequence: part.sequence ?? 0,
    toolName: part.toolName,
    label: part.label,
    title: part.title,
    subtitle: part.subtitle,
    updatedAt: part.updatedAt,
  };

  switch (part.status) {
    case "queued":
      return {
        type: "job_queued",
        ...base,
      };
    case "running":
      if (part.progressPercent != null || part.progressLabel) {
        return {
          type: "job_progress",
          ...base,
          progressPercent: part.progressPercent,
          progressLabel: part.progressLabel,
        };
      }
      return {
        type: "job_started",
        ...base,
      };
    case "succeeded":
      return {
        type: "job_completed",
        ...base,
        summary: part.summary,
        resultPayload: part.resultPayload,
      };
    case "failed":
      return {
        type: "job_failed",
        ...base,
        error: part.error ?? "Deferred job failed.",
      };
    case "canceled":
      return {
        type: "job_canceled",
        ...base,
      };
  }
}