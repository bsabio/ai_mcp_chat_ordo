import { z } from "zod";

import type { ChatMessage } from "@/core/entities/chat-message";
import type { Conversation, Message } from "@/core/entities/conversation";
import { createConversationRoutingSnapshot } from "@/core/entities/conversation-routing";
import type {
  ImportedAttachmentAvailability,
  ImportedAttachmentMessagePart,
  JobStatusMessagePart,
  MessagePart,
} from "@/core/entities/message-parts";

export const CONVERSATION_EXPORT_VERSION = 1;
export const CONVERSATION_IMPORT_MAX_BYTES = 2 * 1024 * 1024;

export type PortableAttachmentAvailability =
  | "durable_asset"
  | ImportedAttachmentAvailability;

export interface PortableAttachmentManifestEntry {
  id: string;
  messageId: string;
  partIndex: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  availability: PortableAttachmentAvailability;
  assetId?: string | null;
  note?: string | null;
}

export interface PortableJobReference {
  jobId: string;
  toolName: string;
  status: string;
  label: string;
  messageId: string;
}

export interface ExportConversationMetadata {
  id: string;
  title: string;
  status: Conversation["status"];
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  sessionSource: string;
  promptVersion: number | null;
  routingSnapshot: Conversation["routingSnapshot"];
  referralSource: string | null;
  deletedAt?: string | null;
  purgeAfter?: string | null;
  importedAt?: string | null;
  importSourceConversationId?: string | null;
  importedFromExportedAt?: string | null;
}

export interface ExportConversationMessage {
  id: string;
  role: Message["role"];
  content: string;
  parts: MessagePart[];
  createdAt: string;
  tokenEstimate: number;
  attachmentManifestIds: string[];
}

export interface ConversationExportPayload {
  version: typeof CONVERSATION_EXPORT_VERSION;
  exportedAt: string;
  conversation: ExportConversationMetadata;
  messages: ExportConversationMessage[];
  attachmentManifest: PortableAttachmentManifestEntry[];
  jobReferences: PortableJobReference[];
}

interface BuildConversationExportOptions {
  conversation: Conversation;
  messages: Message[];
  exportedAt?: string;
}

interface PurgeEligibilityInput {
  deletedAt?: string | null;
  purgeAfter?: string | null;
}

interface ImportConversationShape {
  version: typeof CONVERSATION_EXPORT_VERSION;
  exportedAt: string;
  conversation: ExportConversationMetadata;
  messages: ExportConversationMessage[];
  attachmentManifest: PortableAttachmentManifestEntry[];
  jobReferences: PortableJobReference[];
}

export interface NormalizedImportedConversation {
  payload: ImportConversationShape;
  importedMessages: Array<{
    role: Message["role"];
    content: string;
    parts: MessagePart[];
  }>;
}

const htmlPattern = /<\s*\/?\s*[a-z!][^>]*>/i;
const executablePattern = /(?:javascript:|data:text\/html|<script\b|on(?:load|error|click)\s*=)/i;

const routingSnapshotSchema = z.object({
  lane: z.enum(["organization", "individual", "development", "uncertain"]),
  confidence: z.number().nullable().optional(),
  recommendedNextStep: z.string().nullable().optional(),
  detectedNeedSummary: z.string().nullable().optional(),
  lastAnalyzedAt: z.string().nullable().optional(),
});

