import type { JobFailureClass, JobRequest } from "@/core/entities/job";
import type { JobQueueRepository } from "@/core/use-cases/JobQueueRepository";
import type { DeferredJobNotificationResult } from "./deferred-job-notifications";
import type { DeferredJobConversationProjector } from "./deferred-job-conversation-projector";
import { getJobCapability, type JobRetryPolicy } from "./job-capability-registry";

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
  outcome: "idle" | "succeeded" | "failed" | "canceled" | "scheduled_retry";
  result?: unknown;
  errorMessage?: string;
}

export interface DeferredJobNotificationDispatcher {
  notify(job: JobRequest, eventType: "result" | "failed" | "canceled"): Promise<DeferredJobNotificationResult>;
}

function toIso(date: Date): string {
  return date.toISOString();
}

function classifyJobFailure(error: unknown): JobFailureClass {
  if (error instanceof Error && error.name === "AbortError") {
    return "canceled";
  }

  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.trim().toLowerCase();

  if (!normalized) {
    return "unknown";
  }

  if (/(policy|forbidden|permission|not allowed|unauthorized|rbac|access denied)/.test(normalized)) {
    return "policy";
  }

  if (/(timeout|timed out|temporary|temporarily|try again|rate limit|too many requests|service unavailable|network|socket hang up|connection reset|econn|eai_again|429|502|503|504|offline)/.test(normalized)) {
    return "transient";
  }

  if (/(cancel|aborted)/.test(normalized)) {
    return "canceled";
  }

  return "terminal";
}

function calculateRetryDelayMs(policy: JobRetryPolicy, attemptCount: number): number {
  const baseDelayMs = policy.baseDelayMs ?? 0;

  switch (policy.backoffStrategy) {
    case "none":
      return 0;
    case "exponential":
      return baseDelayMs * Math.max(1, 2 ** Math.max(0, attemptCount - 1));
    case "fixed":
    default:
      return baseDelayMs;
  }
}

function shouldScheduleAutomaticRetry(
  policy: JobRetryPolicy | undefined,
  failureClass: JobFailureClass,
  attemptCount: number,
): policy is JobRetryPolicy & { mode: "automatic"; maxAttempts: number } {
  return policy?.mode === "automatic"
    && typeof policy.maxAttempts === "number"
    && policy.maxAttempts > 0
    && failureClass === "transient"
    && attemptCount < policy.maxAttempts;
}

function isAutomaticRetryExhausted(
  policy: JobRetryPolicy | undefined,
  failureClass: JobFailureClass,
  attemptCount: number,
): policy is JobRetryPolicy & { mode: "automatic"; maxAttempts: number } {
  return policy?.mode === "automatic"
    && typeof policy.maxAttempts === "number"
    && policy.maxAttempts > 0
    && failureClass === "transient"
    && attemptCount >= policy.maxAttempts;
}

function buildRetryScheduledSummary(nextAttempt: number, maxAttempts: number, nextRetryAt: string): string {
  return `Transient failure detected. Retry ${nextAttempt} of ${maxAttempts} scheduled for ${nextRetryAt}.`;
}

function buildRetryExhaustedSummary(attemptCount: number, maxAttempts: number): string {
  return `Automatic retries exhausted after ${attemptCount} of ${maxAttempts} allowed attempts.`;
}

function buildLeaseRecoveredSummary(previousClaimedBy: string | null): string {
  return previousClaimedBy
    ? `Worker lease expired for ${previousClaimedBy}. Job requeued for recovery.`
    : "Worker lease expired. Job requeued for recovery.";
}

function buildNotificationSentSummary(
  eventType: "result" | "failed" | "canceled",
  deliveredCount: number,
  failedCount: number,
): string {
  const deliveryLabel = deliveredCount === 1 ? "1 subscription" : `${deliveredCount} subscriptions`;
  const partialFailureLabel = failedCount > 0
    ? ` ${failedCount} endpoint${failedCount === 1 ? "" : "s"} failed and will be retried on a future terminal event.`
    : "";

  return `Push notification delivered for the ${eventType} terminal event to ${deliveryLabel}.${partialFailureLabel}`;
}

