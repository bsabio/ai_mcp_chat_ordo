import type { NextRequest } from "next/server";
import {
  getLatestUserMessage,
  parseIncomingMessages,
} from "@/lib/chat/validation";
import { runRouteTemplate, successJson } from "@/lib/chat/http-facade";
import { getSessionUser } from "@/lib/auth";
import { executeDirectChatTurn } from "@/lib/chat/chat-turn";

export async function POST(request: NextRequest) {
  return runRouteTemplate({
    route: "/api/chat",
    request,
    execute: async (context) => {
      const body = await request.json();
      const incomingMessages = parseIncomingMessages(body);
      getLatestUserMessage(incomingMessages);
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
