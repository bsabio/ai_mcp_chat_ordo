import type { MediaCompositionPlan, MediaExecutionRoute } from "@/core/entities/media-composition";
import type { MediaAssetDescriptor } from "@/core/entities/media-asset";

export interface MediaRouterContext {
  plan: MediaCompositionPlan;
  resolvedVisualAssets: MediaAssetDescriptor[];
  resolvedAudioAssets: MediaAssetDescriptor[];
  browserWasmAvailable: boolean; // Pre-checked by the client via SharedArrayBuffer probe
}

export interface MediaRouterLimits {
  maxVisualClipsForBrowser: number;
  maxAudioClipsForBrowser: number;
  maxTotalDurationSecondsForBrowser: number;
}

const DEFAULT_BROWSER_LIMITS: MediaRouterLimits = {
  maxVisualClipsForBrowser: 2,
  maxAudioClipsForBrowser: 2,
  maxTotalDurationSecondsForBrowser: 60,
};

export function selectExecutionRoute(
  context: MediaRouterContext,
  limits: MediaRouterLimits = DEFAULT_BROWSER_LIMITS,
): MediaExecutionRoute {
  if (!context.browserWasmAvailable) {
    return "deferred_server";
  }

  if (context.plan.visualClips.length > limits.maxVisualClipsForBrowser) {
    return "deferred_server";
  }

  if (context.plan.audioClips.length > limits.maxAudioClipsForBrowser) {
    return "deferred_server";
  }

  const totalVisualDuration = context.resolvedVisualAssets.reduce((acc, current) => acc + (current.durationSeconds ?? 0), 0);
  const totalAudioDuration = context.resolvedAudioAssets.reduce((acc, current) => acc + (current.durationSeconds ?? 0), 0);
  const maxDuration = Math.max(totalVisualDuration, totalAudioDuration);

  if (maxDuration > limits.maxTotalDurationSecondsForBrowser) {
    return "deferred_server";
  }

  return "browser_wasm";
}
