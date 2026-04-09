import type { NextRequest } from "next/server";

import { validateSession } from "@/lib/auth";
import { createConversationRouteServices } from "@/lib/chat/conversation-root";
import { errorJson, runRouteTemplate, successJson } from "@/lib/chat/http-facade";
import { NotFoundError } from "@/core/use-cases/ConversationInteractor";

const SESSION_COOKIE = "lms_session_token";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRouteTemplate({
    route: "/api/conversations/[id]/restore",
    request,
    validationMessages: [],
    execute: async (context) => {
      const token = request.cookies.get(SESSION_COOKIE)?.value;
      if (!token) {
        return errorJson(context, "Authentication required", 401);
      }

      const user = await validateSession(token);
      const { id } = await params;
      const { interactor } = createConversationRouteServices();

      try {
        await interactor.restore(id, user.id);
        return successJson(context, { restored: true });
      } catch (err) {
        if (err instanceof NotFoundError) {
          return errorJson(context, "Conversation not found", 404);
        }
        throw err;
      }
    },
  });
}