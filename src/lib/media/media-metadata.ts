import type { UserFileMetadata } from "@/core/entities/user-file";

import type { ChatUploadPolicyResult } from "./media-upload-policy";

function readPngDimensions(data: Buffer): { width: number; height: number } | null {
  if (data.length < 24 || data.toString("hex", 0, 8) !== "89504e470d0a1a0a") {
    return null;
  }

  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
  };
}

function readGifDimensions(data: Buffer): { width: number; height: number } | null {
  if (data.length < 10 || (data.toString("ascii", 0, 6) !== "GIF87a" && data.toString("ascii", 0, 6) !== "GIF89a")) {
    return null;
  }

  return {
    width: data.readUInt16LE(6),
    height: data.readUInt16LE(8),
  };
}

function readJpegDimensions(data: Buffer): { width: number; height: number } | null {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 9 < data.length) {
    if (data[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = data[offset + 1];
    const segmentLength = data.readUInt16BE(offset + 2);
    if (segmentLength < 2) {
      return null;
    }

    if (
      marker === 0xc0
      || marker === 0xc1
      || marker === 0xc2
      || marker === 0xc3
      || marker === 0xc5
      || marker === 0xc6
      || marker === 0xc7
      || marker === 0xc9
      || marker === 0xca
      || marker === 0xcb
      || marker === 0xcd
      || marker === 0xce
      || marker === 0xcf
    ) {
      return {
        height: data.readUInt16BE(offset + 5),
        width: data.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + segmentLength;
  }

  return null;
}

function readImageDimensions(
  mimeType: string,
  data: Buffer,
): { width: number; height: number } | null {
  switch (mimeType) {
    case "image/png":
      return readPngDimensions(data);
    case "image/gif":
      return readGifDimensions(data);
    case "image/jpeg":
      return readJpegDimensions(data);
    default:
      return null;
  }
}

export function extractUploadMediaMetadata(
  classification: ChatUploadPolicyResult,
  data: Buffer,
): Partial<UserFileMetadata> {
  const base: Partial<UserFileMetadata> = {
    ...(classification.assetKind ? { assetKind: classification.assetKind } : {}),
    source: classification.source ?? "uploaded",
  };

  if (classification.assetKind === "image") {
    const dimensions = readImageDimensions(classification.mimeType, data);
    if (dimensions) {
      return {
        ...base,
        width: dimensions.width,
        height: dimensions.height,
      };
    }
  }

  return base;
}
