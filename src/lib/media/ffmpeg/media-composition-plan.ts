import { z } from "zod";
import type { MediaCompositionPlan, MediaCompositionClip } from "@/core/entities/media-composition";

export const MediaCompositionClipSchema = z.object({
  assetId: z.string().min(1),
  kind: z.enum(["image", "video", "audio", "chart", "graph"]),
  startTime: z.number().nonnegative().optional(),
  duration: z.number().positive().optional(),
});

export const MediaCompositionPlanSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  visualClips: z.array(MediaCompositionClipSchema).max(5),
  audioClips: z.array(MediaCompositionClipSchema).max(5),
  subtitlePolicy: z.enum(["none", "burned", "sidecar", "both"]).default("none"),
  waveformPolicy: z.enum(["none", "generate"]).default("none"),
  outputFormat: z.enum(["mp4", "webm"]).default("mp4"),
  resolution: z
    .object({
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
});

export function normalizeMediaCompositionPlan(raw: unknown): MediaCompositionPlan | null {
  const result = MediaCompositionPlanSchema.safeParse(raw);
  if (!result.success) return null;
  return result.data as MediaCompositionPlan;
}

export function validatePlanConstraints(plan: MediaCompositionPlan): string | null {
  if (plan.visualClips.length === 0 && plan.audioClips.length === 0) {
    return "Plan must contain at least one visual or audio clip.";
  }

  // Prevent impossible states
  if (plan.visualClips.length === 0 && plan.subtitlePolicy === "burned") {
    return "Cannot burn subtitles into audio-only output.";
  }

  return null;
}
