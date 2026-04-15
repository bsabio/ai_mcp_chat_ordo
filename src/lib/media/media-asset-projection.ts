import type { CapabilityArtifactRef } from "@/core/entities/capability-result";
import type {
  MediaAssetDescriptor,
  MediaAssetKind,
  MediaAssetRetentionClass,
  MediaAssetSource,
} from "@/core/entities/media-asset";
import type { UserFile, UserFileMetadata } from "@/core/entities/user-file";

export interface ConversationMediaAssetCandidate {
  assetId: string;
  assetKind: MediaAssetKind;
  label: string;
  fileName: string;
  mimeType: string;
  source: MediaAssetSource;
  retentionClass: MediaAssetRetentionClass;
  createdAt: string;
  conversationId: string | null;
  toolName?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

function isMediaAssetKind(value: string): value is MediaAssetKind {
  return value === "image"
    || value === "chart"
    || value === "graph"
    || value === "audio"
    || value === "video"
    || value === "subtitle"
    || value === "waveform";
}

function inferAssetKind(file: UserFile): MediaAssetKind | null {
  if (file.metadata.assetKind && isMediaAssetKind(file.metadata.assetKind)) {
    return file.metadata.assetKind;
  }

  if (file.fileType !== "document" && isMediaAssetKind(file.fileType)) {
    return file.fileType;
  }

  return null;
}

function inferSource(file: UserFile, assetKind: MediaAssetKind): MediaAssetSource {
  if (file.metadata.source) {
    return file.metadata.source;
  }

  if (assetKind === "audio" || assetKind === "chart" || assetKind === "graph" || assetKind === "waveform" || assetKind === "subtitle") {
    return "generated";
  }

  return "uploaded";
}

function inferRetentionClass(file: UserFile): MediaAssetRetentionClass {
  return file.metadata.retentionClass ?? (file.conversationId ? "conversation" : "ephemeral");
}

function inferArtifactLabel(file: UserFile, fallbackLabel?: string): string {
  return fallbackLabel?.trim() || file.fileName;
}

export function buildUserFileMetadata(
  metadata: Partial<UserFileMetadata> | undefined,
): UserFileMetadata {
  return {
    ...(metadata?.assetKind ? { assetKind: metadata.assetKind } : {}),
    ...(metadata?.source ? { source: metadata.source } : {}),
    ...(typeof metadata?.width === "number" ? { width: metadata.width } : {}),
    ...(typeof metadata?.height === "number" ? { height: metadata.height } : {}),
    ...(typeof metadata?.durationSeconds === "number" ? { durationSeconds: metadata.durationSeconds } : {}),
    ...(metadata?.toolName ? { toolName: metadata.toolName } : {}),
    ...(metadata?.retentionClass ? { retentionClass: metadata.retentionClass } : {}),
    ...(metadata?.derivativeOfAssetId !== undefined ? { derivativeOfAssetId: metadata.derivativeOfAssetId } : {}),
    ...(typeof metadata?.subtitleCueCount === "number" ? { subtitleCueCount: metadata.subtitleCueCount } : {}),
  };
}

export function projectUserFileToMediaAssetDescriptor(
  file: UserFile,
): MediaAssetDescriptor | null {
  const kind = inferAssetKind(file);
  if (!kind) {
    return null;
  }

  return {
    id: file.id,
    kind,
    mimeType: file.mimeType,
    source: inferSource(file, kind),
    assetId: file.id,
    ...(typeof file.metadata.width === "number" ? { width: file.metadata.width } : {}),
    ...(typeof file.metadata.height === "number" ? { height: file.metadata.height } : {}),
    ...(typeof file.metadata.durationSeconds === "number"
      ? { durationSeconds: file.metadata.durationSeconds }
      : {}),
    ...(file.conversationId ? { conversationId: file.conversationId } : {}),
    ...(file.metadata.toolName ? { toolName: file.metadata.toolName } : {}),
    retentionClass: inferRetentionClass(file),
  };
}

export function projectUserFileToConversationMediaAssetCandidate(
  file: UserFile,
): ConversationMediaAssetCandidate | null {
  const asset = projectUserFileToMediaAssetDescriptor(file);
  if (!asset?.assetId) {
    return null;
  }

  return {
    assetId: asset.assetId,
    assetKind: asset.kind,
    label: inferArtifactLabel(file),
    fileName: file.fileName,
    mimeType: asset.mimeType,
    source: asset.source,
    retentionClass: asset.retentionClass ?? inferRetentionClass(file),
    createdAt: file.createdAt,
    conversationId: file.conversationId,
    ...(asset.toolName ? { toolName: asset.toolName } : {}),
    ...(typeof asset.width === "number" ? { width: asset.width } : {}),
    ...(typeof asset.height === "number" ? { height: asset.height } : {}),
    ...(typeof asset.durationSeconds === "number"
      ? { durationSeconds: asset.durationSeconds }
      : {}),
  };
}

export function projectMediaAssetToArtifactRef(
  asset: MediaAssetDescriptor,
  options: { label?: string } = {},
): CapabilityArtifactRef {
  return {
    kind: asset.kind,
    label: options.label?.trim() || `${asset.kind[0]?.toUpperCase() ?? "A"}${asset.kind.slice(1)} asset`,
    mimeType: asset.mimeType,
    ...(asset.assetId ? { assetId: asset.assetId } : {}),
    ...(asset.uri ? { uri: asset.uri } : {}),
    ...(asset.retentionClass ? { retentionClass: asset.retentionClass } : {}),
    ...(typeof asset.width === "number" ? { width: asset.width } : {}),
    ...(typeof asset.height === "number" ? { height: asset.height } : {}),
    ...(typeof asset.durationSeconds === "number"
      ? { durationSeconds: asset.durationSeconds }
      : {}),
    source: asset.source,
  };
}

export function projectUserFileToArtifactRef(
  file: UserFile,
  options: { label?: string } = {},
): CapabilityArtifactRef | null {
  const asset = projectUserFileToMediaAssetDescriptor(file);
  if (!asset) {
    return null;
  }

  return projectMediaAssetToArtifactRef(asset, {
    label: inferArtifactLabel(file, options.label),
  });
}
