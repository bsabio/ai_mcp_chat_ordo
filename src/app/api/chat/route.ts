import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { getAnthropicApiKey } from "@/lib/config/env";
import { looksLikeMath } from "@/lib/chat/policy";
import { orchestrateChatTurn } from "@/lib/chat/orchestrator";
import { getLatestUserMessage, parseIncomingMessages, toAnthropicMessages } from "@/lib/chat/validation";
import { createAnthropicProvider } from "@/lib/chat/anthropic-client";
import { withProviderErrorMapping, withProviderTiming } from "@/lib/chat/provider-decorators";
import { runRouteTemplate, successJson } from "@/lib/chat/http-facade";
import { logEvent } from "@/lib/observability/logger";

export async function POST(request: NextRequest) {
  return runRouteTemplate({
    route: "/api/chat",
    request,
    execute: async (context) => {
      const body = await request.json();
      const incomingMessages = parseIncomingMessages(body);
      const latestUserMessage = getLatestUserMessage(incomingMessages);
      const apiKey = getAnthropicApiKey();
      const conversation = toAnthropicMessages(incomingMessages);

      const client = new Anthropic({ apiKey });
      const provider = withProviderTiming(
        withProviderErrorMapping(createAnthropicProvider(client)),
        ({ durationMs, isError }) => {
          logEvent("info", "provider.call", {
            route: context.route,
            requestId: context.requestId,
            durationMs,
            isError,
          });
        },
      );

      const toolChoice: { type: "auto" } | { type: "tool"; name: "calculator" } = looksLikeMath(latestUserMessage)
        ? { type: "tool", name: "calculator" }
        : { type: "auto" };

      const reply = await orchestrateChatTurn({
        provider,
        conversation,
        toolChoice,
      });

      return successJson(context, { reply });
    },
  });
}
