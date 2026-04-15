import type { UserFileMetadata } from "@/core/entities/user-file";

export interface SubtitleCueInput {
  id?: string;
  startMs?: number;
  endMs?: number;
  startSeconds?: number;
  endSeconds?: number;
  text: string;
}

export interface SubtitleCue {
  id: string;
  order: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  text: string;
}

export interface SubtitleTimingTrack {
  cues: SubtitleCue[];
  cueCount: number;
  totalDurationMs: number;
  totalDurationSeconds: number;
}

function toMilliseconds(
  milliseconds: number | undefined,
  seconds: number | undefined,
): number {
  if (typeof milliseconds === "number" && Number.isFinite(milliseconds)) {
    return Math.max(0, Math.round(milliseconds));
  }

  if (typeof seconds === "number" && Number.isFinite(seconds)) {
    return Math.max(0, Math.round(seconds * 1000));
  }

  return 0;
}

function normalizeCueText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function normalizeSubtitleTiming(
  cues: readonly SubtitleCueInput[],
): SubtitleTimingTrack {
  const normalized = cues
    .map((cue, index) => {
      const text = normalizeCueText(cue.text);
      if (!text) {
        return null;
      }

      const startMs = toMilliseconds(cue.startMs, cue.startSeconds);
      const requestedEndMs = toMilliseconds(cue.endMs, cue.endSeconds);
      const endMs = Math.max(startMs + 1, requestedEndMs || startMs + 1);

      return {
        id: cue.id?.trim() || `cue_${index + 1}`,
        sourceIndex: index,
        startMs,
        endMs,
        text,
      };
    })
    .filter((cue): cue is NonNullable<typeof cue> => Boolean(cue))
    .sort((left, right) => {
      if (left.startMs !== right.startMs) {
        return left.startMs - right.startMs;
      }

      if (left.endMs !== right.endMs) {
        return left.endMs - right.endMs;
      }

      return left.sourceIndex - right.sourceIndex;
    })
    .map<SubtitleCue>((cue, order) => ({
      id: cue.id,
      order,
      startMs: cue.startMs,
      endMs: cue.endMs,
      durationMs: cue.endMs - cue.startMs,
      text: cue.text,
    }));

  const totalDurationMs = normalized.reduce(
    (max, cue) => Math.max(max, cue.endMs),
    0,
  );

  return {
    cues: normalized,
    cueCount: normalized.length,
    totalDurationMs,
    totalDurationSeconds: totalDurationMs / 1000,
  };
}

export function buildSubtitleTimingMetadata(
  track: SubtitleTimingTrack,
): Pick<UserFileMetadata, "durationSeconds" | "subtitleCueCount"> {
  return {
    durationSeconds: track.totalDurationSeconds,
    subtitleCueCount: track.cueCount,
  };
}
