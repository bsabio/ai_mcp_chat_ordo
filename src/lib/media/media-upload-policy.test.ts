import { describe, expect, it } from "vitest";

import {
  ALLOWED_CHAT_UPLOAD_MIME_TYPES,
  MAX_CHAT_UPLOAD_FILE_SIZE_BYTES,
  classifyChatUpload,
} from "./media-upload-policy";

describe("media-upload-policy", () => {
  it("keeps the documented upload byte budget", () => {
    expect(MAX_CHAT_UPLOAD_FILE_SIZE_BYTES).toBe(32 * 1024 * 1024);
  });

  it("classifies uploaded images, audio, and video into typed media kinds", () => {
    expect(classifyChatUpload("cover.png", "image/png")).toEqual({
      mimeType: "image/png",
      fileType: "image",
      assetKind: "image",
      source: "uploaded",
      extension: "png",
    });
    expect(classifyChatUpload("intro.mp3", "audio/mpeg")).toEqual({
      mimeType: "audio/mpeg",
      fileType: "audio",
      assetKind: "audio",
      source: "uploaded",
      extension: "mp3",
    });
    expect(classifyChatUpload("clip.mp4", "video/mp4")).toEqual({
      mimeType: "video/mp4",
      fileType: "video",
      assetKind: "video",
      source: "uploaded",
      extension: "mp4",
    });
  });

  it("keeps document uploads as document file types", () => {
    expect(classifyChatUpload("notes.txt", "text/plain")).toEqual({
      mimeType: "text/plain",
      fileType: "document",
      source: "uploaded",
      extension: "txt",
    });
  });

  it("can fall back to the file extension when browsers omit a recognized mime type", () => {
    expect(classifyChatUpload("recording.wav", "")).toEqual({
      mimeType: "",
      fileType: "audio",
      assetKind: "audio",
      source: "uploaded",
      extension: "wav",
    });
  });

  it("can classify derived browser-runtime chart and graph assets without widening the public upload allowlist", () => {
    expect(ALLOWED_CHAT_UPLOAD_MIME_TYPES.has("text/vnd.mermaid")).toBe(false);
    expect(ALLOWED_CHAT_UPLOAD_MIME_TYPES.has("application/vnd.studioordo.graph+json")).toBe(false);

    expect(classifyChatUpload("launch_flow.mmd", "text/vnd.mermaid", { allowDerivedAssets: true })).toEqual({
      mimeType: "text/vnd.mermaid",
      fileType: "chart",
      assetKind: "chart",
      source: "derived",
      extension: "mmd",
    });
    expect(classifyChatUpload("lead_mix.json", "application/vnd.studioordo.graph+json", { allowDerivedAssets: true })).toEqual({
      mimeType: "application/vnd.studioordo.graph+json",
      fileType: "graph",
      assetKind: "graph",
      source: "derived",
      extension: "json",
    });
  });

  it("rejects unsupported uploads", () => {
    expect(ALLOWED_CHAT_UPLOAD_MIME_TYPES.has("application/zip")).toBe(false);
    expect(classifyChatUpload("archive.zip", "application/zip")).toBeNull();
  });
});
