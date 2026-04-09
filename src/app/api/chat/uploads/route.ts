import path from "path";
import { NextResponse } from "next/server";

import { UserFileDataMapper } from "@/adapters/UserFileDataMapper";
import { getConversationInteractor } from "@/lib/chat/conversation-root";
import { resolveUserId } from "@/lib/chat/resolve-user";
import { reapStaleChatUploads } from "@/lib/chat/upload-reaper";
import { getDb } from "@/lib/db";
import { UserFileSystem } from "@/lib/user-files";
import { logDegradation, logFailure } from "@/lib/observability/logger";

function getExtension(fileName: string, mimeType: string): string {
  const extension = path.extname(fileName).replace(/^\./, "").trim().toLowerCase();
  if (extension) {
    return extension;
  }

  if (mimeType === "application/pdf") {
    return "pdf";
  }

  if (mimeType === "text/plain") {
    return "txt";
  }

  return "bin";
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

    const ufs = new UserFileSystem(new UserFileDataMapper(getDb()));
    const attachments = await Promise.all(
      files.map(async (file) => {
        const data = Buffer.from(await file.arrayBuffer());
        const storedFile = await ufs.storeBinary({
          userId,
          conversationId,
          fileType: "document",
          mimeType: file.type || "application/octet-stream",
          extension: getExtension(file.name, file.type),
          data,
        });

        return {
          assetId: storedFile.id,
          fileName: file.name,
          mimeType: storedFile.mimeType,
          fileSize: storedFile.fileSize,
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
    const ufs = new UserFileSystem(new UserFileDataMapper(getDb()));

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