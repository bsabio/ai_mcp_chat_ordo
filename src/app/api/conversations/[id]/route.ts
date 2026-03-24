import type { NextRequest } from "next/server";
import { validateSession } from "@/lib/auth";
import {
  runRouteTemplate,
  successJson,
  errorJson,
} from "@/lib/chat/http-facade";
import { createConversationRouteServices } from "@/lib/chat/conversation-root";
import { NotFoundError } from "@/core/use-cases/ConversationInteractor";

const SESSION_COOKIE = "lms_session_token";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRouteTemplate({
    route: "/api/conversations/[id]",
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
        const { conversation, messages } = await interactor.get(id, user.id);
        return successJson(context, { conversation, messages });
      } catch (err) {
        if (err instanceof NotFoundError) {
          return errorJson(context, "Conversation not found", 404);
        }
        throw err;
      }
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRouteTemplate({
    route: "/api/conversations/[id]",
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
        await interactor.delete(id, user.id);
        return successJson(context, { deleted: true });
      } catch (err) {
        if (err instanceof NotFoundError) {
          return errorJson(context, "Conversation not found", 404);
        }
        throw err;
      }
    },
  });
}
