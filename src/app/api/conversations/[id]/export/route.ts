import type { NextRequest } from "next/server";

import { NotFoundError } from "@/core/use-cases/ConversationInteractor";
import { createConversationRouteServices } from "@/lib/chat/conversation-root";
import { errorJson, runRouteTemplate, successText } from "@/lib/chat/http-facade";
import { resolveUserId } from "@/lib/chat/resolve-user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRouteTemplate({
    route: "/api/conversations/[id]/export",
    request,
    validationMessages: [],
    execute: async (context) => {
      const { userId } = await resolveUserId();
      const { id } = await params;
      const { interactor } = createConversationRouteServices();

      try {
        const payload = await interactor.exportConversation(id, userId);
        return successText(
          context,
          `${JSON.stringify(payload, null, 2)}\n`,
          {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="conversation-${id}.json"`,
          },
        );
      } catch (error) {
        if (error instanceof NotFoundError) {
          return errorJson(context, "Conversation not found", 404);
        }

        throw error;
      }
    },
  });
}