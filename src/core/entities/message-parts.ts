import type { ActionLinkType } from "./rich-content";
import type { JobFailureClass, JobRecoveryMode, JobStatus } from "./job";

/**
 * Domain types for message parts (tool calls, text segments, tool results).
 * Defined in the core layer so entities and use-cases can reference them
 * without depending on React hooks or framework code.
 */
export interface JobStatusMessagePart {
  type: "job_status";
  jobId: string;
  toolName: string;
  label: string;
  title?: string;
  subtitle?: string;
  status: JobStatus;
  sequence?: number;
  progressPercent?: number | null;
  progressLabel?: string | null;
  summary?: string;
  error?: string;
  updatedAt?: string;
  resultPayload?: unknown;
  failureClass?: JobFailureClass | null;
  recoveryMode?: JobRecoveryMode | null;
  replayedFromJobId?: string | null;
  supersededByJobId?: string | null;
  actions?: Array<{
    label: string;
    actionType: ActionLinkType;
    value: string;
    params?: Record<string, string>;
  }>;
}

export type GenerationStatus = "stopped" | "interrupted";
export type GenerationStatusActor = "user" | "system";

export interface GenerationStatusMessagePart {
  type: "generation_status";
  status: GenerationStatus;
  actor: GenerationStatusActor;
  reason: string;
  partialContentRetained: boolean;
  recordedAt?: string;
}

export type ImportedAttachmentAvailability = "embedded" | "unavailable";

export interface ImportedAttachmentMessagePart {
  type: "imported_attachment";
  fileName: string;
  mimeType: string;
  fileSize: number;
  availability: ImportedAttachmentAvailability;
  note: string;
  originalAssetId?: string | null;
}

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "error"; text: string }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; name: string; result: unknown }
  | JobStatusMessagePart
  | GenerationStatusMessagePart
  | {
      type: "attachment";
      assetId: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
    }
  | ImportedAttachmentMessagePart
  | { type: "summary"; text: string; coversUpToMessageId: string }
  | { type: "meta_summary"; text: string; coversUpToSummaryId: string; summariesCompacted: number };
