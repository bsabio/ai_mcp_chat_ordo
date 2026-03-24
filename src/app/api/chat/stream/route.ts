import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKey } from "@/lib/config/env";
import { looksLikeMath } from "@/lib/chat/math-classifier";
import { createSystemPromptBuilder } from "@/lib/chat/policy";
import {
  errorJson,
  runRouteTemplate,
  successText,
  type RouteContext,
} from "@/lib/chat/http-facade";
import { runClaudeAgentLoopStream } from "@/lib/chat/anthropic-stream";
import { getToolRegistry, getToolExecutor } from "@/lib/chat/tool-composition-root";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import { getSessionUser } from "@/lib/auth";
import type { RoleName } from "@/core/entities/user";
import type { MessagePart } from "@/core/entities/message-parts";
import {
  createConversationRuntimeServices,
} from "@/lib/chat/conversation-root";
import { MessageLimitError } from "@/core/use-cases/ConversationInteractor";
import { resolveUserId } from "@/lib/chat/resolve-user";
import { buildContextWindow } from "@/lib/chat/context-window";
import { executeDirectChatTurn } from "@/lib/chat/chat-turn";
import {
  buildTaskOriginContextBlock,
  normalizeTaskOriginHandoff,
} from "@/lib/chat/task-origin-handoff";
import { UserFileDataMapper } from "@/adapters/UserFileDataMapper";
import { UserPreferencesDataMapper } from "@/adapters/UserPreferencesDataMapper";
import { getDb } from "@/lib/db";
import {
  buildMessageContextText,
  type AttachmentPart,
} from "@/lib/chat/message-attachments";
import { UserFileSystem } from "@/lib/user-files";
import { createConversationRoutingSnapshot } from "@/core/entities/conversation-routing";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ParsedRequestBody = {
  incomingMessages: ChatMessage[];
  incomingAttachments: AttachmentPart[];
  taskOriginHandoff: ReturnType<typeof normalizeTaskOriginHandoff>;
};

type ConversationState = {
  conversationId: string;
  services: ReturnType<typeof createConversationRuntimeServices>;
};

type StreamPreparation = {
  contextMessages: Array<{ role: "user" | "assistant"; content: string }>;
  systemPrompt: string;
};

function isAttachmentCandidate(value: unknown): value is Omit<AttachmentPart, "type"> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.assetId === "string" &&
    typeof candidate.fileName === "string" &&
    typeof candidate.mimeType === "string" &&
    typeof candidate.fileSize === "number"
  );
}

// Formats for SSE
function sseChunk(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function toStreamErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes("credit balance is too low")) {
    return "The configured Anthropic account has insufficient credits. Update the production AI key or billing, then retry.";
  }

  return message;
}

function parseRequestBody(body: {
  messages?: ChatMessage[];
  attachments?: unknown[];
  taskOriginHandoff?: unknown;
}): ParsedRequestBody {
  return {
    incomingMessages: body.messages ?? [],
    taskOriginHandoff: normalizeTaskOriginHandoff(body.taskOriginHandoff),
    incomingAttachments: (body.attachments ?? [])
      .filter(isAttachmentCandidate)
      .map((attachment) => ({
        type: "attachment" as const,
        assetId: attachment.assetId,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
      })),
  };
}

function applyTaskOriginHandoff(
  builder: Awaited<ReturnType<typeof createSystemPromptBuilder>>,
  taskOriginHandoff: ReturnType<typeof normalizeTaskOriginHandoff>,
): void {
  if (!taskOriginHandoff) {
    return;
  }

  builder.withSection({
    key: "task_origin_handoff",
    content: buildTaskOriginContextBlock(taskOriginHandoff),
    priority: 90,
  });
}

async function ensureConversationState(
  userId: string,
  request: NextRequest,
  services: ReturnType<typeof createConversationRuntimeServices>,
): Promise<ConversationState> {
  const { interactor } = services;
  const referralSource = request.cookies?.get("lms_referral_code")?.value || undefined;
  const conversation = await interactor.ensureActive(userId, { referralSource });

  return {
    conversationId: conversation.id,
    services,
  };
}

async function assignAttachmentsToConversation(
  userId: string,
  conversationId: string,
  attachments: AttachmentPart[],
) {
  if (attachments.length === 0) {
    return null;
  }

  const userFiles = new UserFileSystem(new UserFileDataMapper(getDb()));
  const attachmentIds: string[] = [];

  for (const attachment of attachments) {
    const uploaded = await userFiles.getById(attachment.assetId);
    if (!uploaded || uploaded.file.userId !== userId) {
      return false;
    }
    attachmentIds.push(attachment.assetId);
  }

  await userFiles.assignConversation(attachmentIds, userId, conversationId);
  return true;
}

