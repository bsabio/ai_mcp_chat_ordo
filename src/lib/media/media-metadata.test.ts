import { describe, expect, it } from "vitest";

import { extractUploadMediaMetadata } from "./media-metadata";

describe("media-metadata", () => {
  it("extracts stable metadata for image uploads when dimensions are known", () => {
    const png = Buffer.from(
      "89504e470d0a1a0a0000000d49484452000004b0000002760806000000",
      "hex",
    );

    expect(extractUploadMediaMetadata({
      mimeType: "image/png",
      fileType: "image",
      assetKind: "image",
      extension: "png",
    }, png)).toEqual({
      assetKind: "image",
      source: "uploaded",
      width: 1200,
      height: 630,
    });
  });

  it("still classifies non-image media when dimensions are unavailable", () => {
    expect(extractUploadMediaMetadata({
      mimeType: "audio/mpeg",
      fileType: "audio",
      assetKind: "audio",
      extension: "mp3",
    }, Buffer.from("mp3 bytes"))).toEqual({
      assetKind: "audio",
      source: "uploaded",
    });
  });
});
