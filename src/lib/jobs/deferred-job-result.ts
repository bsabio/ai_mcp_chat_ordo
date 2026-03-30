import type { StreamEvent } from "@/core/entities/chat-stream";
import type { JobEvent, JobRequest, JobStatus } from "@/core/entities/job";
import type { JobStatusMessagePart } from "@/core/entities/message-parts";
import { buildJobStatusPart } from "./job-status";

export interface DeferredJobEnvelope {
  jobId: string;
  conversationId: string;
  toolName: string;
  label: string;
  title?: string;
  subtitle?: string;
  status: JobStatus;
  sequence: number;
  progressPercent?: number | null;
  progressLabel?: string | null;
  summary?: string;
  error?: string;
  resultPayload?: unknown;
  updatedAt?: string;
  deduped?: boolean;
}

export interface DeferredJobResultPayload {
  deferred_job: DeferredJobEnvelope;
}

export function createDeferredJobResultPayload(
  job: JobRequest,
  event: JobEvent,
  options?: { deduped?: boolean },
): DeferredJobResultPayload {
  const part = buildJobStatusPart(job, event);

  return {
    deferred_job: {
      jobId: job.id,
      conversationId: job.conversationId,
      toolName: job.toolName,
      label: part.label,
      title: part.title,
      subtitle: part.subtitle,
      status: part.status,
      sequence: part.sequence ?? event.sequence,
      progressPercent: part.progressPercent,
      progressLabel: part.progressLabel,
      summary: part.summary,
      error: part.error,
      resultPayload: job.resultPayload ?? part.resultPayload,
      updatedAt: part.updatedAt,
      deduped: options?.deduped,
    },
  };
}

export function isDeferredJobResultPayload(value: unknown): value is DeferredJobResultPayload {
  return (
    typeof value === "object"
    && value !== null
    && "deferred_job" in value
    && typeof (value as { deferred_job?: unknown }).deferred_job === "object"
    && (value as { deferred_job?: unknown }).deferred_job !== null
  );
}

export function deferredJobResultToMessagePart(payload: DeferredJobResultPayload): JobStatusMessagePart {
  const deferredJob = payload.deferred_job;
  const summary = deferredJob.deduped && (deferredJob.status === "queued" || deferredJob.status === "running")
    ? `Using existing ${deferredJob.label} job in this conversation.`
    : deferredJob.summary;

  return {
    type: "job_status",
    jobId: deferredJob.jobId,
    toolName: deferredJob.toolName,
    label: deferredJob.label,
    title: deferredJob.title,
    subtitle: deferredJob.subtitle,
    status: deferredJob.status,
    sequence: deferredJob.sequence,
    progressPercent: deferredJob.progressPercent,
    progressLabel: deferredJob.progressLabel,
    summary,
    error: deferredJob.error,
    resultPayload: deferredJob.resultPayload,
    updatedAt: deferredJob.updatedAt,
  };
}

export function deferredJobResultToStreamEvent(payload: DeferredJobResultPayload): Extract<
  StreamEvent,
  { type: "job_queued" | "job_started" | "job_progress" | "job_completed" | "job_failed" | "job_canceled" }
> {
  const deferredJob = payload.deferred_job;
  const base = {
    jobId: deferredJob.jobId,
    conversationId: deferredJob.conversationId,
    sequence: deferredJob.sequence,
    toolName: deferredJob.toolName,
    label: deferredJob.label,
    title: deferredJob.title,
    subtitle: deferredJob.subtitle,
    updatedAt: deferredJob.updatedAt,
  };

  switch (deferredJob.status) {
    case "queued":
      return {
        type: "job_queued",
        ...base,
      };
    case "running":
      return {
        type: "job_progress",
        ...base,
        progressPercent: deferredJob.progressPercent,
        progressLabel: deferredJob.progressLabel,
      };
    case "succeeded":
      return {
        type: "job_completed",
        ...base,
        summary: deferredJob.summary,
        resultPayload: deferredJob.resultPayload,
      };
    case "failed":
      return {
        type: "job_failed",
        ...base,
        error: deferredJob.error ?? "Deferred job failed.",
      };
    case "canceled":
      return {
        type: "job_canceled",
        ...base,
      };
  }
}