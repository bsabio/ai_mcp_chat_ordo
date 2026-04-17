export type SubtitlePolicy = "none" | "burned" | "sidecar" | "both";
export type WaveformPolicy = "none" | "generate";
export type MediaCompositionProfile = "auto" | "still_image_narration_fast" | "multi_video_standard";

export interface MediaCompositionClip {
  assetId: string;
  kind: "image" | "video" | "audio" | "chart" | "graph";
  sourceAssetId?: string;
  startTime?: number; // Offset within the clip if it's AV
  duration?: number;
}

export interface MediaCompositionPlan {
  id: string; // Plan identity
  conversationId: string;
  visualClips: MediaCompositionClip[]; // Layer 0
  audioClips: MediaCompositionClip[]; // Layer 1 (Audio track)
  profile?: MediaCompositionProfile;
  subtitlePolicy: SubtitlePolicy;
  waveformPolicy: WaveformPolicy;
  outputFormat: "mp4" | "webm";
  resolution?: { width: number; height: number };
}

export type MediaExecutionRoute = "browser_wasm" | "deferred_server";
