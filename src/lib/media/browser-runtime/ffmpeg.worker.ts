/// <reference lib="webworker" />

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { fetchFile } from "@ffmpeg/util";
import type { MediaCompositionPlan } from "@/core/entities/media-composition";
import { getComposeMediaProgressLabel } from "@/lib/media/compose-media-progress";

export interface FfmpegWorkerMessage {
  type: "START_COMPOSITION";
  plan: MediaCompositionPlan;
  visualAssetUrls: Record<string, string>;
  audioAssetUrls: Record<string, string>;
}

export interface FfmpegWorkerResponse {
  type: "PROGRESS" | "SUCCESS" | "ERROR";
  progress?: number;
  label?: string;
  blob?: Blob;
  error?: string;
}

let ffmpeg: FFmpeg | null = null;

async function getFfmpeg(): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;
  ffmpeg = new FFmpeg();

  ffmpeg.on("progress", ({ progress }) => {
    postMessage({
      type: "PROGRESS",
      progress: Math.min(progress * 100, 99),
      label: getComposeMediaProgressLabel("rendering_media"),
    } as FfmpegWorkerResponse);
  });

  // Load core from self-hosted public dir (COEP-safe: same-origin, no CDN)
  const baseURL = self.location.origin;
  const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core/ffmpeg-core.js`, "text/javascript");
  const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core/ffmpeg-core.wasm`, "application/wasm");

  await ffmpeg.load({ coreURL, wasmURL });

  return ffmpeg;
}

self.onmessage = async (event: MessageEvent<FfmpegWorkerMessage>) => {
  const { type, plan, visualAssetUrls, audioAssetUrls } = event.data;
  
  if (type !== "START_COMPOSITION") return;

  try {
    postMessage({
      type: "PROGRESS",
      progress: 0,
      label: getComposeMediaProgressLabel("staging_assets"),
    } as FfmpegWorkerResponse);
    const ff = await getFfmpeg();

    postMessage({
      type: "PROGRESS",
      progress: 10,
      label: getComposeMediaProgressLabel("staging_assets"),
    } as FfmpegWorkerResponse);

    // Write visual layers
    for (let i = 0; i < plan.visualClips.length; i++) {
      const clip = plan.visualClips[i];
      const data = await fetchFile(visualAssetUrls[clip.assetId]);
      await ff.writeFile(`in_v_${i}.mp4`, data);
    }

    // Write audio layers
    for (let i = 0; i < plan.audioClips.length; i++) {
      const clip = plan.audioClips[i];
      const data = await fetchFile(audioAssetUrls[clip.assetId]);
      await ff.writeFile(`in_a_${i}.mp3`, data);
    }

    postMessage({
      type: "PROGRESS",
      progress: 30,
      label: getComposeMediaProgressLabel("staging_assets"),
    } as FfmpegWorkerResponse);

    // Simplified fallback execution args: just copy the first visual layer if it exists
    // In a full implementation, you'd construct complex filter_complex graphs here
    const args: string[] = [];
    if (plan.visualClips.length > 0) {
      args.push("-i", "in_v_0.mp4");
      if (plan.audioClips.length > 0) {
        args.push("-i", "in_a_0.mp3");
        args.push("-c:v", "copy", "-c:a", "aac", "-shortest");
      } else {
        args.push("-c", "copy");
      }
    } else if (plan.audioClips.length > 0) {
      args.push("-i", "in_a_0.mp3", "-c:a", "libmp3lame");
    }

    const outputName = plan.outputFormat === "mp4" ? "output.mp4" : "output.webm";
    args.push(outputName);

    postMessage({
      type: "PROGRESS",
      progress: 40,
      label: getComposeMediaProgressLabel("rendering_media"),
    } as FfmpegWorkerResponse);

    await ff.exec(args);

    postMessage({
      type: "PROGRESS",
      progress: 99,
      label: getComposeMediaProgressLabel("packaging_artifacts"),
    } as FfmpegWorkerResponse);
    
    const fileData = await ff.readFile(outputName);
    const blob = new Blob([fileData as BlobPart], { type: plan.outputFormat === "mp4" ? "video/mp4" : "video/webm" });

    // Cleanup memory
    for (let i = 0; i < plan.visualClips.length; i++) await ff.deleteFile(`in_v_${i}.mp4`);
    for (let i = 0; i < plan.audioClips.length; i++) await ff.deleteFile(`in_a_${i}.mp3`);
    await ff.deleteFile(outputName);

    postMessage({ type: "SUCCESS", blob } as FfmpegWorkerResponse);
  } catch (error) {
    postMessage({ type: "ERROR", error: error instanceof Error ? error.message : "Unknown FFmpeg worker error" } as FfmpegWorkerResponse);
  }
};
