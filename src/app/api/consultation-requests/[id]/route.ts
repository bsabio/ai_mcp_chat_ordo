import type { NextRequest } from "next/server";

import { isConsultationRequestStatus } from "@/core/entities/consultation-request";
import {
  ConsultationRequestNotFoundError,
  ConsultationRequestTransitionError,
} from "@/core/use-cases/TriageConsultationRequestInteractor";
import { getSessionUser } from "@/lib/auth";
import {
  getConsultationRequestRepository,
  getTriageConsultationRequestInteractor,
} from "@/lib/chat/conversation-root";
import { errorJson, runRouteTemplate, successJson } from "@/lib/chat/http-facade";

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return runRouteTemplate({
    route: "/api/consultation-requests/[id]",
    request,
    validationMessages: ["id is required."],
    execute: async (routeContext) => {
      const user = await getSessionUser();

      if (!user.roles.includes("ADMIN")) {
        return errorJson(routeContext, "Consultation request triage is restricted to administrators.", 403);
      }

      const { id } = await context.params;

      if (!id) {
        return errorJson(routeContext, "id is required.", 400);
      }

      const repo = getConsultationRequestRepository();
      const consultationRequest = await repo.findById(id);

      if (!consultationRequest) {
        return errorJson(routeContext, "Consultation request not found.", 404);
      }

      return successJson(routeContext, {
        ok: true,
        consultationRequest,
      });
    },
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return runRouteTemplate({
    route: "/api/consultation-requests/[id]",
    request,
    validationMessages: [
      "id is required.",
      "status is required.",
      "status must be valid.",
      "founderNote must be 1000 characters or fewer.",
    ],
    execute: async (routeContext) => {
      const user = await getSessionUser();

      if (!user.roles.includes("ADMIN")) {
        return errorJson(routeContext, "Consultation request triage is restricted to administrators.", 403);
      }

      const { id } = await context.params;

      if (!id) {
        return errorJson(routeContext, "id is required.", 400);
      }

      const body = (await request.json().catch(() => null)) as {
        status?: unknown;
        founderNote?: unknown;
      } | null;
      const status = typeof body?.status === "string" ? body.status.trim() : "";
      const founderNote = normalizeOptionalString(body?.founderNote);

      if (!status) {
        return errorJson(routeContext, "status is required.", 400);
      }

      if (!isConsultationRequestStatus(status)) {
        return errorJson(routeContext, "status must be valid.", 400);
      }

      if (founderNote && founderNote.length > 1000) {
        return errorJson(routeContext, "founderNote must be 1000 characters or fewer.", 400);
      }

      try {
        const interactor = getTriageConsultationRequestInteractor();
        const consultationRequest = await interactor.triage(user.id, id, status, founderNote);

        return successJson(routeContext, {
          ok: true,
          consultationRequest,
        });
      } catch (error) {
        if (error instanceof ConsultationRequestNotFoundError) {
          return errorJson(routeContext, error.message, 404);
        }
        if (error instanceof ConsultationRequestTransitionError) {
          return errorJson(routeContext, error.message, 422);
        }
        throw error;
      }
    },
  });
}