import type { NextRequest } from "next/server";
import { getJobStatusQuery } from "@/adapters/RepositoryFactory";
import { NotFoundError } from "@/core/use-cases/ConversationInteractor";
import { createConversationRouteServices } from "@/lib/chat/conversation-root";
import { resolveUserId } from "@/lib/chat/resolve-user";
import { errorJson, runRouteTemplate, successJson } from "@/lib/chat/http-facade";
import { getActiveJobStatuses } from "@/lib/jobs/job-read-model";

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