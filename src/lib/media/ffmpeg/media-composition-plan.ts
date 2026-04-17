import { z } from "zod";
import type { MediaCompositionPlan, MediaCompositionClip } from "@/core/entities/media-composition";
import {
  DEFAULT_MEDIA_COMPOSITION_PROFILE,
  MEDIA_COMPOSITION_PROFILE_IDS,
  STANDARD_MEDIA_COMPOSITION_RESOLUTION,
  getDefaultResolutionForPlan,
  resolveMediaCompositionProfile,
} from "./media-composition-profile";

export const DEFAULT_MEDIA_COMPOSITION_RESOLUTION = {
  ...STANDARD_MEDIA_COMPOSITION_RESOLUTION,
} as const;

export const MediaCompositionClipSchema = z.object({
  assetId: z.string().min(1),
  kind: z.enum(["image", "video", "audio", "chart", "graph"]),
  sourceAssetId: z.string().min(1).optional(),
  startTime: z.number().nonnegative().optional(),
  duration: z.number().positive().optional(),
});

export const MediaCompositionPlanSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  visualClips: z.array(MediaCompositionClipSchema).max(5),
  audioClips: z.array(MediaCompositionClipSchema).max(5),
  profile: z.enum(MEDIA_COMPOSITION_PROFILE_IDS).default(DEFAULT_MEDIA_COMPOSITION_PROFILE),
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
  const plan = result.data as MediaCompositionPlan;

  return {
    ...plan,
    resolution: plan.resolution ?? getDefaultResolutionForPlan(plan),
  };
}

export function validatePlanConstraints(plan: MediaCompositionPlan): string | null {
  if (plan.visualClips.length === 0 && plan.audioClips.length === 0) {
    return "Plan must contain at least one visual or audio clip.";
  }

  if (plan.visualClips.some((clip) => clip.kind !== "image" && clip.kind !== "video")) {
    return "Visual clips must be image or video assets. Charts and graphs must be rendered to an image before video composition.";
  }

  if (plan.audioClips.some((clip) => clip.kind !== "audio")) {
    return "Audio clips must be audio assets.";
  }

  const resolvedProfile = resolveMediaCompositionProfile(plan);

  if (resolvedProfile === "still_image_narration_fast") {
    if (plan.visualClips.length !== 1 || plan.visualClips.some((clip) => clip.kind !== "image")) {
      return "The still_image_narration_fast profile requires exactly one image visual clip.";
    }

    if (plan.audioClips.length > 1) {
      return "The still_image_narration_fast profile supports at most one narration audio clip.";
    }
  }

  // Prevent impossible states
  if (plan.visualClips.length === 0 && plan.subtitlePolicy === "burned") {
    return "Cannot burn subtitles into audio-only output.";
  }

  if (plan.resolution && (plan.resolution.width % 2 !== 0 || plan.resolution.height % 2 !== 0)) {
    return "Resolution width and height must be even numbers.";
  }

  return null;
}
