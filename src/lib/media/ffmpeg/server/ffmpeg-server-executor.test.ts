import { describe, expect, it, vi, beforeEach } from "vitest";
import { FfmpegServerExecutor } from "./ffmpeg-server-executor";
import type { MediaCompositionPlan } from "@/core/entities/media-composition";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Use the real system ffmpeg. Skip tests gracefully if it's not present.
const FFMPEG_BIN = process.env["FFMPEG_BIN"]
  ?? (fs.existsSync("/opt/homebrew/bin/ffmpeg") ? "/opt/homebrew/bin/ffmpeg" : "ffmpeg");
const ffmpegAvailable = (() => {
  try {
    return spawnSync(FFMPEG_BIN, ["-version"], { stdio: "ignore" }).status === 0;
  } catch (error) {
    void error;
    return false;
  }
})();

const basePlan: MediaCompositionPlan = {
  id: "server-test-plan-1",
  conversationId: "conv-server-1",
  visualClips: [],
  audioClips: [],
  subtitlePolicy: "none",
  waveformPolicy: "none",
  outputFormat: "mp4",
};

describe("FfmpegServerExecutor", () => {
  let workDir: string;

  beforeEach(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), "ordo-ffmpeg-test-"));
  });

  it("emits progress phases in the correct order", async () => {
    if (!ffmpegAvailable) {
      console.warn(`Skipping: ffmpeg not found at ${FFMPEG_BIN}`);
      return;
    }

    const executor = new FfmpegServerExecutor();
    const phases: string[] = [];

    await executor.executeDeferredPlan(
      basePlan,
      (progress, phase) => { phases.push(phase); },
      { resolveAssetPath: () => null, outputDir: workDir },
    );

    // staging_assets must come before rendering_media, which must come before packaging_artifacts
    expect(phases[0]).toBe("staging_assets");
    const renderingIdx = phases.indexOf("rendering_media");
    const packagingIdx = phases.indexOf("packaging_artifacts");
    expect(renderingIdx).toBeLessThan(packagingIdx);
    expect(phases.at(-1)).toBe("persisting");
  });

  it("returns a canonical CapabilityResultEnvelope on success", async () => {
    if (!ffmpegAvailable) {
      console.warn(`Skipping: ffmpeg not found at ${FFMPEG_BIN}`);
      return;
    }

    const executor = new FfmpegServerExecutor();
    const envelope = await executor.executeDeferredPlan(
      basePlan,
      () => {},
      { resolveAssetPath: () => null, outputDir: workDir },
    );

    expect(envelope.schemaVersion).toBe(1);
    expect(envelope.toolName).toBe("compose_media");
    expect(envelope.family).toBe("artifact");
    expect(envelope.executionMode).toBe("hybrid");
    expect(envelope.summary.statusLine).toBe("succeeded");
    expect(envelope.replaySnapshot?.route).toBe("deferred_server");
    expect(envelope.payload).toMatchObject({
      route: "deferred_server",
      planId: "server-test-plan-1",
      outputFormat: "mp4",
    });
  });

  it("produces a real output file on disk when no inputs are provided (lavfi fallback)", async () => {
    if (!ffmpegAvailable) {
      console.warn(`Skipping: ffmpeg not found at ${FFMPEG_BIN}`);
      return;
    }

    const executor = new FfmpegServerExecutor();
    const envelope = await executor.executeDeferredPlan(
      basePlan,
      () => {},
      { resolveAssetPath: () => null, outputDir: workDir },
    );

    const payloadPath = (envelope.payload as { outputPath?: string })?.outputPath;
    expect(payloadPath).toBeDefined();
    if (payloadPath) {
      expect(fs.existsSync(payloadPath)).toBe(true);
      const stat = fs.statSync(payloadPath);
      expect(stat.size).toBeGreaterThan(100); // Must be a real file, not empty
    }
  });

  it("supports the fast still-image narration profile on the server path", async () => {
    if (!ffmpegAvailable) {
      console.warn(`Skipping: ffmpeg not found at ${FFMPEG_BIN}`);
      return;
    }

    const imagePath = path.join(workDir, "image.png");
    const audioPath = path.join(workDir, "audio.mp3");

    const imageResult = spawnSync(FFMPEG_BIN, [
      "-y",
      "-f", "lavfi",
      "-i", "color=c=black:s=720x1280",
      "-frames:v", "1",
      imagePath,
    ], { stdio: "ignore" });
    expect(imageResult.status).toBe(0);

    const audioResult = spawnSync(FFMPEG_BIN, [
      "-y",
      "-f", "lavfi",
      "-i", "sine=frequency=880:duration=1",
      "-q:a", "9",
      "-acodec", "libmp3lame",
      audioPath,
    ], { stdio: "ignore" });
    expect(audioResult.status).toBe(0);

    const executor = new FfmpegServerExecutor();
    const envelope = await executor.executeDeferredPlan(
      {
        ...basePlan,
        id: "server-test-plan-image-audio",
        profile: "still_image_narration_fast",
        visualClips: [{ assetId: "asset-image-1", kind: "image" }],
        audioClips: [{ assetId: "asset-audio-1", kind: "audio" }],
        resolution: { width: 720, height: 1280 },
      },
      () => {},
      {
        resolveAssetPath: (assetId) => {
          if (assetId === "asset-image-1") return imagePath;
          if (assetId === "asset-audio-1") return audioPath;
          return null;
        },
        outputDir: workDir,
      },
    );

    expect(envelope.payload).toMatchObject({
      route: "deferred_server",
      profile: "still_image_narration_fast",
      outputFormat: "mp4",
    });

    const payloadPath = (envelope.payload as { outputPath?: string })?.outputPath;
    expect(payloadPath).toBeDefined();
    if (payloadPath) {
      const stat = fs.statSync(payloadPath);
      expect(stat.size).toBeGreaterThan(100);
    }
  }, 15000);

  it("concatenates multiple source videos for the multi-video standard profile", async () => {
    if (!ffmpegAvailable) {
      console.warn(`Skipping: ffmpeg not found at ${FFMPEG_BIN}`);
      return;
    }

    const firstVideoPath = path.join(workDir, "clip-1.mp4");
    const secondVideoPath = path.join(workDir, "clip-2.mp4");

    const firstVideoResult = spawnSync(FFMPEG_BIN, [
      "-y",
      "-f", "lavfi",
      "-i", "testsrc=size=160x90:rate=12",
      "-f", "lavfi",
      "-i", "sine=frequency=440:duration=0.5",
      "-t", "0.5",
      "-c:v", "libx264",
      "-c:a", "aac",
      "-pix_fmt", "yuv420p",
      firstVideoPath,
    ], { stdio: "ignore" });
    expect(firstVideoResult.status).toBe(0);

    const secondVideoResult = spawnSync(FFMPEG_BIN, [
      "-y",
      "-f", "lavfi",
      "-i", "testsrc2=size=160x90:rate=12",
      "-f", "lavfi",
      "-i", "sine=frequency=660:duration=0.5",
      "-t", "0.5",
      "-c:v", "libx264",
      "-c:a", "aac",
      "-pix_fmt", "yuv420p",
      secondVideoPath,
    ], { stdio: "ignore" });
    expect(secondVideoResult.status).toBe(0);

    const executor = new FfmpegServerExecutor();
    const envelope = await executor.executeDeferredPlan(
      {
        ...basePlan,
        id: "server-test-plan-multi-video",
        profile: "multi_video_standard",
        visualClips: [
          { assetId: "asset-video-1", kind: "video" },
          { assetId: "asset-video-2", kind: "video" },
        ],
        audioClips: [],
        resolution: { width: 720, height: 1280 },
      },
      () => {},
      {
        resolveAssetPath: (assetId) => {
          if (assetId === "asset-video-1") return firstVideoPath;
          if (assetId === "asset-video-2") return secondVideoPath;
          return null;
        },
        outputDir: workDir,
      },
    );

    expect(envelope.payload).toMatchObject({
      route: "deferred_server",
      profile: "multi_video_standard",
      outputFormat: "mp4",
    });

    const payloadPath = (envelope.payload as { outputPath?: string })?.outputPath;
    expect(payloadPath).toBeDefined();
    if (payloadPath) {
      const stat = fs.statSync(payloadPath);
      expect(stat.size).toBeGreaterThan(100);

      const inspectResult = spawnSync(FFMPEG_BIN, ["-i", payloadPath], { encoding: "utf8" });
      expect(`${inspectResult.stdout}\n${inspectResult.stderr}`).toContain("Audio:");
    }
  }, 15000);

  it("throws with a descriptive message when ffmpeg binary is missing", async () => {
    // Override FFMPEG_BIN via env to a non-existent path
    process.env["FFMPEG_BIN"] = "/nonexistent/ffmpeg";

    vi.resetModules();
    const { FfmpegServerExecutor: FreshExecutor } = await import("./ffmpeg-server-executor");
    const executor = new FreshExecutor();

    await expect(
      executor.executeDeferredPlan(basePlan, () => {}, { resolveAssetPath: () => null, outputDir: workDir })
    ).rejects.toThrow(/ffmpeg/i);

    delete process.env["FFMPEG_BIN"];
  });
});
