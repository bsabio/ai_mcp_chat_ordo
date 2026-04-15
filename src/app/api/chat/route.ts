import type { NextRequest } from "next/server";
import { runRouteTemplate, successJson } from "@/lib/chat/http-facade";
import { getSessionUser } from "@/lib/auth";
import { executeDirectChatTurn } from "@/lib/chat/chat-turn";
import { validateAndParseDirectChatRequest } from "@/lib/chat/direct-turn-intake";

export async function POST(request: NextRequest) {
  return runRouteTemplate({
    route: "/api/chat",
    request,
    execute: async (context) => {
      const { incomingMessages } = validateAndParseDirectChatRequest(
        await request.json(),
      );
      const user = await getSessionUser();
      const reply = await executeDirectChatTurn({
        incomingMessages,
        user,
        route: context.route,
        requestId: context.requestId,
      });

      return successJson(context, { reply });
    },
  });
}