const exportConversationSchema = z.object({
  version: z.literal(CONVERSATION_EXPORT_VERSION),
  exportedAt: z.string().min(1),
  conversation: z.object({
    id: z.string().min(1),
    title: z.string(),
    status: z.enum(["active", "archived"]),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    messageCount: z.number().int().nonnegative(),
    sessionSource: z.string().min(1),
    promptVersion: z.number().int().nullable(),
    routingSnapshot: routingSnapshotSchema,
    referralSource: z.string().nullable(),
    deletedAt: z.string().nullable().optional(),
    purgeAfter: z.string().nullable().optional(),
    importedAt: z.string().nullable().optional(),
    importSourceConversationId: z.string().nullable().optional(),
    importedFromExportedAt: z.string().nullable().optional(),
  }),
  messages: z.array(z.object({
    id: z.string().min(1),
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
    parts: z.array(z.object({ type: z.string() }).passthrough()),
    createdAt: z.string().min(1),
    tokenEstimate: z.number().int().nonnegative(),
    attachmentManifestIds: z.array(z.string()).default([]),
  })),
  attachmentManifest: z.array(z.object({
    id: z.string().min(1),
    messageId: z.string().min(1),
    partIndex: z.number().int().nonnegative(),
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
    fileSize: z.number().int().nonnegative(),
    availability: z.enum(["durable_asset", "embedded", "unavailable"]),
    assetId: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
  })),
  jobReferences: z.array(z.object({
    jobId: z.string().min(1),
    toolName: z.string().min(1),
    status: z.string().min(1),
    label: z.string().min(1),
    messageId: z.string().min(1),
  })).default([]),
});

function deepCloneParts(parts: MessagePart[]): MessagePart[] {
  return JSON.parse(JSON.stringify(parts)) as MessagePart[];
}

function toAttachmentManifestId(messageId: string, partIndex: number): string {
  return `${messageId}:attachment:${partIndex}`;
}

function defaultImportedAttachmentNote(availability: ImportedAttachmentAvailability): string {
  return availability === "embedded"
    ? "Embedded attachment content was preserved in the export metadata, but the original file cannot be reopened here."
    : "The original attachment is unavailable in this workspace and could not be restored.";
}

function importedAttachmentFromManifest(
  entry: PortableAttachmentManifestEntry,
): ImportedAttachmentMessagePart {
  return {
    type: "imported_attachment",
    fileName: entry.fileName,
    mimeType: entry.mimeType,
    fileSize: entry.fileSize,
    availability: entry.availability === "embedded" ? "embedded" : "unavailable",
    note: entry.note?.trim() || defaultImportedAttachmentNote(entry.availability === "embedded" ? "embedded" : "unavailable"),
    ...(entry.assetId ? { originalAssetId: entry.assetId } : {}),
  };
}

function walkStrings(value: unknown, visitor: (text: string) => void): void {
  if (typeof value === "string") {
    visitor(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      walkStrings(entry, visitor);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const entry of Object.values(value)) {
      walkStrings(entry, visitor);
    }
  }
}

function assertSafeImportPayload(value: unknown): void {
  let unsafeMatch: string | null = null;

  walkStrings(value, (text) => {
    if (unsafeMatch) {
      return;
    }

    if (htmlPattern.test(text) || executablePattern.test(text)) {
      unsafeMatch = text;
    }
  });

  if (unsafeMatch) {
    throw new Error("Import payload contains disallowed HTML or executable content.");
  }
}

