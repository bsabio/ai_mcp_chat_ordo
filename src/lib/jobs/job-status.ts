import type { JobEvent, JobRequest } from "@/core/entities/job";
import type { JobStatusMessagePart } from "@/core/entities/message-parts";

import { getAdminJournalPreviewPath } from "@/lib/journal/admin-journal-routes";

type JobStatusProjection = Pick<
  JobRequest,
  | "id"
  | "status"
  | "toolName"
  | "requestPayload"
  | "progressPercent"
  | "progressLabel"
  | "resultPayload"
  | "errorMessage"
  | "failureClass"
  | "recoveryMode"
  | "replayedFromJobId"
  | "supersededByJobId"
>;

export function projectJobForEvent(
  job: Pick<JobRequest, "id" | "status" | "toolName" | "requestPayload" | "failureClass" | "recoveryMode" | "replayedFromJobId" | "supersededByJobId">,
  event: JobEvent,
): JobStatusProjection {
  const payload = event.payload;

  return {
    id: job.id,
    status: job.status,
    toolName: job.toolName,
    requestPayload: job.requestPayload,
    progressPercent:
      typeof payload.progressPercent === "number" ? payload.progressPercent : null,
    progressLabel:
      typeof payload.progressLabel === "string" ? payload.progressLabel : null,
    resultPayload: payload.result ?? null,
    errorMessage:
      typeof payload.errorMessage === "string" ? payload.errorMessage : null,
    failureClass: job.failureClass,
    recoveryMode: job.recoveryMode,
    replayedFromJobId: job.replayedFromJobId,
    supersededByJobId: job.supersededByJobId,
  };
}

