import { useEffect, useRef } from "react";
import type { Dispatch } from "react";

import type { ChatMessage } from "@/core/entities/chat-message";
import type {
  MediaAssetKind,
  MediaAssetRetentionClass,
  MediaAssetSource,
} from "@/core/entities/media-asset";
import { resolveGenerateChartPayload } from "@/core/use-cases/tools/chart-payload";
import {
  resolveGenerateGraphPayload,
  type ResolvedGraphPayload,
} from "@/core/use-cases/tools/graph-payload";

import type { ChatAction } from "./chatState";
import {
  buildBrowserRuntimeJobStatusPart,
  getBrowserRuntimeCandidates,
  shouldStartBrowserRuntime,
  withResolvedAudioAsset,
} from "@/lib/media/browser-runtime/job-snapshots";
import { FfmpegBrowserExecutor } from "@/lib/media/browser-runtime/ffmpeg-browser-executor";
import {
  COMPOSE_MEDIA_COMPLETE_LABEL,
  COMPOSE_MEDIA_FAILURE_LABEL,
  COMPOSE_MEDIA_REROUTING_LABEL,
  getComposeMediaProgressLabel,
} from "@/lib/media/compose-media-progress";
import type { MediaCompositionPlan } from "@/core/entities/media-composition";

type BrowserRuntimeStoredAsset = {
  assetId: string;
  mimeType: string;
  assetKind?: MediaAssetKind;
  source?: MediaAssetSource;
  retentionClass?: MediaAssetRetentionClass;
};

type BrowserRuntimeStoredPayloadFields = {
  assetId?: string;
  mimeType?: string;
  assetKind?: MediaAssetKind;
  assetSource?: MediaAssetSource;
  retentionClass?: MediaAssetRetentionClass;
};

type ResolvedChartRuntimePayload = ReturnType<typeof resolveGenerateChartPayload> & BrowserRuntimeStoredPayloadFields;
type ResolvedGraphRuntimePayload = ResolvedGraphPayload & BrowserRuntimeStoredPayloadFields;

interface UseBrowserCapabilityRuntimeOptions {
  conversationId: string | null;
  messages: ChatMessage[];
  dispatch: Dispatch<ChatAction>;
}

