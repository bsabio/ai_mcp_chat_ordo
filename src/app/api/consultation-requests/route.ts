import type { NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getRequestConsultationInteractor } from "@/lib/chat/conversation-root";
import { errorJson, runRouteTemplate, successJson } from "@/lib/chat/http-facade";
import {
  ConsultationRequestError,
  DuplicateConsultationRequestError,
} from "@/core/use-cases/RequestConsultationInteractor";

export async function POST(request: NextRequest) {
  return runRouteTemplate({
    route: "/api/consultation-requests",
    request,
    validationMessages: [
      "conversationId is required.",
      "requestSummary is required.",
    ],
    execute: async (context) => {
      const user = await getSessionUser();

      if (user.roles.includes("ANONYMOUS")) {
        return errorJson(context, "Authentication required.", 403);
      }

      const body = (await request.json()) as {
        conversationId?: unknown;
        requestSummary?: unknown;
      };

      const conversationId =
        typeof body.conversationId === "string" ? body.conversationId.trim() : "";
      const requestSummary =
        typeof body.requestSummary === "string" ? body.requestSummary.trim() : "";

      if (!conversationId) {
        return errorJson(context, "conversationId is required.", 400);
      }

      if (!requestSummary) {
        return errorJson(context, "requestSummary is required.", 400);
      }

      try {
        const interactor = getRequestConsultationInteractor();
        const consultationRequest = await interactor.requestConsultation(
          user.id,
          conversationId,
          requestSummary,
        );

        return successJson(context, { consultationRequest, ok: true }, { status: 201 });
      } catch (error) {
        if (error instanceof DuplicateConsultationRequestError) {
          return errorJson(context, error.message, 409);
        }
        if (error instanceof ConsultationRequestError) {
          return errorJson(context, error.message, 403);
        }
        throw error;
      }
    },
  });
}
