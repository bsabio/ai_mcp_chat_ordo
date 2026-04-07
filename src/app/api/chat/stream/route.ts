import type { NextRequest } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKey } from "@/lib/config/env";
import { createSystemPromptBuilder } from "@/lib/chat/policy";
import { errorJson, runRouteTemplate } from "@/lib/chat/http-facade";
import { getToolComposition } from "@/lib/chat/tool-composition-root";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import { createConversationRuntimeServices } from "@/lib/chat/conversation-root";
import { UserPreferencesDataMapper } from "@/adapters/UserPreferencesDataMapper";
import { getDb } from "@/lib/db";
import { buildMessageContextText } from "@/lib/chat/message-attachments";
import { ChatStreamPipeline } from "@/lib/chat/stream-pipeline";
import { getReferralLedgerService } from "@/lib/referrals/referral-ledger";
const pipeline = new ChatStreamPipeline();

export async function POST(request: NextRequest) {
  return runRouteTemplate({
    route: "/api/chat/stream",
    request,
    execute: async (context) => {
      const apiKey = getAnthropicApiKey();
      const { user, role, userId, isAnonymous } = await pipeline.resolveSession();

      const parseResultOrResponse = pipeline.validateAndParse(await request.json(), context);
      if (parseResultOrResponse instanceof Response) return parseResultOrResponse;
      const { parsed: { incomingMessages, incomingAttachments, taskOriginHandoff }, body } = parseResultOrResponse;

      const systemPromptOptions = {
        ...(body.currentPathname ? { currentPathname: body.currentPathname } : {}),
        ...(body.currentPageSnapshot ? { currentPageSnapshot: body.currentPageSnapshot } : {}),
      };
      const builder = await createSystemPromptBuilder(role, systemPromptOptions);
      const { registry: toolRegistry, executor: baseToolExecutor } = getToolComposition();

      if (!user.roles.includes("ANONYMOUS")) {
        const prefRepo = new UserPreferencesDataMapper(getDb());
        const userPrefs = await prefRepo.getAll(userId);
        builder.withUserPreferences(userPrefs);
      }

      const tools = toolRegistry.getSchemasForRole(role) as Anthropic.Tool[];
      builder.withToolManifest(tools.map(t => ({ name: t.name, description: t.description ?? "" })));
      const services = createConversationRuntimeServices();

      const latestUserMessage = [...incomingMessages]
        .reverse()
        .find((m) => m.role === "user")?.content;
      if (!latestUserMessage && incomingAttachments.length === 0) {
        return errorJson(context, "No user message found.", 400);
      }

      const latestUserText = latestUserMessage ?? "";
      const latestUserContent = buildMessageContextText(latestUserText, incomingAttachments);

      const { conversationId } = await pipeline.ensureConversation(userId, request, services);
      builder.withTrustedReferralContext(await getReferralLedgerService().getTrustedReferrerContext(conversationId));
      const execContext: ToolExecutionContext = {
        role,
        userId,
        conversationId,
        ...(body.currentPathname ? { currentPathname: body.currentPathname } : {}),
        ...(body.currentPageSnapshot ? { currentPageSnapshot: body.currentPageSnapshot } : {}),
      };
      const toolExecutor = await pipeline.createDeferredToolExecutor({
        conversationId, isAnonymous, registry: toolRegistry, baseExecutor: baseToolExecutor, context: execContext,
      });
      const { interactor, routingAnalyzer, summarizationInteractor } = services;

      const attachmentsAssigned = await pipeline.assignAttachments(userId, conversationId, incomingAttachments);
      if (attachmentsAssigned === false) return errorJson(context, "Attachment not found.", 404);

      const messageLimitError = await pipeline.persistUserMessage(interactor, conversationId, userId, latestUserText, incomingAttachments);
      if (messageLimitError) return errorJson(context, messageLimitError.message, 400);

      const preparation = await pipeline.prepareStreamContext(
        builder, interactor, routingAnalyzer, conversationId, userId,
        incomingMessages, latestUserText, latestUserContent, taskOriginHandoff,
      ).catch(() => pipeline.prepareFallbackContext(builder, incomingMessages, latestUserContent, taskOriginHandoff));

      const mathResult = await pipeline.checkMathShortCircuit(
        latestUserText, incomingMessages, conversationId, interactor, user, userId, context,
      );
      if (mathResult) return mathResult;

      return pipeline.createStreamResponse({
        apiKey, context, conversationId, interactor, summarizationInteractor,
        role, userId, systemPrompt: preparation.systemPrompt,
        contextMessages: preparation.contextMessages, tools, toolExecutor,
      });
    },
  });
}
