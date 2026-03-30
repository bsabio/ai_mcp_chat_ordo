import type { NextRequest } from "next/server";
import { getJobQueueRepository } from "@/adapters/RepositoryFactory";
import { errorJson, runRouteTemplate, successJson } from "@/lib/chat/http-facade";
import { mapJobEventHistory } from "@/lib/jobs/job-event-history";
import {
  DEFAULT_BATCH_LIMIT,
  ensureUserOwnsConversationJob,
  parsePositiveInteger,
  requireAuthenticatedUser,
} from "../../_lib";

type RouteParams = {
  params: Promise<{ jobId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  return runRouteTemplate({
    route: "/api/jobs/[jobId]/events",
    request,
    validationMessages: [],
    execute: async (context) => {
      const user = await requireAuthenticatedUser(context);
      if (user instanceof Response) {
        return user;
      }

      const { jobId } = await params;
      const limit = parsePositiveInteger(request.nextUrl.searchParams.get("limit"), DEFAULT_BATCH_LIMIT);
      const repository = getJobQueueRepository();
      const job = await repository.findJobById(jobId);

      if (!job) {
        return errorJson(context, "Job not found", 404);
      }

      const unauthorized = await ensureUserOwnsConversationJob(user.id, job.conversationId, context);
      if (unauthorized) {
        return unauthorized;
      }

      const events = await repository.listEventsForUserJob(user.id, job.id, { limit });

      return successJson(context, {
        ok: true,
        jobId: job.id,
        events: mapJobEventHistory(job, events),
      });
    },
  });
}