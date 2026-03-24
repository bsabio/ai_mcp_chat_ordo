import type { NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth";
import {
  getConversationEventRecorder,
  getDealRecordRepository,
} from "@/lib/chat/conversation-root";
import { errorJson, runRouteTemplate, successJson } from "@/lib/chat/http-facade";

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return runRouteTemplate({
    route: "/api/deals/[id]/response",
    request,
    validationMessages: [
      "id is required.",
      "response must be agreed or declined.",
      "note must be 1000 characters or fewer.",
    ],
    execute: async (routeContext) => {
      const user = await getSessionUser();

      if (user.roles.includes("ANONYMOUS")) {
        return errorJson(routeContext, "Deals require an authenticated session.", 403);
      }

      const { id } = await context.params;

      if (!id) {
        return errorJson(routeContext, "id is required.", 400);
      }

      const body = (await request.json().catch(() => null)) as {
        response?: unknown;
        note?: unknown;
      } | null;
      const responseValue = typeof body?.response === "string" ? body.response.trim() : "";
      const note = normalizeOptionalString(body?.note);

      if (responseValue !== "agreed" && responseValue !== "declined") {
        return errorJson(routeContext, "response must be agreed or declined.", 400);
      }

      if (note && note.length > 1000) {
        return errorJson(routeContext, "note must be 1000 characters or fewer.", 400);
      }

      const repo = getDealRecordRepository();
      const deal = await repo.findById(id);

      if (!deal) {
        return errorJson(routeContext, "Deal not found.", 404);
      }

      if (deal.userId !== user.id) {
        return errorJson(routeContext, "You do not have access to this deal.", 403);
      }

      if (deal.status !== "estimate_ready" && deal.status !== "agreed" && deal.status !== "declined") {
        return errorJson(routeContext, "Deal responses are only available once the founder marks the deal estimate_ready.", 422);
      }

      if (deal.status === "agreed" || deal.status === "declined") {
        return errorJson(routeContext, "Final deal responses cannot be recorded twice.", 422);
      }

      const updatedDeal = await repo.updateStatus(id, responseValue, {
        customerResponseNote: note,
      });

      await getConversationEventRecorder().record(deal.conversationId, "deal_customer_response_recorded", {
        userId: user.id,
        dealId: deal.id,
        fromStatus: deal.status,
        toStatus: responseValue,
        note,
      });

      return successJson(routeContext, {
        ok: true,
        deal: updatedDeal,
      });
    },
  });
}