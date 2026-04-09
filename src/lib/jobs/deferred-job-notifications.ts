import webpush from "web-push";
import { getPushSubscriptionRepository } from "@/adapters/RepositoryFactory";
import { UserPreferencesDataMapper } from "@/adapters/UserPreferencesDataMapper";
import type { JobRequest } from "@/core/entities/job";
import type { BrowserPushSubscription } from "@/core/entities/push-subscription";
import { getToolComposition } from "@/lib/chat/tool-composition-root";
import {
  getWebPushPrivateKey,
  getWebPushPublicKey,
  getWebPushSubject,
} from "@/lib/config/env";
import { getDb } from "@/lib/db";
import {
  isPushNotificationsEnabledValue,
  PUSH_NOTIFICATIONS_PREFERENCE_KEY,
} from "@/lib/push/push-preferences";

type TerminalEventType = "result" | "failed" | "canceled";

type DeferredJobNotificationSuppressionReason =
  | "missing_user"
  | "anonymous_user"
  | "policy_disabled"
  | "web_push_unconfigured"
  | "preference_disabled"
  | "no_subscriptions";

export type DeferredJobNotificationResult =
  | {
      status: "suppressed";
      reason: DeferredJobNotificationSuppressionReason;
    }
  | {
      status: "sent";
      attemptedCount: number;
      deliveredCount: number;
      failedCount: number;
    }
  | {
      status: "failed";
      reason: "delivery_error";
      attemptedCount: number;
      failedCount: number;
      lastErrorMessage: string | null;
      lastErrorStatusCode: number | null;
    };

export interface DeferredJobNotificationDispatcher {
  notify(job: JobRequest, eventType: TerminalEventType): Promise<DeferredJobNotificationResult>;
}

let configured = false;

function ensureWebPushConfigured(): boolean {
  const publicKey = getWebPushPublicKey();
  const privateKey = getWebPushPrivateKey();

  if (!publicKey || !privateKey) {
    return false;
  }

  if (!configured) {
    webpush.setVapidDetails(getWebPushSubject(), publicKey, privateKey);
    configured = true;
  }

  return true;
}

function shouldNotify(job: JobRequest, eventType: TerminalEventType): boolean {
  const descriptor = getToolComposition().registry.getDescriptor(job.toolName);
  const policy = descriptor?.deferred?.notificationPolicy ?? "none";

  if (policy === "none") {
    return false;
  }
  if (policy === "all-terminal") {
    return true;
  }
  if (policy === "completion-and-failure") {
    return eventType === "result" || eventType === "failed";
  }

  return false;
}

function buildNotificationPayload(job: JobRequest, eventType: TerminalEventType) {
  const label = job.toolName.split("_").map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1)).join(" ");
  const title =
    eventType === "result"
      ? `${label} completed`
      : eventType === "failed"
        ? `${label} failed`
        : `${label} canceled`;
  const body =
    eventType === "result"
      ? `${label} finished for your conversation.`
      : eventType === "failed"
        ? job.errorMessage ?? `${label} failed.`
        : `${label} was canceled.`;

  return {
    title,
    body,
    url: `/?conversationId=${encodeURIComponent(job.conversationId)}`,
    conversationId: job.conversationId,
    jobId: job.id,
    status: job.status,
  };
}

function toWebPushSubscription(record: {
  endpoint: string;
  expirationTime: number | null;
  p256dhKey: string;
  authKey: string;
}): BrowserPushSubscription {
  return {
    endpoint: record.endpoint,
    expirationTime: record.expirationTime,
    keys: {
      p256dh: record.p256dhKey,
      auth: record.authKey,
    },
  };
}

export function createDeferredJobNotificationDispatcher(): DeferredJobNotificationDispatcher {
  const repository = getPushSubscriptionRepository();
  const preferencesRepository = new UserPreferencesDataMapper(getDb());

  return {
    async notify(job, eventType) {
      if (!job.userId) {
        return { status: "suppressed", reason: "missing_user" };
      }

      if (job.userId.startsWith("anon_")) {
        return { status: "suppressed", reason: "anonymous_user" };
      }

      if (!shouldNotify(job, eventType)) {
        return { status: "suppressed", reason: "policy_disabled" };
      }

      if (!ensureWebPushConfigured()) {
        return { status: "suppressed", reason: "web_push_unconfigured" };
      }

      const preference = await preferencesRepository.get(
        job.userId,
        PUSH_NOTIFICATIONS_PREFERENCE_KEY,
      );
      if (!isPushNotificationsEnabledValue(preference?.value)) {
        return { status: "suppressed", reason: "preference_disabled" };
      }

      const subscriptions = await repository.listByUser(job.userId);
      if (subscriptions.length === 0) {
        return { status: "suppressed", reason: "no_subscriptions" };
      }

      const payload = JSON.stringify(buildNotificationPayload(job, eventType));
      const notifiedAt = new Date().toISOString();
      let deliveredCount = 0;
      let failedCount = 0;
      let lastErrorMessage: string | null = null;
      let lastErrorStatusCode: number | null = null;

      for (const subscription of subscriptions) {
        try {
          await webpush.sendNotification(
            toWebPushSubscription(subscription),
            payload,
          );
          await repository.markNotified(subscription.endpoint, notifiedAt);
          deliveredCount += 1;
        } catch (error) {
          failedCount += 1;
          lastErrorMessage = error instanceof Error ? error.message : String(error);
          const statusCode = typeof error === "object" && error !== null && "statusCode" in error
            ? Number((error as { statusCode?: unknown }).statusCode)
            : null;
          lastErrorStatusCode = statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await repository.deleteByEndpoint(subscription.endpoint);
          }
        }
      }

      if (deliveredCount > 0) {
        return {
          status: "sent",
          attemptedCount: subscriptions.length,
          deliveredCount,
          failedCount,
        };
      }

      return {
        status: "failed",
        reason: "delivery_error",
        attemptedCount: subscriptions.length,
        failedCount,
        lastErrorMessage,
        lastErrorStatusCode,
      };
    },
  };
}