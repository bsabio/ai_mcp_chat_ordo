import { describe, expect, it } from "vitest";

import {
  buildUserFileMetadata,
  projectMediaAssetToArtifactRef,
  projectUserFileToConversationMediaAssetCandidate,
  projectUserFileToArtifactRef,
  projectUserFileToMediaAssetDescriptor,
} from "./media-asset-projection";
import type { UserFile } from "@/core/entities/user-file";

function createUserFile(overrides: Partial<UserFile> = {}): UserFile {
  return {
    id: "uf_audio_1",
    userId: "usr_test",
    conversationId: "conv_1",
    contentHash: "hash_1",
    fileType: "audio",
    fileName: "voiceover.mp3",
    mimeType: "audio/mpeg",
    fileSize: 1024,
    metadata: {},
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("media-asset-projection", () => {
  it("normalizes partial metadata into a stable user-file metadata object", () => {
    expect(buildUserFileMetadata({ assetKind: "audio", durationSeconds: 12.5 })).toEqual({
      assetKind: "audio",
      durationSeconds: 12.5,
    });
  });

  it("projects a typed user file into a media asset descriptor", () => {
    const file = createUserFile({
      metadata: {
        assetKind: "audio",
        source: "generated",
        durationSeconds: 18,
        toolName: "generate_audio",
      },
    });

    expect(projectUserFileToMediaAssetDescriptor(file)).toEqual({
      id: "uf_audio_1",
      kind: "audio",
      mimeType: "audio/mpeg",
      source: "generated",
      assetId: "uf_audio_1",
      durationSeconds: 18,
      conversationId: "conv_1",
      toolName: "generate_audio",
      retentionClass: "conversation",
    });
  });

  it("projects reusable conversation media candidates for composition planning", () => {
    const file = createUserFile({
      id: "uf_chart_1",
      fileType: "chart",
      fileName: "quarterly-funnel.svg",
      mimeType: "image/svg+xml",
      metadata: {
        assetKind: "chart",
        source: "generated",
        toolName: "generate_chart",
        width: 1280,
        height: 720,
      },
      createdAt: "2026-04-14T12:00:00.000Z",
    });

    expect(projectUserFileToConversationMediaAssetCandidate(file)).toEqual({
      assetId: "uf_chart_1",
      assetKind: "chart",
      label: "quarterly-funnel.svg",
      fileName: "quarterly-funnel.svg",
      mimeType: "image/svg+xml",
      source: "generated",
      retentionClass: "conversation",
      createdAt: "2026-04-14T12:00:00.000Z",
      conversationId: "conv_1",
      toolName: "generate_chart",
      width: 1280,
      height: 720,
    });
  });

  it("returns null for non-media document files", () => {
    const file = createUserFile({
      id: "uf_doc_1",
      fileType: "document",
      fileName: "notes.txt",
      mimeType: "text/plain",
    });

    expect(projectUserFileToMediaAssetDescriptor(file)).toBeNull();
    expect(projectUserFileToArtifactRef(file)).toBeNull();
  });

  it("projects media assets to transcript-safe artifact refs", () => {
    const file = createUserFile({
      id: "uf_image_1",
      fileType: "image",
      fileName: "cover.png",
      mimeType: "image/png",
      metadata: {
        assetKind: "image",
        source: "uploaded",
        width: 1200,
        height: 630,
      },
    });

    expect(projectUserFileToArtifactRef(file, { label: "Cover image" })).toEqual({
      kind: "image",
      label: "Cover image",
      mimeType: "image/png",
      assetId: "uf_image_1",
      retentionClass: "conversation",
      width: 1200,
      height: 630,
      source: "uploaded",
    });
  });

  it("preserves stable artifact metadata when projecting a media descriptor directly", () => {
    expect(projectMediaAssetToArtifactRef({
      id: "uf_subtitle_1",
      kind: "subtitle",
      mimeType: "text/vtt",
      source: "derived",
      assetId: "uf_subtitle_1",
      retentionClass: "durable",
    }, { label: "Subtitle track" })).toEqual({
      kind: "subtitle",
      label: "Subtitle track",
      mimeType: "text/vtt",
      assetId: "uf_subtitle_1",
      retentionClass: "durable",
      source: "derived",
    });
  });
});