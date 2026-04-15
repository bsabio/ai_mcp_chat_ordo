import type { User } from "@/core/entities/user";
import type { JobStatusQuery } from "@/core/use-cases/JobStatusQuery";
import { executeDirectChatTurn } from "@/lib/chat/chat-turn";
import {
  createEmptyChatSlashCommandMessage,
  createUnsupportedChatSlashCommandMessage,
  resolveChatSlashCommand,
} from "@/lib/chat/chat-slash-commands";
import type { createConversationRuntimeServices } from "@/lib/chat/conversation-root";
import type { RouteContext } from "@/lib/chat/http-facade";
import { looksLikeMath } from "@/lib/chat/math-classifier";
import { logDegradation } from "@/lib/observability/logger";
import { REASON_CODES } from "@/lib/observability/reason-codes";
import { recordPromptTurnProvenance } from "@/lib/prompts/prompt-provenance-service";

import type { ChatMessage } from "@/lib/chat/stream-intake";
import {
  appendShortCircuitAssistantMessage,
  attachPromptProvenanceRecord,
  createShortCircuitStreamResponse,
} from "@/lib/chat/stream-response-helpers";

export async function maybeHandleSlashCommand(options: {
  latestUserText: string;
  conversationId: string;
  userId: string;
  role: User["roles"][number];
  isAnonymous: boolean;
  interactor: ReturnType<typeof createConversationRuntimeServices>["interactor"];
  summarizationInteractor: ReturnType<typeof createConversationRuntimeServices>["summarizationInteractor"];
  jobStatusQuery: JobStatusQuery;
  context: RouteContext;
}): Promise<Response | null> {
  const resolvedCommand = resolveChatSlashCommand(options.latestUserText);
  if (!resolvedCommand) {
    return null;
  }

  if (resolvedCommand.kind === "empty") {
    const replyText = createEmptyChatSlashCommandMessage();
    await appendShortCircuitAssistantMessage(
      options.interactor,
      options.conversationId,
      options.userId,
      replyText,
    );
    return createShortCircuitStreamResponse(options.context, options.conversationId, replyText);
  }

  if (resolvedCommand.kind === "unsupported") {
    const replyText = createUnsupportedChatSlashCommandMessage(resolvedCommand.commandName);
    await appendShortCircuitAssistantMessage(
      options.interactor,
      options.conversationId,
      options.userId,
      replyText,
    );
    return createShortCircuitStreamResponse(options.context, options.conversationId, replyText);
  }

  const result = await resolvedCommand.command.execute({
    conversationId: options.conversationId,
    userId: options.userId,
    role: options.role,
    isAnonymous: options.isAnonymous,
    interactor: options.interactor,
    summarizationInteractor: options.summarizationInteractor,
    jobStatusQuery: options.jobStatusQuery,
  });

  return createShortCircuitStreamResponse(
    options.context,
    result.conversationId,
    result.streamText === undefined ? result.replyText : result.streamText,
  );
}

export async function checkMathShortCircuit(options: {
  latestUserText: string;
  incomingMessages: ChatMessage[];
  conversationId: string;
  interactor: ReturnType<typeof createConversationRuntimeServices>["interactor"];
  user: Pick<User, "id" | "roles">;
  userId: string;
  context: RouteContext;
  userMessageId: string | null;
}): Promise<Response | null> {
  if (!options.latestUserText || !looksLikeMath(options.latestUserText)) {
    return null;
  }

  let promptProvenanceRecordId: string | null = null;

  const reply = await executeDirectChatTurn({
    incomingMessages: options.incomingMessages,
    user: {
      id: options.userId || options.user.id,
      roles: options.user.roles,
    },
    route: options.context.route,
    requestId: options.context.requestId,
    onPromptBuilt: async ({ promptRuntime, replayContext }) => {
      if (!options.userMessageId || !replayContext) {
        return;
      }

      try {
        const record = await recordPromptTurnProvenance({
          conversationId: options.conversationId,
          userMessageId: options.userMessageId,
          promptRuntime,
          replayContext,
        });
        promptProvenanceRecordId = record.id;
      } catch (error) {
        logDegradation(
          REASON_CODES.UNKNOWN_ROUTE_ERROR,
          "Math short-circuit prompt provenance recording failed",
          { conversationId: options.conversationId, userMessageId: options.userMessageId },
          error,
        );
      }
    },
  });

  if (reply) {
    const message = await options.interactor.appendMessage(
      {
        conversationId: options.conversationId,
        role: "assistant",
        content: reply,
        parts: [{ type: "text", text: reply }],
      },
      options.userId,
    );

    await attachPromptProvenanceRecord(
      options.conversationId,
      promptProvenanceRecordId,
      message.id,
    );
  }

  return createShortCircuitStreamResponse(options.context, options.conversationId, reply);
}