import type { NextRequest } from "next/server";
import { getJobQueueRepository, getJobStatusQuery } from "@/adapters/RepositoryFactory";
import { createConversationRouteServices } from "@/lib/chat/conversation-root";
import { resolveUserId } from "@/lib/chat/resolve-user";
import { getToolComposition } from "@/lib/chat/tool-composition-root";
import { errorJson, runRouteTemplate, successJson } from "@/lib/chat/http-facade";
import { buildDeferredJobDedupeKey } from "@/lib/jobs/job-dedupe";
import { createDeferredJobConversationProjector } from "@/lib/jobs/deferred-job-projector-root";

type RouteParams = {
  params: Promise<{ jobId: string }>;
};

function parseAction(value: unknown): "cancel" | "retry" | null {
  return value === "cancel" || value === "retry" ? value : null;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  return runRouteTemplate({
    route: "/api/chat/jobs/[jobId]",
    request: _request,
    validationMessages: [],
    execute: async (context) => {
      const { jobId } = await params;
      const snapshot = await getJobStatusQuery().getJobSnapshot(jobId);

      if (!snapshot) {
        return errorJson(context, "Job not found", 404);
      }

      if (!snapshot.conversationId) {
        return errorJson(context, "Job is missing conversation context", 500);
      }

      const { userId } = await resolveUserId();
      const { interactor } = createConversationRouteServices();
      await interactor.get(snapshot.conversationId, userId);

      return successJson(context, {
        ok: true,
        job: snapshot,
      });
    },
  });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  return runRouteTemplate({
    route: "/api/chat/jobs/[jobId]",
    request,
    validationMessages: ["Invalid job action."],
    execute: async (context) => {
      const { jobId } = await params;
      const body = await request.json().catch(() => ({}));
      const action = parseAction((body as { action?: unknown }).action);

      if (!action) {
        throw new Error("Invalid job action.");
      }

      const repository = getJobQueueRepository();
      const job = await repository.findJobById(jobId);
      if (!job) {
        return errorJson(context, "Job not found", 404);
      }

      const { userId } = await resolveUserId();
      const { interactor } = createConversationRouteServices();
      await interactor.get(job.conversationId, userId);

      const projector = createDeferredJobConversationProjector();
      const now = new Date().toISOString();

      if (action === "cancel") {
        if (job.status !== "queued" && job.status !== "running") {
          return errorJson(context, "Job cannot be canceled in its current state", 409);
        }

        const canceledJob = await repository.cancelJob(job.id, now);
        const canceledEvent = await repository.appendEvent({
          jobId: job.id,
          conversationId: job.conversationId,
          eventType: "canceled",
          payload: { canceledBy: userId },
        });

        await projector.project(canceledJob, canceledEvent);

        return successJson(context, {
          ok: true,
          action,
          job: canceledJob,
          eventSequence: canceledEvent.sequence,
        });
      }

      if (job.status !== "failed" && job.status !== "canceled") {
        return errorJson(context, "Job cannot be retried in its current state", 409);
      }

      const descriptor = getToolComposition().registry.getDescriptor(job.toolName);
      const dedupeKey = descriptor?.deferred?.dedupeStrategy === "per-conversation-payload"
        ? buildDeferredJobDedupeKey(job.conversationId, job.toolName, job.requestPayload)
        : null;
      const existing = dedupeKey
        ? await repository.findActiveJobByDedupeKey(job.conversationId, dedupeKey)
        : null;

      if (existing) {
        return successJson(context, {
          ok: true,
          action,
          deduped: true,
          job: existing,
        });
      }

      const retriedJob = await repository.createJob({
        conversationId: job.conversationId,
        userId: job.userId,
        toolName: job.toolName,
        priority: job.priority,
        dedupeKey,
        initiatorType: job.initiatorType,
        requestPayload: job.requestPayload,
      });

      const queuedEvent = await repository.appendEvent({
        jobId: retriedJob.id,
        conversationId: retriedJob.conversationId,
        eventType: "queued",
        payload: {
          toolName: retriedJob.toolName,
          retriedFromJobId: job.id,
        },
      });

      await projector.project(retriedJob, queuedEvent);

      return successJson(context, {
        ok: true,
        action,
        job: retriedJob,
        eventSequence: queuedEvent.sequence,
      });
    },
  });
}