import fs from "fs";
import type Anthropic from "@anthropic-ai/sdk";
import type { UserFile } from "@/core/entities/user-file";
import type { UserFileRepository } from "@/core/use-cases/UserFileRepository";
import type { AttachmentPart } from "@/lib/chat/message-attachments";
import { getUserFilePath } from "@/lib/user-files";

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const IMAGE_MIME_TYPES = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function readFileBytes(userId: string, fileName: string): Buffer | null {
  const filePath = getUserFilePath(userId, fileName);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath);
}

function buildImageBlock(
  mimeType: string,
  base64: string,
): Anthropic.ImageBlockParam {
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: mimeType as ImageMediaType,
      data: base64,
    },
  };
}

function buildPdfDocumentBlock(
  base64: string,
): Anthropic.DocumentBlockParam {
  return {
    type: "document",
    source: {
      type: "base64",
      media_type: "application/pdf",
      data: base64,
    },
  };
}

function buildPlainTextDocumentBlock(
  data: string,
): Anthropic.DocumentBlockParam {
  return {
    type: "document",
    source: {
      type: "text",
      media_type: "text/plain",
      data,
    },
  };
}

export async function buildMultimodalContentBlocks(
  textContent: string,
  attachments: AttachmentPart[],
  userId: string,
  fileRepo: UserFileRepository,
): Promise<Anthropic.ContentBlockParam[]> {
  const blocks: Anthropic.ContentBlockParam[] = [];

  for (const attachment of attachments) {
    const userFile: UserFile | null = await fileRepo.findById(attachment.assetId);
    if (!userFile) continue;

    const fileBytes = readFileBytes(userId, userFile.fileName);
    if (!fileBytes) continue;

    if (IMAGE_MIME_TYPES.has(userFile.mimeType)) {
      blocks.push(buildImageBlock(userFile.mimeType, fileBytes.toString("base64")));
    } else if (userFile.mimeType === "application/pdf") {
      blocks.push(buildPdfDocumentBlock(fileBytes.toString("base64")));
    } else if (userFile.mimeType === "text/plain") {
      blocks.push(buildPlainTextDocumentBlock(fileBytes.toString("utf-8")));
    }
  }

  const text = textContent.trim();
  if (text) {
    blocks.push({ type: "text", text });
  }

  if (blocks.length === 0) {
    blocks.push({ type: "text", text: "(empty message)" });
  }

  return blocks;
}
