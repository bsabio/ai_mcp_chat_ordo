import type { NextRequest } from "next/server";
import { validateSession } from "@/lib/auth";
import {
  runRouteTemplate,
  successJson,
  errorJson,
} from "@/lib/chat/http-facade";
import { createConversationRouteServices } from "@/lib/chat/conversation-root";
import type { ConversationListScope } from "@/core/use-cases/ConversationRepository";

const SESSION_COOKIE = "lms_session_token";

function parseConversationScope(request: NextRequest): ConversationListScope | undefined {
  const raw = request.nextUrl.searchParams.get("scope");

  if (raw === "active" || raw === "archived" || raw === "deleted" || raw === "all") {
    return raw;
  }

  return undefined;
}

export async function GET(request: NextRequest) {
  return runRouteTemplate({
    route: "/api/conversations",
    request,
    validationMessages: [],
    execute: async (context) => {
      const token = request.cookies.get(SESSION_COOKIE)?.value;
      if (!token) {
        return errorJson(context, "Authentication required", 401);
      }

      const user = await validateSession(token);
      const { interactor } = createConversationRouteServices();
      const scope = parseConversationScope(request);
      const conversations = scope
        ? await interactor.list(user.id, { scope })
        : await interactor.list(user.id);

      return successJson(context, { conversations });
    },
  });
}

export async function POST(request: NextRequest) {
  return runRouteTemplate({
    route: "/api/conversations",
    request,
    validationMessages: [],
    execute: async (context) => {
      const token = request.cookies.get(SESSION_COOKIE)?.value;
      if (!token) {
        return errorJson(context, "Authentication required", 401);
      }

      const user = await validateSession(token);
    const { interactor } = createConversationRouteServices();
      const conversation = await interactor.ensureActive(user.id);

      return successJson(context, { conversation }, { status: 201 });
    },
  });
}
