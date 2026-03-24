import type { NextRequest } from "next/server";
import {
  runRouteTemplate,
  successJson,
  errorJson,
} from "@/lib/chat/http-facade";
import { createConversationRouteServices } from "@/lib/chat/conversation-root";
import { resolveUserId } from "@/lib/chat/resolve-user";
import { embedConversation } from "@/lib/chat/embed-conversation";

export async function POST(request: NextRequest) {
  return runRouteTemplate({
    route: "/api/conversations/active/archive",
    request,
    validationMessages: [],
    execute: async (context) => {
      const { userId, isAnonymous } = await resolveUserId();
      const { interactor } = createConversationRouteServices();
      const archived = await interactor.archiveActive(userId);

      if (!archived) {
        return errorJson(context, "No active conversation to archive", 404);
      }

      // Embed conversation for search (authenticated users only, async)
      if (!isAnonymous) {
        embedConversation(archived.id, userId).catch((err) =>
          console.error("[archive] embedding error", err),
        );
      }

      return successJson(context, { archived: true, conversationId: archived.id });
    },
  });
}
