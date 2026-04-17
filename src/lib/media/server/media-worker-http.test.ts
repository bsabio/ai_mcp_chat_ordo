import { afterEach, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { createMediaWorkerServer } from "./media-worker-http";
import { MediaWorkerClient } from "./media-worker-client";

let activeServer: Server | null = null;

async function startServer(server: Server): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  activeServer = server;
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  if (!activeServer) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    activeServer?.close((error) => (error ? reject(error) : resolve()));
  });
  activeServer = null;
});

describe("media-worker remote pipeline", () => {
  it("streams remote progress through the client before returning the final envelope", async () => {
    const baseUrl = await startServer(createMediaWorkerServer({
      executeComposeMedia: async ({ onProgress, plan }) => {
        onProgress?.({
          activePhaseKey: "staging_assets",
          progressPercent: 5,
          progressLabel: "Preparing still image and narration · about 10s left",
        });
        onProgress?.({
          activePhaseKey: "rendering_media",
          progressPercent: 55,
          progressLabel: "Encoding narration video · about 4s left",
        });

        return {
          schemaVersion: 1,
          toolName: "compose_media",
          family: "artifact",
          cardKind: "artifact_viewer",
          executionMode: "hybrid",
          inputSnapshot: { planId: plan.id },
          summary: { title: "Media Composition", statusLine: "succeeded" },
          replaySnapshot: { route: "deferred_remote", planId: plan.id },
          progress: { percent: 100, label: "Composition complete" },
          artifacts: [],
          payload: {
            route: "deferred_remote",
            planId: plan.id,
            primaryAssetId: "uf_pipeline_1",
            outputFormat: "mp4",
          },
        };
      },
    }));

    const client = new MediaWorkerClient({ baseUrl });
    const updates: Array<{ activePhaseKey?: string | null; progressPercent?: number | null; progressLabel?: string | null }> = [];

    const result = await client.executeComposeMediaJob({
      userId: "user-1",
      conversationId: "conv-1",
      plan: {
        id: "plan_pipeline_1",
        conversationId: "conv-1",
        visualClips: [{ assetId: "asset-image-1", kind: "image" }],
        audioClips: [{ assetId: "asset-audio-1", kind: "audio" }],
        subtitlePolicy: "none",
        waveformPolicy: "none",
        outputFormat: "mp4",
      },
    }, async (update) => {
      updates.push(update);
    });

    expect(updates).toEqual([
      expect.objectContaining({ activePhaseKey: "staging_assets", progressPercent: 5 }),
      expect.objectContaining({ activePhaseKey: "rendering_media", progressPercent: 55 }),
    ]);
    expect(result.payload).toEqual({
      route: "deferred_remote",
      planId: "plan_pipeline_1",
      primaryAssetId: "uf_pipeline_1",
      outputFormat: "mp4",
    });
  });

  it("surfaces streamed worker failures through the client", async () => {
    const baseUrl = await startServer(createMediaWorkerServer({
      executeComposeMedia: async ({ onProgress }) => {
        onProgress?.({
          activePhaseKey: "rendering_media",
          progressPercent: 35,
          progressLabel: "Combining video clips · about 18s left",
        });
        throw new Error("ffmpeg concat failed");
      },
    }));

    const client = new MediaWorkerClient({ baseUrl });

    await expect(client.executeComposeMediaJob({
      userId: "user-1",
      conversationId: "conv-1",
      plan: {
        id: "plan_pipeline_err_1",
        conversationId: "conv-1",
        visualClips: [{ assetId: "asset-video-1", kind: "video" }],
        audioClips: [],
        subtitlePolicy: "none",
        waveformPolicy: "none",
        outputFormat: "mp4",
      },
    })).rejects.toThrow("ffmpeg concat failed");
  });

  it("returns 401 for unauthorized worker requests", async () => {
    const baseUrl = await startServer(createMediaWorkerServer({
      sharedSecret: "secret-1",
      executeComposeMedia: async () => {
        throw new Error("should not run");
      },
    }));

    const client = new MediaWorkerClient({ baseUrl });

    await expect(client.executeComposeMediaJob({
      userId: "user-1",
      conversationId: "conv-1",
      plan: {
        id: "plan_pipeline_auth_1",
        conversationId: "conv-1",
        visualClips: [],
        audioClips: [],
        subtitlePolicy: "none",
        waveformPolicy: "none",
        outputFormat: "mp4",
      },
    })).rejects.toThrow(/401/);
  });
});