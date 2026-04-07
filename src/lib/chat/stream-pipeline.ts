import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { looksLikeMath } from "@/lib/chat/math-classifier";
import type { createSystemPromptBuilder } from "@/lib/chat/policy";
import {
  errorJson,
  successText,
  type RouteContext,
} from "@/lib/chat/http-facade";
import { runClaudeAgentLoopStream } from "@/lib/chat/anthropic-stream";
import type { ToolCompositionResult } from "@/lib/chat/tool-composition-root";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import { getSessionUser } from "@/lib/auth";
import type { RoleName } from "@/core/entities/user";
import type { JobEvent, JobRequest } from "@/core/entities/job";
import type { MessagePart } from "@/core/entities/message-parts";
import type { createConversationRuntimeServices } from "@/lib/chat/conversation-root";
import { MessageLimitError } from "@/core/use-cases/ConversationInteractor";
import { resolveUserId } from "@/lib/chat/resolve-user";
import { buildContextWindow } from "@/lib/chat/context-window";
import { executeDirectChatTurn } from "@/lib/chat/chat-turn";
import {
  buildTaskOriginContextBlock,
  normalizeTaskOriginHandoff,
} from "@/lib/chat/task-origin-handoff";
import { UserFileDataMapper } from "@/adapters/UserFileDataMapper";
import { getDb } from "@/lib/db";
import type { AttachmentPart } from "@/lib/chat/message-attachments";
import { UserFileSystem } from "@/lib/user-files";
import { createConversationRoutingSnapshot } from "@/core/entities/conversation-routing";
import { getJobQueueRepository } from "@/adapters/RepositoryFactory";
import {
  createDeferredJobResultPayload,
  deferredJobResultToMessagePart,
  deferredJobResultToStreamEvent,
  isDeferredJobResultPayload,
} from "@/lib/jobs/deferred-job-result";
import { buildDeferredJobDedupeKey } from "@/lib/jobs/job-dedupe";
import {
  extractJobStatusSnapshots,
  jobStatusSnapshotToStreamEvent,
} from "@/lib/jobs/job-status-snapshots";
import { ChatStreamRequestSchema } from "@/app/api/chat/stream/schema";
import type { ChatStreamRequest } from "@/app/api/chat/stream/schema";
import {
  normalizeCurrentPageSnapshot,
  type CurrentPageSnapshot,
} from "@/lib/chat/current-page-context";
import { logDegradation, logFailure } from "@/lib/observability/logger";
import { REASON_CODES } from "@/lib/observability/reason-codes";
import {
  REFERRAL_VISIT_COOKIE_NAME,
  resolveValidatedReferralVisit,
} from "@/lib/referrals/referral-visit";
import { getReferralLedgerService } from "@/lib/referrals/referral-ledger";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ParsedRequestBody = {
  incomingMessages: ChatMessage[];
  incomingAttachments: AttachmentPart[];
  taskOriginHandoff: ReturnType<typeof normalizeTaskOriginHandoff>;
};

type NormalizedChatStreamRequest = Omit<ChatStreamRequest, "currentPageSnapshot"> & {
  currentPageSnapshot?: CurrentPageSnapshot;
};

type ConversationState = {
  conversationId: string;
  services: ReturnType<typeof createConversationRuntimeServices>;
};

type StreamPreparation = {
  contextMessages: Array<{ role: "user" | "assistant"; content: string }>;
  systemPrompt: string;
};

type DeferredToolExecutorOptions = {
  conversationId: string;
  isAnonymous: boolean;
  registry: ToolCompositionResult["registry"];
  baseExecutor: ToolCompositionResult["executor"];
  context: ToolExecutionContext;
};

/* ------------------------------------------------------------------ */
/*  Pure helpers                                                       */
/* ------------------------------------------------------------------ */

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

function buildSyntheticJobEvent(job: JobRequest): JobEvent {
  const eventType = job.status === "running" ? "progress" : "queued";
  return {
    id: `synthetic_${job.id}`,
    jobId: job.id,
    conversationId: job.conversationId,
    sequence: 0,
    eventType,
    payload: {
      progressPercent: job.progressPercent,
      progressLabel: job.progressLabel,
      errorMessage: job.errorMessage,
      result: job.resultPayload,
    },
    createdAt: job.updatedAt,
  };
}

/* ------------------------------------------------------------------ */
/*  ChatStreamPipeline                                                 */
/* ------------------------------------------------------------------ */

export class ChatStreamPipeline {
  /* ---- Session / Auth ---- */

  async resolveSession() {
    const user = await getSessionUser();
    const role = user.roles[0] as RoleName;
    const { userId, isAnonymous } = await resolveUserId();
    return { user, role, userId, isAnonymous };
  }

  /* ---- Request parsing ---- */

  validateAndParse(
    raw: unknown,
    context: RouteContext,
  ): { parsed: ParsedRequestBody; body: NormalizedChatStreamRequest } | Response {
    const parseResult = ChatStreamRequestSchema.safeParse(raw);
    if (!parseResult.success) {
      return errorJson(context, "messages must be a non-empty array.", 400);
    }
    const body = this.normalizeValidatedRequest(parseResult.data);
    const parsed = this.parseRequestBody(body);
    return { parsed, body };
  }

  /* ---- Conversation ---- */

