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
