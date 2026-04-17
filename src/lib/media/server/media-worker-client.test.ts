import { describe, expect, it, vi } from "vitest";

import { MediaWorkerClient } from "./media-worker-client";

function buildNdjsonResponse(lines: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const line of lines) {
          controller.enqueue(encoder.encode(`${line}\n`));
        }
        controller.close();
      },
    }),
    {
      status: 200,
      headers: { "content-type": "application/x-ndjson" },
    },
  );
}

describe("media-worker-client", () => {
  it("posts compose media work to the remote worker", async () => {
    const fetchImpl = vi.fn(async () => new Response(
      JSON.stringify({
        schemaVersion: 1,
        toolName: "compose_media",
        family: "artifact",
        cardKind: "artifact_viewer",
        executionMode: "hybrid",
        inputSnapshot: { planId: "plan_1" },
        summary: { statusLine: "succeeded" },
        payload: { primaryAssetId: "uf_media_1", outputFormat: "mp4" },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    )) as typeof fetch;
    const client = new MediaWorkerClient({
      fetchImpl,
      baseUrl: "http://media-worker.test:3101",
      sharedSecret: "shared-secret",
    });

    const result = await client.executeComposeMediaJob({
      userId: "user-1",
      conversationId: "conv-1",
      plan: {
        id: "plan_1",
        conversationId: "conv-1",
        visualClips: [],
        audioClips: [],
        subtitlePolicy: "none",
        waveformPolicy: "none",
        outputFormat: "mp4",
      },
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://media-worker.test:3101/compose-media",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          authorization: "Bearer shared-secret",
        }),
      }),
    );
    expect(result.payload).toEqual({ primaryAssetId: "uf_media_1", outputFormat: "mp4" });
  });

  it("parses streamed progress events before returning the final envelope", async () => {
    const fetchImpl = vi.fn(async () => buildNdjsonResponse([
      JSON.stringify({
        type: "progress",
        update: {
          activePhaseKey: "rendering_media",
          progressPercent: 42,
          progressLabel: "Encoding narration video · about 8s left",
        },
      }),
      JSON.stringify({
        type: "result",
        envelope: {
          schemaVersion: 1,
          toolName: "compose_media",
          family: "artifact",
          cardKind: "artifact_viewer",
          executionMode: "hybrid",
          inputSnapshot: { planId: "plan_stream_1" },
          summary: { statusLine: "succeeded" },
          payload: { primaryAssetId: "uf_media_stream_1", outputFormat: "mp4" },
        },
      }),
    ])) as typeof fetch;
    const client = new MediaWorkerClient({
      fetchImpl,
      baseUrl: "http://media-worker.test:3101",
    });
    const progressUpdates: Array<{ progressPercent?: number | null; progressLabel?: string | null }> = [];

    const result = await client.executeComposeMediaJob({
      userId: "user-1",
      conversationId: "conv-1",
      plan: {
        id: "plan_stream_1",
        conversationId: "conv-1",
        visualClips: [{ assetId: "asset-1", kind: "image" }],
        audioClips: [{ assetId: "asset-a1", kind: "audio" }],
        subtitlePolicy: "none",
        waveformPolicy: "none",
        outputFormat: "mp4",
      },
    }, async (update) => {
      progressUpdates.push(update);
    });

    expect(progressUpdates).toEqual([
      expect.objectContaining({
        activePhaseKey: "rendering_media",
        progressPercent: 42,
        progressLabel: "Encoding narration video · about 8s left",
      }),
    ]);
    expect(result.payload).toEqual({ primaryAssetId: "uf_media_stream_1", outputFormat: "mp4" });
  });

  it("throws when the streamed worker returns an error event", async () => {
    const fetchImpl = vi.fn(async () => buildNdjsonResponse([
      JSON.stringify({ type: "error", error: "remote ffmpeg failed" }),
    ])) as typeof fetch;
    const client = new MediaWorkerClient({
      fetchImpl,
      baseUrl: "http://media-worker.test:3101",
    });

    await expect(client.executeComposeMediaJob({
      userId: "user-1",
      conversationId: "conv-1",
      plan: {
        id: "plan_stream_err_1",
        conversationId: "conv-1",
        visualClips: [],
        audioClips: [],
        subtitlePolicy: "none",
        waveformPolicy: "none",
        outputFormat: "mp4",
      },
    })).rejects.toThrow("remote ffmpeg failed");
  });

  it("throws when the streamed worker never returns a final result", async () => {
    const fetchImpl = vi.fn(async () => buildNdjsonResponse([
      JSON.stringify({
        type: "progress",
        update: { activePhaseKey: "staging_assets", progressPercent: 5, progressLabel: "Preparing source videos" },
      }),
    ])) as typeof fetch;
    const client = new MediaWorkerClient({
      fetchImpl,
      baseUrl: "http://media-worker.test:3101",
    });

    await expect(client.executeComposeMediaJob({
      userId: "user-1",
      conversationId: "conv-1",
      plan: {
        id: "plan_stream_missing_result_1",
        conversationId: "conv-1",
        visualClips: [],
        audioClips: [],
        subtitlePolicy: "none",
        waveformPolicy: "none",
        outputFormat: "mp4",
      },
    })).rejects.toThrow("Media worker stream ended without a final result.");
  });
});
