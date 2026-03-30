import type { NextRequest } from "next/server";
import { getJobQueueRepository } from "@/adapters/RepositoryFactory";
import { NotFoundError } from "@/core/use-cases/ConversationInteractor";
import { resolveUserId } from "@/lib/chat/resolve-user";
import { createConversationRouteServices } from "@/lib/chat/conversation-root";
import { errorJson, runRouteTemplate, type RouteContext } from "@/lib/chat/http-facade";
import { createJobEventStreamResponse } from "@/lib/jobs/job-event-stream";

const DEFAULT_POLL_INTERVAL_MS = 500;
const DEFAULT_STREAM_WINDOW_MS = 25_000;
const DEFAULT_BATCH_LIMIT = 100;

function parsePositiveInteger(value: string | null | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

async function resolveConversationId(request: NextRequest, context: RouteContext): Promise<string | Response> {
  const requestedConversationId = request.nextUrl.searchParams.get("conversationId");
  const { interactor } = createConversationRouteServices();
  const { userId } = await resolveUserId();

  if (requestedConversationId) {
    try {
      await interactor.get(requestedConversationId, userId);
      return requestedConversationId;
    } catch (error) {
      if (error instanceof NotFoundError) {
        return errorJson(context, "Conversation not found", 404);
      }
      throw error;
    }
  }

  const active = await interactor.getActiveForUser(userId);
  if (!active) {
    return errorJson(context, "No active conversation", 404);
  }

  return active.conversation.id;
}

export async function GET(request: NextRequest) {
  return runRouteTemplate({
    route: "/api/chat/events",
    request,
    validationMessages: [],
    execute: async (context) => {
      const resolvedConversationId = await resolveConversationId(request, context);
      if (resolvedConversationId instanceof Response) {
        return resolvedConversationId;
      }

      const initialAfterSequence = parsePositiveInteger(
        request.nextUrl.searchParams.get("afterSequence")
          ?? request.headers.get("last-event-id")
          ?? undefined,
        0,
      );
      const pollIntervalMs = parsePositiveInteger(
        process.env.JOB_EVENT_STREAM_POLL_INTERVAL_MS,
        DEFAULT_POLL_INTERVAL_MS,
      );
      const streamWindowMs = parsePositiveInteger(
        process.env.JOB_EVENT_STREAM_MAX_DURATION_MS,
        DEFAULT_STREAM_WINDOW_MS,
      );

      const repository = getJobQueueRepository();

      return createJobEventStreamResponse({
        request,
        requestId: context.requestId,
        initialAfterSequence,
        pollIntervalMs,
        streamWindowMs,
        batchLimit: DEFAULT_BATCH_LIMIT,
        listEvents: (afterSequence, limit) => repository.listConversationEvents(resolvedConversationId, {
          afterSequence,
          limit,
        }),
        findJobById: (jobId) => repository.findJobById(jobId),
      });
    },
  });
}