import type { JobRequest } from "@/core/entities/job";
import type { JobQueueRepository } from "@/core/use-cases/JobQueueRepository";
import type { DeferredJobConversationProjector } from "./deferred-job-conversation-projector";

export interface DeferredJobProgressUpdate {
  progressPercent?: number;
  progressLabel?: string;
  payload?: Record<string, unknown>;
}

export interface DeferredJobHandlerContext {
  reportProgress: (update: DeferredJobProgressUpdate) => Promise<void>;
}

export type DeferredJobHandler = (
  job: JobRequest,
  context: DeferredJobHandlerContext,
) => Promise<unknown>;

export interface DeferredJobWorkerOptions {
  workerId: string;
  leaseDurationMs?: number;
  now?: Date;
}

export interface DeferredJobWorkerResult {
  reclaimedExpiredCount: number;
  job: JobRequest | null;
  outcome: "idle" | "succeeded" | "failed" | "canceled";
  result?: unknown;
  errorMessage?: string;
}

export interface DeferredJobNotificationDispatcher {
  notify(job: JobRequest, eventType: "result" | "failed" | "canceled"): Promise<boolean>;
}

function toIso(date: Date): string {
  return date.toISOString();
}

export class DeferredJobWorker {
  constructor(
    private readonly repository: JobQueueRepository,
    private readonly handlers: Record<string, DeferredJobHandler>,
    private readonly conversationProjector?: DeferredJobConversationProjector,
    private readonly notificationDispatcher?: DeferredJobNotificationDispatcher,
  ) {}

  private async recordNotification(job: JobRequest, eventType: "result" | "failed" | "canceled"): Promise<void> {
    if (!this.notificationDispatcher) {
      return;
    }

    const delivered = await this.notificationDispatcher.notify(job, eventType);
    if (!delivered) {
      return;
    }

    await this.repository.appendEvent({
      jobId: job.id,
      conversationId: job.conversationId,
      eventType: "notification_sent",
      payload: { terminalEventType: eventType },
    });
  }

  private async wasCanceled(jobId: string): Promise<JobRequest | null> {
    const current = await this.repository.findJobById(jobId);
    if (current?.status === "canceled") {
      return current;
    }
    return null;
  }

  async runNext(options: DeferredJobWorkerOptions): Promise<DeferredJobWorkerResult> {
    const baseNow = options.now ?? new Date();
    const nowIso = toIso(baseNow);
    const leaseDurationMs = options.leaseDurationMs ?? 30_000;
    const leaseExpiresAt = toIso(new Date(baseNow.getTime() + leaseDurationMs));

    const reclaimedExpiredCount = await this.repository.requeueExpiredRunningJobs(nowIso);
    const job = await this.repository.claimNextQueuedJob({
      workerId: options.workerId,
      leaseExpiresAt,
      now: nowIso,
    });

    if (!job) {
      return {
        reclaimedExpiredCount,
        job: null,
        outcome: "idle",
      };
    }

    const startedEvent = await this.repository.appendEvent({
      jobId: job.id,
      conversationId: job.conversationId,
      eventType: "started",
      payload: { workerId: options.workerId, leaseExpiresAt },
    });
    await this.conversationProjector?.project(job, startedEvent);

    const handler = this.handlers[job.toolName];

    if (!handler) {
      const errorMessage = `No deferred job handler registered for tool: ${job.toolName}`;
      const completedAt = toIso(new Date());
      await this.repository.updateJobStatus(job.id, {
        status: "failed",
        errorMessage,
        completedAt,
        leaseExpiresAt: null,
        claimedBy: null,
      });
      const failedEvent = await this.repository.appendEvent({
        jobId: job.id,
        conversationId: job.conversationId,
        eventType: "failed",
        payload: { errorMessage },
      });
      const failedJob = await this.repository.findJobById(job.id);
      if (failedJob) {
        await this.conversationProjector?.project(failedJob, failedEvent);
      }

      return {
        reclaimedExpiredCount,
        job: failedJob,
        outcome: "failed",
        errorMessage,
      };
    }

    try {
      const result = await handler(job, {
        reportProgress: async (update) => {
          if (await this.wasCanceled(job.id)) {
            return;
          }

          await this.repository.updateJobStatus(job.id, {
            status: "running",
            progressPercent: update.progressPercent,
            progressLabel: update.progressLabel,
            leaseExpiresAt,
            claimedBy: options.workerId,
          });
          const progressEvent = await this.repository.appendEvent({
            jobId: job.id,
            conversationId: job.conversationId,
            eventType: "progress",
            payload: {
              progressPercent: update.progressPercent,
              progressLabel: update.progressLabel,
              ...(update.payload ?? {}),
            },
          });
          const progressJob = await this.repository.findJobById(job.id);
          if (progressJob) {
            await this.conversationProjector?.project(progressJob, progressEvent);
          }
        },
      });

      const canceledJob = await this.wasCanceled(job.id);
      if (canceledJob) {
        await this.recordNotification(canceledJob, "canceled");
        return {
          reclaimedExpiredCount,
          job: canceledJob,
          outcome: "canceled",
        };
      }

      const completedAt = toIso(new Date());
      await this.repository.updateJobStatus(job.id, {
        status: "succeeded",
        resultPayload: result,
        completedAt,
        leaseExpiresAt: null,
        claimedBy: null,
      });
      const resultEvent = await this.repository.appendEvent({
        jobId: job.id,
        conversationId: job.conversationId,
        eventType: "result",
        payload: { result },
      });
      const succeededJob = await this.repository.findJobById(job.id);
      if (succeededJob) {
        await this.conversationProjector?.project(succeededJob, resultEvent);
        await this.recordNotification(succeededJob, "result");
      }

      return {
        reclaimedExpiredCount,
        job: succeededJob,
        outcome: "succeeded",
        result,
      };
    } catch (error) {
      const canceledJob = await this.wasCanceled(job.id);
      if (canceledJob) {
        await this.recordNotification(canceledJob, "canceled");
        return {
          reclaimedExpiredCount,
          job: canceledJob,
          outcome: "canceled",
        };
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      const completedAt = toIso(new Date());
      await this.repository.updateJobStatus(job.id, {
        status: "failed",
        errorMessage,
        completedAt,
        leaseExpiresAt: null,
        claimedBy: null,
      });
      const failedEvent = await this.repository.appendEvent({
        jobId: job.id,
        conversationId: job.conversationId,
        eventType: "failed",
        payload: { errorMessage },
      });
      const failedJob = await this.repository.findJobById(job.id);
      if (failedJob) {
        await this.conversationProjector?.project(failedJob, failedEvent);
        await this.recordNotification(failedJob, "failed");
      }

      return {
        reclaimedExpiredCount,
        job: failedJob,
        outcome: "failed",
        errorMessage,
      };
    }
  }
}
