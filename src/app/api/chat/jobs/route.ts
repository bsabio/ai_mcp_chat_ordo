import type { NextRequest } from "next/server";
import { getJobQueueRepository, getJobStatusQuery } from "@/adapters/RepositoryFactory";
import { NotFoundError } from "@/core/use-cases/ConversationInteractor";
import { createConversationRouteServices } from "@/lib/chat/conversation-root";
import { resolveUserId } from "@/lib/chat/resolve-user";
import { errorJson, runRouteTemplate, successJson } from "@/lib/chat/http-facade";
import { enqueueComposeMediaDeferredJob, InvalidComposeMediaDeferredJobError } from "@/lib/jobs/compose-media-deferred-job";
import { buildJobStatusSnapshot } from "@/lib/jobs/job-read-model";
import { getActiveJobStatuses } from "@/lib/jobs/job-read-model";
import { isRegisteredJobCapability } from "@/lib/jobs/job-capability-registry";

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function resolveConversationId(request: NextRequest, userId: string): Promise<string | null> {
  const requestedConversationId = request.nextUrl.searchParams.get("conversationId");
  const { interactor } = createConversationRouteServices();

  if (requestedConversationId) {
    try {
      await interactor.get(requestedConversationId, userId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return requestedConversationId;
      }
      throw error;
    }
    return requestedConversationId;
  }

  const active = await interactor.getActiveForUser(userId);
  return active?.conversation.id ?? null;
}

export async function GET(request: NextRequest) {
  return runRouteTemplate({
    route: "/api/chat/jobs",
    request,
    validationMessages: [],
    execute: async (context) => {
      const { userId } = await resolveUserId();
      const requestedConversationId = request.nextUrl.searchParams.get("conversationId");
      const conversationId = await resolveConversationId(request, userId);
      const resolvedConversationId = conversationId ?? requestedConversationId;

      if (!resolvedConversationId) {
        return errorJson(
          context,
          "No active conversation",
          404,
        );
      }

      const activeOnly = request.nextUrl.searchParams.get("activeOnly") === "true";
      const limit = parsePositiveInteger(request.nextUrl.searchParams.get("limit"), 25);

      const jobs = await getJobStatusQuery().listConversationJobSnapshots(resolvedConversationId, {
        statuses: activeOnly ? getActiveJobStatuses() : undefined,
        limit,
      });

      return successJson(context, {
        ok: true,
        conversationId: resolvedConversationId,
        jobs,
      });
    },
  });
}

/**
 * POST /api/chat/jobs
 *
 * Enqueues a compose_media deferred server job when the hybrid router has
 * selected `deferred_server` or a browser attempt has fallen back.
 *
 * Body: { toolName: "compose_media", conversationId: string, plan: unknown }
 */
export async function POST(request: NextRequest) {
  return runRouteTemplate({
    route: "POST /api/chat/jobs",
    request,
    execute: async (context) => {
      const { userId } = await resolveUserId();

      let body: unknown;
      try {
        body = await request.json();
      } catch (error) {
        void error;
        return errorJson(context, "Request body must be valid JSON", 400);
      }

      if (typeof body !== "object" || body === null) {
        return errorJson(context, "Request body must be an object", 400);
      }

      const raw = body as Record<string, unknown>;
      const toolName = raw["toolName"];

      if (toolName !== "compose_media") {
        return errorJson(context, `Unsupported tool for media enqueue: ${String(toolName)}`, 400);
      }

      if (!isRegisteredJobCapability(toolName)) {
        return errorJson(context, `Tool is not a registered job capability: ${toolName}`, 400);
      }

      const conversationId = typeof raw["conversationId"] === "string"
        ? raw["conversationId"].trim()
        : null;

      if (!conversationId) {
        return errorJson(context, "conversationId is required", 400);
      }

      // Authorize: conversation must belong to the requesting user
      const { interactor } = createConversationRouteServices();
      try {
        await interactor.get(conversationId, userId);
      } catch (err) {
        if (err instanceof NotFoundError) {
          return errorJson(context, "Conversation not found or access denied", 404);
        }
        throw err;
      }

      try {
        const result = await enqueueComposeMediaDeferredJob({
          repository: getJobQueueRepository(),
          conversationId,
          userId,
          plan: raw["plan"],
          initiatorType: "user",
          priority: 5,
        });

        return successJson(
          context,
          {
            ok: true,
            jobId: result.job.id,
            deduplicated: result.deduplicated,
            job: buildJobStatusSnapshot(result.job, result.event),
          },
          { status: result.deduplicated ? 200 : 201 },
        );
      } catch (error) {
        if (error instanceof InvalidComposeMediaDeferredJobError) {
          return errorJson(context, error.message, 400);
        }

        throw error;
      }
    },
  });
}