function normalizeImportedPart(
  rawPart: Record<string, unknown>,
  entry: PortableAttachmentManifestEntry | undefined,
): MessagePart {
  switch (rawPart.type) {
    case "text":
      return { type: "text", text: String(rawPart.text ?? "") };
    case "error":
      return { type: "error", text: String(rawPart.text ?? "") };
    case "tool_call":
      return {
        type: "tool_call",
        name: String(rawPart.name ?? ""),
        args: (rawPart.args && typeof rawPart.args === "object" ? rawPart.args : {}) as Record<string, unknown>,
      };
    case "tool_result":
      return {
        type: "tool_result",
        name: String(rawPart.name ?? ""),
        result: rawPart.result,
      };
    case "job_status":
      {
        const normalizedStatus: JobStatusMessagePart["status"] = rawPart.status === "running"
          || rawPart.status === "succeeded"
          || rawPart.status === "failed"
          || rawPart.status === "canceled"
          ? rawPart.status
          : "queued";

      return {
        type: "job_status",
        jobId: String(rawPart.jobId ?? ""),
        toolName: String(rawPart.toolName ?? ""),
        label: String(rawPart.label ?? ""),
        status: normalizedStatus,
        ...(typeof rawPart.title === "string" ? { title: rawPart.title } : {}),
        ...(typeof rawPart.subtitle === "string" ? { subtitle: rawPart.subtitle } : {}),
        ...(typeof rawPart.sequence === "number" ? { sequence: rawPart.sequence } : {}),
        ...(typeof rawPart.progressPercent === "number" || rawPart.progressPercent === null ? { progressPercent: rawPart.progressPercent as number | null } : {}),
        ...(typeof rawPart.progressLabel === "string" || rawPart.progressLabel === null ? { progressLabel: rawPart.progressLabel as string | null } : {}),
        ...(typeof rawPart.summary === "string" ? { summary: rawPart.summary } : {}),
        ...(typeof rawPart.error === "string" ? { error: rawPart.error } : {}),
        ...(typeof rawPart.updatedAt === "string" ? { updatedAt: rawPart.updatedAt } : {}),
        ...(rawPart.resultPayload !== undefined ? { resultPayload: rawPart.resultPayload } : {}),
        ...(typeof rawPart.failureClass === "string" || rawPart.failureClass === null ? { failureClass: rawPart.failureClass as string | null } : {}),
        ...(typeof rawPart.recoveryMode === "string" || rawPart.recoveryMode === null ? { recoveryMode: rawPart.recoveryMode as string | null } : {}),
        ...(typeof rawPart.replayedFromJobId === "string" || rawPart.replayedFromJobId === null ? { replayedFromJobId: rawPart.replayedFromJobId as string | null } : {}),
        ...(typeof rawPart.supersededByJobId === "string" || rawPart.supersededByJobId === null ? { supersededByJobId: rawPart.supersededByJobId as string | null } : {}),
      } as MessagePart;
      }
    case "generation_status":
      return {
        type: "generation_status",
        status: rawPart.status === "stopped" ? "stopped" : "interrupted",
        actor: rawPart.actor === "user" ? "user" : "system",
        reason: String(rawPart.reason ?? ""),
        partialContentRetained: Boolean(rawPart.partialContentRetained),
        ...(typeof rawPart.recordedAt === "string" ? { recordedAt: rawPart.recordedAt } : {}),
      };
    case "attachment":
      if (!entry) {
        throw new Error("Import attachment manifest is incomplete.");
      }

      if (entry.availability === "durable_asset" && entry.assetId) {
        return {
          type: "attachment",
          assetId: entry.assetId,
          fileName: entry.fileName,
          mimeType: entry.mimeType,
          fileSize: entry.fileSize,
        };
      }

      return importedAttachmentFromManifest(entry);
    case "imported_attachment":
      return {
        type: "imported_attachment",
        fileName: String(rawPart.fileName ?? "Imported attachment"),
        mimeType: String(rawPart.mimeType ?? "application/octet-stream"),
        fileSize: Number(rawPart.fileSize ?? 0),
        availability: rawPart.availability === "embedded" ? "embedded" : "unavailable",
        note: String(rawPart.note ?? defaultImportedAttachmentNote(rawPart.availability === "embedded" ? "embedded" : "unavailable")),
        ...(typeof rawPart.originalAssetId === "string" ? { originalAssetId: rawPart.originalAssetId } : {}),
      };
    case "summary":
      return {
        type: "summary",
        text: String(rawPart.text ?? ""),
        coversUpToMessageId: String(rawPart.coversUpToMessageId ?? ""),
      };
    case "meta_summary":
      return {
        type: "meta_summary",
        text: String(rawPart.text ?? ""),
        coversUpToSummaryId: String(rawPart.coversUpToSummaryId ?? ""),
        summariesCompacted: Number(rawPart.summariesCompacted ?? 0),
      };
    default:
      throw new Error(`Import payload contains an unsupported message part type: ${String(rawPart.type ?? "unknown")}`);
  }
}

