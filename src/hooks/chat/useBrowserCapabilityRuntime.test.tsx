import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ChatMessage } from "@/core/entities/chat-message";
import type { ChatAction } from "@/hooks/chat/chatState";
import {
  COMPOSE_MEDIA_FAILURE_LABEL,
  COMPOSE_MEDIA_REROUTING_LABEL,
} from "@/lib/media/compose-media-progress";

const executeComposeMediaMock = vi.fn();

vi.mock("@/lib/media/browser-runtime/ffmpeg-browser-executor", () => ({
  FfmpegBrowserExecutor: class MockFfmpegBrowserExecutor {
    execute = executeComposeMediaMock;
  },
}));

import { useBrowserCapabilityRuntime } from "@/hooks/chat/useBrowserCapabilityRuntime";

const fetchMock = vi.fn();
const dispatchMock = vi.fn<(action: ChatAction) => void>();

function Harness({
  conversationId,
  messages,
}: {
  conversationId: string | null;
  messages: ChatMessage[];
}) {
  useBrowserCapabilityRuntime({ conversationId, messages, dispatch: dispatchMock });
  return null;
}

describe("useBrowserCapabilityRuntime", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    dispatchMock.mockReset();
    executeComposeMediaMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists chart tool results as stored browser-runtime assets", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          attachments: [
            {
              assetId: "uf_chart_1",
              mimeType: "text/vnd.mermaid",
              assetKind: "chart",
              source: "derived",
              retentionClass: "conversation",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    render(
      <Harness
        conversationId="conv_1"
        messages={[
          {
            id: "msg_chart_1",
            role: "assistant",
            content: "",
            timestamp: new Date("2026-04-11T12:00:00.000Z"),
            parts: [
              { type: "tool_call", name: "generate_chart", args: { code: "flowchart TD\nA-->B" } },
              { type: "tool_result", name: "generate_chart", result: { code: "flowchart TD\nA-->B" } },
            ],
          },
        ]}
      />,
    );

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({
        type: "REWRITE_TOOL_RESULT_AS_BROWSER_JOB",
        messageId: "msg_chart_1",
        resultIndex: 1,
        part: expect.objectContaining({
          toolName: "generate_chart",
          status: "succeeded",
          resultEnvelope: expect.objectContaining({ executionMode: "browser" }),
        }),
      }));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/chat/uploads",
        expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
      );
    });

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({
        type: "REWRITE_TOOL_RESULT_AS_BROWSER_JOB",
        messageId: "msg_chart_1",
        resultIndex: 1,
        part: expect.objectContaining({
          status: "succeeded",
          resultEnvelope: expect.objectContaining({
            artifacts: [expect.objectContaining({ assetId: "uf_chart_1", kind: "chart" })],
            payload: expect.objectContaining({ assetId: "uf_chart_1", mimeType: "text/vnd.mermaid" }),
          }),
        }),
      }));
    });
  });

  it("runs audio materialization through the browser runtime and stores the returned asset id", async () => {
    fetchMock.mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: { "X-User-File-Id": "uf_audio_1" },
      }),
    );

    render(
      <Harness
        conversationId="conv_1"
        messages={[
          {
            id: "msg_audio_1",
            role: "assistant",
            content: "",
            timestamp: new Date("2026-04-11T12:05:00.000Z"),
            parts: [
              { type: "tool_call", name: "generate_audio", args: { text: "Hello world", title: "Greeting" } },
              {
                type: "tool_result",
                name: "generate_audio",
                result: {
                  action: "generate_audio",
                  title: "Greeting",
                  text: "Hello world",
                  assetId: null,
                  provider: "openai-speech",
                  generationStatus: "client_fetch_pending",
                  estimatedDurationSeconds: 4,
                  estimatedGenerationSeconds: 2,
                },
              },
            ],
          },
        ]}
      />,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/tts",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ text: "Hello world", conversationId: "conv_1" }),
        }),
      );
    });

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({
        type: "REWRITE_TOOL_RESULT_AS_BROWSER_JOB",
        messageId: "msg_audio_1",
        resultIndex: 1,
        part: expect.objectContaining({ status: "running", toolName: "generate_audio" }),
      }));
      expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({
        type: "REWRITE_TOOL_RESULT_AS_BROWSER_JOB",
        messageId: "msg_audio_1",
        resultIndex: 1,
        part: expect.objectContaining({
          status: "succeeded",
          resultEnvelope: expect.objectContaining({
            artifacts: [expect.objectContaining({ assetId: "uf_audio_1", kind: "audio", source: "generated" })],
            payload: expect.objectContaining({
              assetId: "uf_audio_1",
              assetKind: "audio",
              mimeType: "audio/mpeg",
              assetSource: "generated",
              retentionClass: "conversation",
              generationStatus: "cached_asset",
            }),
          }),
        }),
      }));
    });

    await act(async () => {
      await Promise.resolve();
    });
  });

  it("persists graph tool results as stored browser-runtime assets", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          attachments: [
            {
              assetId: "uf_graph_1",
              mimeType: "application/vnd.studioordo.graph+json",
              assetKind: "graph",
              source: "derived",
              retentionClass: "conversation",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    render(
      <Harness
        conversationId="conv_1"
        messages={[
          {
            id: "msg_graph_1",
            role: "assistant",
            content: "",
            timestamp: new Date("2026-04-11T12:06:00.000Z"),
            parts: [
              { type: "tool_call", name: "generate_graph", args: {} },
              {
                type: "tool_result",
                name: "generate_graph",
                result: {
                  graph: {
                    kind: "table",
                    data: [{ label: "A", value: 1 }],
                    columns: ["label", "value"],
                  },
                  title: "Quarterly Mix",
                  caption: "Snapshot",
                },
              },
            ],
          },
        ]}
      />,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/chat/uploads",
        expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
      );
    });

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({
        type: "REWRITE_TOOL_RESULT_AS_BROWSER_JOB",
        messageId: "msg_graph_1",
        resultIndex: 1,
        part: expect.objectContaining({
          status: "succeeded",
          resultEnvelope: expect.objectContaining({
            artifacts: [expect.objectContaining({ assetId: "uf_graph_1", kind: "graph" })],
            payload: expect.objectContaining({ assetId: "uf_graph_1", mimeType: "application/vnd.studioordo.graph+json" }),
          }),
        }),
      }));
    });
  });

  it("does not start browser composition when compose_media has already been rerouted to a deferred job", async () => {
    render(
      <Harness
        conversationId="conv_1"
        messages={[
          {
            id: "msg_media_1",
            role: "assistant",
            content: "",
            timestamp: new Date("2026-04-11T12:10:00.000Z"),
            parts: [
              {
                type: "tool_call",
                name: "compose_media",
                args: {
                  plan: {
                    id: "plan_media_1",
                    conversationId: "conv_1",
                    visualClips: [{ assetId: "asset_visual_1", kind: "video" }],
                    audioClips: [],
                    subtitlePolicy: "none",
                    waveformPolicy: "none",
                    outputFormat: "mp4",
                  },
                },
              },
              {
                type: "tool_result",
                name: "compose_media",
                result: {
                  deferred_job: {
                    jobId: "job_media_1",
                    conversationId: "conv_1",
                    toolName: "compose_media",
                    label: "Compose Media",
                    status: "queued",
                    sequence: 1,
                  },
                },
              },
            ],
          },
        ]}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it("rewrites compose_media into a succeeded browser runtime job after local FFmpeg success", async () => {
    executeComposeMediaMock.mockResolvedValue({
      status: "succeeded",
      envelope: {
        schemaVersion: 1,
        toolName: "compose_media",
        family: "artifact",
        cardKind: "artifact_viewer",
        executionMode: "hybrid",
        inputSnapshot: { planId: "plan_media_2" },
        summary: { title: "Media Composition", statusLine: "succeeded" },
        replaySnapshot: { route: "browser_wasm", planId: "plan_media_2" },
        progress: { percent: 100, label: "Composition complete" },
        artifacts: [],
        payload: {
          route: "browser_wasm",
          planId: "plan_media_2",
          primaryAssetId: "asset_browser_1",
          outputFormat: "mp4",
        },
      },
    });

    render(
      <Harness
        conversationId="conv_2"
        messages={[
          {
            id: "msg_media_2",
            role: "assistant",
            content: "",
            timestamp: new Date("2026-04-11T12:12:00.000Z"),
            parts: [
              {
                type: "tool_call",
                name: "compose_media",
                args: {
                  plan: {
                    id: "plan_media_2",
                    conversationId: "conv_2",
                    visualClips: [{ assetId: "asset_visual_2", kind: "video" }],
                    audioClips: [],
                    subtitlePolicy: "none",
                    waveformPolicy: "none",
                    outputFormat: "mp4",
                  },
                },
              },
              {
                type: "tool_result",
                name: "compose_media",
                result: {
                  action: "compose_media",
                  planId: "plan_media_2",
                  id: "plan_media_2",
                  conversationId: "conv_2",
                  visualClips: [{ assetId: "asset_visual_2", kind: "video" }],
                  audioClips: [],
                  subtitlePolicy: "none",
                  waveformPolicy: "none",
                  outputFormat: "mp4",
                  generationStatus: "client_fetch_pending",
                },
              },
            ],
          },
        ]}
      />,
    );

    await waitFor(() => {
      expect(executeComposeMediaMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({
        type: "REWRITE_TOOL_RESULT_AS_BROWSER_JOB",
        messageId: "msg_media_2",
        resultIndex: 1,
        part: expect.objectContaining({ status: "running", toolName: "compose_media" }),
      }));
      expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({
        type: "REWRITE_TOOL_RESULT_AS_BROWSER_JOB",
        messageId: "msg_media_2",
        resultIndex: 1,
        part: expect.objectContaining({
          status: "succeeded",
          toolName: "compose_media",
          resultEnvelope: expect.objectContaining({
            payload: expect.objectContaining({
              route: "browser_wasm",
              primaryAssetId: "asset_browser_1",
            }),
          }),
        }),
      }));
    });
  });

  it("marks compose_media as failed with rerouting guidance when browser FFmpeg requires fallback", async () => {
    executeComposeMediaMock.mockResolvedValue({
      status: "fallback_required",
      failureCode: "wasm_unavailable",
    });

    render(
      <Harness
        conversationId="conv_3"
        messages={[
          {
            id: "msg_media_3",
            role: "assistant",
            content: "",
            timestamp: new Date("2026-04-11T12:13:00.000Z"),
            parts: [
              {
                type: "tool_call",
                name: "compose_media",
                args: {
                  plan: {
                    id: "plan_media_3",
                    conversationId: "conv_3",
                    visualClips: [{ assetId: "asset_visual_3", kind: "video" }],
                    audioClips: [],
                    subtitlePolicy: "none",
                    waveformPolicy: "none",
                    outputFormat: "mp4",
                  },
                },
              },
              {
                type: "tool_result",
                name: "compose_media",
                result: {
                  action: "compose_media",
                  planId: "plan_media_3",
                  id: "plan_media_3",
                  conversationId: "conv_3",
                  visualClips: [{ assetId: "asset_visual_3", kind: "video" }],
                  audioClips: [],
                  subtitlePolicy: "none",
                  waveformPolicy: "none",
                  outputFormat: "mp4",
                  generationStatus: "client_fetch_pending",
                },
              },
            ],
          },
        ]}
      />,
    );

    await waitFor(() => {
      const lastAction = dispatchMock.mock.calls.at(-1)?.[0];
      expect(lastAction).toMatchObject({
        type: "REWRITE_TOOL_RESULT_AS_BROWSER_JOB",
        messageId: "msg_media_3",
        resultIndex: 1,
        part: {
          status: "failed",
          toolName: "compose_media",
          error: "wasm_unavailable",
          progressLabel: COMPOSE_MEDIA_REROUTING_LABEL,
        },
      });
    });
  });

  it("marks compose_media as failed when browser FFmpeg returns a hard failure", async () => {
    executeComposeMediaMock.mockResolvedValue({
      status: "failed",
      failureCode: "worker_error",
    });

    render(
      <Harness
        conversationId="conv_4"
        messages={[
          {
            id: "msg_media_4",
            role: "assistant",
            content: "",
            timestamp: new Date("2026-04-11T12:14:00.000Z"),
            parts: [
              {
                type: "tool_call",
                name: "compose_media",
                args: {
                  plan: {
                    id: "plan_media_4",
                    conversationId: "conv_4",
                    visualClips: [{ assetId: "asset_visual_4", kind: "video" }],
                    audioClips: [],
                    subtitlePolicy: "none",
                    waveformPolicy: "none",
                    outputFormat: "mp4",
                  },
                },
              },
              {
                type: "tool_result",
                name: "compose_media",
                result: {
                  action: "compose_media",
                  planId: "plan_media_4",
                  id: "plan_media_4",
                  conversationId: "conv_4",
                  visualClips: [{ assetId: "asset_visual_4", kind: "video" }],
                  audioClips: [],
                  subtitlePolicy: "none",
                  waveformPolicy: "none",
                  outputFormat: "mp4",
                  generationStatus: "client_fetch_pending",
                },
              },
            ],
          },
        ]}
      />,
    );

    await waitFor(() => {
      const lastAction = dispatchMock.mock.calls.at(-1)?.[0];
      expect(lastAction).toMatchObject({
        type: "REWRITE_TOOL_RESULT_AS_BROWSER_JOB",
        messageId: "msg_media_4",
        resultIndex: 1,
        part: {
          status: "failed",
          toolName: "compose_media",
          error: "worker_error",
          progressLabel: COMPOSE_MEDIA_FAILURE_LABEL,
        },
      });
    });
  });
});