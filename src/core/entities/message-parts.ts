import type { ActionLinkType } from "./rich-content";
import type { JobStatus } from "./job";

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
  actions?: Array<{
    label: string;
    actionType: ActionLinkType;
    value: string;
    params?: Record<string, string>;
  }>;
}

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; name: string; result: unknown }
  | JobStatusMessagePart
  | {
      type: "attachment";
      assetId: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
    }
  | { type: "summary"; text: string; coversUpToMessageId: string }
  | { type: "meta_summary"; text: string; coversUpToSummaryId: string; summariesCompacted: number };