function humanizeToolName(toolName: string): string {
  return toolName
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function inferSummary(result: unknown): string | undefined {
  if (typeof result === "string" && result.trim()) {
    return result;
  }

  if (typeof result === "object" && result !== null) {
    const candidate = result as Record<string, unknown>;
    if (typeof candidate.summary === "string" && candidate.summary.trim()) {
      return candidate.summary;
    }
    if (typeof candidate.message === "string" && candidate.message.trim()) {
      return candidate.message;
    }
    if (
      candidate.action === "prepare_journal_post_for_publish"
      && typeof candidate.summary === "string"
      && candidate.summary.trim()
    ) {
      return candidate.summary;
    }
    if (
      candidate.status === "draft"
      && typeof candidate.title === "string"
      && typeof candidate.slug === "string"
    ) {
      return `Draft journal article \"${candidate.title}\" ready at ${getAdminJournalPreviewPath(candidate.slug)}.`;
    }
    if (
      candidate.status === "published"
      && typeof candidate.title === "string"
      && typeof candidate.slug === "string"
    ) {
      return `Published journal article \"${candidate.title}\" at /journal/${candidate.slug}.`;
    }
  }

  return undefined;
}

function compactText(value: string, maxLength = 84): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function buildHumanReadableIdentity(
  job: Pick<JobStatusProjection, "toolName" | "requestPayload">,
): Pick<JobStatusMessagePart, "title" | "subtitle"> {
  const payload = job.requestPayload;
  const title = readString(payload.title);
  const brief = readString(payload.brief);
  const audience = readString(payload.audience);
  const objective = readString(payload.objective);
  const altText = readString(payload.alt_text);
  const postId = readString(payload.post_id);

  switch (job.toolName) {
    case "draft_content":
      return {
        title: title ? compactText(title) : undefined,
        subtitle: title ? "Draft journal article" : undefined,
      };
    case "publish_content":
      return {
        title: postId ? `Publish journal draft ${postId}` : "Publish journal draft",
        subtitle: "Make the saved article live in the journal",
      };
    case "compose_blog_article":
      return {
        title: brief ? compactText(brief) : undefined,
        subtitle: [audience ? `Audience: ${compactText(audience, 40)}` : undefined, objective ? `Objective: ${compactText(objective, 40)}` : undefined]
          .filter(Boolean)
          .join(" · ") || "Compose the first article draft",
      };
    case "produce_blog_article":
      return {
        title: brief ? compactText(brief) : undefined,
        subtitle: [audience ? `Audience: ${compactText(audience, 40)}` : undefined, objective ? `Objective: ${compactText(objective, 40)}` : undefined]
          .filter(Boolean)
          .join(" · ") || "Compose, QA, and prepare a publish-ready draft",
      };
    case "qa_blog_article":
      return {
        title: title ? compactText(title) : undefined,
        subtitle: "Run editorial QA on the current article draft",
      };
    case "resolve_blog_article_qa":
      return {
        title: title ? compactText(title) : undefined,
        subtitle: "Apply editorial fixes from the QA report",
      };
    case "generate_blog_image_prompt":
      return {
        title: title ? compactText(title) : undefined,
        subtitle: "Prepare the hero-image prompt for this article",
      };
    case "generate_blog_image":
      return {
        title: altText ? compactText(altText) : undefined,
        subtitle: "Generate the blog hero image asset",
      };
    case "prepare_journal_post_for_publish":
      return {
        title: postId ? `Journal publish readiness for ${postId}` : "Journal publish readiness",
        subtitle: "Check blockers, active work, and QA before publication",
      };
    default:
      return {};
  }
}

export function buildJobStatusPart(job: JobRequest, event: JobEvent): JobStatusMessagePart {
  return buildJobStatusPartFromProjection(job, event);
}

export function buildJobStatusPartFromProjection(
  job: JobStatusProjection,
  event: JobEvent,
): JobStatusMessagePart {
  const status =
    event.eventType === "queued"
      ? "queued"
      : event.eventType === "started" || event.eventType === "progress"
        ? "running"
        : event.eventType === "requeued" || event.eventType === "retry_scheduled" || event.eventType === "lease_recovered"
          ? "queued"
        : event.eventType === "result"
          ? "succeeded"
          : event.eventType === "failed" || event.eventType === "retry_exhausted"
            ? "failed"
            : event.eventType === "canceled"
              ? "canceled"
              : job.status;

  const payload = event.payload;
  const identity = buildHumanReadableIdentity(job);

  return {
    type: "job_status",
    jobId: job.id,
    toolName: job.toolName,
    label: humanizeToolName(job.toolName),
    title: identity.title,
    subtitle: identity.subtitle,
    status,
    sequence: event.sequence,
    progressPercent:
      typeof payload.progressPercent === "number"
        ? payload.progressPercent
        : job.progressPercent,
    progressLabel:
      typeof payload.progressLabel === "string"
        ? payload.progressLabel
        : job.progressLabel,
    summary:
      typeof payload.summary === "string"
        ? payload.summary
        : inferSummary(payload.result) ?? inferSummary(job.resultPayload),
    error:
      typeof payload.errorMessage === "string"
        ? payload.errorMessage
        : job.errorMessage ?? undefined,
    updatedAt: event.createdAt,
    resultPayload: payload.result ?? job.resultPayload ?? undefined,
    failureClass: job.failureClass,
    recoveryMode: job.recoveryMode,
    replayedFromJobId: job.replayedFromJobId,
    supersededByJobId: job.supersededByJobId,
  };
}

export function describeJobStatus(part: JobStatusMessagePart): string {
  const subject = part.title ? `${part.label} job for ${part.title}` : `${part.label} job`;

  switch (part.status) {
    case "queued":
      return `${subject} queued.`;
    case "running":
      if (part.progressLabel && part.progressPercent != null) {
        return `${subject} running: ${part.progressLabel} (${Math.round(part.progressPercent)}%).`;
      }
      if (part.progressLabel) {
        return `${subject} running: ${part.progressLabel}.`;
      }
      if (part.progressPercent != null) {
        return `${subject} running (${Math.round(part.progressPercent)}%).`;
      }
      return `${subject} running.`;
    case "succeeded":
      return part.summary ? `${subject} completed: ${part.summary}` : `${subject} completed.`;
    case "failed":
      return part.error ? `${subject} failed: ${part.error}` : `${subject} failed.`;
    case "canceled":
      return `${subject} canceled.`;
  }
}

export function getJobMessageId(jobId: string): string {
  return `jobmsg_${jobId}`;
}