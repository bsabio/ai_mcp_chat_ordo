import type { NextRequest } from "next/server";
import { validateSession } from "@/lib/auth";
import {
  runRouteTemplate,
  successJson,
  errorJson,
} from "@/lib/chat/http-facade";
import { createConversationRouteServices } from "@/lib/chat/conversation-root";
import { ConversationValidationError, NotFoundError } from "@/core/use-cases/ConversationInteractor";

const SESSION_COOKIE = "lms_session_token";

function parseConversationAction(value: unknown): "rename" | "archive" | "move_to_trash" | null {
  return value === "rename" || value === "archive" || value === "move_to_trash"
    ? value
    : null;
}

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRouteTemplate({
    route: "/api/conversations/[id]",
    request,
    validationMessages: ["Invalid conversation action."],
    execute: async (context) => {
      const token = request.cookies.get(SESSION_COOKIE)?.value;
      if (!token) {
        return errorJson(context, "Authentication required", 401);
      }

      const user = await validateSession(token);
      const { id } = await params;
      const { interactor } = createConversationRouteServices();
      const body = await request.json().catch(() => ({}));
      const action = parseConversationAction((body as { action?: unknown }).action);

      if (!action) {
        throw new Error("Invalid conversation action.");
      }

      try {
        if (action === "rename") {
          await interactor.rename(id, user.id, String((body as { title?: unknown }).title ?? ""));
          return successJson(context, { ok: true, action, renamed: true });
        }

        if (action === "archive") {
          await interactor.archive(id, user.id);
          return successJson(context, { ok: true, action, archived: true });
        }

        await interactor.delete(id, user.id);
        return successJson(context, { ok: true, action, deleted: true });
      } catch (err) {
        if (err instanceof NotFoundError) {
          return errorJson(context, "Conversation not found", 404);
        }
        if (err instanceof ConversationValidationError) {
          return errorJson(context, err.message, 400);
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
