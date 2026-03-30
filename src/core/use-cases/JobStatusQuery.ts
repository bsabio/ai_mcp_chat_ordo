import type { JobStatus } from "@/core/entities/job";
import type { JobStatusSnapshot } from "@/lib/jobs/job-read-model";

export interface JobStatusQueryOptions {
  statuses?: JobStatus[];
  limit?: number;
}

export interface JobStatusQuery {
  getJobSnapshot(jobId: string): Promise<JobStatusSnapshot | null>;
  getUserJobSnapshot(userId: string, jobId: string): Promise<JobStatusSnapshot | null>;
  listConversationJobSnapshots(
    conversationId: string,
    options?: JobStatusQueryOptions,
  ): Promise<JobStatusSnapshot[]>;
  listUserJobSnapshots(
    userId: string,
    options?: JobStatusQueryOptions,
  ): Promise<JobStatusSnapshot[]>;
}