export function buildConversationExportPayload({
  conversation,
  messages,
  exportedAt = new Date().toISOString(),
}: BuildConversationExportOptions): ConversationExportPayload {
  const attachmentManifest: PortableAttachmentManifestEntry[] = [];
  const jobReferences: PortableJobReference[] = [];

  const exportedMessages = messages.map<ExportConversationMessage>((message) => {
    const attachmentManifestIds: string[] = [];

    for (const [partIndex, part] of (message.parts ?? []).entries()) {
      if (part.type === "attachment") {
        const manifestId = toAttachmentManifestId(message.id, partIndex);
        attachmentManifestIds.push(manifestId);
        attachmentManifest.push({
          id: manifestId,
          messageId: message.id,
          partIndex,
          fileName: part.fileName,
          mimeType: part.mimeType,
          fileSize: part.fileSize,
          availability: "durable_asset",
          assetId: part.assetId,
        });
      }

      if (part.type === "imported_attachment") {
        const manifestId = toAttachmentManifestId(message.id, partIndex);
        attachmentManifestIds.push(manifestId);
        attachmentManifest.push({
          id: manifestId,
          messageId: message.id,
          partIndex,
          fileName: part.fileName,
          mimeType: part.mimeType,
          fileSize: part.fileSize,
          availability: part.availability,
          assetId: part.originalAssetId ?? null,
          note: part.note,
        });
      }

      if (part.type === "job_status") {
        jobReferences.push({
          jobId: part.jobId,
          toolName: part.toolName,
          status: part.status,
          label: part.label,
          messageId: message.id,
        });
      }
    }

    return {
      id: message.id,
      role: message.role,
      content: message.content,
      parts: deepCloneParts(message.parts ?? []),
      createdAt: message.createdAt,
      tokenEstimate: message.tokenEstimate,
      attachmentManifestIds,
    };
  });

  return {
    version: CONVERSATION_EXPORT_VERSION,
    exportedAt,
    conversation: {
      id: conversation.id,
      title: conversation.title,
      status: conversation.status,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messageCount: conversation.messageCount,
      sessionSource: conversation.sessionSource,
      promptVersion: conversation.promptVersion,
      routingSnapshot: conversation.routingSnapshot,
      referralSource: conversation.referralSource,
      ...(conversation.deletedAt ? { deletedAt: conversation.deletedAt } : {}),
      ...(conversation.purgeAfter ? { purgeAfter: conversation.purgeAfter } : {}),
      ...(conversation.importedAt ? { importedAt: conversation.importedAt } : {}),
      ...(conversation.importSourceConversationId ? { importSourceConversationId: conversation.importSourceConversationId } : {}),
      ...(conversation.importedFromExportedAt ? { importedFromExportedAt: conversation.importedFromExportedAt } : {}),
    },
    messages: exportedMessages,
    attachmentManifest,
    jobReferences,
  };
}

