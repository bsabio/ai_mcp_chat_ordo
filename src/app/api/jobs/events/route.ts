import type { NextRequest } from "next/server";
import { getJobQueueRepository } from "@/adapters/RepositoryFactory";
import { runRouteTemplate } from "@/lib/chat/http-facade";
import { createJobEventStreamResponse } from "@/lib/jobs/job-event-stream";
import {
  DEFAULT_BATCH_LIMIT,
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_STREAM_WINDOW_MS,
  getAfterSequence,
  parsePositiveInteger,
  requireAuthenticatedUser,
} from "../_lib";

export async function GET(request: NextRequest) {
  return runRouteTemplate({
    route: "/api/jobs/events",
    request,
    validationMessages: [],
    execute: async (context) => {
      const user = await requireAuthenticatedUser(context);
      if (user instanceof Response) {
        return user;
      }

      const initialAfterSequence = getAfterSequence(request);
      const pollIntervalMs = parsePositiveInteger(
        process.env.JOB_EVENT_STREAM_POLL_INTERVAL_MS,
        DEFAULT_POLL_INTERVAL_MS,
      );
      const streamWindowMs = parsePositiveInteger(
        process.env.JOB_EVENT_STREAM_MAX_DURATION_MS,
        DEFAULT_STREAM_WINDOW_MS,
      );
      const repository = getJobQueueRepository();

      return createJobEventStreamResponse({
        request,
        requestId: context.requestId,
        initialAfterSequence,
        pollIntervalMs,
        streamWindowMs,
        batchLimit: DEFAULT_BATCH_LIMIT,
        listEvents: (afterSequence, limit) => repository.listUserEvents(user.id, {
          afterSequence,
          limit,
        }),
        findJobById: (jobId) => repository.findJobById(jobId),
        findLatestRenderableEventForJob: (jobId) => repository.findLatestRenderableEventForJob(jobId),
      });
    },
  });
}