export type SubtitlePolicy = "none" | "burned" | "sidecar" | "both";
export type WaveformPolicy = "none" | "generate";

export interface MediaCompositionClip {
  assetId: string;
  kind: "image" | "video" | "audio" | "chart" | "graph";
  startTime?: number; // Offset within the clip if it's AV
  duration?: number;
}

export interface MediaCompositionPlan {
  id: string; // Plan identity
  conversationId: string;
  visualClips: MediaCompositionClip[]; // Layer 0
  audioClips: MediaCompositionClip[]; // Layer 1 (Audio track)
  subtitlePolicy: SubtitlePolicy;
  waveformPolicy: WaveformPolicy;
  outputFormat: "mp4" | "webm";
  resolution?: { width: number; height: number };
}

export type MediaExecutionRoute = "browser_wasm" | "deferred_server";
