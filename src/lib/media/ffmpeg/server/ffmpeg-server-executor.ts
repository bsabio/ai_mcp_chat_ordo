import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { MediaCompositionPlan } from "@/core/entities/media-composition";
import type { CapabilityResultEnvelope } from "@/core/entities/capability-result";
import {
  COMPOSE_MEDIA_COMPLETE_LABEL,
  type ComposeMediaProgressPhaseKey,
} from "@/lib/media/compose-media-progress";
import { getMediaCompositionProfileSettings, resolveMediaCompositionProfile } from "../media-composition-profile";

/** Path to the system FFmpeg binary on this machine or container. */
const FFMPEG_BIN = process.env["FFMPEG_BIN"]
  ?? (fs.existsSync("/opt/homebrew/bin/ffmpeg") ? "/opt/homebrew/bin/ffmpeg" : "ffmpeg");

export interface ServerMediaExecutorContext {
  /** Absolute path to fetch input assets from — must be the disk path for each user-file assetId. */
  resolveAssetPath: (assetId: string) => string | null;
  /** Where to write the composed output. Caller is responsible for cleanup if upstream fails. */
  outputDir?: string;
}

export interface ServerMediaExecutorResult {
  outputPath: string;
  mimeType: string;
  durationSeconds?: number;
}

