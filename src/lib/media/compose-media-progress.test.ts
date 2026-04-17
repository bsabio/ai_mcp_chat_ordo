import { describe, expect, it } from "vitest";
import { getComposeMediaProgressLabel } from "./compose-media-progress";

describe("compose-media-progress", () => {
  it("returns profile-aware fast narration labels with ETA", () => {
    expect(getComposeMediaProgressLabel("rendering_media", {
      plan: {
        profile: "still_image_narration_fast",
        visualClips: [{ assetId: "img-1", kind: "image", duration: 90 }],
        audioClips: [{ assetId: "aud-1", kind: "audio", duration: 90 }],
      },
      progressPercent: 40,
    })).toContain("Encoding narration video");
  });

  it("returns profile-aware multi-video labels", () => {
    expect(getComposeMediaProgressLabel("staging_assets", {
      plan: {
        profile: "multi_video_standard",
        visualClips: [
          { assetId: "vid-1", kind: "video", duration: 8 },
          { assetId: "vid-2", kind: "video", duration: 12 },
        ],
        audioClips: [],
      },
      progressPercent: 5,
    })).toContain("Preparing source videos");
  });

  it("keeps verifying playback concise without ETA", () => {
    expect(getComposeMediaProgressLabel("verifying_playback", {
      plan: {
        profile: "still_image_narration_fast",
        visualClips: [{ assetId: "img-1", kind: "image", duration: 60 }],
        audioClips: [{ assetId: "aud-1", kind: "audio", duration: 60 }],
      },
      progressPercent: 98,
    })).toBe("Checking playback");
  });
});