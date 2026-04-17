import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ChatMessage } from "@/core/entities/chat-message";
import type { ChatAction } from "@/hooks/chat/chatState";
import {
  COMPOSE_MEDIA_FAILURE_LABEL,
  COMPOSE_MEDIA_REROUTING_LABEL,
  getComposeMediaProgressLabel,
} from "@/lib/media/compose-media-progress";

const { executeComposeMediaMock, renderGraphToPngBlobMock, renderMermaidChartToPngBlobMock } = vi.hoisted(() => ({
  executeComposeMediaMock: vi.fn(),
  renderGraphToPngBlobMock: vi.fn(),
  renderMermaidChartToPngBlobMock: vi.fn(),
}));
const { waitForPlayableVideoAssetMock, VideoPlaybackVerificationErrorMock } = vi.hoisted(() => ({
  waitForPlayableVideoAssetMock: vi.fn(),
  VideoPlaybackVerificationErrorMock: class VideoPlaybackVerificationError extends Error {
    code: "playback_readiness_timeout" | "playback_verification_failed";

    constructor(
      code: "playback_readiness_timeout" | "playback_verification_failed",
      message: string,
    ) {
      super(message);
      this.name = "VideoPlaybackVerificationError";
      this.code = code;
    }
  },
}));

vi.mock("@/lib/media/browser-runtime/ffmpeg-browser-executor", () => ({
  FfmpegBrowserExecutor: class MockFfmpegBrowserExecutor {
    execute = executeComposeMediaMock;
  },
}));

vi.mock("@/lib/media/browser-runtime/mermaid-image-derivation", () => ({
  renderMermaidChartToPngBlob: renderMermaidChartToPngBlobMock,
}));

vi.mock("@/lib/media/browser-runtime/graph-image-derivation", () => ({
  renderGraphToPngBlob: renderGraphToPngBlobMock,
}));

