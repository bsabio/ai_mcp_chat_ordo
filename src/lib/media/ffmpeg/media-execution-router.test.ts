import { describe, it, expect } from "vitest";
import { normalizeMediaCompositionPlan, validatePlanConstraints } from "./media-composition-plan";
import { selectExecutionRoute } from "./media-execution-router";

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
    const plan = {
      id: "plan-1",
      conversationId: "conv-1",
      visualClips: [],
      audioClips: [],
      subtitlePolicy: "none",
      waveformPolicy: "none",
      outputFormat: "mp4",
    } as any;
    expect(validatePlanConstraints(plan)).toBe("Plan must contain at least one visual or audio clip.");
  });

  it("validates constraints preventing audio-only burns", () => {
    const plan = {
      id: "plan-1",
      conversationId: "conv-1",
      visualClips: [],
      audioClips: [{ assetId: "audio-1", kind: "audio" }],
      subtitlePolicy: "burned",
      waveformPolicy: "none",
      outputFormat: "mp4",
    } as any;
    expect(validatePlanConstraints(plan)).toBe("Cannot burn subtitles into audio-only output.");
  });
});

describe("media-execution-router", () => {
  const basePlan = {
    id: "plan-1",
    conversationId: "conv-1",
    visualClips: [{ assetId: "asset-1", kind: "video" }],
    audioClips: [],
    subtitlePolicy: "none",
    waveformPolicy: "none",
    outputFormat: "mp4",
  } as any;

  it("routes to deferred_server when WASM is totally unavailable", () => {
    const route = selectExecutionRoute({
      plan: basePlan,
      resolvedVisualAssets: [{ id: "asset-1", kind: "video", source: "uploaded", mimeType: "video/mp4", durationSeconds: 10 }],
      resolvedAudioAssets: [],
      browserWasmAvailable: false,
    });
    expect(route).toBe("deferred_server");
  });

  it("routes to browser_wasm for simple, within-limit assets", () => {
    const route = selectExecutionRoute({
      plan: basePlan,
      resolvedVisualAssets: [{ id: "asset-1", kind: "video", source: "uploaded", mimeType: "video/mp4", durationSeconds: 10 }],
      resolvedAudioAssets: [],
      browserWasmAvailable: true,
    });
    expect(route).toBe("browser_wasm");
  });

  it("routes to deferred_server if duration exceeds limits", () => {
    const route = selectExecutionRoute({
      plan: basePlan,
      resolvedVisualAssets: [{ id: "asset-1", kind: "video", source: "uploaded", mimeType: "video/mp4", durationSeconds: 100 }],
      resolvedAudioAssets: [],
      browserWasmAvailable: true,
    });
    expect(route).toBe("deferred_server");
  });

  it("routes to deferred_server if clip count is too high", () => {
    const heavyPlan = { ...basePlan, visualClips: [
      { assetId: "asset-1", kind: "video" },
      { assetId: "asset-2", kind: "video" },
      { assetId: "asset-3", kind: "video" },
    ]};
    const route = selectExecutionRoute({
      plan: heavyPlan,
      resolvedVisualAssets: [
        { id: "asset-1", kind: "video", source: "uploaded", mimeType: "video/mp4", durationSeconds: 1 },
        { id: "asset-2", kind: "video", source: "uploaded", mimeType: "video/mp4", durationSeconds: 1 },
        { id: "asset-3", kind: "video", source: "uploaded", mimeType: "video/mp4", durationSeconds: 1 }
      ],
      resolvedAudioAssets: [],
      browserWasmAvailable: true,
    });
    expect(route).toBe("deferred_server");
  });
});
