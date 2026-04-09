import type { MessagePart } from "@/core/entities/message-parts";

export type AttachmentPart = Extract<MessagePart, { type: "attachment" }>;
export type ImportedAttachmentPart = Extract<MessagePart, { type: "imported_attachment" }>;

export type PresentedAttachment =
  | ({ kind: "linked" } & AttachmentPart)
  | ({ kind: "imported" } & ImportedAttachmentPart);

export function getAttachmentParts(parts?: MessagePart[]): AttachmentPart[] {
  if (!parts) {
    return [];
  }

  return parts.filter(
    (part): part is AttachmentPart => part.type === "attachment",
  );
}

export function getPresentedAttachments(parts?: MessagePart[]): PresentedAttachment[] {
  if (!parts) {
    return [];
  }

  const attachments: PresentedAttachment[] = [];

  for (const part of parts) {
    if (part.type === "attachment") {
      attachments.push({ kind: "linked", ...part });
      continue;
    }

    if (part.type === "imported_attachment") {
      attachments.push({ kind: "imported", ...part });
    }
  }

  return attachments;
}

export function buildAttachmentContextText(
  attachments: AttachmentPart[],
): string {
  if (attachments.length === 0) {
    return "";
  }

  const lines = attachments.map(
    (attachment) =>
      `- ${attachment.fileName} (${attachment.mimeType}, ${attachment.fileSize} bytes)`,
  );

  return ["Attached files:", ...lines].join("\n");
}

export function buildMessageContextText(
  content: string,
  parts?: MessagePart[],
): string {
  const text = content.trim();
  const attachments = buildAttachmentContextText(getAttachmentParts(parts));

  if (text && attachments) {
    return `${text}\n\n${attachments}`;
  }

  if (attachments) {
    return attachments;
  }

  return text;
}