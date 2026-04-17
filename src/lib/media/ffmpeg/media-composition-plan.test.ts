import { describe, expect, it } from "vitest";
import {
  DEFAULT_MEDIA_COMPOSITION_RESOLUTION,
  normalizeMediaCompositionPlan,
  validatePlanConstraints,
} from "./media-composition-plan";
import { FAST_STILL_IMAGE_NARRATION_RESOLUTION } from "./media-composition-profile";

describe("media-composition-plan — normalization", () => {
  it("normalizes a valid plan with a sidecar subtitle policy", () => {
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
    expect(parsed?.subtitlePolicy).toBe("sidecar");
    expect(parsed?.outputFormat).toBe("mp4"); // default
  });

  it("applies defaults for optional fields", () => {
    const raw = {
      id: "plan-defaults",
      conversationId: "conv-defaults",
      visualClips: [{ assetId: "image-1", kind: "image" }],
      audioClips: [{ assetId: "audio-1", kind: "audio" }],
    };
    const parsed = normalizeMediaCompositionPlan(raw);
    expect(parsed?.profile).toBe("auto");
    expect(parsed?.subtitlePolicy).toBe("none");
    expect(parsed?.waveformPolicy).toBe("none");
    expect(parsed?.outputFormat).toBe("mp4");
    expect(parsed?.resolution).toEqual(FAST_STILL_IMAGE_NARRATION_RESOLUTION);
  });

  it("uses the standard default resolution for non-narration plans", () => {
    const raw = {
      id: "plan-video-defaults",
      conversationId: "conv-video-defaults",
      visualClips: [{ assetId: "video-1", kind: "video" }],
      audioClips: [],
    };
    const parsed = normalizeMediaCompositionPlan(raw);
    expect(parsed?.resolution).toEqual(DEFAULT_MEDIA_COMPOSITION_RESOLUTION);
  });

  it("preserves an explicit resolution override", () => {
    const raw = {
      id: "plan-resolution",
      conversationId: "conv-resolution",
      visualClips: [{ assetId: "image-1", kind: "image" }],
      audioClips: [],
      resolution: { width: 1920, height: 1080 },
    };
    const parsed = normalizeMediaCompositionPlan(raw);
    expect(parsed?.resolution).toEqual({ width: 1920, height: 1080 });
  });

  it("fails to normalize a plan missing required fields", () => {
    const raw = { visualClips: [] };
    expect(normalizeMediaCompositionPlan(raw)).toBeNull();
  });

  it("fails to normalize a plan with an invalid subtitle policy", () => {
    const raw = {
      id: "plan-bad",
      conversationId: "conv-bad",
      visualClips: [{ assetId: "a1", kind: "video" }],
      audioClips: [],
      subtitlePolicy: "invalid_policy",
    };
    expect(normalizeMediaCompositionPlan(raw)).toBeNull();
  });

  it("caps visual clips at the schema maximum (5)", () => {
    const raw = {
      id: "plan-oversize",
      conversationId: "conv-1",
      visualClips: Array.from({ length: 6 }, (_, i) => ({ assetId: `a${i}`, kind: "video" })),
      audioClips: [],
    };
    expect(normalizeMediaCompositionPlan(raw)).toBeNull();
  });
});

describe("media-composition-plan — constraint validation", () => {
  it("rejects empty plans (no clips at all)", () => {
    const plan = {
      id: "p1", conversationId: "c1",
      visualClips: [], audioClips: [],
      subtitlePolicy: "none", waveformPolicy: "none", outputFormat: "mp4",
    } as any;
    expect(validatePlanConstraints(plan)).toBe("Plan must contain at least one visual or audio clip.");
  });

  it("rejects burning subtitles into audio-only output", () => {
    const plan = {
      id: "p2", conversationId: "c1",
      visualClips: [],
      audioClips: [{ assetId: "a1", kind: "audio" }],
      subtitlePolicy: "burned", waveformPolicy: "none", outputFormat: "mp4",
    } as any;
    expect(validatePlanConstraints(plan)).toBe("Cannot burn subtitles into audio-only output.");
  });

  it("passes a valid plan with one visual clip", () => {
    const plan = {
      id: "p3", conversationId: "c1",
      visualClips: [{ assetId: "v1", kind: "video" }],
      audioClips: [],
      subtitlePolicy: "none", waveformPolicy: "none", outputFormat: "mp4",
    } as any;
    expect(validatePlanConstraints(plan)).toBeNull();
  });

  it("rejects explicit still image narration profiles with non-image visuals", () => {
    const plan = {
      id: "p3b", conversationId: "c1",
      profile: "still_image_narration_fast",
      visualClips: [{ assetId: "v1", kind: "video" }],
      audioClips: [{ assetId: "a1", kind: "audio" }],
      subtitlePolicy: "none", waveformPolicy: "none", outputFormat: "mp4",
      resolution: { width: 720, height: 1280 },
    } as any;
    expect(validatePlanConstraints(plan)).toBe("The still_image_narration_fast profile requires exactly one image visual clip.");
  });

  it("passes a sidecar subtitle plan with visual content", () => {
    const plan = {
      id: "p4", conversationId: "c1",
      visualClips: [{ assetId: "v1", kind: "video" }],
      audioClips: [],
      subtitlePolicy: "sidecar", waveformPolicy: "none", outputFormat: "mp4",
    } as any;
    expect(validatePlanConstraints(plan)).toBeNull();
  });

  it("rejects odd-numbered output dimensions that break h264 compatibility", () => {
    const plan = {
      id: "p5", conversationId: "c1",
      visualClips: [{ assetId: "v1", kind: "video" }],
      audioClips: [],
      subtitlePolicy: "none", waveformPolicy: "none", outputFormat: "mp4",
      resolution: { width: 1079, height: 1921 },
    } as any;
    expect(validatePlanConstraints(plan)).toBe("Resolution width and height must be even numbers.");
  });

  it("rejects chart and graph source assets as visual clips for composition", () => {
    const plan = {
      id: "p6", conversationId: "c1",
      visualClips: [{ assetId: "chart_1", kind: "chart" }],
      audioClips: [{ assetId: "audio_1", kind: "audio" }],
      subtitlePolicy: "none", waveformPolicy: "none", outputFormat: "mp4",
      resolution: { width: 1080, height: 1920 },
    } as any;
    expect(validatePlanConstraints(plan)).toBe("Visual clips must be image or video assets. Charts and graphs must be rendered to an image before video composition.");
  });

  it("rejects non-audio assets in the audio track list", () => {
    const plan = {
      id: "p7", conversationId: "c1",
      visualClips: [{ assetId: "image_1", kind: "image" }],
      audioClips: [{ assetId: "video_1", kind: "video" }],
      subtitlePolicy: "none", waveformPolicy: "none", outputFormat: "mp4",
      resolution: { width: 1080, height: 1920 },
    } as any;
    expect(validatePlanConstraints(plan)).toBe("Audio clips must be audio assets.");
  });
});
