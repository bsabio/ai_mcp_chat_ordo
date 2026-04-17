import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { getByIdMock, executeDeferredPlanMock, storeBinaryMock } = vi.hoisted(() => ({
  getByIdMock: vi.fn(),
  executeDeferredPlanMock: vi.fn(),
  storeBinaryMock: vi.fn(),
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getUserFileDataMapper: vi.fn(() => ({})),
}));

vi.mock("@/lib/user-files", () => ({
  UserFileSystem: vi.fn(function MockUserFileSystem() {
    return {
      getById: getByIdMock,
      storeBinary: storeBinaryMock,
    };
  }),
}));

vi.mock("@/lib/media/ffmpeg/server/ffmpeg-server-executor", () => ({
  FfmpegServerExecutor: vi.fn(function MockFfmpegServerExecutor() {
    return {
      executeDeferredPlan: executeDeferredPlanMock,
    };
  }),
}));

import {
  executeComposeMediaRemotely,
  InvalidComposeMediaAssetReadinessError,
} from "./compose-media-worker-runtime";

function createPlan() {
  return {
    id: "plan_worker_1",
    conversationId: "conv_1",
    visualClips: [{ assetId: "asset_image_1", kind: "image" as const }],
    audioClips: [{ assetId: "asset_audio_1", kind: "audio" as const }],
    subtitlePolicy: "none" as const,
    waveformPolicy: "none" as const,
    outputFormat: "mp4" as const,
    resolution: { width: 1280, height: 720 },
  };
}

function createStoredFile(overrides: Partial<{
  id: string;
  userId: string;
  conversationId: string | null;
  fileType: "audio" | "image" | "video";
  mimeType: string;
}> = {}) {
  return {
    file: {
      id: overrides.id ?? "asset_1",
      userId: overrides.userId ?? "user_1",
      conversationId: overrides.conversationId ?? "conv_1",
      contentHash: "hash_1",
      fileType: overrides.fileType ?? "image",
      fileName: "asset.bin",
      mimeType: overrides.mimeType ?? "image/png",
      fileSize: 12,
      metadata: {},
      createdAt: "2026-04-16T10:00:00.000Z",
    },
    diskPath: "/tmp/asset.bin",
  };
}

describe("compose-media worker runtime", () => {
  beforeEach(() => {
    getByIdMock.mockReset();
    executeDeferredPlanMock.mockReset();
    storeBinaryMock.mockReset();
  });

  it("returns a canonical deferred_remote envelope after persisting the rendered artifact", async () => {
    const plan = createPlan();
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "ordo-ffmpeg-"));
    const outputPath = path.join(workDir, "composed.mp4");
    fs.writeFileSync(outputPath, Buffer.from([0x00, 0x01, 0x02, 0x03]));

    getByIdMock.mockImplementation(async (assetId: string) => {
      if (assetId === "asset_image_1") {
        return createStoredFile({ id: assetId, fileType: "image", mimeType: "image/png" });
      }

      return createStoredFile({ id: assetId, fileType: "audio", mimeType: "audio/mpeg" });
    });
    executeDeferredPlanMock.mockImplementation(async (_plan, onProgress, options) => {
      expect(options.resolveAssetPath("asset_image_1")).toBe("/tmp/asset.bin");
      expect(options.resolveAssetPath("asset_audio_1")).toBe("/tmp/asset.bin");

      onProgress?.(42, "rendering_media");

      return {
        schemaVersion: 1,
        toolName: "compose_media",
        family: "artifact",
        cardKind: "artifact_viewer",
        executionMode: "hybrid",
        inputSnapshot: { planId: plan.id },
        summary: { title: "Media Composition", statusLine: "succeeded" },
        replaySnapshot: { route: "deferred_worker", planId: plan.id },
        progress: { percent: 100, label: "Composition complete" },
        artifacts: [],
        payload: { outputPath },
      };
    });
    storeBinaryMock.mockResolvedValue({ id: "uf_media_worker_1", fileSize: 4 });
    const progressUpdates: Array<{ progressPercent?: number | null; progressLabel?: string | null }> = [];

    const result = await executeComposeMediaRemotely({
      plan,
      userId: "user_1",
      conversationId: "conv_1",
      onProgress: (update) => {
        progressUpdates.push(update);
      },
    });

    expect(executeDeferredPlanMock).toHaveBeenCalledTimes(1);
    expect(storeBinaryMock).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user_1",
      conversationId: "conv_1",
      fileType: "video",
      mimeType: "video/mp4",
      metadata: expect.objectContaining({
        assetKind: "video",
        source: "generated",
        retentionClass: "conversation",
        toolName: "compose_media",
      }),
    }));
    expect(progressUpdates).toContainEqual(expect.objectContaining({
      activePhaseKey: "rendering_media",
      progressPercent: 42,
    }));
    expect(result).toMatchObject({
      schemaVersion: 1,
      toolName: "compose_media",
      family: "artifact",
      cardKind: "artifact_viewer",
      executionMode: "hybrid",
      summary: expect.objectContaining({
        title: "Media Composition",
        statusLine: "succeeded",
      }),
      replaySnapshot: expect.objectContaining({
        route: "deferred_remote",
        planId: plan.id,
        outputFormat: "mp4",
      }),
      artifacts: [expect.objectContaining({
        kind: "video",
        assetId: "uf_media_worker_1",
        mimeType: "video/mp4",
        retentionClass: "conversation",
        source: "generated",
      })],
      payload: expect.objectContaining({
        route: "deferred_remote",
        planId: plan.id,
        primaryAssetId: "uf_media_worker_1",
        outputFormat: "mp4",
        mimeType: "video/mp4",
      }),
    });
  });

  it("rejects missing governed assets before deferred execution starts", async () => {
    getByIdMock.mockImplementation(async (assetId: string) => {
      if (assetId === "asset_image_1") {
        return null;
      }

      return createStoredFile({
        id: assetId,
        fileType: "audio",
        mimeType: "audio/mpeg",
      });
    });

    await expect(executeComposeMediaRemotely({
      plan: createPlan(),
      userId: "user_1",
      conversationId: "conv_1",
    })).rejects.toMatchObject({
      name: "InvalidComposeMediaAssetReadinessError",
      failureCode: "asset_not_found",
    });

    expect(executeDeferredPlanMock).not.toHaveBeenCalled();
  });

  it("rejects cross-user governed assets before deferred execution starts", async () => {
    getByIdMock.mockImplementation(async (assetId: string) => {
      if (assetId === "asset_image_1") {
        return createStoredFile({ id: assetId, userId: "other_user" });
      }

      return createStoredFile({
        id: assetId,
        fileType: "audio",
        mimeType: "audio/mpeg",
      });
    });

    const execution = executeComposeMediaRemotely({
      plan: createPlan(),
      userId: "user_1",
      conversationId: "conv_1",
    });

    await expect(execution).rejects.toBeInstanceOf(InvalidComposeMediaAssetReadinessError);
    await expect(execution).rejects.toMatchObject({ failureCode: "asset_forbidden" });

    expect(executeDeferredPlanMock).not.toHaveBeenCalled();
  });
});