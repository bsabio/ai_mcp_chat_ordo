import { describe, expect, it } from "vitest";
import { normalizeMediaCompositionPlan, validatePlanConstraints } from "./media-composition-plan";

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
      visualClips: [],
      audioClips: [{ assetId: "audio-1", kind: "audio" }],
    };
    const parsed = normalizeMediaCompositionPlan(raw);
    expect(parsed?.subtitlePolicy).toBe("none");
    expect(parsed?.waveformPolicy).toBe("none");
    expect(parsed?.outputFormat).toBe("mp4");
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

  it("passes a sidecar subtitle plan with visual content", () => {
    const plan = {
      id: "p4", conversationId: "c1",
      visualClips: [{ assetId: "v1", kind: "video" }],
      audioClips: [],
      subtitlePolicy: "sidecar", waveformPolicy: "none", outputFormat: "mp4",
    } as any;
    expect(validatePlanConstraints(plan)).toBeNull();
  });
});
