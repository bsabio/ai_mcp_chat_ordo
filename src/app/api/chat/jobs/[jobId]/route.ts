import type { NextRequest } from "next/server";
import { getJobQueueRepository, getJobStatusQuery } from "@/adapters/RepositoryFactory";
import { createConversationRouteServices } from "@/lib/chat/conversation-root";
import { resolveUserId } from "@/lib/chat/resolve-user";
import { errorJson, runRouteTemplate, successJson } from "@/lib/chat/http-facade";
import { createDeferredJobConversationProjector } from "@/lib/jobs/deferred-job-projector-root";
import { canManualReplayJob, isJobCancelable, performManualJobReplay } from "@/lib/jobs/manual-replay";

type RouteParams = {
  params: Promise<{ jobId: string }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildCanceledEventPayload(
  latestRenderablePayload: Record<string, unknown> | undefined,
  canceledBy: string,
): Record<string, unknown> {
  return {
    progressPercent: null,
    progressLabel: null,
    ...(Array.isArray(latestRenderablePayload?.phases)
      ? { phases: latestRenderablePayload.phases }
      : {}),
    activePhaseKey: null,
    ...(typeof latestRenderablePayload?.summary === "string"
      ? { summary: latestRenderablePayload.summary }
      : {}),
    ...(latestRenderablePayload?.resultEnvelope === null || isRecord(latestRenderablePayload?.resultEnvelope)
      ? { resultEnvelope: latestRenderablePayload.resultEnvelope }
      : {}),
    ...(latestRenderablePayload?.replaySnapshot === null || isRecord(latestRenderablePayload?.replaySnapshot)
      ? { replaySnapshot: latestRenderablePayload.replaySnapshot }
      : {}),
    ...(Array.isArray(latestRenderablePayload?.artifacts)
      ? { artifacts: latestRenderablePayload.artifacts }
      : {}),
    canceledBy,
  };
}

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
        if (!isJobCancelable(job.status)) {
          return errorJson(context, "Job cannot be canceled in its current state", 409);
        }

        const latestRenderableEvent = await repository.findLatestRenderableEventForJob(job.id);
        const canceledJob = await repository.cancelJob(job.id, now);
        const canceledEvent = await repository.appendEvent({
          jobId: job.id,
          conversationId: job.conversationId,
          eventType: "canceled",
          payload: buildCanceledEventPayload(latestRenderableEvent?.payload, userId),
        });

        await projector.project(canceledJob, canceledEvent);

        return successJson(context, {
          ok: true,
          action,
          job: canceledJob,
          eventSequence: canceledEvent.sequence,
        });
      }

      if (!canManualReplayJob(job)) {
        return errorJson(context, "Job cannot be retried in its current state", 409);
      }

      const replay = await performManualJobReplay(repository, job, {
        ownerUserId: userId,
        projector,
        requestedByUserId: userId,
      });

      return successJson(context, {
        ok: true,
        action,
        deduped: replay.outcome === "deduped",
        replay: {
          outcome: replay.outcome,
          sourceJobId: replay.sourceJobId,
          targetJobId: replay.job.id,
          dedupeKey: replay.dedupeKey,
        },
        job: replay.job,
        ...(replay.eventSequence ? { eventSequence: replay.eventSequence } : {}),
      });
    },
  });
}