function buildConcatManifest(paths: string[]): string {
  return paths
    .map((inputPath) => `file '${inputPath.replace(/'/g, String.raw`'\\''`)}'`)
    .join("\n");
}

/**
 * Runs a real FFmpeg command on the server using the system binary.
 *
 * The executor:
 * 1. Resolves input asset disk paths from the plan's clip assetIds
 * 2. Builds deterministic FFmpeg args (no raw CLI strings from the model)
 * 3. Spawns `ffmpeg` as a child process and streams stderr for progress
 * 4. Returns the path to the composed output file
 *
 * Error handling: process exit code ≠ 0 or a spawn error both throw.
 * Callers (deferred job handlers) must handle cleanup of outputDir.
 */
export class FfmpegServerExecutor {
  async executeDeferredPlan(
    plan: MediaCompositionPlan,
    onProgress: (progress: number, phase: ComposeMediaProgressPhaseKey) => void,
    context?: ServerMediaExecutorContext,
  ): Promise<CapabilityResultEnvelope> {
    onProgress(5, "staging_assets");

    // Write to a temp dir unless caller provides one
    const workDir = context?.outputDir ?? fs.mkdtempSync(path.join(os.tmpdir(), "ordo-ffmpeg-"));
    const outputFilename = `output-${plan.id}.${plan.outputFormat}`;
    const outputPath = path.join(workDir, outputFilename);

    try {
      // Build input args from plan
      const args = buildFfmpegArgs(plan, workDir, context);
      const resolvedProfile = resolveMediaCompositionProfile(plan);
      const profileSettings = getMediaCompositionProfileSettings(resolvedProfile);

      onProgress(20, "rendering_media");

      await runFfmpeg(args, outputPath, (progressPercent) => {
        // Map 0–100 ffmpeg progress to the 20–80 render band
        const mapped = 20 + Math.round(progressPercent * 0.6);
        onProgress(mapped, "rendering_media");
      });

      onProgress(85, "packaging_artifacts");

      const stat = fs.statSync(outputPath);
      const mimeType = plan.outputFormat === "mp4" ? "video/mp4" : "video/webm";

      onProgress(100, "persisting");

      const envelope: CapabilityResultEnvelope = {
        schemaVersion: 1,
        toolName: "compose_media",
        family: "artifact",
        cardKind: "artifact_viewer",
        executionMode: "hybrid",
        inputSnapshot: {
          planId: plan.id,
          visualClips: plan.visualClips.length,
          audioClips: plan.audioClips.length,
          profile: resolvedProfile,
          subtitlePolicy: plan.subtitlePolicy,
          outputFormat: plan.outputFormat,
          resolution: plan.resolution ?? null,
        },
        summary: {
          title: "Media Composition",
          subtitle: `${plan.outputFormat.toUpperCase()} · Server · ${profileSettings.label} · ${plan.resolution?.width ?? 0}x${plan.resolution?.height ?? 0} · ${formatBytes(stat.size)}`,
          statusLine: "succeeded",
        },
        replaySnapshot: {
          route: "deferred_server",
          planId: plan.id,
          profile: resolvedProfile,
          outputFormat: plan.outputFormat,
          outputBytes: stat.size,
          resolution: plan.resolution ?? null,
        },
        progress: { percent: 100, label: COMPOSE_MEDIA_COMPLETE_LABEL },
        artifacts: [], // populated by the job handler after persisting to user_files
        payload: {
          route: "deferred_server",
          planId: plan.id,
          profile: resolvedProfile,
          outputPath,      // handler consumes this to persist to user_files
          outputFormat: plan.outputFormat,
          outputBytes: stat.size,
          mimeType,
          resolution: plan.resolution ?? null,
        },
      };

      return envelope;
    } catch (err) {
      throw new Error(
        `FFmpeg server execution failed for plan ${plan.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build deterministic FFmpeg args from the structured plan — no raw model strings. */
function buildFfmpegArgs(
  plan: MediaCompositionPlan,
  workDir: string,
  context?: ServerMediaExecutorContext,
): string[] {
  const args: string[] = ["-y"]; // overwrite without prompt
  const resolvedProfile = resolveMediaCompositionProfile(plan);
  const profileSettings = getMediaCompositionProfileSettings(resolvedProfile);

  // Add visual inputs
  const visualInputs = plan.visualClips
    .map((clip) => {
      const diskPath = context?.resolveAssetPath(clip.assetId);
      return diskPath ?? null;
    })
    .filter((p): p is string => p !== null);

  const audioInputs = plan.audioClips
    .map((clip) => {
      const diskPath = context?.resolveAssetPath(clip.assetId);
      return diskPath ?? null;
    })
    .filter((p): p is string => p !== null);

  for (const p of visualInputs) args.push("-i", p);
  for (const p of audioInputs) args.push("-i", p);

  const hasVisual = visualInputs.length > 0;
  const hasAudio = audioInputs.length > 0;

  if (!hasVisual && !hasAudio) {
    // No real inputs — generate a 1-second black MP4 for testing/graceful degradation
    args.push(
      "-f", "lavfi", "-i", "color=black:size=1280x720:rate=30",
      "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-t", "1",
    );
  }

  if (resolvedProfile === "still_image_narration_fast" && hasVisual) {
    const imagePath = visualInputs[0];
    args.length = 1;
    args.push(
      "-loop",
      "1",
      "-framerate",
      String(profileSettings.serverEncode.imageInputFramerate),
      "-i",
      imagePath,
    );

    if (hasAudio) {
      args.push("-i", audioInputs[0]);
    }

    args.push(
      ...profileSettings.serverEncode.videoCodecArgs,
      "-r",
      String(profileSettings.serverEncode.outputFramerate),
      "-vf",
      `scale=${plan.resolution?.width ?? 720}:${plan.resolution?.height ?? 1280},fps=${profileSettings.serverEncode.outputFramerate}`,
    );

    if (hasAudio) {
      args.push(...profileSettings.serverEncode.audioCodecArgs, "-shortest");
    } else {
      args.push("-t", String(plan.visualClips[0]?.duration ?? 5));
    }

    if (plan.outputFormat === "mp4") {
      args.push("-movflags", "+faststart");
    }

    const outputFilename = `output-${plan.id}.${plan.outputFormat}`;
    args.push(path.join(workDir, outputFilename));
    return args;
  }

  const isMultiVideoSequence = resolvedProfile === "multi_video_standard"
    && visualInputs.length > 1
    && plan.visualClips.length === visualInputs.length
    && plan.visualClips.every((clip) => clip.kind === "video");

  if (isMultiVideoSequence) {
    const concatManifestPath = path.join(workDir, "concat.txt");
    fs.writeFileSync(concatManifestPath, buildConcatManifest(visualInputs), "utf8");

    args.length = 1;
    args.push("-f", "concat", "-safe", "0", "-i", concatManifestPath);

    if (plan.outputFormat === "mp4") {
      args.push(
        ...profileSettings.serverEncode.videoCodecArgs,
        "-r",
        String(profileSettings.serverEncode.outputFramerate),
      );
      if (plan.resolution) {
        args.push(
          "-vf",
          `scale=${plan.resolution.width}:${plan.resolution.height},fps=${profileSettings.serverEncode.outputFramerate}`,
        );
      }
      args.push(...profileSettings.serverEncode.audioCodecArgs, "-movflags", "+faststart");
    } else {
      args.push("-c:v", "libvpx-vp9", "-c:a", "libopus");
      if (plan.resolution) {
        args.push(
          "-vf",
          `scale=${plan.resolution.width}:${plan.resolution.height},fps=${profileSettings.serverEncode.outputFramerate}`,
        );
      }
    }

    const outputFilename = `output-${plan.id}.${plan.outputFormat}`;
    args.push(path.join(workDir, outputFilename));
    return args;
  }

  // Codec selection
  if (plan.outputFormat === "mp4") {
    args.push(...profileSettings.serverEncode.videoCodecArgs);
    if (hasAudio || !hasVisual) args.push(...profileSettings.serverEncode.audioCodecArgs);
    args.push("-movflags", "+faststart");
  } else {
    args.push("-c:v", "libvpx-vp9");
    if (hasAudio || !hasVisual) args.push("-c:a", "libopus");
  }

  // Resolution if specified
  if (plan.resolution) {
    args.push("-vf", `scale=${plan.resolution.width}:${plan.resolution.height},fps=${profileSettings.serverEncode.outputFramerate}`);
  }

  const outputFilename = `output-${plan.id}.${plan.outputFormat}`;
  args.push(path.join(workDir, outputFilename));

  return args;
}

/** Spawn the real FFmpeg binary and parse progress from stderr. */
function runFfmpeg(
  args: string[],
  _outputPath: string,
  onRawProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_BIN, args, { stdio: ["ignore", "ignore", "pipe"] });

    let durationMs: number | null = null;
    let stderr = "";

    proc.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;

      // Parse total duration once
      if (durationMs === null) {
        const m = /Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/.exec(text);
        if (m) {
          durationMs =
            (parseInt(m[1], 10) * 3600 +
              parseInt(m[2], 10) * 60 +
              parseInt(m[3], 10)) *
              1000 +
            parseInt(m[4], 10) * 10;
        }
      }

      // Parse current time for progress
      if (durationMs !== null && durationMs > 0) {
        const t = /time=(\d+):(\d+):(\d+)\.(\d+)/.exec(text);
        if (t) {
          const currentMs =
            (parseInt(t[1], 10) * 3600 +
              parseInt(t[2], 10) * 60 +
              parseInt(t[3], 10)) *
              1000 +
            parseInt(t[4], 10) * 10;
          const percent = Math.min(Math.round((currentMs / durationMs) * 100), 99);
          onRawProgress(percent);
        }
      }
    });

    proc.on("close", (code) => {
      if (code === 0) {
        onRawProgress(100);
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}. stderr:\n${stderr.slice(-2000)}`));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn ffmpeg at ${FFMPEG_BIN}: ${err.message}`));
    });
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
