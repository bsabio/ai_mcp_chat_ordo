import { describe, it, expect } from "vitest";
import type { MediaAssetDescriptor } from "@/core/entities/media-asset";
import type { MediaCompositionPlan } from "@/core/entities/media-composition";
import { normalizeMediaCompositionPlan, validatePlanConstraints } from "./media-composition-plan";
import { selectExecutionRoute } from "./media-execution-router";

function createPlan(overrides: Partial<MediaCompositionPlan> = {}): MediaCompositionPlan {
  return {
    id: "plan-1",
    conversationId: "conv-1",
    visualClips: [{ assetId: "asset-1", kind: "image" }],
    audioClips: [{ assetId: "asset-a1", kind: "audio" }],
    subtitlePolicy: "none",
    waveformPolicy: "none",
    outputFormat: "mp4",
    ...overrides,
  };
}

function createAsset(overrides: Partial<MediaAssetDescriptor>): MediaAssetDescriptor {
  return {
    id: "asset-1",
    kind: "image",
    source: "uploaded",
    mimeType: "image/png",
    ...overrides,
  };
}

describe("media-composition-plan", () => {
  it("normalizes a valid plan", () => {
    const raw = {
      id: "plan-1",
      conversationId: "conv-1",
      visualClips: [{ assetId: "asset-1", kind: "video" }],
      audioClips: [],
      subtitlePolicy: "sidecar",
    };
    const parsed = normalizeMediaCompositionPlan(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.visualClips[0].assetId).toBe("asset-1");
  });

  it("fails to normalize an invalid plan missing required fields", () => {
    const raw = {
      visualClips: [],
    };
    const parsed = normalizeMediaCompositionPlan(raw);
    expect(parsed).toBeNull();
  });

  it("validates constraints around empty requests", () => {
    const plan = createPlan({
      visualClips: [],
      audioClips: [],
    });
    expect(validatePlanConstraints(plan)).toBe("Plan must contain at least one visual or audio clip.");
  });

  it("validates constraints preventing audio-only burns", () => {
    const plan = createPlan({
      visualClips: [],
      audioClips: [{ assetId: "audio-1", kind: "audio" }],
      subtitlePolicy: "burned",
    });
    expect(validatePlanConstraints(plan)).toBe("Cannot burn subtitles into audio-only output.");
  });
});

describe("media-execution-router", () => {
  const basePlan = createPlan();

  it("routes to deferred_server when WASM is totally unavailable", () => {
    const route = selectExecutionRoute({
      plan: basePlan,
      resolvedVisualAssets: [createAsset({ durationSeconds: 10 })],
      resolvedAudioAssets: [createAsset({ id: "asset-a1", kind: "audio", source: "generated", mimeType: "audio/mpeg", durationSeconds: 10 })],
      browserWasmAvailable: false,
    });
    expect(route).toBe("deferred_server");
  });

  it("routes to browser_wasm for simple, within-limit assets", () => {
    const route = selectExecutionRoute({
      plan: basePlan,
      resolvedVisualAssets: [createAsset({ durationSeconds: 10 })],
      resolvedAudioAssets: [createAsset({ id: "asset-a1", kind: "audio", source: "generated", mimeType: "audio/mpeg", durationSeconds: 10 })],
      browserWasmAvailable: true,
    });
    expect(route).toBe("browser_wasm");
  });

  it("routes fast still image narration to deferred_server if duration exceeds 3 minutes", () => {
    const route = selectExecutionRoute({
      plan: basePlan,
      resolvedVisualAssets: [createAsset({ durationSeconds: 190 })],
      resolvedAudioAssets: [createAsset({ id: "asset-a1", kind: "audio", source: "generated", mimeType: "audio/mpeg", durationSeconds: 190 })],
      browserWasmAvailable: true,
    });
    expect(route).toBe("deferred_server");
  });

  it("routes small multi_video_standard plans to browser_wasm when the browser is available", () => {
    const heavyPlan = createPlan({
      visualClips: [
        { assetId: "asset-1", kind: "video" },
        { assetId: "asset-2", kind: "video" },
      ],
      audioClips: [],
      profile: "multi_video_standard",
    });
    const route = selectExecutionRoute({
      plan: heavyPlan,
      resolvedVisualAssets: [
        createAsset({ id: "asset-1", kind: "video", mimeType: "video/mp4", durationSeconds: 1 }),
        createAsset({ id: "asset-2", kind: "video", mimeType: "video/mp4", durationSeconds: 1 }),
      ],
      resolvedAudioAssets: [],
      browserWasmAvailable: true,
    });
    expect(route).toBe("browser_wasm");
  });

  it("routes oversized multi_video_standard plans to deferred_server", () => {
    const heavyPlan = createPlan({
      visualClips: [
        { assetId: "asset-1", kind: "video" },
        { assetId: "asset-2", kind: "video" },
        { assetId: "asset-3", kind: "video" },
        { assetId: "asset-4", kind: "video" },
      ],
      audioClips: [],
      profile: "multi_video_standard",
    });
    const route = selectExecutionRoute({
      plan: heavyPlan,
      resolvedVisualAssets: [
        createAsset({ id: "asset-1", kind: "video", mimeType: "video/mp4", durationSeconds: 1 }),
        createAsset({ id: "asset-2", kind: "video", mimeType: "video/mp4", durationSeconds: 1 }),
        createAsset({ id: "asset-3", kind: "video", mimeType: "video/mp4", durationSeconds: 1 }),
        createAsset({ id: "asset-4", kind: "video", mimeType: "video/mp4", durationSeconds: 1 }),
      ],
      resolvedAudioAssets: [],
      browserWasmAvailable: true,
    });
    expect(route).toBe("deferred_server");
  });
});