export function parseConversationImportPayload(rawText: string): NormalizedImportedConversation {
  if (new TextEncoder().encode(rawText).byteLength > CONVERSATION_IMPORT_MAX_BYTES) {
    throw new Error("Import payload exceeds the maximum allowed size.");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(rawText) as unknown;
  } catch {
    throw new Error("Import payload must be valid JSON.");
  }

  assertSafeImportPayload(raw);

  const parsed = exportConversationSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Import payload does not match the platform export format.");
  }

  const manifestById = new Map(parsed.data.attachmentManifest.map((entry) => [entry.id, entry]));

  const importedMessages = parsed.data.messages.map((message) => {
    let attachmentOrdinal = 0;
    const parts = message.parts.map((part) => {
      const manifestEntry = (part.type === "attachment" || part.type === "imported_attachment")
        ? manifestById.get(message.attachmentManifestIds[attachmentOrdinal++])
        : undefined;

      return normalizeImportedPart(part as Record<string, unknown>, manifestEntry);
    });

    return {
      role: message.role,
      content: message.content,
      parts,
    };
  });

  const normalizedPayload: ImportConversationShape = {
    ...parsed.data,
    conversation: {
      ...parsed.data.conversation,
      routingSnapshot: createConversationRoutingSnapshot({
        lane: parsed.data.conversation.routingSnapshot.lane,
        confidence: parsed.data.conversation.routingSnapshot.confidence ?? null,
        recommendedNextStep: parsed.data.conversation.routingSnapshot.recommendedNextStep ?? null,
        detectedNeedSummary: parsed.data.conversation.routingSnapshot.detectedNeedSummary ?? null,
        lastAnalyzedAt: parsed.data.conversation.routingSnapshot.lastAnalyzedAt ?? null,
      }),
    },
    messages: parsed.data.messages.map((message, index) => ({
      ...message,
      parts: importedMessages[index]?.parts ?? [],
    })),
  };

  return {
    payload: normalizedPayload,
    importedMessages,
  };
}

function formatTranscriptTimestamp(value: Date | string | undefined): string {
  if (!value) {
    return "";
  }

  const normalized = value instanceof Date ? value.toISOString() : value;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getConversationPurgeEligibility(
  conversation: PurgeEligibilityInput,
): { eligible: boolean; blockedReason: string | null } {
  if (!conversation.deletedAt) {
    return {
      eligible: false,
      blockedReason: "Move the conversation to trash before purging it.",
    };
  }

  if (!conversation.purgeAfter) {
    return { eligible: true, blockedReason: null };
  }

  const purgeAfter = Date.parse(conversation.purgeAfter);
  if (Number.isNaN(purgeAfter) || purgeAfter <= Date.now()) {
    return { eligible: true, blockedReason: null };
  }

  return {
    eligible: false,
    blockedReason: `Purge is blocked until ${new Date(conversation.purgeAfter).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}.`,
  };
}

function attachmentLines(parts: MessagePart[] | undefined): string[] {
  if (!parts || parts.length === 0) {
    return [];
  }

  return parts.flatMap((part) => {
    if (part.type === "attachment") {
      return [`Attachments: ${part.fileName} (${part.mimeType}, ${part.fileSize} bytes)`];
    }

    if (part.type === "imported_attachment") {
      const state = part.availability === "embedded" ? "embedded copy only" : "unavailable";
      return [`Attachments: ${part.fileName} (${part.mimeType}, ${part.fileSize} bytes, ${state})`, `Note: ${part.note}`];
    }

    return [];
  });
}

function statusLines(parts: MessagePart[] | undefined): string[] {
  if (!parts || parts.length === 0) {
    return [];
  }

  return parts.flatMap((part) => {
    if (part.type === "generation_status") {
      const label = part.status === "stopped" ? "Response stopped" : "Response interrupted";
      return [`Status: ${label}${part.reason ? ` — ${part.reason}` : ""}`];
    }

    if (part.type === "job_status") {
      return [`Job: ${part.label} (${part.status})`];
    }

    return [];
  });
}

export function buildTranscriptCopy(
  messages: Array<Pick<ChatMessage, "role" | "content" | "parts" | "timestamp">>,
): string {
  return messages
    .map((message) => {
      const timestamp = formatTranscriptTimestamp(message.timestamp);
      const header = `${message.role === "assistant" ? "Assistant" : message.role === "system" ? "System" : "User"}${timestamp ? ` (${timestamp})` : ""}`;
      const lines = [header, message.content.trim() || "(no text content)"];
      lines.push(...attachmentLines(message.parts));
      lines.push(...statusLines(message.parts));
      return lines.join("\n");
    })
    .join("\n\n---\n\n")
    .trim();
}