function isGenerateAudioPayload(value: unknown): value is {
  action: "generate_audio";
  title: string;
  text: string;
  assetId: string | null;
  provider: string;
  generationStatus: "client_fetch_pending" | "cached_asset";
  estimatedDurationSeconds: number;
  estimatedGenerationSeconds: number;
} {
  return typeof value === "object"
    && value !== null
    && (value as { action?: unknown }).action === "generate_audio"
    && typeof (value as { text?: unknown }).text === "string"
    && typeof (value as { title?: unknown }).title === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isResolvedGraphRuntimePayload(value: unknown): value is ResolvedGraphRuntimePayload {
  return isRecord(value)
    && isRecord(value.graph)
    && typeof value.graph.kind === "string";
}

function readStoredPayloadFields(value: unknown): BrowserRuntimeStoredPayloadFields {
  if (!isRecord(value)) {
    return {};
  }

  const assetSource = value.assetSource === "generated"
    || value.assetSource === "uploaded"
    || value.assetSource === "derived"
    ? value.assetSource
    : value.source === "generated" || value.source === "uploaded" || value.source === "derived"
      ? value.source
      : undefined;

  return {
    ...(typeof value.assetId === "string" && value.assetId.trim().length > 0
      ? { assetId: value.assetId }
      : {}),
    ...(typeof value.mimeType === "string" ? { mimeType: value.mimeType } : {}),
    ...(value.assetKind === "audio"
      || value.assetKind === "chart"
      || value.assetKind === "graph"
      || value.assetKind === "image"
      || value.assetKind === "video"
      || value.assetKind === "subtitle"
      || value.assetKind === "waveform"
      ? { assetKind: value.assetKind }
      : {}),
    ...(assetSource ? { assetSource } : {}),
    ...(value.retentionClass === "ephemeral"
      || value.retentionClass === "conversation"
      || value.retentionClass === "durable"
      ? { retentionClass: value.retentionClass }
      : {}),
  };
}

function toStoredPayloadFields(stored: BrowserRuntimeStoredAsset): BrowserRuntimeStoredPayloadFields {
  return {
    assetId: stored.assetId,
    mimeType: stored.mimeType,
    ...(stored.assetKind ? { assetKind: stored.assetKind } : {}),
    ...(stored.source ? { assetSource: stored.source } : {}),
    ...(stored.retentionClass ? { retentionClass: stored.retentionClass } : {}),
  };
}

function toFileStem(value: string | undefined, fallback: string): string {
  const normalized = (value ?? fallback)
    .trim()
    .replace(/\.[a-z0-9]+$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function resolveChartRuntimePayload(
  payload: unknown,
  args: Record<string, unknown>,
): ResolvedChartRuntimePayload {
  const raw = isRecord(payload) ? payload : args;
  return {
    ...resolveGenerateChartPayload(raw),
    ...readStoredPayloadFields(raw),
  };
}

function resolveGraphRuntimePayload(
  payload: unknown,
  args: Record<string, unknown>,
): ResolvedGraphRuntimePayload {
  const raw = isRecord(payload) ? payload : args;
  const graph = isResolvedGraphRuntimePayload(payload)
    ? payload
    : resolveGenerateGraphPayload(args);

  return {
    ...graph,
    ...readStoredPayloadFields(raw),
  };
}

async function uploadBrowserRuntimeAsset(options: {
  file: File;
  conversationId: string | null;
  signal: AbortSignal;
}): Promise<BrowserRuntimeStoredAsset> {
  const formData = new FormData();
  formData.append("files", options.file);
  if (options.conversationId) {
    formData.append("conversationId", options.conversationId);
  }

  const response = await fetch("/api/chat/uploads", {
    method: "POST",
    body: formData,
    signal: options.signal,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || `Asset persistence failed (${response.status})`);
  }

  const payload = await response.json() as {
    attachments?: Array<{
      assetId: string;
      mimeType: string;
      assetKind?: MediaAssetKind;
      source?: MediaAssetSource;
      retentionClass?: MediaAssetRetentionClass;
    }>;
  };
  const stored = payload.attachments?.[0];

  if (!stored?.assetId || !stored.mimeType) {
    throw new Error("Asset persistence completed without returning stored asset metadata.");
  }

  return stored;
}

async function persistBrowserRuntimePayload(options: {
  toolName: "generate_chart" | "generate_graph";
  payload: unknown;
  args: Record<string, unknown>;
  conversationId: string | null;
  signal: AbortSignal;
}): Promise<ResolvedChartRuntimePayload | ResolvedGraphRuntimePayload> {
  if (options.toolName === "generate_chart") {
    const chart = resolveChartRuntimePayload(options.payload, options.args);
    if (chart.assetId) {
      return chart;
    }

    const stored = await uploadBrowserRuntimeAsset({
      file: new File(
        [chart.code],
        `${toFileStem(chart.downloadFileName || chart.title, "chart")}.mmd`,
        { type: "text/vnd.mermaid" },
      ),
      conversationId: options.conversationId,
      signal: options.signal,
    });

    return {
      ...chart,
      ...toStoredPayloadFields(stored),
    };
  }

  const graph = resolveGraphRuntimePayload(options.payload, options.args);
  if (graph.assetId) {
    return graph;
  }

  const stored = await uploadBrowserRuntimeAsset({
    file: new File(
      [JSON.stringify(graph, null, 2)],
      `${toFileStem(graph.downloadFileName || graph.title, "graph")}.json`,
      { type: "application/vnd.studioordo.graph+json" },
    ),
    conversationId: options.conversationId,
    signal: options.signal,
  });

  return {
    ...graph,
    ...toStoredPayloadFields(stored),
  };
}

export function useBrowserCapabilityRuntime({
  conversationId,
  messages,
  dispatch,
}: UseBrowserCapabilityRuntimeOptions): void {
  const activeRuntimeControllers = useRef(new Map<string, AbortController>());

  useEffect(() => {
    const controllers = activeRuntimeControllers.current;

    return () => {
      for (const controller of controllers.values()) {
        controller.abort();
      }
      controllers.clear();
    };
  }, []);

  useEffect(() => {
    const controllers = activeRuntimeControllers.current;
    const candidates = getBrowserRuntimeCandidates(messages);

    const dispatchSnapshot = (
      messageId: string,
      resultIndex: number,
      part: ReturnType<typeof buildBrowserRuntimeJobStatusPart>,
    ) => {
      dispatch({
        type: "REWRITE_TOOL_RESULT_AS_BROWSER_JOB",
        messageId,
        resultIndex,
        part,
      });
    };

    for (const candidate of candidates) {
      if (!shouldStartBrowserRuntime(candidate)) {
        continue;
      }

      if (candidate.toolName === "compose_media") {
        if (controllers.has(candidate.jobId) || candidate.snapshot?.status === "succeeded") {
          continue;
        }

        const controller = new AbortController();
        controllers.set(candidate.jobId, controller);
        
        const executor = new FfmpegBrowserExecutor();

        dispatchSnapshot(
          candidate.messageId,
          candidate.resultIndex,
          buildBrowserRuntimeJobStatusPart({
            candidate,
            payload: candidate.payload,
            status: "running",
            sequence: 1,
            progressPercent: 10,
            progressLabel: getComposeMediaProgressLabel("staging_assets"),
            conversationId,
          }),
        );

        executor.execute(
          candidate.payload as MediaCompositionPlan,
          { conversationId, userId: "browser" },
          (progress, label) => {
            dispatchSnapshot(
              candidate.messageId,
              candidate.resultIndex,
              buildBrowserRuntimeJobStatusPart({
                candidate,
                payload: candidate.payload,
                status: "running",
                sequence: 2,
                progressPercent: progress,
                progressLabel: label,
                conversationId,
              }),
            );
          }
        )
        .then((result) => {
          if (result.status === "succeeded" && result.envelope) {
            dispatchSnapshot(
              candidate.messageId,
              candidate.resultIndex,
              buildBrowserRuntimeJobStatusPart({
                candidate,
                payload: result.envelope.payload,
                status: "succeeded",
                sequence: 3,
                progressPercent: 100,
                progressLabel: COMPOSE_MEDIA_COMPLETE_LABEL,
                conversationId,
              }),
            );
          } else if (result.status === "fallback_required") {
            // Browser path couldn't run — surface as failed so the server deferred path can take over
            dispatchSnapshot(
              candidate.messageId,
              candidate.resultIndex,
              buildBrowserRuntimeJobStatusPart({
                candidate,
                payload: candidate.payload,
                status: "failed",
                sequence: 3,
                progressPercent: 0,
                progressLabel: COMPOSE_MEDIA_REROUTING_LABEL,
                error: result.failureCode ?? "fallback_required",
                conversationId,
              }),
            );
          } else {
            dispatchSnapshot(
              candidate.messageId,
              candidate.resultIndex,
              buildBrowserRuntimeJobStatusPart({
                candidate,
                payload: candidate.payload,
                status: "failed",
                sequence: 3,
                progressPercent: 0,
                progressLabel: COMPOSE_MEDIA_FAILURE_LABEL,
                error: result.failureCode ?? "unknown",
                conversationId,
              }),
            );
          }
        })
        .catch((err) => {
          dispatchSnapshot(
            candidate.messageId,
            candidate.resultIndex,
            buildBrowserRuntimeJobStatusPart({
              candidate,
              payload: candidate.payload,
              status: "failed",
              sequence: 3,
              progressPercent: 0,
              progressLabel: COMPOSE_MEDIA_FAILURE_LABEL,
              error: err instanceof Error ? err.message : String(err),
              conversationId,
            }),
          );
        })
        .finally(() => {
          controllers.delete(candidate.jobId);
        });

        continue;
      }

      if (candidate.toolName === "generate_chart" || candidate.toolName === "generate_graph") {
        const initialSequence = candidate.snapshot?.sequence ?? 1;
        dispatchSnapshot(
          candidate.messageId,
          candidate.resultIndex,
          buildBrowserRuntimeJobStatusPart({
            candidate,
            payload: candidate.payload,
            status: "succeeded",
            sequence: initialSequence,
            conversationId,
          }),
        );

        const existingAssetId = readStoredPayloadFields(candidate.payload).assetId;
        if (existingAssetId || controllers.has(candidate.jobId)) {
          continue;
        }

        const controller = new AbortController();
        controllers.set(candidate.jobId, controller);

        void persistBrowserRuntimePayload({
          toolName: candidate.toolName,
          payload: candidate.payload,
          args: candidate.args,
          conversationId,
          signal: controller.signal,
        })
          .then((storedPayload) => {
            dispatchSnapshot(
              candidate.messageId,
              candidate.resultIndex,
              buildBrowserRuntimeJobStatusPart({
                candidate,
                payload: storedPayload,
                status: "succeeded",
                sequence: initialSequence + 1,
                progressPercent: 100,
                progressLabel: candidate.toolName === "generate_chart" ? "Chart stored" : "Graph stored",
                conversationId,
              }),
            );
          })
          .catch(() => {
            // Keep the payload-backed snapshot visible even if asset persistence fails.
          })
          .finally(() => {
            controllers.delete(candidate.jobId);
          });
        continue;
      }

      if (!isGenerateAudioPayload(candidate.payload)) {
        continue;
      }

      const audioPayload = candidate.payload;

      if (audioPayload.assetId) {
        dispatchSnapshot(
          candidate.messageId,
          candidate.resultIndex,
          buildBrowserRuntimeJobStatusPart({
            candidate,
            payload: audioPayload,
            status: "succeeded",
            sequence: candidate.snapshot?.sequence ?? 1,
            conversationId,
          }),
        );
        continue;
      }

      if (controllers.has(candidate.jobId)) {
        continue;
      }

      const controller = new AbortController();
      controllers.set(candidate.jobId, controller);

      dispatchSnapshot(
        candidate.messageId,
        candidate.resultIndex,
        buildBrowserRuntimeJobStatusPart({
          candidate,
          payload: candidate.payload,
          status: "running",
          sequence: 1,
          progressPercent: 15,
          progressLabel: "Generating audio",
          conversationId,
        }),
      );

      void fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: audioPayload.text,
          conversationId,
        }),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            const payload = await response.json().catch(() => null) as { error?: string } | null;
            throw new Error(payload?.error || `Audio generation failed (${response.status})`);
          }

          const assetId = response.headers.get("X-User-File-Id");
          await response.body?.cancel().catch(() => undefined);

          if (!assetId) {
            throw new Error("Audio generation completed without returning a stored asset id.");
          }

          dispatchSnapshot(
            candidate.messageId,
            candidate.resultIndex,
            buildBrowserRuntimeJobStatusPart({
              candidate,
              payload: withResolvedAudioAsset(audioPayload, { assetId, conversationId }),
              status: "succeeded",
              sequence: 2,
              progressPercent: 100,
              progressLabel: "Audio ready",
              conversationId,
            }),
          );
        })
        .catch((error) => {
          if (controller.signal.aborted) {
            return;
          }

          dispatchSnapshot(
            candidate.messageId,
            candidate.resultIndex,
            buildBrowserRuntimeJobStatusPart({
              candidate,
              payload: audioPayload,
              status: "failed",
              sequence: 2,
              error: error instanceof Error ? error.message : "Audio generation failed.",
              conversationId,
            }),
          );
        })
        .finally(() => {
          controllers.delete(candidate.jobId);
        });
    }
  }, [conversationId, dispatch, messages]);
}
