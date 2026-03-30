import type {
  JobClaimOptions,
  JobEvent,
  JobEventSeed,
  JobRequest,
  JobRequestSeed,
  JobStatus,
  JobStatusUpdate,
} from "@/core/entities/job";

export interface JobQueueRepository {
  createJob(seed: JobRequestSeed): Promise<JobRequest>;
  findJobById(id: string): Promise<JobRequest | null>;
  findLatestEventForJob(jobId: string): Promise<JobEvent | null>;
  findActiveJobByDedupeKey(conversationId: string, dedupeKey: string): Promise<JobRequest | null>;
  listJobsByConversation(
    conversationId: string,
    options?: { statuses?: JobStatus[]; limit?: number },
  ): Promise<JobRequest[]>;
  listJobsByUser(
    userId: string,
    options?: { statuses?: JobStatus[]; limit?: number },
  ): Promise<JobRequest[]>;
  appendEvent(seed: JobEventSeed): Promise<JobEvent>;
  requeueExpiredRunningJobs(now: string): Promise<number>;
  listConversationEvents(
    conversationId: string,
    options?: { afterSequence?: number; limit?: number },
  ): Promise<JobEvent[]>;
  listUserEvents(
    userId: string,
    options?: { afterSequence?: number; limit?: number },
  ): Promise<JobEvent[]>;
  listEventsForUserJob(
    userId: string,
    jobId: string,
    options?: { limit?: number },
  ): Promise<JobEvent[]>;
  claimNextQueuedJob(options: JobClaimOptions): Promise<JobRequest | null>;
  updateJobStatus(id: string, update: JobStatusUpdate): Promise<JobRequest>;
  cancelJob(id: string, now: string): Promise<JobRequest>;
}
