import path from "path";
import { NextResponse } from "next/server";

import { getUserFileDataMapper } from "@/adapters/RepositoryFactory";
import { getConversationInteractor } from "@/lib/chat/conversation-root";
import { resolveUserId } from "@/lib/chat/resolve-user";
import { reapStaleChatUploads } from "@/lib/chat/upload-reaper";

import { UserFileSystem } from "@/lib/user-files";
import { logDegradation, logFailure } from "@/lib/observability/logger";
import { MAX_FILE_SIZE_BYTES } from "@/lib/chat/file-validation";
import { extractUploadMediaMetadata } from "@/lib/media/media-metadata";
import { classifyChatUpload } from "@/lib/media/media-upload-policy";

function getExtension(fileName: string, fallbackExtension: string): string {
  const extension = path.extname(fileName).replace(/^\./, "").trim().toLowerCase();
  if (extension) {
    return extension;
  }

  return fallbackExtension;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File);
    const rawConversationId = formData.get("conversationId");

    if (files.length === 0) {
      return NextResponse.json(
        { error: "At least one file is required." },
        { status: 400 },
      );
    }

    for (const file of files) {
      const classification = classifyChatUpload(file.name, file.type, {
        allowDerivedAssets: true,
      });
      if (!classification) {
        return NextResponse.json(
          { error: `Unsupported file type: ${file.type || file.name}. Allowed: PDF, plain text, JPEG, PNG, GIF, WebP, MP3, WAV, OGG, WebM audio, MP4, WebM video, and QuickTime.` },
          { status: 400 },
        );
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds the 32 MB size limit.` },
          { status: 400 },
        );
      }
    }

    const conversationId =
      typeof rawConversationId === "string" && rawConversationId
        ? rawConversationId
        : null;
    const { userId } = await resolveUserId();

    await reapStaleChatUploads({ userId }).catch((error) => {
      logDegradation("UPLOAD_REAPER_WARN", "Chat upload reaper warning", undefined, error);
    });

    if (conversationId) {
      await getConversationInteractor().get(conversationId, userId);
    }

    const ufs = new UserFileSystem(getUserFileDataMapper());
    const attachments = await Promise.all(
      files.map(async (file) => {
        const classification = classifyChatUpload(file.name, file.type, {
          allowDerivedAssets: true,
        });
        if (!classification) {
          throw new Error(`Unsupported file type: ${file.type || file.name}`);
        }

        const data = Buffer.from(await file.arrayBuffer());
        const metadata = extractUploadMediaMetadata(classification, data);
        const storedFile = await ufs.storeBinary({
          userId,
          conversationId,
          fileType: classification.fileType,
          mimeType: file.type || classification.mimeType || "application/octet-stream",
          extension: getExtension(file.name, classification.extension),
          data,
          metadata: {
            ...metadata,
            retentionClass: conversationId ? "conversation" : "ephemeral",
          },
        });
        const storedMetadata = storedFile.metadata ?? {};

        return {
          assetId: storedFile.id,
          fileName: file.name,
          mimeType: storedFile.mimeType,
          fileSize: storedFile.fileSize,
          ...(storedMetadata.assetKind ? { assetKind: storedMetadata.assetKind } : {}),
          ...(typeof storedMetadata.width === "number" ? { width: storedMetadata.width } : {}),
          ...(typeof storedMetadata.height === "number" ? { height: storedMetadata.height } : {}),
          ...(typeof storedMetadata.durationSeconds === "number"
            ? { durationSeconds: storedMetadata.durationSeconds }
            : {}),
          ...(storedMetadata.source ? { source: storedMetadata.source } : {}),
          ...(storedMetadata.retentionClass
            ? { retentionClass: storedMetadata.retentionClass }
            : {}),
        };
      }),
    );

    return NextResponse.json({ attachments });
  } catch (error) {
    logFailure("UPLOAD_ROUTE_ERROR", "Chat upload route error", undefined, error);
    return NextResponse.json(
      { error: "Unable to upload chat attachments." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      attachmentIds?: unknown;
    };
    const attachmentIds = Array.isArray(body.attachmentIds)
      ? body.attachmentIds.filter(
          (value): value is string => typeof value === "string" && value.length > 0,
        )
      : [];

    if (attachmentIds.length === 0) {
      return NextResponse.json(
        { error: "attachmentIds must be a non-empty array." },
        { status: 400 },
      );
    }

    const { userId } = await resolveUserId();
    const ufs = new UserFileSystem(getUserFileDataMapper());

    await Promise.all(
      attachmentIds.map((attachmentId) =>
        ufs.deleteIfUnattached(attachmentId, userId),
      ),
    );

    return NextResponse.json({ deletedIds: attachmentIds });
  } catch (error) {
    logFailure("UPLOAD_CLEANUP_ERROR", "Chat upload cleanup error", undefined, error);
    return NextResponse.json(
      { error: "Unable to clean up chat attachments." },
      { status: 500 },
    );
  }
}