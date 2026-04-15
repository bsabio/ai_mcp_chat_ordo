import { describe, expect, it } from "vitest";

import {
  buildSubtitleTimingMetadata,
  normalizeSubtitleTiming,
} from "./subtitle-timing";

describe("subtitle-timing", () => {
  it("sorts cues deterministically and normalizes cue text", () => {
    const track = normalizeSubtitleTiming([
      { startSeconds: 4, endSeconds: 5.4, text: "  second   line  " },
      { startMs: 0, endMs: 1200, text: "first line" },
    ]);

    expect(track.cues).toEqual([
      {
        id: "cue_2",
        order: 0,
        startMs: 0,
        endMs: 1200,
        durationMs: 1200,
        text: "first line",
      },
      {
        id: "cue_1",
        order: 1,
        startMs: 4000,
        endMs: 5400,
        durationMs: 1400,
        text: "second line",
      },
    ]);
  });

  it("drops blank cues and enforces a minimum positive duration", () => {
    const track = normalizeSubtitleTiming([
      { startMs: 1000, endMs: 1000, text: "A" },
      { startMs: 1500, endMs: 2200, text: "   " },
    ]);

    expect(track.cues).toEqual([
      {
        id: "cue_1",
        order: 0,
        startMs: 1000,
        endMs: 1001,
        durationMs: 1,
        text: "A",
      },
    ]);
    expect(track.cueCount).toBe(1);
  });

  it("computes compact metadata for persisted subtitle assets", () => {
    const track = normalizeSubtitleTiming([
      { id: "intro", startMs: 0, endMs: 800, text: "Intro" },
      { id: "body", startMs: 900, endMs: 3100, text: "Body" },
    ]);

    expect(buildSubtitleTimingMetadata(track)).toEqual({
      durationSeconds: 3.1,
      subtitleCueCount: 2,
    });
  });
});