import type { NextRequest } from "next/server";

import {
  TrainingPathAlreadyExistsError,
  TrainingPathCreationEligibilityError,
  WorkflowSourceNotFoundError,
} from "@/core/use-cases/CreateTrainingPathFromWorkflowInteractor";
import { getSessionUser } from "@/lib/auth";
import { getCreateTrainingPathFromWorkflowInteractor } from "@/lib/chat/conversation-root";
import { errorJson, runRouteTemplate, successJson } from "@/lib/chat/http-facade";

function normalizeId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function POST(request: NextRequest) {
  return runRouteTemplate({
    route: "/api/training-paths",
    request,
    validationMessages: ["Exactly one source id is required."],
    execute: async (routeContext) => {
      const user = await getSessionUser();

      if (!user.roles.includes("ADMIN")) {
        return errorJson(routeContext, "Training-path creation is restricted to administrators.", 403);
      }

      const body = (await request.json().catch(() => null)) as {
        consultationRequestId?: unknown;
        leadRecordId?: unknown;
      } | null;
      const consultationRequestId = normalizeId(body?.consultationRequestId);
      const leadRecordId = normalizeId(body?.leadRecordId);

      if ((consultationRequestId ? 1 : 0) + (leadRecordId ? 1 : 0) !== 1) {
        return errorJson(routeContext, "Exactly one source id is required.", 400);
      }

      try {
        const interactor = getCreateTrainingPathFromWorkflowInteractor();
        const trainingPath = consultationRequestId
          ? await interactor.createFromConsultationRequest(user.id, consultationRequestId)
          : await interactor.createFromQualifiedLead(user.id, leadRecordId as string);

        return successJson(routeContext, { ok: true, trainingPath }, { status: 201 });
      } catch (error) {
        if (error instanceof WorkflowSourceNotFoundError) {
          return errorJson(routeContext, error.message, 404);
        }
        if (error instanceof TrainingPathCreationEligibilityError) {
          return errorJson(routeContext, error.message, 422);
        }
        if (error instanceof TrainingPathAlreadyExistsError) {
          return errorJson(routeContext, error.message, 409);
        }
        throw error;
      }
    },
  });
}