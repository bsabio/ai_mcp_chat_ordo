import type { NextRequest } from "next/server";

import {
  isApprenticeshipInterest,
  isTrainingPathCustomerVisibleStatus,
  isTrainingPathRecommendation,
  isTrainingPathStatus,
  type TrainingPathRecord,
  type TrainingPathStatus,
} from "@/core/entities/training-path-record";
import { getSessionUser } from "@/lib/auth";
import {
  getConversationEventRecorder,
  getTrainingPathRecordRepository,
} from "@/lib/chat/conversation-root";
import { errorJson, runRouteTemplate, successJson } from "@/lib/chat/http-facade";

const LEGAL_FOUNDER_TRANSITIONS: Record<TrainingPathStatus, TrainingPathStatus[]> = {
  draft: ["recommended", "screening_requested", "deferred", "closed"],
  recommended: ["screening_requested", "deferred", "closed"],
  screening_requested: ["recommended", "deferred", "closed"],
  deferred: ["recommended", "screening_requested", "closed"],
  closed: [],
};

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function sanitizeForOwner(trainingPath: TrainingPathRecord): Record<string, unknown> {
  const {
    founderNote: _founderNote,
    leadRecordId: _leadRecordId,
    consultationRequestId: _consultationRequestId,
    ...publicRecord
  } = trainingPath;

  return publicRecord;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return runRouteTemplate({
    route: "/api/training-paths/[id]",
    request,
    validationMessages: ["id is required."],
    execute: async (routeContext) => {
      const user = await getSessionUser();

      if (user.roles.includes("ANONYMOUS")) {
        return errorJson(routeContext, "Training paths require an authenticated session.", 403);
      }

      const { id } = await context.params;

      if (!id) {
        return errorJson(routeContext, "id is required.", 400);
      }

      const repo = getTrainingPathRecordRepository();
      const trainingPath = await repo.findById(id);

      if (!trainingPath) {
        return errorJson(routeContext, "Training path not found.", 404);
      }

      const isAdmin = user.roles.includes("ADMIN");

      if (!isAdmin && trainingPath.userId !== user.id) {
        return errorJson(routeContext, "You do not have access to this training path.", 403);
      }

      if (!isAdmin && !isTrainingPathCustomerVisibleStatus(trainingPath.status)) {
        return errorJson(routeContext, "Training path not found.", 404);
      }

      return successJson(routeContext, {
        ok: true,
        trainingPath: isAdmin ? trainingPath : sanitizeForOwner(trainingPath),
      });
    },
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return runRouteTemplate({
    route: "/api/training-paths/[id]",
    request,
    validationMessages: [
      "id is required.",
      "lane cannot be modified for training paths.",
      "status must be valid.",
      "recommendedPath must be valid.",
      "apprenticeshipInterest must be valid.",
      "Illegal founder status transition for training path.",
      "founderNote must be 1000 characters or fewer.",
      "customerSummary must be 1000 characters or fewer.",
    ],
    execute: async (routeContext) => {
      const user = await getSessionUser();

      if (!user.roles.includes("ADMIN")) {
        return errorJson(routeContext, "Training-path editing is restricted to administrators.", 403);
      }

      const { id } = await context.params;

      if (!id) {
        return errorJson(routeContext, "id is required.", 400);
      }

      const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

      if (body && Object.prototype.hasOwnProperty.call(body, "lane")) {
        return errorJson(routeContext, "lane cannot be modified for training paths.", 400);
      }

      const repo = getTrainingPathRecordRepository();
      const existing = await repo.findById(id);

      if (!existing) {
        return errorJson(routeContext, "Training path not found.", 404);
      }

      const founderNote = normalizeOptionalString(body?.founderNote);
      const customerSummary = normalizeOptionalString(body?.customerSummary);
      const apprenticeshipInterest = typeof body?.apprenticeshipInterest === "string"
        ? body.apprenticeshipInterest.trim()
        : undefined;
      const recommendedPath = typeof body?.recommendedPath === "string"
        ? body.recommendedPath.trim()
        : undefined;
      const status = typeof body?.status === "string" ? body.status.trim() : undefined;

      if (founderNote && founderNote.length > 1000) {
        return errorJson(routeContext, "founderNote must be 1000 characters or fewer.", 400);
      }

      if (customerSummary && customerSummary.length > 1000) {
        return errorJson(routeContext, "customerSummary must be 1000 characters or fewer.", 400);
      }

      if (recommendedPath !== undefined && !isTrainingPathRecommendation(recommendedPath)) {
        return errorJson(routeContext, "recommendedPath must be valid.", 400);
      }

      if (apprenticeshipInterest !== undefined && !isApprenticeshipInterest(apprenticeshipInterest)) {
        return errorJson(routeContext, "apprenticeshipInterest must be valid.", 400);
      }

      if (status !== undefined) {
        if (!isTrainingPathStatus(status)) {
          return errorJson(routeContext, "status must be valid.", 400);
        }

        if (status !== existing.status && !LEGAL_FOUNDER_TRANSITIONS[existing.status].includes(status)) {
          return errorJson(routeContext, "Illegal founder status transition for training path.", 422);
        }
      }

      const updatedTrainingPath = await repo.update(id, {
        currentRoleOrBackground: Object.prototype.hasOwnProperty.call(body ?? {}, "currentRoleOrBackground")
          ? normalizeOptionalString(body?.currentRoleOrBackground)
          : undefined,
        technicalDepth: Object.prototype.hasOwnProperty.call(body ?? {}, "technicalDepth")
          ? normalizeOptionalString(body?.technicalDepth)
          : undefined,
        primaryGoal: Object.prototype.hasOwnProperty.call(body ?? {}, "primaryGoal")
          ? normalizeOptionalString(body?.primaryGoal)
          : undefined,
        preferredFormat: Object.prototype.hasOwnProperty.call(body ?? {}, "preferredFormat")
          ? normalizeOptionalString(body?.preferredFormat)
          : undefined,
        apprenticeshipInterest: apprenticeshipInterest,
        recommendedPath,
        fitRationale: Object.prototype.hasOwnProperty.call(body ?? {}, "fitRationale")
          ? normalizeOptionalString(body?.fitRationale)
          : undefined,
        customerSummary: Object.prototype.hasOwnProperty.call(body ?? {}, "customerSummary")
          ? customerSummary
          : undefined,
        nextAction: Object.prototype.hasOwnProperty.call(body ?? {}, "nextAction")
          ? normalizeOptionalString(body?.nextAction)
          : undefined,
        founderNote: Object.prototype.hasOwnProperty.call(body ?? {}, "founderNote")
          ? founderNote
          : undefined,
      });

      let trainingPath = updatedTrainingPath;

      if (status && status !== existing.status) {
        trainingPath = await repo.updateStatus(id, status, { founderNote });

        await getConversationEventRecorder().record(existing.conversationId, "training_path_status_changed", {
          adminUserId: user.id,
          trainingPathId: existing.id,
          fromStatus: existing.status,
          toStatus: status,
        });
      }

      return successJson(routeContext, {
        ok: true,
        trainingPath,
      });
    },
  });
}