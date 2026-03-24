import type { NextRequest } from "next/server";

import { isConversationLane } from "@/core/entities/conversation-routing";
import { getLeadCaptureInteractor } from "@/lib/chat/conversation-root";
import { errorJson, runRouteTemplate, successJson } from "@/lib/chat/http-facade";
import { resolveUserId } from "@/lib/chat/resolve-user";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  return runRouteTemplate({
    route: "/api/chat/contact-capture",
    request,
    validationMessages: [
      "conversationId is required.",
      "name is required.",
      "email is required.",
      "email must be valid.",
      "lane is required.",
      "lane must be valid.",
      "Conversation not found",
    ],
    execute: async (context) => {
      const body = (await request.json()) as {
        conversationId?: unknown;
        lane?: unknown;
        name?: unknown;
        email?: unknown;
        organization?: unknown;
        roleOrTitle?: unknown;
        trainingGoal?: unknown;
        problemSummary?: unknown;
        recommendedNextAction?: unknown;
      };

      const conversationId = typeof body.conversationId === "string" ? body.conversationId.trim() : "";
      const lane = typeof body.lane === "string" ? body.lane.trim() : "";
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const email = typeof body.email === "string" ? body.email.trim() : "";

      if (!conversationId) {
        return errorJson(context, "conversationId is required.", 400);
      }

      if (!lane) {
        return errorJson(context, "lane is required.", 400);
      }

      if (!isConversationLane(lane)) {
        return errorJson(context, "lane must be valid.", 400);
      }

      if (!name) {
        return errorJson(context, "name is required.", 400);
      }

      if (!email) {
        return errorJson(context, "email is required.", 400);
      }

      if (!isValidEmail(email)) {
        return errorJson(context, "email must be valid.", 400);
      }

      const { userId } = await resolveUserId();
      const leadCaptureInteractor = getLeadCaptureInteractor();
      const leadRecord = await leadCaptureInteractor.submitCapture(userId, {
        conversationId,
        lane,
        name,
        email,
        organization: typeof body.organization === "string" ? body.organization.trim() || null : null,
        roleOrTitle: typeof body.roleOrTitle === "string" ? body.roleOrTitle.trim() || null : null,
        trainingGoal: typeof body.trainingGoal === "string" ? body.trainingGoal.trim() || null : null,
        problemSummary: typeof body.problemSummary === "string" ? body.problemSummary.trim() || null : null,
        recommendedNextAction:
          typeof body.recommendedNextAction === "string" ? body.recommendedNextAction.trim() || null : null,
      });

      return successJson(context, {
        leadRecord,
        ok: true,
      });
    },
  });
}