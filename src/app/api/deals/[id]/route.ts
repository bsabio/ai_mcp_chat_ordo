import type { NextRequest } from "next/server";

import type { DealRecord } from "@/core/entities/deal-record";
import { isDealCustomerVisibleStatus, isDealStatus } from "@/core/entities/deal-record";
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

function normalizeOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }

  return value;
}

function hasInvalidOptionalNumber(
  body: Record<string, unknown> | null,
  key: "estimatedHours" | "estimatedTrainingDays" | "estimatedPrice",
): boolean {
  if (!body || !Object.prototype.hasOwnProperty.call(body, key)) {
    return false;
  }

  return normalizeOptionalNumber(body[key]) === undefined;
}

function sanitizeForOwner(deal: DealRecord): Record<string, unknown> {
  const {
    founderNote: _founderNote,
    consultationRequestId: _consultationRequestId,
    leadRecordId: _leadRecordId,
    ...publicDeal
  } = deal;
  return publicDeal;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return runRouteTemplate({
    route: "/api/deals/[id]",
    request,
    validationMessages: ["id is required."],
    execute: async (routeContext) => {
      const user = await getSessionUser();

      if (user.roles.includes("ANONYMOUS")) {
        return errorJson(routeContext, "Deals require an authenticated session.", 403);
      }

      const { id } = await context.params;

      if (!id) {
        return errorJson(routeContext, "id is required.", 400);
      }

      const repo = getDealRecordRepository();
      const deal = await repo.findById(id);

      if (!deal) {
        return errorJson(routeContext, "Deal not found.", 404);
      }

      const isAdmin = user.roles.includes("ADMIN");

      if (!isAdmin && deal.userId !== user.id) {
        return errorJson(routeContext, "You do not have access to this deal.", 403);
      }

      if (!isAdmin && !isDealCustomerVisibleStatus(deal.status)) {
        return errorJson(routeContext, "Deal not found.", 404);
      }

      return successJson(routeContext, {
        ok: true,
        deal: isAdmin ? deal : sanitizeForOwner(deal),
      });
    },
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return runRouteTemplate({
    route: "/api/deals/[id]",
    request,
    validationMessages: [
      "id is required.",
      "lane cannot be modified for deals.",
      "status must be valid.",
      "Customer response statuses must be recorded by the customer response route.",
      "Only draft, qualified, estimate_ready, and on_hold are editable founder statuses.",
      "founderNote must be 1000 characters or fewer.",
      "customerResponseNote must be 1000 characters or fewer.",
      "Numeric estimate fields must be valid numbers when provided.",
    ],
    execute: async (routeContext) => {
      const user = await getSessionUser();

      if (!user.roles.includes("ADMIN")) {
        return errorJson(routeContext, "Deal editing is restricted to administrators.", 403);
      }

      const { id } = await context.params;

      if (!id) {
        return errorJson(routeContext, "id is required.", 400);
      }

      const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

      if (body && Object.prototype.hasOwnProperty.call(body, "lane")) {
        return errorJson(routeContext, "lane cannot be modified for deals.", 400);
      }

      const repo = getDealRecordRepository();
      const existing = await repo.findById(id);

      if (!existing) {
        return errorJson(routeContext, "Deal not found.", 404);
      }

      if (existing.status === "agreed" || existing.status === "declined") {
        return errorJson(routeContext, "Finalized deals cannot be edited from the founder route.", 422);
      }

      const founderNote = normalizeOptionalString(body?.founderNote);
      const customerResponseNote = normalizeOptionalString(body?.customerResponseNote);
      const estimatedHours = normalizeOptionalNumber(body?.estimatedHours);
      const estimatedTrainingDays = normalizeOptionalNumber(body?.estimatedTrainingDays);
      const estimatedPrice = normalizeOptionalNumber(body?.estimatedPrice);
      const status = typeof body?.status === "string" ? body.status.trim() : undefined;

      if (founderNote && founderNote.length > 1000) {
        return errorJson(routeContext, "founderNote must be 1000 characters or fewer.", 400);
      }

      if (customerResponseNote && customerResponseNote.length > 1000) {
        return errorJson(routeContext, "customerResponseNote must be 1000 characters or fewer.", 400);
      }

      if (
        hasInvalidOptionalNumber(body, "estimatedHours")
        || hasInvalidOptionalNumber(body, "estimatedTrainingDays")
        || hasInvalidOptionalNumber(body, "estimatedPrice")
      ) {
        return errorJson(routeContext, "Numeric estimate fields must be valid numbers when provided.", 400);
      }

      if (status !== undefined) {
        if (!isDealStatus(status)) {
          return errorJson(routeContext, "status must be valid.", 400);
        }

        if (status === "agreed" || status === "declined") {
          return errorJson(routeContext, "Customer response statuses must be recorded by the customer response route.", 400);
        }

        if (!["draft", "qualified", "estimate_ready", "on_hold"].includes(status)) {
          return errorJson(routeContext, "Only draft, qualified, estimate_ready, and on_hold are editable founder statuses.", 400);
        }
      }

      const updatedDeal = await repo.update(id, {
        title: typeof body?.title === "string" ? body.title : undefined,
        organizationName: Object.prototype.hasOwnProperty.call(body ?? {}, "organizationName") ? normalizeOptionalString(body?.organizationName) : undefined,
        problemSummary: typeof body?.problemSummary === "string" ? body.problemSummary : undefined,
        proposedScope: typeof body?.proposedScope === "string" ? body.proposedScope : undefined,
        recommendedServiceType: typeof body?.recommendedServiceType === "string" ? body.recommendedServiceType : undefined,
        estimatedHours,
        estimatedTrainingDays,
        estimatedPrice,
        nextAction: Object.prototype.hasOwnProperty.call(body ?? {}, "nextAction") ? normalizeOptionalString(body?.nextAction) : undefined,
        assumptions: Object.prototype.hasOwnProperty.call(body ?? {}, "assumptions") ? normalizeOptionalString(body?.assumptions) : undefined,
        openQuestions: Object.prototype.hasOwnProperty.call(body ?? {}, "openQuestions") ? normalizeOptionalString(body?.openQuestions) : undefined,
        founderNote: Object.prototype.hasOwnProperty.call(body ?? {}, "founderNote") ? founderNote : undefined,
        customerResponseNote: Object.prototype.hasOwnProperty.call(body ?? {}, "customerResponseNote") ? customerResponseNote : undefined,
      });

      let deal = updatedDeal;

      if (status && status !== existing.status) {
        deal = await repo.updateStatus(id, status, {
          founderNote,
          customerResponseNote,
        });

        await getConversationEventRecorder().record(existing.conversationId, "deal_status_changed", {
          adminUserId: user.id,
          dealId: existing.id,
          fromStatus: existing.status,
          toStatus: status,
        });
      }

      return successJson(routeContext, {
        ok: true,
        deal,
      });
    },
  });
}