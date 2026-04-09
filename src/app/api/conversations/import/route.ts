import type { NextRequest } from "next/server";

import { parseConversationImportPayload } from "@/lib/chat/conversation-portability";
import { createConversationRouteServices } from "@/lib/chat/conversation-root";
import { errorJson, runRouteTemplate, successJson } from "@/lib/chat/http-facade";
import { resolveUserId } from "@/lib/chat/resolve-user";

async function readImportPayload(request: NextRequest): Promise<string> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const payload = formData.get("payload");
    if (typeof payload === "string" && payload.trim()) {
      return payload;
    }

    const file = formData.get("file");
    if (file instanceof File) {
      return file.text();
    }

    throw new Error("Import payload is required.");
  }

  const body = await request.json().catch(() => null) as unknown;
  if (typeof body === "string") {
    return body;
  }

  if (body && typeof body === "object" && "payload" in body) {
    const payload = (body as { payload?: unknown }).payload;
    if (typeof payload === "string") {
      return payload;
    }

    return JSON.stringify(payload);
  }

  return JSON.stringify(body);
}

export async function POST(request: NextRequest) {
  return runRouteTemplate({
    route: "/api/conversations/import",
    request,
    validationMessages: [],
    execute: async (context) => {
      const { userId } = await resolveUserId();
      const { interactor } = createConversationRouteServices();

      try {
        const rawPayload = await readImportPayload(request);
        const importedConversation = parseConversationImportPayload(rawPayload);
        const result = await interactor.importConversation(userId, importedConversation);

        return successJson(context, {
          conversation: result.conversation,
          messages: result.messages,
        }, { status: 201 });
      } catch (error) {
        return errorJson(
          context,
          error instanceof Error ? error.message : "Unable to import conversation.",
          400,
        );
      }
    },
  });
}