vi.mock("@/lib/media/browser-runtime/video-asset-readiness", () => ({
  waitForPlayableVideoAsset: waitForPlayableVideoAssetMock,
  VideoPlaybackVerificationError: VideoPlaybackVerificationErrorMock,
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
    window.sessionStorage.clear();
    fetchMock.mockReset();
    dispatchMock.mockReset();
    executeComposeMediaMock.mockReset();
    renderGraphToPngBlobMock.mockReset();
    renderMermaidChartToPngBlobMock.mockReset();
    waitForPlayableVideoAssetMock.mockReset();
    waitForPlayableVideoAssetMock.mockResolvedValue(undefined);
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

  it("queues browser-local work after the first active slot is occupied", async () => {
    fetchMock.mockImplementation(
      () => new Promise<Response>(() => {
        // Leave the first request unresolved so later candidates must queue.
      }),
    );

    render(
      <Harness
        conversationId="conv_queue_1"
        messages={[
          {
            id: "msg_audio_queue_1",
            role: "assistant",
            content: "",
            timestamp: new Date("2026-04-11T12:05:00.000Z"),
            parts: [
              { type: "tool_call", name: "generate_audio", args: { text: "First", title: "One" } },
              {
                type: "tool_result",
                name: "generate_audio",
                result: {
                  action: "generate_audio",
                  title: "One",
                  text: "First",
                  assetId: null,
                  provider: "openai-speech",
                  generationStatus: "client_fetch_pending",
                  estimatedDurationSeconds: 4,
                  estimatedGenerationSeconds: 2,
                },
              },
            ],
          },
          {
            id: "msg_audio_queue_2",
            role: "assistant",
            content: "",
            timestamp: new Date("2026-04-11T12:05:01.000Z"),
            parts: [
              { type: "tool_call", name: "generate_audio", args: { text: "Second", title: "Two" } },
              {
                type: "tool_result",
                name: "generate_audio",
                result: {
                  action: "generate_audio",
                  title: "Two",
                  text: "Second",
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
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({
      type: "REWRITE_TOOL_RESULT_AS_BROWSER_JOB",
      messageId: "msg_audio_queue_2",
      resultIndex: 1,
      part: expect.objectContaining({
        status: "queued",
        progressLabel: "Queued for local execution",
      }),
    }));
  });

  it("reconciles stale persisted browser-runtime work before showing it as active", async () => {
    window.sessionStorage.setItem(
      "studioordo.browser-runtime.v1",
      JSON.stringify([
        {
          jobId: "browser:msg_audio_reconcile_1:generate_audio:1",
          toolName: "generate_audio",
          conversationId: "conv_reconcile_1",
          status: "running",
          updatedAt: "2026-04-15T10:00:00.000Z",
        },
      ]),
    );

    render(
      <Harness
        conversationId="conv_reconcile_1"
        messages={[
          {
            id: "msg_audio_reconcile_1",
            role: "assistant",
            content: "",
            timestamp: new Date("2026-04-11T12:05:00.000Z"),
            parts: [
              { type: "tool_call", name: "generate_audio", args: { text: "Recover", title: "Recover" } },
              {
                type: "tool_result",
                name: "generate_audio",
                result: {
                  job: {
                    messageId: "msg_audio_reconcile_1",
                    part: {
                      type: "job_status",
                      jobId: "browser:msg_audio_reconcile_1:generate_audio:1",
                      toolName: "generate_audio",
                      label: "Generate Audio",
                      status: "running",
                      sequence: 1,
                      resultPayload: {
                        action: "generate_audio",
                        title: "Recover",
                        text: "Recover",
                        assetId: null,
                        provider: "openai-speech",
                        generationStatus: "client_fetch_pending",
                        estimatedDurationSeconds: 4,
                        estimatedGenerationSeconds: 2,
                      },
                    },
                  },
                },
              },
            ],
          },
        ]}
      />,
    );

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({
        type: "REWRITE_TOOL_RESULT_AS_BROWSER_JOB",
        messageId: "msg_audio_reconcile_1",
        resultIndex: 1,
        part: expect.objectContaining({
          status: "failed",
          error: "Local browser execution was interrupted and must reroute to the server.",
        }),
      }));
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem("studioordo.browser-runtime.v1")).toBeNull();
  });

  it("reconciles stale compose_media browser work into deferred recovery", async () => {
    window.sessionStorage.setItem(
      "studioordo.browser-runtime.v1",
      JSON.stringify([
        {
          jobId: "browser:msg_media_reconcile_1:compose_media:1",
          toolName: "compose_media",
          conversationId: "conv_reconcile_media_1",
          status: "running",
          updatedAt: "2026-04-15T10:00:00.000Z",
        },
      ]),
    );

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url === "/api/chat/jobs" && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            ok: true,
            jobId: "job_media_reconcile_1",
            deduplicated: false,
            job: {
              messageId: "jobmsg_job_media_reconcile_1",
              part: {
                type: "job_status",
                jobId: "job_media_reconcile_1",
                toolName: "compose_media",
                label: "Compose Media",
                status: "queued",
                lifecyclePhase: "compose_queued_deferred",
                progressLabel: "Queued on server",
                updatedAt: "2026-04-15T10:00:05.000Z",
              },
            },
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(
      <Harness
        conversationId="conv_reconcile_media_1"
        messages={[
          {
            id: "msg_media_reconcile_1",
            role: "assistant",
            content: "",
            timestamp: new Date("2026-04-11T12:05:00.000Z"),
            parts: [
              {
                type: "tool_call",
                name: "compose_media",
                args: {
                  plan: {
                    id: "plan_media_reconcile_1",
                    conversationId: "conv_reconcile_media_1",
                    visualClips: [{ assetId: "asset_visual_reconcile_1", kind: "video" }],
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
                  job: {
                    messageId: "msg_media_reconcile_1",
                    part: {
                      type: "job_status",
                      jobId: "browser:msg_media_reconcile_1:compose_media:1",
                      toolName: "compose_media",
                      label: "Compose Media",
                      status: "running",
                      sequence: 1,
                      resultPayload: {
                        id: "plan_media_reconcile_1",
                        conversationId: "conv_reconcile_media_1",
                        visualClips: [{ assetId: "asset_visual_reconcile_1", kind: "video" }],
                        audioClips: [],
                        subtitlePolicy: "none",
                        waveformPolicy: "none",
                        outputFormat: "mp4",
                      },
                    },
                  },
                },
              },
            ],
          },
        ]}
      />,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/chat/jobs",
        expect.objectContaining({ method: "POST" }),
      );
    });

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({
        type: "REWRITE_TOOL_RESULT_AS_BROWSER_JOB",
        messageId: "msg_media_reconcile_1",
        resultIndex: 1,
        part: expect.objectContaining({
          jobId: "job_media_reconcile_1",
          status: "queued",
          lifecyclePhase: "compose_queued_deferred",
        }),
      }));
    });

    expect(window.sessionStorage.getItem("studioordo.browser-runtime.v1")).toBeNull();
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
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url === "/api/user-files/asset_visual_2" && init?.method === "HEAD") {
        return new Response(null, {
          status: 200,
          headers: {
            "Content-Type": "video/mp4",
            "X-Asset-Kind": "video",
            "X-Conversation-Id": "conv_2",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

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
      expect(waitForPlayableVideoAssetMock).toHaveBeenCalledWith(expect.objectContaining({
        uri: "/api/user-files/asset_browser_1",
      }));
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
          status: "running",
          toolName: "compose_media",
          progressLabel: getComposeMediaProgressLabel("verifying_playback", {
            plan: {
              visualClips: [{ assetId: "asset_visual_2", kind: "video" }],
              audioClips: [],
            },
            progressPercent: 98,
          }),
        }),
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

  it("derives a compose-ready image asset for chart visual clips before browser FFmpeg runs", async () => {
    renderMermaidChartToPngBlobMock.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url === "/api/chat/uploads") {
        return new Response(
          JSON.stringify({
            attachments: [
              {
                assetId: "uf_chart_png_1",
                mimeType: "image/png",
                assetKind: "image",
                source: "derived",
                retentionClass: "conversation",
                derivativeOfAssetId: "asset_chart_source_1",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (url === "/api/user-files/uf_chart_png_1" && init?.method === "HEAD") {
        return new Response(null, {
          status: 200,
          headers: {
            "Content-Type": "image/png",
            "X-Asset-Kind": "image",
            "X-Conversation-Id": "conv_chart_1",
            "X-Derivative-Of-Asset-Id": "asset_chart_source_1",
          },
        });
      }

      if (url === "/api/user-files/asset_audio_chart_1" && init?.method === "HEAD") {
        return new Response(null, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "X-Asset-Kind": "audio",
            "X-Conversation-Id": "conv_chart_1",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    executeComposeMediaMock.mockResolvedValue({
      status: "succeeded",
      envelope: {
        schemaVersion: 1,
        toolName: "compose_media",
        family: "artifact",
        cardKind: "artifact_viewer",
        executionMode: "hybrid",
        inputSnapshot: { planId: "plan_media_chart_1" },
        summary: { title: "Media Composition", statusLine: "succeeded" },
        replaySnapshot: { route: "browser_wasm", planId: "plan_media_chart_1" },
        progress: { percent: 100, label: "Composition complete" },
        artifacts: [],
        payload: {
          route: "browser_wasm",
          planId: "plan_media_chart_1",
          primaryAssetId: "asset_browser_chart_1",
          outputFormat: "mp4",
        },
      },
    });

    render(
      <Harness
        conversationId="conv_chart_1"
        messages={[
          {
            id: "msg_chart_source_1",
            role: "assistant",
            content: "",
            timestamp: new Date("2026-04-11T12:11:00.000Z"),
            parts: [
              { type: "tool_call", name: "generate_chart", args: { code: "flowchart TD\nA-->B", title: "Quarterly mix" } },
              {
                type: "tool_result",
                name: "generate_chart",
                result: {
                  code: "flowchart TD\nA-->B",
                  title: "Quarterly mix",
                  assetId: "asset_chart_source_1",
                  mimeType: "text/vnd.mermaid",
                },
              },
            ],
          },
          {
            id: "msg_media_chart_1",
            role: "assistant",
            content: "",
            timestamp: new Date("2026-04-11T12:12:00.000Z"),
            parts: [
              {
                type: "tool_call",
                name: "compose_media",
                args: {
                  plan: {
                    id: "plan_media_chart_1",
                    conversationId: "conv_chart_1",
                    visualClips: [{ assetId: "asset_chart_source_1", kind: "chart" }],
                    audioClips: [{ assetId: "asset_audio_chart_1", kind: "audio" }],
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
                  planId: "plan_media_chart_1",
                  id: "plan_media_chart_1",
                  conversationId: "conv_chart_1",
                  visualClips: [{ assetId: "asset_chart_source_1", kind: "chart" }],
                  audioClips: [{ assetId: "asset_audio_chart_1", kind: "audio" }],
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
      expect(renderMermaidChartToPngBlobMock).toHaveBeenCalledWith("flowchart TD\nA-->B");
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/chat/uploads",
        expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
      );
    });

    await waitFor(() => {
      expect(executeComposeMediaMock).toHaveBeenCalledWith(
        expect.objectContaining({
          visualClips: [{ assetId: "uf_chart_png_1", kind: "image", sourceAssetId: "asset_chart_source_1" }],
          audioClips: [{ assetId: "asset_audio_chart_1", kind: "audio" }],
        }),
        expect.anything(),
        expect.any(Function),
        expect.any(AbortSignal),
      );
    });

    await waitFor(() => {
      expect(waitForPlayableVideoAssetMock).toHaveBeenCalledWith(expect.objectContaining({
        uri: "/api/user-files/asset_browser_chart_1",
      }));
    });
  });

  it("enqueues deferred compose_media recovery when browser FFmpeg requires fallback", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url === "/api/user-files/asset_visual_3" && init?.method === "HEAD") {
        return new Response(null, {
          status: 200,
          headers: {
            "Content-Type": "video/mp4",
            "X-Asset-Kind": "video",
            "X-Conversation-Id": "conv_3",
          },
        });
      }

      if (url === "/api/chat/jobs" && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            ok: true,
            jobId: "job_media_deferred_3",
            deduplicated: false,
            job: {
              messageId: "jobmsg_job_media_deferred_3",
              part: {
                type: "job_status",
                jobId: "job_media_deferred_3",
                toolName: "compose_media",
                label: "Compose Media",
                status: "queued",
                lifecyclePhase: "compose_queued_deferred",
                progressLabel: "Queued on server",
                updatedAt: "2026-04-11T12:13:05.000Z",
                resultEnvelope: {
                  schemaVersion: 1,
                  toolName: "compose_media",
                  family: "artifact",
                  cardKind: "artifact_viewer",
                  executionMode: "deferred",
                  inputSnapshot: { planId: "plan_media_3" },
                  summary: { title: "Media Composition", statusLine: "queued" },
                  payload: {
                    route: "deferred_remote",
                    planId: "plan_media_3",
                  },
                },
              },
            },
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

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
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/chat/jobs",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({
        type: "REWRITE_TOOL_RESULT_AS_BROWSER_JOB",
        messageId: "msg_media_3",
        resultIndex: 1,
        part: expect.objectContaining({
          status: "queued",
          toolName: "compose_media",
          jobId: "job_media_deferred_3",
          lifecyclePhase: "compose_queued_deferred",
          progressLabel: "Queued on server",
        }),
      }));
    });
  });

  it("marks compose_media as failed at deferred_enqueue when browser recovery enqueue fails", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url === "/api/user-files/asset_visual_3b" && init?.method === "HEAD") {
        return new Response(null, {
          status: 200,
          headers: {
            "Content-Type": "video/mp4",
            "X-Asset-Kind": "video",
            "X-Conversation-Id": "conv_3b",
          },
        });
      }

      if (url === "/api/chat/jobs" && init?.method === "POST") {
        return new Response(
          JSON.stringify({ error: "Queue unavailable" }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    executeComposeMediaMock.mockResolvedValue({
      status: "fallback_required",
      failureCode: "wasm_unavailable",
    });

    render(
      <Harness
        conversationId="conv_3b"
        messages={[
          {
            id: "msg_media_3b",
            role: "assistant",
            content: "",
            timestamp: new Date("2026-04-11T12:13:30.000Z"),
            parts: [
              {
                type: "tool_call",
                name: "compose_media",
                args: {
                  plan: {
                    id: "plan_media_3b",
                    conversationId: "conv_3b",
                    visualClips: [{ assetId: "asset_visual_3b", kind: "video" }],
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
                  planId: "plan_media_3b",
                  id: "plan_media_3b",
                  conversationId: "conv_3b",
                  visualClips: [{ assetId: "asset_visual_3b", kind: "video" }],
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
        messageId: "msg_media_3b",
        resultIndex: 1,
        part: {
          status: "failed",
          toolName: "compose_media",
          error: "Queue unavailable",
          failureCode: "deferred_enqueue_failed",
          failureStage: "deferred_enqueue",
          progressLabel: COMPOSE_MEDIA_FAILURE_LABEL,
        },
      });
    });
  });

  it("marks compose_media as failed when browser FFmpeg returns a hard failure", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url === "/api/user-files/asset_visual_4" && init?.method === "HEAD") {
        return new Response(null, {
          status: 200,
          headers: {
            "Content-Type": "video/mp4",
            "X-Asset-Kind": "video",
            "X-Conversation-Id": "conv_4",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

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

  it("classifies compose_media playback readiness failures as playback verification failures", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url === "/api/user-files/asset_visual_4b" && init?.method === "HEAD") {
        return new Response(null, {
          status: 200,
          headers: {
            "Content-Type": "video/mp4",
            "X-Asset-Kind": "video",
            "X-Conversation-Id": "conv_4b",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    executeComposeMediaMock.mockResolvedValue({
      status: "succeeded",
      envelope: {
        schemaVersion: 1,
        toolName: "compose_media",
        family: "media",
        cardKind: "media_render",
        executionMode: "browser_wasm",
        summary: {
          title: "Composition",
          message: "Rendered in browser",
        },
        progress: { percent: 100, label: "Composition complete" },
        artifacts: [],
        payload: {
          route: "browser_wasm",
          planId: "plan_media_4b",
          primaryAssetId: "asset_visual_4b",
          outputFormat: "mp4",
        },
      },
    });
    waitForPlayableVideoAssetMock.mockRejectedValue(
      new VideoPlaybackVerificationErrorMock(
        "playback_readiness_timeout",
        "Timed out waiting for video playback readiness.",
      ),
    );

    render(
      <Harness
        conversationId="conv_4b"
        messages={[
          {
            id: "msg_media_4b",
            role: "assistant",
            content: "",
            timestamp: new Date("2026-04-11T12:14:15.000Z"),
            parts: [
              {
                type: "tool_call",
                name: "compose_media",
                args: {
                  plan: {
                    id: "plan_media_4b",
                    conversationId: "conv_4b",
                    visualClips: [{ assetId: "asset_visual_4b", kind: "video" }],
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
                  planId: "plan_media_4b",
                  id: "plan_media_4b",
                  conversationId: "conv_4b",
                  visualClips: [{ assetId: "asset_visual_4b", kind: "video" }],
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
        messageId: "msg_media_4b",
        resultIndex: 1,
        part: {
          status: "failed",
          toolName: "compose_media",
          error: "Timed out waiting for video playback readiness.",
          failureCode: "playback_readiness_timeout",
          failureStage: "playback_verification",
          progressLabel: COMPOSE_MEDIA_FAILURE_LABEL,
        },
      });
    });
  });

  it("derives a compose-ready image asset for graph visual clips before browser FFmpeg runs", async () => {
    renderGraphToPngBlobMock.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url === "/api/chat/uploads") {
        return new Response(
          JSON.stringify({
            attachments: [
              {
                assetId: "uf_graph_png_1",
                mimeType: "image/png",
                assetKind: "image",
                source: "derived",
                retentionClass: "conversation",
                derivativeOfAssetId: "asset_graph_5",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (url === "/api/user-files/uf_graph_png_1" && init?.method === "HEAD") {
        return new Response(null, {
          status: 200,
          headers: {
            "Content-Type": "image/png",
            "X-Asset-Kind": "image",
            "X-Conversation-Id": "conv_5",
            "X-Derivative-Of-Asset-Id": "asset_graph_5",
          },
        });
      }

      if (url === "/api/user-files/asset_audio_5" && init?.method === "HEAD") {
        return new Response(null, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "X-Asset-Kind": "audio",
            "X-Conversation-Id": "conv_5",
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    executeComposeMediaMock.mockResolvedValue({
      status: "succeeded",
      envelope: {
        schemaVersion: 1,
        toolName: "compose_media",
        family: "artifact",
        cardKind: "artifact_viewer",
        executionMode: "hybrid",
        inputSnapshot: { planId: "plan_media_5" },
        summary: { title: "Media Composition", statusLine: "succeeded" },
        replaySnapshot: { route: "browser_wasm", planId: "plan_media_5" },
        progress: { percent: 100, label: "Composition complete" },
        artifacts: [],
        payload: {
          route: "browser_wasm",
          planId: "plan_media_5",
          primaryAssetId: "asset_browser_graph_1",
          outputFormat: "mp4",
        },
      },
    });

    render(
      <Harness
        conversationId="conv_5"
        messages={[
          {
            id: "msg_graph_source_5",
            role: "assistant",
            content: "",
            timestamp: new Date("2026-04-11T12:14:30.000Z"),
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
                  title: "Pipeline Mix",
                  caption: "Snapshot",
                  assetId: "asset_graph_5",
                  mimeType: "application/vnd.studioordo.graph+json",
                },
              },
            ],
          },
          {
            id: "msg_media_5",
            role: "assistant",
            content: "",
            timestamp: new Date("2026-04-11T12:15:00.000Z"),
            parts: [
              {
                type: "tool_call",
                name: "compose_media",
                args: {
                  plan: {
                    id: "plan_media_5",
                    conversationId: "conv_5",
                    visualClips: [{ assetId: "asset_graph_5", kind: "graph" }],
                    audioClips: [{ assetId: "asset_audio_5", kind: "audio" }],
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
                  planId: "plan_media_5",
                  id: "plan_media_5",
                  conversationId: "conv_5",
                  visualClips: [{ assetId: "asset_graph_5", kind: "graph" }],
                  audioClips: [{ assetId: "asset_audio_5", kind: "audio" }],
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
      expect(renderGraphToPngBlobMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(executeComposeMediaMock).toHaveBeenCalledWith(
        expect.objectContaining({
          visualClips: [{ assetId: "uf_graph_png_1", kind: "image", sourceAssetId: "asset_graph_5" }],
          audioClips: [{ assetId: "asset_audio_5", kind: "audio" }],
        }),
        expect.anything(),
        expect.any(Function),
        expect.any(AbortSignal),
      );
    });

    await waitFor(() => {
      expect(waitForPlayableVideoAssetMock).toHaveBeenCalledWith(expect.objectContaining({
        uri: "/api/user-files/asset_browser_graph_1",
      }));
    });

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({
        type: "REWRITE_TOOL_RESULT_AS_BROWSER_JOB",
        messageId: "msg_media_5",
        resultIndex: 1,
        part: expect.objectContaining({
          status: "succeeded",
          toolName: "compose_media",
          resultEnvelope: expect.objectContaining({
            payload: expect.objectContaining({
              route: "browser_wasm",
              primaryAssetId: "asset_browser_graph_1",
            }),
          }),
        }),
      }));
    });
  });

  it("fails compose_media in browser preflight when a governed source asset is missing", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url === "/api/user-files/asset_missing_6" && init?.method === "HEAD") {
        return new Response(null, { status: 404 });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(
      <Harness
        conversationId="conv_6"
        messages={[
          {
            id: "msg_media_6",
            role: "assistant",
            content: "",
            timestamp: new Date("2026-04-11T12:16:00.000Z"),
            parts: [
              {
                type: "tool_call",
                name: "compose_media",
                args: {
                  plan: {
                    id: "plan_media_6",
                    conversationId: "conv_6",
                    visualClips: [{ assetId: "asset_missing_6", kind: "video" }],
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
                  planId: "plan_media_6",
                  id: "plan_media_6",
                  conversationId: "conv_6",
                  visualClips: [{ assetId: "asset_missing_6", kind: "video" }],
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
        messageId: "msg_media_6",
        resultIndex: 1,
        part: {
          status: "failed",
          toolName: "compose_media",
          error: "Composition source asset asset_missing_6 was not found.",
          failureCode: "asset_not_found",
          failureStage: "composition_preflight",
          progressLabel: COMPOSE_MEDIA_FAILURE_LABEL,
        },
      });
    });

    expect(executeComposeMediaMock).not.toHaveBeenCalled();
  });

  it("reroutes overflowed compose_media work into deferred recovery", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url === "/api/tts") {
        return new Promise<Response>(() => {
          // Keep the active slot occupied so the fourth candidate overflows.
        });
      }

      if (url === "/api/chat/jobs" && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            ok: true,
            jobId: "job_media_overflow_1",
            deduplicated: false,
            job: {
              messageId: "jobmsg_job_media_overflow_1",
              part: {
                type: "job_status",
                jobId: "job_media_overflow_1",
                toolName: "compose_media",
                label: "Compose Media",
                status: "queued",
                lifecyclePhase: "compose_queued_deferred",
                progressLabel: "Queued on server",
                updatedAt: "2026-04-11T12:20:05.000Z",
              },
            },
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(
      <Harness
        conversationId="conv_overflow_1"
        messages={[
          {
            id: "msg_audio_overflow_1",
            role: "assistant",
            content: "",
            timestamp: new Date("2026-04-11T12:20:00.000Z"),
            parts: [
              { type: "tool_call", name: "generate_audio", args: { text: "First", title: "One" } },
              {
                type: "tool_result",
                name: "generate_audio",
                result: {
                  action: "generate_audio",
                  title: "One",
                  text: "First",
                  assetId: null,
                  provider: "openai-speech",
                  generationStatus: "client_fetch_pending",
                  estimatedDurationSeconds: 4,
                  estimatedGenerationSeconds: 2,
                },
              },
            ],
          },
          {
            id: "msg_audio_overflow_2",
            role: "assistant",
            content: "",
            timestamp: new Date("2026-04-11T12:20:01.000Z"),
            parts: [
              { type: "tool_call", name: "generate_audio", args: { text: "Second", title: "Two" } },
              {
                type: "tool_result",
                name: "generate_audio",
                result: {
                  action: "generate_audio",
                  title: "Two",
                  text: "Second",
                  assetId: null,
                  provider: "openai-speech",
                  generationStatus: "client_fetch_pending",
                  estimatedDurationSeconds: 4,
                  estimatedGenerationSeconds: 2,
                },
              },
            ],
          },
          {
            id: "msg_audio_overflow_3",
            role: "assistant",
            content: "",
            timestamp: new Date("2026-04-11T12:20:02.000Z"),
            parts: [
              { type: "tool_call", name: "generate_audio", args: { text: "Third", title: "Three" } },
              {
                type: "tool_result",
                name: "generate_audio",
                result: {
                  action: "generate_audio",
                  title: "Three",
                  text: "Third",
                  assetId: null,
                  provider: "openai-speech",
                  generationStatus: "client_fetch_pending",
                  estimatedDurationSeconds: 4,
                  estimatedGenerationSeconds: 2,
                },
              },
            ],
          },
          {
            id: "msg_media_overflow_1",
            role: "assistant",
            content: "",
            timestamp: new Date("2026-04-11T12:20:03.000Z"),
            parts: [
              {
                type: "tool_call",
                name: "compose_media",
                args: {
                  plan: {
                    id: "plan_media_overflow_1",
                    conversationId: "conv_overflow_1",
                    visualClips: [{ assetId: "asset_visual_overflow_1", kind: "video" }],
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
                  planId: "plan_media_overflow_1",
                  id: "plan_media_overflow_1",
                  conversationId: "conv_overflow_1",
                  visualClips: [{ assetId: "asset_visual_overflow_1", kind: "video" }],
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
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/chat/jobs",
        expect.objectContaining({ method: "POST" }),
      );
    });

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({
        type: "REWRITE_TOOL_RESULT_AS_BROWSER_JOB",
        messageId: "msg_media_overflow_1",
        resultIndex: 1,
        part: expect.objectContaining({
          jobId: "job_media_overflow_1",
          status: "queued",
          lifecyclePhase: "compose_queued_deferred",
        }),
      }));
    });
  });
});