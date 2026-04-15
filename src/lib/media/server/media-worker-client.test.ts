import { describe, expect, it, vi } from "vitest";

import { MediaWorkerClient } from "./media-worker-client";

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
});
