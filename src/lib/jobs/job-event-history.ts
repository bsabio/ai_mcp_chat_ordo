import type { JobEvent, JobRequest } from "@/core/entities/job";
import {
  buildJobStatusPartFromProjection,
  projectJobForEvent,
} from "@/lib/jobs/job-status";

export function mapJobEventHistory(job: JobRequest, events: JobEvent[]) {
  return events.map((event) => ({
    id: event.id,
    jobId: event.jobId,
    conversationId: event.conversationId,
    sequence: event.sequence,
    eventType: event.eventType,
    createdAt: event.createdAt,
    part: buildJobStatusPartFromProjection(projectJobForEvent(job, event), event),
  }));
}