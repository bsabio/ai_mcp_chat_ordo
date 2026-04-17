import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

const ARTIFACT_ROOT = path.join(process.cwd(), "test-results", "media-e2e-artifacts");
const PNG_UPLOAD_FIXTURE_PATH = path.join(process.cwd(), "public", "ordo-avatar.png");

function ensureDirectory(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function runMediaCommand(command: string, args: string[]) {
  const result = spawnSync(command, args, { encoding: "utf8" });

  if (result.error) {
    throw new Error(`${command} is required for live media validation: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`${command} failed for live media validation.${details ? `\n${details}` : ""}`);
  }

  return result;
}

function assertVideoHasAudibleAudio(filePath: string) {
  const ffprobeResult = runMediaCommand("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "a",
    "-show_entries",
    "stream=codec_name,codec_type,sample_rate,channels",
    "-of",
    "csv=p=0",
    filePath,
  ]);

  if (!ffprobeResult.stdout.trim()) {
    throw new Error(`Expected ${filePath} to contain an audio stream.`);
  }

  const ffmpegResult = runMediaCommand("ffmpeg", [
    "-hide_banner",
    "-i",
    filePath,
    "-map",
    "0:a:0",
    "-af",
    "volumedetect",
    "-f",
    "null",
    "-",
  ]);

  const output = `${ffmpegResult.stdout}\n${ffmpegResult.stderr}`;
  const maxVolumeMatch = output.match(/max_volume:\s+([^\s]+)/);
  if (!maxVolumeMatch || maxVolumeMatch[1] === "-inf") {
    throw new Error(`Expected ${filePath} to contain audible audio, but the track appears silent.`);
  }
}

function createRunDirectory() {
  const runId = `run-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const runDir = path.join(ARTIFACT_ROOT, runId);
  ensureDirectory(runDir);
  return { runId, runDir };
}

async function registerFreshUser(page: import("@playwright/test").Page) {
  const email = `media-e2e-${Date.now()}@example.com`;
  const password = "MediaE2E!Pass123";

  await page.goto("/register");
  await page.getByLabel("Name").fill("Media Acceptance User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.waitForTimeout(1700);
  await page.getByRole("button", { name: "Create Account" }).click();
  await page.waitForURL("/");

  return { email, password };
}

async function writeUploadFixture(runDir: string) {
  const uploadPath = path.join(runDir, "workflow-2-upload-source.png");
  fs.copyFileSync(PNG_UPLOAD_FIXTURE_PATH, uploadPath);
  return uploadPath;
}

async function downloadAuthenticatedAsset(options: {
  page: import("@playwright/test").Page;
  baseURL: string;
  uri: string;
  destinationPath: string;
}) {
  const cookies = await options.page.context().cookies();
  const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  const response = await fetch(new URL(options.uri, options.baseURL), {
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
  });

  if (!response.ok) {
    throw new Error(`Failed to download ${options.uri} (${response.status}).`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(options.destinationPath, bytes);
}

async function waitForWorkflowSuccess(page: import("@playwright/test").Page, workflowKey: string) {
  const statusCard = page.getByTestId(`status-${workflowKey}`);
  await expect(statusCard).toContainText("succeeded", { timeout: 240_000 });
}

test("live media workflows produce inspectable video artifacts", async ({ page }, testInfo) => {
  test.setTimeout(600_000);

  const baseURL = String(testInfo.project.use.baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:34123");
  const { runId, runDir } = createRunDirectory();

  await registerFreshUser(page);
  await page.goto("/e2e/media-lab");
  await expect(page.getByRole("heading", { name: "Live media workflow lab" })).toBeVisible();
  await expect(page.getByTestId("media-e2e-chart").locator("svg").first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("media-e2e-graph").locator("svg").first()).toBeVisible({ timeout: 60_000 });

  await page.getByTestId("media-e2e-chart").screenshot({ path: path.join(runDir, "workflow-3-chart-render.png") });
  await page.getByTestId("media-e2e-graph").screenshot({ path: path.join(runDir, "workflow-4-graph-render.png") });

  const uploadPath = await writeUploadFixture(runDir);
  await page.getByLabel("Upload workflow image").setInputFiles(uploadPath);
  await expect(page.getByTestId("artifact-link-uploaded-image")).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "Run Workflow 1" }).click();
  await waitForWorkflowSuccess(page, "workflow1");

  await page.getByRole("button", { name: "Run Workflow 2" }).click();
  await waitForWorkflowSuccess(page, "workflow2");

  await page.getByRole("button", { name: "Run Workflow 3" }).click();
  await waitForWorkflowSuccess(page, "workflow3");

  await page.getByRole("button", { name: "Run Workflow 4" }).click();
  await waitForWorkflowSuccess(page, "workflow4");

  await page.getByRole("button", { name: "Run Workflow 5" }).click();
  await waitForWorkflowSuccess(page, "workflow5");

  const manifestText = await page.getByTestId("manifest-json").textContent();
  const manifest = JSON.parse(manifestText || "[]") as Array<{
    key: string;
    label: string;
    kind: string;
    assetId: string;
    uri: string;
    note?: string;
  }>;

  const videoArtifacts = manifest.filter((entry) => entry.kind === "video");
  expect(videoArtifacts).toHaveLength(5);

  const copiedArtifacts: Array<Record<string, string>> = [];
  for (const artifact of videoArtifacts) {
    const fileName = `${artifact.key}.mp4`;
    const destinationPath = path.join(runDir, fileName);
    await downloadAuthenticatedAsset({
      page,
      baseURL,
      uri: artifact.uri,
      destinationPath,
    });
    copiedArtifacts.push({
      key: artifact.key,
      assetId: artifact.assetId,
      uri: artifact.uri,
      copiedPath: destinationPath,
    });

    assertVideoHasAudibleAudio(destinationPath);
  }

  fs.writeFileSync(
    path.join(runDir, "manifest.json"),
    JSON.stringify(
      {
        runId,
        baseURL,
        copiedArtifacts,
        manifest,
      },
      null,
      2,
    ),
  );
});

test("uploaded mp4 clips concatenate into a playable browser-surface video", async ({ page }, testInfo) => {
  test.setTimeout(300_000);

  const baseURL = String(testInfo.project.use.baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:34123");
  const { runId, runDir } = createRunDirectory();

  await registerFreshUser(page);
  await page.goto("/e2e/media-lab");
  await expect(page.getByRole("heading", { name: "Live media workflow lab" })).toBeVisible();

  const uploadPath = await writeUploadFixture(runDir);
  await page.getByLabel("Upload workflow image").setInputFiles(uploadPath);
  await expect(page.getByTestId("artifact-link-uploaded-image")).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "Run Workflow 1" }).click();
  await waitForWorkflowSuccess(page, "workflow1");

  await page.getByRole("button", { name: "Run Workflow 2" }).click();
  await waitForWorkflowSuccess(page, "workflow2");

  const sourceManifestText = await page.getByTestId("manifest-json").textContent();
  const sourceManifest = JSON.parse(sourceManifestText || "[]") as Array<{
    key: string;
    assetId: string;
    uri: string;
    kind: string;
  }>;
  const workflow1Video = sourceManifest.find((entry) => entry.key === "workflow1-video");
  const workflow2Video = sourceManifest.find((entry) => entry.key === "workflow2-video");
  expect(workflow1Video).toBeDefined();
  expect(workflow2Video).toBeDefined();
  if (!workflow1Video || !workflow2Video) {
    throw new Error("Workflow 1 and workflow 2 videos must exist before fixture upload concat validation.");
  }

  const firstVideoPath = path.join(runDir, "workflow-6-upload-source-1.mp4");
  const secondVideoPath = path.join(runDir, "workflow-6-upload-source-2.mp4");
  await downloadAuthenticatedAsset({
    page,
    baseURL,
    uri: workflow1Video.uri,
    destinationPath: firstVideoPath,
  });
  await downloadAuthenticatedAsset({
    page,
    baseURL,
    uri: workflow2Video.uri,
    destinationPath: secondVideoPath,
  });

  await page.getByLabel("Upload workflow videos").setInputFiles([firstVideoPath, secondVideoPath]);
  await expect(page.getByTestId("uploaded-video-names")).toContainText("workflow-6-upload-source-1.mp4");
  await expect(page.getByTestId("uploaded-video-names")).toContainText("workflow-6-upload-source-2.mp4");

  await page.getByRole("button", { name: "Run Workflow 6" }).click();
  await waitForWorkflowSuccess(page, "workflow6");

  const preview = page.getByTestId("artifact-video-workflow6-video");
  await expect(preview).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("artifact-link-workflow6-video")).toBeVisible();

  await preview.evaluate(async (video: HTMLVideoElement) => {
    video.muted = true;
    await video.play();
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Timed out waiting for playback progress.")), 15000);
      const onTimeUpdate = () => {
        if (video.currentTime > 0.1) {
          window.clearTimeout(timeout);
          video.removeEventListener("timeupdate", onTimeUpdate);
          resolve();
        }
      };
      video.addEventListener("timeupdate", onTimeUpdate);
    });
    video.pause();
  });

  const playbackState = await preview.evaluate((video: HTMLVideoElement) => ({
    readyState: video.readyState,
    currentTime: video.currentTime,
    duration: video.duration,
  }));
  expect(playbackState.readyState).toBeGreaterThanOrEqual(2);
  expect(playbackState.currentTime).toBeGreaterThan(0.1);
  expect(playbackState.duration).toBeGreaterThan(0.5);

  const manifestText = await page.getByTestId("manifest-json").textContent();
  const manifest = JSON.parse(manifestText || "[]") as Array<{
    key: string;
    assetId: string;
    uri: string;
    kind: string;
  }>;
  const combinedVideo = manifest.find((entry) => entry.key === "workflow6-video");
  expect(combinedVideo).toBeDefined();
  if (!combinedVideo) {
    throw new Error("Workflow 6 video missing from manifest.");
  }

  const destinationPath = path.join(runDir, "workflow6-video.mp4");
  await downloadAuthenticatedAsset({
    page,
    baseURL,
    uri: combinedVideo.uri,
    destinationPath,
  });
  assertVideoHasAudibleAudio(destinationPath);

  fs.writeFileSync(
    path.join(runDir, "workflow6-manifest.json"),
    JSON.stringify({
      runId,
      sourceVideos: [firstVideoPath, secondVideoPath],
      combinedVideo,
      downloadedPath: destinationPath,
      playbackState,
    }, null, 2),
  );
});
