import webpush from "web-push";
import type {
  AdminNotification,
  NotificationChannel,
} from "@/core/entities/NotificationChannel";
import type { BrowserPushSubscription, PushSubscriptionRecord } from "@/core/entities/push-subscription";
import type { PushSubscriptionRepository } from "@/core/use-cases/PushSubscriptionRepository";
import {
  getWebPushPrivateKey,
  getWebPushPublicKey,
  getWebPushSubject,
} from "@/lib/config/env";

let configured = false;

function ensureWebPushConfigured(): boolean {
  const publicKey = getWebPushPublicKey();
  const privateKey = getWebPushPrivateKey();
  if (!publicKey || !privateKey) return false;
  if (!configured) {
    webpush.setVapidDetails(getWebPushSubject(), publicKey, privateKey);
    configured = true;
  }
  return true;
}

function toWebPushSubscription(record: PushSubscriptionRecord): BrowserPushSubscription {
  return {
    endpoint: record.endpoint,
    expirationTime: record.expirationTime,
    keys: {
      p256dh: record.p256dhKey,
      auth: record.authKey,
    },
  };
}

export class PushNotificationChannel implements NotificationChannel {
  constructor(
    private readonly repository: PushSubscriptionRepository,
    private readonly adminUserId: string,
  ) {}

  async send(notification: AdminNotification): Promise<void> {
    if (!ensureWebPushConfigured()) return;

    const subscriptions = await this.repository.listByUser(this.adminUserId);
    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      url: notification.actionUrl ?? "/admin",
    });

    const notifiedAt = new Date().toISOString();

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(toWebPushSubscription(subscription), payload);
        await this.repository.markNotified(subscription.endpoint, notifiedAt);
      } catch (error) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number((error as { statusCode?: unknown }).statusCode)
            : null;
        if (statusCode === 404 || statusCode === 410) {
          await this.repository.deleteByEndpoint(subscription.endpoint);
        }
      }
    }
  }
}