function buildNotificationFailedSummary(
  eventType: "result" | "failed" | "canceled",
  attemptedCount: number,
  errorMessage: string | null,
): string {
  const attemptsLabel = attemptedCount === 1 ? "1 subscription" : `${attemptedCount} subscriptions`;

  if (errorMessage) {
    return `Push notification delivery failed for the ${eventType} terminal event across ${attemptsLabel}: ${errorMessage}`;
  }

  return `Push notification delivery failed for the ${eventType} terminal event across ${attemptsLabel}.`;
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

    let notificationResult: DeferredJobNotificationResult;

    try {
      notificationResult = await this.notificationDispatcher.notify(job, eventType);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.repository.appendEvent({
        jobId: job.id,
        conversationId: job.conversationId,
        eventType: "notification_failed",
        payload: {
          terminalEventType: eventType,
          attemptedCount: 1,
          failedCount: 1,
          reason: "dispatcher_error",
          errorMessage,
          summary: buildNotificationFailedSummary(eventType, 1, errorMessage),
        },
      });
      return;
    }

    if (notificationResult.status === "suppressed") {
      return;
    }

    if (notificationResult.status === "failed") {
      await this.repository.appendEvent({
        jobId: job.id,
        conversationId: job.conversationId,
        eventType: "notification_failed",
        payload: {
          terminalEventType: eventType,
          attemptedCount: notificationResult.attemptedCount,
          failedCount: notificationResult.failedCount,
          reason: notificationResult.reason,
          errorMessage: notificationResult.lastErrorMessage,
          statusCode: notificationResult.lastErrorStatusCode,
          summary: buildNotificationFailedSummary(
            eventType,
            notificationResult.attemptedCount,
            notificationResult.lastErrorMessage,
          ),
        },
      });
      return;
    }

    await this.repository.appendEvent({
      jobId: job.id,
      conversationId: job.conversationId,
      eventType: "notification_sent",
      payload: {
        terminalEventType: eventType,
        attemptedCount: notificationResult.attemptedCount,
        deliveredCount: notificationResult.deliveredCount,
        failedCount: notificationResult.failedCount,
        summary: buildNotificationSentSummary(
          eventType,
          notificationResult.deliveredCount,
          notificationResult.failedCount,
        ),
      },
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

    const reclaimedExpiredJobs = await this.repository.requeueExpiredRunningJobs(nowIso);
    for (const recovery of reclaimedExpiredJobs) {
      const recoveredEvent = await this.repository.appendEvent({
        jobId: recovery.job.id,
        conversationId: recovery.job.conversationId,
        eventType: "lease_recovered",
        payload: {
          previousClaimedBy: recovery.previousClaimedBy,
          previousLeaseExpiresAt: recovery.previousLeaseExpiresAt,
          summary: buildLeaseRecoveredSummary(recovery.previousClaimedBy),
        },
      });
      await this.conversationProjector?.project(recovery.job, recoveredEvent);
    }

    const reclaimedExpiredCount = reclaimedExpiredJobs.length;
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
        errorMessage: null,
        completedAt,
        leaseExpiresAt: null,
        claimedBy: null,
        failureClass: null,
        nextRetryAt: null,
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
      const failureClass = classifyJobFailure(error);
      const capability = getJobCapability(job.toolName);

      if (shouldScheduleAutomaticRetry(capability?.retryPolicy, failureClass, job.attemptCount)) {
        const delayMs = calculateRetryDelayMs(capability.retryPolicy, job.attemptCount);
        const nextRetryAt = toIso(new Date(baseNow.getTime() + delayMs));
        const scheduledJob = await this.repository.updateJobStatus(job.id, {
          status: "queued",
          errorMessage,
          progressPercent: null,
          progressLabel: null,
          completedAt: null,
          leaseExpiresAt: null,
          claimedBy: null,
          failureClass,
          nextRetryAt,
          recoveryMode: capability.recoveryMode,
        });
        const scheduledEvent = await this.repository.appendEvent({
          jobId: job.id,
          conversationId: job.conversationId,
          eventType: "retry_scheduled",
          payload: {
            errorMessage,
            failureClass,
            nextRetryAt,
            attemptCount: scheduledJob.attemptCount,
            maxAttempts: capability.retryPolicy.maxAttempts,
            summary: buildRetryScheduledSummary(
              scheduledJob.attemptCount + 1,
              capability.retryPolicy.maxAttempts,
              nextRetryAt,
            ),
          },
        });
        await this.conversationProjector?.project(scheduledJob, scheduledEvent);

        return {
          reclaimedExpiredCount,
          job: scheduledJob,
          outcome: "scheduled_retry",
          errorMessage,
        };
      }

      const completedAt = toIso(new Date());
      await this.repository.updateJobStatus(job.id, {
        status: "failed",
        errorMessage,
        completedAt,
        leaseExpiresAt: null,
        claimedBy: null,
        failureClass,
        nextRetryAt: null,
        recoveryMode: capability?.recoveryMode ?? job.recoveryMode,
      });
      const failedEvent = await this.repository.appendEvent({
        jobId: job.id,
        conversationId: job.conversationId,
        eventType: "failed",
        payload: { errorMessage, failureClass },
      });
      const failedJob = await this.repository.findJobById(job.id);
      if (failedJob) {
        await this.conversationProjector?.project(failedJob, failedEvent);

        if (isAutomaticRetryExhausted(capability?.retryPolicy, failureClass, failedJob.attemptCount)) {
          const exhaustedEvent = await this.repository.appendEvent({
            jobId: failedJob.id,
            conversationId: failedJob.conversationId,
            eventType: "retry_exhausted",
            payload: {
              errorMessage,
              failureClass,
              attemptCount: failedJob.attemptCount,
              maxAttempts: capability.retryPolicy.maxAttempts,
              summary: buildRetryExhaustedSummary(
                failedJob.attemptCount,
                capability.retryPolicy.maxAttempts,
              ),
            },
          });
          await this.conversationProjector?.project(failedJob, exhaustedEvent);
        }

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