async function persistUserMessage(
  interactor: ReturnType<typeof createConversationRuntimeServices>["interactor"],
  conversationId: string,
  userId: string,
  latestUserText: string,
  incomingAttachments: AttachmentPart[],
) {
  try {
    await interactor.appendMessage(
      {
        conversationId,
        role: "user",
        content: latestUserText,
        parts: [
          ...(latestUserText ? [{ type: "text" as const, text: latestUserText }] : []),
          ...incomingAttachments,
        ],
      },
      userId,
    );
    return null;
  } catch (error) {
    if (error instanceof MessageLimitError) {
      return error;
    }
    throw error;
  }
}

async function prepareStreamContext(
  builder: Awaited<ReturnType<typeof createSystemPromptBuilder>>,
  interactor: ReturnType<typeof createConversationRuntimeServices>["interactor"],
  routingAnalyzer: ReturnType<typeof createConversationRuntimeServices>["routingAnalyzer"],
  conversationId: string,
  userId: string,
  incomingMessages: ChatMessage[],
  latestUserText: string,
  latestUserContent: string,
  taskOriginHandoff: ReturnType<typeof normalizeTaskOriginHandoff>,
): Promise<StreamPreparation> {
  const allMessages = await interactor.getForStreamingContext(conversationId, userId);
  let routingSnapshot = createConversationRoutingSnapshot();

  try {
    routingSnapshot = await routingAnalyzer.analyze({
      conversation: allMessages.conversation,
      messages: allMessages.messages,
      latestUserText,
    });

    await interactor.updateRoutingSnapshot(conversationId, userId, routingSnapshot);
  } catch (error) {
    console.error("[stream] routing analysis error", error);
    routingSnapshot = allMessages.conversation.routingSnapshot;
  }

  const contextWindow = buildContextWindow(allMessages.messages);
  builder.withConversationSummary(contextWindow.summaryText);
  builder.withRoutingContext(routingSnapshot);
  applyTaskOriginHandoff(builder, taskOriginHandoff);

  return {
    contextMessages: contextWindow.contextMessages,
    systemPrompt: builder.build(),
  };
}

function prepareFallbackContext(
  builder: Awaited<ReturnType<typeof createSystemPromptBuilder>>,
  incomingMessages: ChatMessage[],
  latestUserContent: string,
  taskOriginHandoff: ReturnType<typeof normalizeTaskOriginHandoff>,
): StreamPreparation {
  builder.withRoutingContext(createConversationRoutingSnapshot());
  applyTaskOriginHandoff(builder, taskOriginHandoff);

  return {
    contextMessages: incomingMessages.map((message, index) => ({
      role: message.role,
      content:
        index === incomingMessages.length - 1 && message.role === "user"
          ? latestUserContent
          : message.content,
    })),
    systemPrompt: builder.build(),
  };
}

async function maybeHandleMathRequest(
  latestUserText: string,
  incomingMessages: ChatMessage[],
  conversationId: string,
  interactor: ReturnType<typeof createConversationRuntimeServices>["interactor"],
  user: Pick<Awaited<ReturnType<typeof getSessionUser>>, "id" | "roles">,
  userId: string,
  context: RouteContext,
) {
  if (!latestUserText || !looksLikeMath(latestUserText)) {
    return null;
  }

  const reply = await executeDirectChatTurn({
    incomingMessages,
    user: {
      id: userId || user.id,
      roles: user.roles,
    },
    route: context.route,
    requestId: context.requestId,
  });

  if (reply) {
    await interactor.appendMessage(
      {
        conversationId,
        role: "assistant",
        content: reply,
        parts: [{ type: "text", text: reply }],
      },
      userId,
    );
  }

  return successText(context, reply);
}

