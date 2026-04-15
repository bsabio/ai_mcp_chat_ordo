import fs from "node:fs";
import path from "node:path";

import { getUserFileDataMapper } from "@/adapters/RepositoryFactory";
import type {
  CapabilityArtifactRef,
  CapabilityResultEnvelope,
} from "@/core/entities/capability-result";
import type { MediaCompositionPlan } from "@/core/entities/media-composition";
import { FfmpegServerExecutor } from "@/lib/media/ffmpeg/server/ffmpeg-server-executor";
import { COMPOSE_MEDIA_ARTIFACT_LABEL } from "@/lib/media/compose-media-progress";
import { UserFileSystem } from "@/lib/user-files";

export interface ExecuteComposeMediaRemotelyParams {
  plan: MediaCompositionPlan;
  userId: string;
  conversationId: string | null;
  onProgress?: (progress: number, phase: string) => void;
}

function getOutputExtension(outputFormat: string): string {
  return outputFormat === "webm" ? "webm" : "mp4";
}

function getMimeType(outputFormat: string): string {
  return outputFormat === "webm" ? "video/webm" : "video/mp4";
}

function buildPersistedArtifacts(
  primaryAssetId: string,
  outputFormat: string,
  conversationId: string | null,
): CapabilityArtifactRef[] {
  return [
    {
      kind: "video",
      label: COMPOSE_MEDIA_ARTIFACT_LABEL,
      mimeType: getMimeType(outputFormat),
      assetId: primaryAssetId,
      uri: `/api/user-files/${primaryAssetId}`,
      retentionClass: conversationId ? "conversation" : "ephemeral",
      source: "generated",
    },
  ];
}

function getPayloadOutputPath(envelope: CapabilityResultEnvelope): string {
  const outputPath = (envelope.payload as { outputPath?: unknown } | null)?.outputPath;
  if (typeof outputPath !== "string" || outputPath.trim().length === 0) {
    throw new Error("Compose media worker completed without an outputPath payload.");
  }

  return outputPath;
}

export async function executeComposeMediaRemotely(
  params: ExecuteComposeMediaRemotelyParams,
): Promise<CapabilityResultEnvelope> {
  const repo = getUserFileDataMapper();
  const userFiles = new UserFileSystem(repo);
  const executor = new FfmpegServerExecutor();
  const assetIds = [...new Set([
    ...params.plan.visualClips.map((clip) => clip.assetId),
    ...params.plan.audioClips.map((clip) => clip.assetId),
  ])];
  const assetPaths = new Map<string, string | null>();

  for (const assetId of assetIds) {
    const stored = await userFiles.getById(assetId);
    assetPaths.set(assetId, stored && stored.file.userId === params.userId ? stored.diskPath : null);
  }

  const envelope = await executor.executeDeferredPlan(
    params.plan,
    (progress, phase) => params.onProgress?.(progress, phase),
    {
      resolveAssetPath: (assetId) => assetPaths.get(assetId) ?? null,
    },
  );

  const outputPath = getPayloadOutputPath(envelope);
  const outputBytes = fs.readFileSync(outputPath);
  const stored = await userFiles.storeBinary({
    userId: params.userId,
    conversationId: params.conversationId,
    fileType: "video",
    mimeType: getMimeType(params.plan.outputFormat),
    extension: getOutputExtension(params.plan.outputFormat),
    data: outputBytes,
    metadata: {
      assetKind: "video",
      source: "generated",
      retentionClass: params.conversationId ? "conversation" : "ephemeral",
      toolName: "compose_media",
    },
  });

  try {
    fs.unlinkSync(outputPath);
    const workDir = path.dirname(outputPath);
    if (workDir.includes("ordo-ffmpeg-")) {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  } catch {
    // Best-effort cleanup only.
  }

  return {
    ...envelope,
    summary: {
      ...envelope.summary,
      subtitle: `${params.plan.outputFormat.toUpperCase()} · Media Worker`,
      statusLine: "succeeded",
    },
    replaySnapshot: {
      route: "deferred_remote",
      planId: params.plan.id,
      outputFormat: params.plan.outputFormat,
      outputBytes: stored.fileSize,
    },
    artifacts: buildPersistedArtifacts(stored.id, params.plan.outputFormat, params.conversationId),
    payload: {
      route: "deferred_remote",
      planId: params.plan.id,
      primaryAssetId: stored.id,
      outputFormat: params.plan.outputFormat,
      outputBytes: stored.fileSize,
      mimeType: getMimeType(params.plan.outputFormat),
    },
  };
}
