import type { AttachmentPart } from "@/lib/chat/message-attachments";

function asAttachmentPart(value: unknown): AttachmentPart | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.assetId !== "string" ||
    typeof candidate.fileName !== "string" ||
    typeof candidate.mimeType !== "string" ||
    typeof candidate.fileSize !== "number"
  ) {
    return null;
  }

  return {
    type: "attachment",
    assetId: candidate.assetId,
    fileName: candidate.fileName,
    mimeType: candidate.mimeType,
    fileSize: candidate.fileSize,
    ...(typeof candidate.assetKind === "string" ? { assetKind: candidate.assetKind as AttachmentPart["assetKind"] } : {}),
    ...(typeof candidate.width === "number" ? { width: candidate.width } : {}),
    ...(typeof candidate.height === "number" ? { height: candidate.height } : {}),
    ...(typeof candidate.durationSeconds === "number" ? { durationSeconds: candidate.durationSeconds } : {}),
    ...(typeof candidate.source === "string" ? { source: candidate.source as AttachmentPart["source"] } : {}),
    ...(typeof candidate.retentionClass === "string"
      ? { retentionClass: candidate.retentionClass as AttachmentPart["retentionClass"] }
      : {}),
    ...(typeof candidate.toolName === "string" ? { toolName: candidate.toolName } : {}),
  };
}

export async function uploadChatAttachments(
  files: File[],
  conversationId: string | null,
): Promise<AttachmentPart[]> {
  if (files.length === 0) {
    return [];
  }

  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  if (conversationId) {
    formData.append("conversationId", conversationId);
  }

  const response = await fetch("/api/chat/uploads", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(payload.error || "Attachment upload failed.");
  }

  const payload = (await response.json()) as {
    attachments?: unknown[];
  };

  return (payload.attachments ?? [])
    .map(asAttachmentPart)
    .filter((attachment): attachment is AttachmentPart => attachment !== null);
}

export async function cleanupChatAttachments(
  attachmentIds: string[],
): Promise<void> {
  if (attachmentIds.length === 0) {
    return;
  }

  await fetch("/api/chat/uploads", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ attachmentIds }),
  });
}