  async ensureConversation(
    userId: string,
    request: NextRequest,
    services: ReturnType<typeof createConversationRuntimeServices>,
  ): Promise<ConversationState> {
    const { interactor } = services;
    const referralVisit = resolveValidatedReferralVisit(
      request.cookies?.get(REFERRAL_VISIT_COOKIE_NAME)?.value,
    );
    const conversation = await interactor.ensureActive(
      userId,
      referralVisit
        ? {
            referralSource: referralVisit.code,
          }
        : undefined,
    );

    if (referralVisit) {
      await getReferralLedgerService().attachValidatedVisitToConversation({
        conversationId: conversation.id,
        userId,
        visit: referralVisit,
      });
    }

    return {
      conversationId: conversation.id,
      services,
    };
  }

  /* ---- Attachments ---- */

  async assignAttachments(
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

  /* ---- User message persistence ---- */

  async persistUserMessage(
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

  /* ---- Routing analysis ---- */

  async prepareStreamContext(
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
      logDegradation(
        REASON_CODES.ROUTING_ANALYSIS_FAILED,
        "Routing analysis failed; proceeding with previous snapshot",
        { conversationId },
        error,
      );
      routingSnapshot = allMessages.conversation.routingSnapshot;
    }

    const contextWindow = buildContextWindow(allMessages.messages);
    builder.withConversationSummary(contextWindow.summaryText);
    builder.withRoutingContext(routingSnapshot);
    this.applyTaskOriginHandoff(builder, taskOriginHandoff);

    return {
      contextMessages: contextWindow.contextMessages,
      systemPrompt: builder.build(),
    };
  }

  prepareFallbackContext(
    builder: Awaited<ReturnType<typeof createSystemPromptBuilder>>,
    incomingMessages: ChatMessage[],
    latestUserContent: string,
    taskOriginHandoff: ReturnType<typeof normalizeTaskOriginHandoff>,
  ): StreamPreparation {
    builder.withRoutingContext(createConversationRoutingSnapshot());
    this.applyTaskOriginHandoff(builder, taskOriginHandoff);

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

  /* ---- Math short-circuit ---- */

  async checkMathShortCircuit(
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

  /* ---- Tool executor ---- */

  async createDeferredToolExecutor({
    conversationId,
    isAnonymous,
    registry,
    baseExecutor,
    context,
  }: DeferredToolExecutorOptions) {
    const queueRepository = getJobQueueRepository();

    return async (name: string, input: Record<string, unknown>) => {
      const descriptor = registry.getDescriptor(name);
      if (!descriptor || descriptor.executionMode !== "deferred") {
        return baseExecutor(name, input, context);
      }

      const dedupeKey = descriptor.deferred?.dedupeStrategy === "per-conversation-payload"
        ? buildDeferredJobDedupeKey(conversationId, name, input)
        : null;

      const existing = dedupeKey
        ? await queueRepository.findActiveJobByDedupeKey(conversationId, dedupeKey)
        : null;

      if (existing) {
        return createDeferredJobResultPayload(
          existing,
          buildSyntheticJobEvent(existing),
          { deduped: true },
        );
      }

      const job = await queueRepository.createJob({
        conversationId,
        userId: context.userId,
        toolName: name,
        dedupeKey,
        initiatorType: isAnonymous ? "anonymous_session" : "user",
        requestPayload: input,
      });

      const queuedEvent = await queueRepository.appendEvent({
        jobId: job.id,
        conversationId,
        eventType: "queued",
        payload: {
          toolName: name,
        },
      });

      return createDeferredJobResultPayload(job, queuedEvent);
    };
  }

  /* ---- Stream response ---- */

  createStreamResponse(options: {
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
                  .catch((error) => logDegradation(REASON_CODES.TOOL_EXECUTION_FAILED, "Tool usage event recording failed", { tool: name }, error));
              },
              onToolResult(name, result) {
                assistantParts.push({ type: "tool_result", name, result });
                controller.enqueue(
                  encoder.encode(sseChunk({ tool_result: { name, result } })),
                );

                if (isDeferredJobResultPayload(result)) {
                  const streamEvent = deferredJobResultToStreamEvent(result);
                  assistantParts.push(deferredJobResultToMessagePart(result));
                  controller.enqueue(encoder.encode(sseChunk(streamEvent as unknown as Record<string, unknown>)));
                  return;
                }

                const jobSnapshots = extractJobStatusSnapshots(result);
                for (const snapshot of jobSnapshots) {
                  assistantParts.push(snapshot.part);
                  controller.enqueue(
                    encoder.encode(
                      sseChunk(jobStatusSnapshotToStreamEvent(snapshot, options.conversationId) as unknown as Record<string, unknown>),
                    ),
                  );
                }
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
            logFailure(REASON_CODES.MESSAGE_PERSIST_FAILED, "Failed to persist assistant message", { conversationId: options.conversationId }, error);
            controller.enqueue(
              encoder.encode(sseChunk({ error: toStreamErrorMessage(error) })),
            );
          }

          if (assistantPersisted) {
            options.summarizationInteractor
              .summarizeIfNeeded(options.conversationId)
              .catch((error) => logDegradation(REASON_CODES.CONVERSATION_LOOKUP_FAILED, "Summarization failed", { conversationId: options.conversationId }, error));
          }

          controller.close();
        } catch (error) {
          logFailure(REASON_CODES.UNKNOWN_ROUTE_ERROR, "Unexpected stream error", {}, error);
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

  /* ---- Private helpers ---- */

  private normalizeValidatedRequest(body: ChatStreamRequest): NormalizedChatStreamRequest {
    const { currentPageSnapshot, ...rest } = body;
    const normalizedSnapshot = normalizeCurrentPageSnapshot(currentPageSnapshot);

    if (!normalizedSnapshot) {
      return rest;
    }

    return {
      ...rest,
      currentPageSnapshot: normalizedSnapshot,
    };
  }

  private parseRequestBody(body: {
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

  private applyTaskOriginHandoff(
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
}
