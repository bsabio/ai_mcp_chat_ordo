import type { NextRequest } from "next/server";
import { getJobQueueRepository, getJobStatusQuery } from "@/adapters/RepositoryFactory";
import { errorJson, runRouteTemplate, successJson } from "@/lib/chat/http-facade";
import { createDeferredJobConversationProjector } from "@/lib/jobs/deferred-job-projector-root";
import { canManualReplayJob, isJobCancelable, performManualJobReplay } from "@/lib/jobs/manual-replay";
import { ensureUserOwnsConversationJob, requireAuthenticatedUser } from "../_lib";

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
    ...(typeof latestRenderablePayload?.progressPercent === "number"
      ? { progressPercent: latestRenderablePayload.progressPercent }
      : {}),
    ...(typeof latestRenderablePayload?.progressLabel === "string"
      || latestRenderablePayload?.progressLabel === null
      ? { progressLabel: latestRenderablePayload.progressLabel }
      : {}),
    ...(Array.isArray(latestRenderablePayload?.phases)
      ? { phases: latestRenderablePayload.phases }
      : {}),
    ...(typeof latestRenderablePayload?.activePhaseKey === "string"
      || latestRenderablePayload?.activePhaseKey === null
      ? { activePhaseKey: latestRenderablePayload.activePhaseKey }
      : {}),
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

export async function GET(request: NextRequest, { params }: RouteParams) {
  return runRouteTemplate({
    route: "/api/jobs/[jobId]",
    request,
    validationMessages: [],
    execute: async (context) => {
      const user = await requireAuthenticatedUser(context);
      if (user instanceof Response) {
        return user;
      }

      const { jobId } = await params;
      const snapshot = await getJobStatusQuery().getJobSnapshot(jobId);

      if (!snapshot) {
        return errorJson(context, "Job not found", 404);
      }

      if (!snapshot.conversationId) {
        return errorJson(context, "Job is missing conversation context", 500);
      }

      const unauthorized = await ensureUserOwnsConversationJob(user.id, snapshot.conversationId, context);
      if (unauthorized) {
        return unauthorized;
      }

      return successJson(context, {
        ok: true,
        job: snapshot,
      });
    },
  });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  return runRouteTemplate({
    route: "/api/jobs/[jobId]",
    request,
    validationMessages: ["Invalid job action."],
    execute: async (context) => {
      const user = await requireAuthenticatedUser(context);
      if (user instanceof Response) {
        return user;
      }

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

      const unauthorized = await ensureUserOwnsConversationJob(user.id, job.conversationId, context);
      if (unauthorized) {
        return unauthorized;
      }

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
          payload: buildCanceledEventPayload(latestRenderableEvent?.payload, user.id),
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
        ownerUserId: user.id,
        projector,
        requestedByUserId: user.id,
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