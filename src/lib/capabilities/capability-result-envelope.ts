import type { CapabilityPresentationDescriptor } from "@/core/entities/capability-presentation";
import type {
  CapabilityArtifactRef,
  CapabilityResultEnvelope,
} from "@/core/entities/capability-result";
import { getCapabilityPresentationDescriptor } from "@/frameworks/ui/chat/registry/capability-presentation-registry";

const REPLAY_SNAPSHOT_HARD_MAX_BYTES = 24 * 1024;
const MAX_PREVIEW_ITEMS = 10;
const MAX_STRING_LENGTH = 500;
const MAX_OBJECT_KEYS = 12;
const MAX_DEPTH = 2;

type SummaryInput = Partial<CapabilityResultEnvelope["summary"]>;

export interface ProjectCapabilityResultEnvelopeInput {
  toolName: string;
  payload: unknown;
  inputSnapshot?: unknown;
  descriptor?: CapabilityPresentationDescriptor;
  executionMode?: CapabilityResultEnvelope["executionMode"];
  summary?: SummaryInput;
  progress?: CapabilityResultEnvelope["progress"];
  replaySnapshot?: Record<string, unknown> | null;
  artifacts?: CapabilityArtifactRef[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function truncateText(value: string, maxLength = MAX_STRING_LENGTH): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function readString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function summarizeValue(value: unknown, depth = 0): unknown {
  if (value == null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return truncateText(value);
  }

  if (Array.isArray(value)) {
    const preview = value.slice(0, MAX_PREVIEW_ITEMS).map((entry) => summarizeValue(entry, depth + 1));
    return {
      itemCount: value.length,
      preview,
      omittedCount: Math.max(0, value.length - preview.length),
    };
  }

  if (!isRecord(value)) {
    return undefined;
  }

  if (depth >= MAX_DEPTH) {
    return {
      keys: Object.keys(value).slice(0, MAX_OBJECT_KEYS),
      truncated: true,
    };
  }

  const entries = Object.entries(value).slice(0, MAX_OBJECT_KEYS);
  const summary = Object.fromEntries(
    entries
      .map(([key, entryValue]) => [key, summarizeValue(entryValue, depth + 1)] as const)
      .filter(([, entryValue]) => entryValue !== undefined),
  );

  if (Object.keys(summary).length === 0) {
    return undefined;
  }

  return summary;
}

function coerceSnapshot(value: unknown): Record<string, unknown> | null {
  const summarized = summarizeValue(value);
  if (!isRecord(summarized)) {
    return summarized === undefined ? null : { value: summarized };
  }

  const serialized = JSON.stringify(summarized);
  if (serialized.length <= REPLAY_SNAPSHOT_HARD_MAX_BYTES) {
    return summarized;
  }

  if (isRecord(value)) {
    return {
      keys: Object.keys(value).slice(0, MAX_OBJECT_KEYS),
      truncated: true,
    };
  }

  return {
    truncated: true,
  };
}

function buildArtifactRefs(
  descriptor: CapabilityPresentationDescriptor,
  payload: unknown,
): CapabilityArtifactRef[] | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  const artifactKinds = descriptor.artifactKinds ?? [];
  const artifacts: CapabilityArtifactRef[] = [];
  const assetId = readString(payload, ["assetId"]);
  const audioUri = readString(payload, ["audioUrl", "uri"]);
  const imageUri = readString(payload, ["imageUrl", "qr_code_url", "uri"]);

  if (artifactKinds.includes("audio") && (assetId || audioUri)) {
    artifacts.push({
      kind: "audio",
      label: readString(payload, ["title"]) ?? descriptor.label,
      mimeType: "audio/mpeg",
      assetId: assetId ?? undefined,
      uri: audioUri ?? undefined,
      retentionClass: "conversation",
    });
  }

  if (artifactKinds.includes("image") && (assetId || imageUri)) {
    artifacts.push({
      kind: "image",
      label: readString(payload, ["title", "name"]) ?? descriptor.label,
      mimeType: "image/png",
      assetId: assetId ?? undefined,
      uri: imageUri ?? undefined,
      retentionClass: "conversation",
    });
  }

  return artifacts.length > 0 ? artifacts : undefined;
}

function buildSummary(
  descriptor: CapabilityPresentationDescriptor,
  payload: unknown,
  summary: SummaryInput | undefined,
): CapabilityResultEnvelope["summary"] {
  if (!isRecord(payload)) {
    return {
      title: summary?.title ? truncateText(summary.title) : descriptor.label,
      subtitle: summary?.subtitle ? truncateText(summary.subtitle) : undefined,
      statusLine: summary?.statusLine ? truncateText(summary.statusLine) : undefined,
      message:
        summary?.message
          ? truncateText(summary.message)
          : typeof payload === "string"
            ? truncateText(payload)
            : undefined,
    };
  }

  return {
    title:
      summary?.title ? truncateText(summary.title)
      : truncateText(
          readString(payload, ["title", "name"])
          ?? readString(payload, ["query"])
          ?? descriptor.label,
        ),
    subtitle:
      summary?.subtitle ? truncateText(summary.subtitle)
      : (() => {
          const subtitle = readString(payload, ["subtitle"]) ?? readString(payload, ["provider"]);
          return subtitle ? truncateText(subtitle) : undefined;
        })(),
    statusLine:
      summary?.statusLine ? truncateText(summary.statusLine)
      : (() => {
          const statusLine = readString(payload, ["status", "generationStatus"]);
          return statusLine ? truncateText(statusLine) : undefined;
        })(),
    message:
      summary?.message ? truncateText(summary.message)
      : (() => {
          const message = readString(payload, ["summary", "message", "answer"]);
          return message ? truncateText(message) : undefined;
        })(),
  };
}

function mergeSummary(
  base: CapabilityResultEnvelope["summary"],
  overrides: SummaryInput | undefined,
): CapabilityResultEnvelope["summary"] {
  if (!overrides) {
    return base;
  }

  return {
    title: overrides.title === undefined ? base.title : truncateText(overrides.title),
    subtitle:
      overrides.subtitle === undefined ? base.subtitle : truncateText(overrides.subtitle),
    statusLine:
      overrides.statusLine === undefined
        ? base.statusLine
        : truncateText(overrides.statusLine),
    message: overrides.message === undefined ? base.message : truncateText(overrides.message),
  };
}

function mergeProgress(
  base: CapabilityResultEnvelope["progress"] | undefined,
  overrides: CapabilityResultEnvelope["progress"] | undefined,
): CapabilityResultEnvelope["progress"] | undefined {
  if (!base) {
    return overrides;
  }

  if (!overrides) {
    return base;
  }

  return {
    percent: overrides.percent === undefined ? base.percent : overrides.percent,
    label: overrides.label === undefined ? base.label : overrides.label,
    phases: overrides.phases === undefined ? base.phases : overrides.phases,
    activePhaseKey:
      overrides.activePhaseKey === undefined ? base.activePhaseKey : overrides.activePhaseKey,
  };
}

export function isCapabilityResultEnvelope(value: unknown): value is CapabilityResultEnvelope {
  return (
    isRecord(value)
    && value.schemaVersion === 1
    && typeof value.toolName === "string"
    && typeof value.family === "string"
    && typeof value.cardKind === "string"
    && typeof value.executionMode === "string"
    && isRecord(value.inputSnapshot)
    && isRecord(value.summary)
    && "payload" in value
  );
}

export function projectCapabilityResultEnvelope(
  input: ProjectCapabilityResultEnvelopeInput,
): CapabilityResultEnvelope | null {
  const descriptor = input.descriptor ?? getCapabilityPresentationDescriptor(input.toolName);
  if (!descriptor && !isCapabilityResultEnvelope(input.payload)) {
    return null;
  }

  if (isCapabilityResultEnvelope(input.payload)) {
    return {
      ...input.payload,
      inputSnapshot:
        Object.keys(input.payload.inputSnapshot ?? {}).length > 0
          ? input.payload.inputSnapshot
          : (coerceSnapshot(input.inputSnapshot) ?? {}),
      summary: mergeSummary(input.payload.summary, input.summary),
      replaySnapshot:
        input.replaySnapshot === undefined ? input.payload.replaySnapshot : input.replaySnapshot,
      progress: mergeProgress(input.payload.progress, input.progress),
      artifacts: input.artifacts === undefined ? input.payload.artifacts : input.artifacts,
      payload: input.payload.payload ?? null,
    };
  }

  if (!descriptor) {
    return null;
  }

  return {
    schemaVersion: 1,
    toolName: descriptor.toolName,
    family: descriptor.family,
    cardKind: descriptor.cardKind,
    executionMode: input.executionMode ?? descriptor.executionMode,
    inputSnapshot: coerceSnapshot(input.inputSnapshot) ?? {},
    summary: buildSummary(descriptor, input.payload, input.summary),
    replaySnapshot: input.replaySnapshot === undefined ? coerceSnapshot(input.payload) : input.replaySnapshot,
    progress: input.progress,
    artifacts: input.artifacts ?? buildArtifactRefs(descriptor, input.payload),
    payload: input.payload ?? null,
  };
}