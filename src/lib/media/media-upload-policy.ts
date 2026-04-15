import path from "path";

import type { MediaAssetKind } from "@/core/entities/media-asset";
import type { MediaAssetSource } from "@/core/entities/media-asset";
import type { UserFileType } from "@/core/entities/user-file";

export const MAX_CHAT_UPLOAD_FILE_SIZE_BYTES = 32 * 1024 * 1024;

type UploadClassification = {
  fileType: UserFileType;
  assetKind?: MediaAssetKind;
  source?: MediaAssetSource;
  defaultExtension: string;
};

const USER_UPLOAD_MIME_CLASSIFICATIONS: Record<string, UploadClassification> = {
  "application/pdf": { fileType: "document", defaultExtension: "pdf", source: "uploaded" },
  "text/plain": { fileType: "document", defaultExtension: "txt", source: "uploaded" },
  "image/jpeg": { fileType: "image", assetKind: "image", defaultExtension: "jpg", source: "uploaded" },
  "image/png": { fileType: "image", assetKind: "image", defaultExtension: "png", source: "uploaded" },
  "image/gif": { fileType: "image", assetKind: "image", defaultExtension: "gif", source: "uploaded" },
  "image/webp": { fileType: "image", assetKind: "image", defaultExtension: "webp", source: "uploaded" },
  "audio/mpeg": { fileType: "audio", assetKind: "audio", defaultExtension: "mp3", source: "uploaded" },
  "audio/mp3": { fileType: "audio", assetKind: "audio", defaultExtension: "mp3", source: "uploaded" },
  "audio/wav": { fileType: "audio", assetKind: "audio", defaultExtension: "wav", source: "uploaded" },
  "audio/x-wav": { fileType: "audio", assetKind: "audio", defaultExtension: "wav", source: "uploaded" },
  "audio/webm": { fileType: "audio", assetKind: "audio", defaultExtension: "webm", source: "uploaded" },
  "audio/ogg": { fileType: "audio", assetKind: "audio", defaultExtension: "ogg", source: "uploaded" },
  "video/mp4": { fileType: "video", assetKind: "video", defaultExtension: "mp4", source: "uploaded" },
  "video/webm": { fileType: "video", assetKind: "video", defaultExtension: "webm", source: "uploaded" },
  "video/quicktime": { fileType: "video", assetKind: "video", defaultExtension: "mov", source: "uploaded" },
};

const DERIVED_RUNTIME_MIME_CLASSIFICATIONS: Record<string, UploadClassification> = {
  "text/vnd.mermaid": { fileType: "chart", assetKind: "chart", defaultExtension: "mmd", source: "derived" },
  "application/vnd.studioordo.graph+json": {
    fileType: "graph",
    assetKind: "graph",
    defaultExtension: "json",
    source: "derived",
  },
};

const USER_UPLOAD_EXTENSION_CLASSIFICATIONS: Record<string, UploadClassification> = {
  pdf: USER_UPLOAD_MIME_CLASSIFICATIONS["application/pdf"],
  txt: USER_UPLOAD_MIME_CLASSIFICATIONS["text/plain"],
  jpeg: USER_UPLOAD_MIME_CLASSIFICATIONS["image/jpeg"],
  jpg: USER_UPLOAD_MIME_CLASSIFICATIONS["image/jpeg"],
  png: USER_UPLOAD_MIME_CLASSIFICATIONS["image/png"],
  gif: USER_UPLOAD_MIME_CLASSIFICATIONS["image/gif"],
  webp: USER_UPLOAD_MIME_CLASSIFICATIONS["image/webp"],
  mp3: USER_UPLOAD_MIME_CLASSIFICATIONS["audio/mpeg"],
  wav: USER_UPLOAD_MIME_CLASSIFICATIONS["audio/wav"],
  ogg: USER_UPLOAD_MIME_CLASSIFICATIONS["audio/ogg"],
  webm: USER_UPLOAD_MIME_CLASSIFICATIONS["video/webm"],
  mp4: USER_UPLOAD_MIME_CLASSIFICATIONS["video/mp4"],
  mov: USER_UPLOAD_MIME_CLASSIFICATIONS["video/quicktime"],
};

const DERIVED_RUNTIME_EXTENSION_CLASSIFICATIONS: Record<string, UploadClassification> = {
  mmd: DERIVED_RUNTIME_MIME_CLASSIFICATIONS["text/vnd.mermaid"],
  mermaid: DERIVED_RUNTIME_MIME_CLASSIFICATIONS["text/vnd.mermaid"],
};

export interface ChatUploadPolicyResult {
  mimeType: string;
  fileType: UserFileType;
  assetKind?: MediaAssetKind;
  source?: MediaAssetSource;
  extension: string;
}

export const ALLOWED_CHAT_UPLOAD_MIME_TYPES = new Set(Object.keys(USER_UPLOAD_MIME_CLASSIFICATIONS));

type ClassifyChatUploadOptions = {
  allowDerivedAssets?: boolean;
};

export function classifyChatUpload(
  fileName: string,
  mimeType: string,
  options: ClassifyChatUploadOptions = {},
): ChatUploadPolicyResult | null {
  const normalizedMimeType = mimeType.trim().toLowerCase();
  const mimeClassifications = options.allowDerivedAssets
    ? { ...USER_UPLOAD_MIME_CLASSIFICATIONS, ...DERIVED_RUNTIME_MIME_CLASSIFICATIONS }
    : USER_UPLOAD_MIME_CLASSIFICATIONS;
  const extensionClassifications = options.allowDerivedAssets
    ? { ...USER_UPLOAD_EXTENSION_CLASSIFICATIONS, ...DERIVED_RUNTIME_EXTENSION_CLASSIFICATIONS }
    : USER_UPLOAD_EXTENSION_CLASSIFICATIONS;
  const byMime = mimeClassifications[normalizedMimeType];
  const extension = path.extname(fileName).replace(/^\./, "").trim().toLowerCase();

  const classification = byMime ?? (extension ? extensionClassifications[extension] : undefined);
  if (!classification) {
    return null;
  }

  return {
    mimeType: normalizedMimeType || mimeType,
    fileType: classification.fileType,
    ...(classification.assetKind ? { assetKind: classification.assetKind } : {}),
    ...(classification.source ? { source: classification.source } : {}),
    extension: extension || classification.defaultExtension,
  };
}
