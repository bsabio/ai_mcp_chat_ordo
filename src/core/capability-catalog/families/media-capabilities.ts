import path from "node:path";

import type { CapabilityDefinition } from "../capability-definition";
import { CATALOG_INPUT_SCHEMAS } from "../catalog-input-schemas";
import { COMPOSE_MEDIA_PROGRESS_PHASES } from "@/lib/media/compose-media-progress";
import {
  ADMIN_ROLES,
  SIGNED_IN_ROLES,
} from "./shared";

const PROJECT_ROOT = path.resolve(__dirname, "../../../..");
const TSX_BINARY = path.join(
  PROJECT_ROOT,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsx.cmd" : "tsx",
);

export const MEDIA_CAPABILITIES = {
  list_conversation_media_assets: {
    core: {
      name: "list_conversation_media_assets",
      label: "List Conversation Media Assets",
      description:
        "List reusable governed media assets already attached to the current conversation.",
      category: "system",
      roles: [...SIGNED_IN_ROLES],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.list_conversation_media_assets,
      outputHint: "Returns reusable conversation-scoped media assets with real governed asset IDs.",
    },
    runtime: {},
    executorBinding: {
      bundleId: "media",
      executorId: "list_conversation_media_assets",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "list_conversation_media_assets",
      mode: "parse",
    },
    presentation: {
      family: "system",
      cardKind: "fallback",
      executionMode: "inline",
    },
    promptHint: {
      roleDirectiveLines: {
        AUTHENTICATED: [
          "MEDIA ASSET DISCOVERY (`list_conversation_media_assets`): Use this before `compose_media` whenever the user wants to reuse a previously generated chart, graph, audio file, image, or video from the current conversation.",
        ],
        APPRENTICE: [
          "MEDIA ASSET DISCOVERY (`list_conversation_media_assets`): Use this before `compose_media` whenever the user wants to reuse a previously generated chart, graph, audio file, image, or video from the current conversation.",
        ],
        STAFF: [
          "MEDIA ASSET DISCOVERY (`list_conversation_media_assets`): Use this before `compose_media` whenever the user wants to reuse a previously generated chart, graph, audio file, image, or video from the current conversation.",
        ],
        ADMIN: [
          "MEDIA ASSET DISCOVERY (`list_conversation_media_assets`): Use this before `compose_media` whenever the user wants to reuse a previously generated chart, graph, audio file, image, or video from the current conversation.",
        ],
      },
    },
  },
  compose_media: {
    core: {
      name: "compose_media",
      label: "Compose Media",
      description:
        "Compose, trim, and combine visual and audio assets into a new MP4 video. "
        + "Produces a unified artifact. You must provide governed asset handles.",
      category: "content",
      roles: ["AUTHENTICATED", "APPRENTICE", "STAFF", "ADMIN"],
    },
    schema: {
      inputSchema: {
        type: "object",
        properties: {
          plan: {
            type: "object",
            description: "A MediaCompositionPlan describing the clips, policies, and output format.",
            properties: {
              id: { type: "string", description: "Unique plan identifier." },
              conversationId: { type: "string", description: "Conversation this plan belongs to." },
              visualClips: {
                type: "array",
                maxItems: 5,
                items: {
                  type: "object",
                  properties: {
                    assetId: { type: "string", description: "Governed asset handle." },
                    kind: { type: "string", enum: ["image", "video", "audio", "chart", "graph"] },
                    startTime: { type: "number", description: "Optional clip trim start time in seconds." },
                    duration: { type: "number", description: "Optional clip duration in seconds." },
                  },
                  required: ["assetId", "kind"],
                },
              },
              audioClips: {
                type: "array",
                maxItems: 5,
                items: {
                  type: "object",
                  properties: {
                    assetId: { type: "string", description: "Governed asset handle." },
                    kind: { type: "string", enum: ["image", "video", "audio", "chart", "graph"] },
                    startTime: { type: "number", description: "Optional clip trim start time in seconds." },
                    duration: { type: "number", description: "Optional clip duration in seconds." },
                  },
                  required: ["assetId", "kind"],
                },
              },
              subtitlePolicy: { type: "string", enum: ["none", "burned", "sidecar", "both"] },
              waveformPolicy: { type: "string", enum: ["none", "generate"] },
              outputFormat: { type: "string", enum: ["mp4", "webm"] },
              resolution: {
                type: "object",
                properties: {
                  width: { type: "number", description: "Output width in pixels." },
                  height: { type: "number", description: "Output height in pixels." },
                },
                required: ["width", "height"],
              },
            },
            required: ["id", "conversationId", "visualClips", "audioClips"],
          },
        },
        required: ["plan"],
      },
      outputHint: "Returns the validated plan payload for browser/runtime execution.",
    },
    executorBinding: {
      bundleId: "media",
      executorId: "compose_media",
      executionSurface: "browser",
    },
    validationBinding: {
      validatorId: "compose_media",
      mode: "parse",
    },
    localExecutionTargets: {
      nativeProcess: {
        processId: "compose-media-native",
        command: TSX_BINARY,
        args: ["scripts/compose-media-native-target.ts"],
        cwd: PROJECT_ROOT,
        entrypoint: "scripts/compose-media-native-target.ts",
        label: "Compose media native worker",
      },
    },
    runtime: {
      executionMode: undefined,
      deferred: undefined,
    },
    presentation: {
      family: "artifact",
      cardKind: "media_render",
      executionMode: "hybrid",
      progressMode: "single",
      artifactKinds: ["video", "audio"],
      supportsRetry: "whole_job",
    },
    job: {
      family: "media",
      label: "Compose Media",
      description:
        "Compose visual and audio assets into a governed MP4 video via browser WASM or server FFmpeg.",
      executionPrincipal: "system_worker",
      executionAllowedRoles: SIGNED_IN_ROLES,
      retryPolicy: {
        mode: "automatic",
        maxAttempts: 2,
        backoffStrategy: "fixed",
        baseDelayMs: 5_000,
      },
      recoveryMode: "rerun",
      resultRetention: "retain",
      artifactPolicy: { mode: "retain" },
      initiatorRoles: SIGNED_IN_ROLES,
      ownerViewerRoles: SIGNED_IN_ROLES,
      ownerActionRoles: SIGNED_IN_ROLES,
      globalViewerRoles: ADMIN_ROLES,
      globalActionRoles: ADMIN_ROLES,
      defaultSurface: "self",
      progressPhases: COMPOSE_MEDIA_PROGRESS_PHASES,
    },
    browser: {
      runtimeKind: "wasm_worker",
      moduleId: "ffmpeg-browser-executor",
      supportedAssetKinds: ["video", "audio", "image", "subtitle", "waveform"],
      fallbackPolicy: "server",
      recoveryPolicy: "fallback_to_server",
      maxConcurrentExecutions: 1,
      requiresCrossOriginIsolation: true,
    },
    promptHint: {
      roleDirectiveLines: {
        AUTHENTICATED: [
          "MEDIA COMPOSITION (compose_media):",
          "- Before composing with previously generated chart, graph, audio, image, or video assets from this conversation, call `list_conversation_media_assets` to discover real governed asset IDs.",
          "- **compose_media**: Compose, trim, and combine visual and audio assets into a new MP4 video.",
          "- You MUST provide a structured plan object with id, conversationId, visualClips, audioClips, and output settings.",
          "- Each clip must reference a governed asset handle (assetId). Do NOT fabricate asset IDs — only use IDs from prior tool results or user-uploaded files.",
          "- The video will be rendered in the user's browser via WebAssembly FFmpeg. If their browser does not support it, the system falls back to server-side rendering automatically.",
          "- Use this tool when the user asks to create a video, combine clips, add audio to video, or perform any media composition task.",
        ],
        APPRENTICE: [
          "MEDIA COMPOSITION (compose_media):",
          "- Before composing with previously generated chart, graph, audio, image, or video assets from this conversation, call `list_conversation_media_assets` to discover real governed asset IDs.",
          "- **compose_media**: Compose, trim, and combine visual and audio assets into a new MP4 video.",
          "- You MUST provide a structured plan object with id, conversationId, visualClips, audioClips, and output settings.",
          "- Each clip must reference a governed asset handle (assetId). Do NOT fabricate asset IDs — only use IDs from prior tool results or user-uploaded files.",
        ],
        STAFF: [
          "MEDIA COMPOSITION (compose_media):",
          "- Before composing with previously generated chart, graph, audio, image, or video assets from this conversation, call `list_conversation_media_assets` to discover real governed asset IDs.",
          "- **compose_media**: Compose, trim, and combine visual and audio assets into a new MP4 video.",
          "- You MUST provide a structured plan object with id, conversationId, visualClips, audioClips, and output settings.",
          "- Each clip must reference a governed asset handle (assetId). Do NOT fabricate asset IDs — only use IDs from prior tool results or user-uploaded files.",
        ],
        ADMIN: [
          "MEDIA COMPOSITION (compose_media — hybrid browser/server execution):",
          "- Before composing with previously generated chart, graph, audio, image, or video assets from this conversation, call `list_conversation_media_assets` to discover real governed asset IDs.",
          "- **compose_media**: Compose, trim, and combine visual and audio assets into a new MP4 video.",
          "- You MUST provide a structured plan object with: id (unique string), conversationId, visualClips (array of {assetId, kind}), audioClips (array of {assetId, kind}), and optional subtitlePolicy, waveformPolicy, outputFormat.",
          "- Each clip must reference a governed asset handle (assetId). Do NOT fabricate asset IDs — only use IDs from prior tool results or user-uploaded files.",
          "- The video renders in the user's browser via WebAssembly FFmpeg first. If their browser lacks SharedArrayBuffer/COOP/COEP support, the system automatically falls back to server-side FFmpeg.",
          "- Use this tool when the user asks to create a video, combine clips, add audio to video, trim media, or perform any media composition task.",
          "- This is a deferred job — the result appears as a media card in the conversation with playback controls.",
        ],
      },
    },
  },
} as const satisfies Record<string, CapabilityDefinition>;