function createStreamResponse(options: {
  apiKey: string;
  context: RouteContext;
  conversationId: string;
  interactor: ReturnType<typeof createConversationRuntimeServices>["interactor"];
  summarizationInteractor: ReturnType<typeof createConversationRuntimeServices>["summarizationInteractor"];
  role: RoleName;
  userId: string;
  systemPrompt: string;
  contextMessages: Array<{ role: "user" | "assistant"; content: string }>;
  tools: Anthropic.Tool[];
  toolExecutor: (name: string, input: Record<string, unknown>) => Promise<unknown>;
}) {
  const encoder = new TextEncoder();
  const streamAbortController = new AbortController();
  const assistantParts: MessagePart[] = [];
  let assistantText = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(sseChunk({ conversation_id: options.conversationId })),
        );

        await runClaudeAgentLoopStream({
          apiKey: options.apiKey,
          messages: options.contextMessages as Anthropic.MessageParam[],
          signal: streamAbortController.signal,
          systemPrompt: options.systemPrompt,
          tools: options.tools,
          toolExecutor: options.toolExecutor,
          callbacks: {
            onDelta(text) {
              assistantText += text;
              assistantParts.push({ type: "text", text });
              controller.enqueue(encoder.encode(sseChunk({ delta: text })));
            },
            onToolCall(name, args) {
              assistantParts.push({ type: "tool_call", name, args });
              controller.enqueue(
                encoder.encode(sseChunk({ tool_call: { name, args } })),
              );
              options.interactor.recordToolUsed(options.conversationId, name, options.role)
                .catch((error) => console.error("[stream] tool usage event error", error));
            },
            onToolResult(name, result) {
              assistantParts.push({ type: "tool_result", name, result });
              controller.enqueue(
                encoder.encode(sseChunk({ tool_result: { name, result } })),
              );
            },
          },
        });

        let assistantPersisted = false;
        try {
          await options.interactor.appendMessage(
            {
              conversationId: options.conversationId,
              role: "assistant",
              content: assistantText,
              parts: assistantParts,
            },
            options.userId,
          );
          assistantPersisted = true;
        } catch (error) {
          console.error("[stream] persist assistant error", error);
          controller.enqueue(
            encoder.encode(sseChunk({ error: toStreamErrorMessage(error) })),
          );
        }

        if (assistantPersisted) {
          options.summarizationInteractor
            .summarizeIfNeeded(options.conversationId)
            .catch((error) => console.error("[stream] summarization error", error));
        }

        controller.close();
      } catch (error) {
        console.error("[stream] error", error);
        controller.enqueue(
          encoder.encode(sseChunk({ error: toStreamErrorMessage(error) })),
        );
        controller.close();
      }
    },
    cancel() {
      streamAbortController.abort();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "x-request-id": options.context.requestId,
    },
  });
}

export async function POST(request: NextRequest) {
  return runRouteTemplate({
    route: "/api/chat/stream",
    request,
    execute: async (context) => {
      const apiKey = getAnthropicApiKey();
      const user = await getSessionUser();
      const role = user.roles[0] as RoleName;
      const { userId } = await resolveUserId();
      const builder = await createSystemPromptBuilder(role);

      // Inject user preferences into system prompt (FND-003)
      if (!user.roles.includes("ANONYMOUS")) {
        const prefRepo = new UserPreferencesDataMapper(getDb());
        const userPrefs = await prefRepo.getAll(userId);
        builder.withUserPreferences(userPrefs);
      }

      const tools = getToolRegistry().getSchemasForRole(role) as Anthropic.Tool[];

      const execContext: ToolExecutionContext = {
        role,
        userId,
      };
      const toolExecutor = (name: string, input: Record<string, unknown>) =>
        getToolExecutor()(name, input, execContext);
      const services = createConversationRuntimeServices();

      const body = (await request.json()) as {
        messages?: ChatMessage[];
        conversationId?: string;
        attachments?: unknown[];
        taskOriginHandoff?: unknown;
      };
      const {
        incomingMessages,
        incomingAttachments,
        taskOriginHandoff,
      } = parseRequestBody(body);

      if (!Array.isArray(incomingMessages) || incomingMessages.length === 0) {
        return errorJson(context, "messages must be a non-empty array.", 400);
      }

      const latestUserMessage = [...incomingMessages]
        .reverse()
        .find((message) => message.role === "user")?.content;

      if (!latestUserMessage && incomingAttachments.length === 0) {
        return errorJson(context, "No user message found.", 400);
      }

      const latestUserText = latestUserMessage ?? "";
      const latestUserContent = buildMessageContextText(
        latestUserText,
        incomingAttachments,
      );

      const { conversationId } = await ensureConversationState(
        userId,
        request,
        services,
      );
      const { interactor, routingAnalyzer, summarizationInteractor } = services;

      const attachmentsAssigned = await assignAttachmentsToConversation(
        userId,
        conversationId,
        incomingAttachments,
      );
      if (attachmentsAssigned === false) {
        return errorJson(context, "Attachment not found.", 404);
      }

      const messageLimitError = await persistUserMessage(
        interactor,
        conversationId,
        userId,
        latestUserText,
        incomingAttachments,
      );
      if (messageLimitError) {
        return errorJson(context, messageLimitError.message, 400);
      }

      const preparation = await prepareStreamContext(
        builder,
        interactor,
        routingAnalyzer,
        conversationId,
        userId,
        incomingMessages,
        latestUserText,
        latestUserContent,
        taskOriginHandoff,
      ).catch(() => prepareFallbackContext(
        builder,
        incomingMessages,
        latestUserContent,
        taskOriginHandoff,
      ));

      const mathResult = await maybeHandleMathRequest(
        latestUserText,
        incomingMessages,
        conversationId,
        interactor,
        user,
        userId,
        context,
      );
      if (mathResult) {
        return mathResult;
      }

      return createStreamResponse({
        apiKey,
        context,
        conversationId,
        interactor,
        summarizationInteractor,
        role,
        userId,
        systemPrompt: preparation.systemPrompt,
        contextMessages: preparation.contextMessages,
        tools,
        toolExecutor,
      });
    },
  });
}
