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

export interface DeferredJobNotificationDispatcher {
  notify(job: JobRequest, eventType: TerminalEventType): Promise<boolean>;
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
      if (!job.userId || job.userId.startsWith("anon_") || !shouldNotify(job, eventType) || !ensureWebPushConfigured()) {
        return false;
      }

      const preference = await preferencesRepository.get(
        job.userId,
        PUSH_NOTIFICATIONS_PREFERENCE_KEY,
      );
      if (!isPushNotificationsEnabledValue(preference?.value)) {
        return false;
      }

      const subscriptions = await repository.listByUser(job.userId);
      if (subscriptions.length === 0) {
        return false;
      }

      const payload = JSON.stringify(buildNotificationPayload(job, eventType));
      const notifiedAt = new Date().toISOString();
      let delivered = false;

      for (const subscription of subscriptions) {
        try {
          await webpush.sendNotification(
            toWebPushSubscription(subscription),
            payload,
          );
          await repository.markNotified(subscription.endpoint, notifiedAt);
          delivered = true;
        } catch (error) {
          const statusCode = typeof error === "object" && error !== null && "statusCode" in error
            ? Number((error as { statusCode?: unknown }).statusCode)
            : null;
          if (statusCode === 404 || statusCode === 410) {
            await repository.deleteByEndpoint(subscription.endpoint);
          }
        }
      }

      return delivered;
    },
  };
}