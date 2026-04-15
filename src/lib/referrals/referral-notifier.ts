import webpush from "web-push";

import { getPushSubscriptionRepository, getUserPreferencesDataMapper } from "@/adapters/RepositoryFactory";
import type { Referral } from "@/core/entities/Referral";
import type { ReferralEvent } from "@/core/entities/ReferralEvent";
import type { PushSubscriptionRecord } from "@/core/entities/push-subscription";
import type { UserPreferencesRepository } from "@/core/ports/UserPreferencesRepository";
import type { PushSubscriptionRepository } from "@/core/use-cases/PushSubscriptionRepository";

import {
  getWebPushPrivateKey,
  getWebPushPublicKey,
  getWebPushSubject,
} from "@/lib/config/env";
import {
  isPushNotificationsEnabledValue,
  PUSH_NOTIFICATIONS_PREFERENCE_KEY,
} from "@/lib/push/push-preferences";
import { toReferralFeedNotification } from "@/lib/referrals/referral-milestones";

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

function toWebPushSubscription(record: PushSubscriptionRecord) {
  return {
    endpoint: record.endpoint,
    expirationTime: record.expirationTime,
    keys: {
      p256dh: record.p256dhKey,
      auth: record.authKey,
    },
  };
}

export interface ReferralMilestoneNotifier {
  notify(referral: Referral, event: ReferralEvent): Promise<void>;
}

export class BrowserPushReferralMilestoneNotifier implements ReferralMilestoneNotifier {
  constructor(
    private readonly pushSubscriptionRepository: PushSubscriptionRepository,
    private readonly preferencesRepository: UserPreferencesRepository,
  ) {}

  async notify(referral: Referral, event: ReferralEvent): Promise<void> {
    if (!ensureWebPushConfigured()) {
      return;
    }

    const notification = toReferralFeedNotification({
      eventId: event.id,
      referralId: referral.id,
      referralCode: referral.referralCode,
      eventType: event.eventType,
      createdAt: event.createdAt,
      conversationId: event.conversationId,
      payload: event.payload,
    });
    if (!notification) {
      return;
    }

    const preference = await this.preferencesRepository.get(
      referral.referrerUserId,
      PUSH_NOTIFICATIONS_PREFERENCE_KEY,
    );
    if (!isPushNotificationsEnabledValue(preference?.value)) {
      return;
    }

    const subscriptions = await this.pushSubscriptionRepository.listByUser(referral.referrerUserId);
    if (subscriptions.length === 0) {
      return;
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      url: notification.href ?? "/referrals",
    });
    const notifiedAt = new Date().toISOString();

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(toWebPushSubscription(subscription), payload);
        await this.pushSubscriptionRepository.markNotified(subscription.endpoint, notifiedAt);
      } catch (error) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number((error as { statusCode?: unknown }).statusCode)
            : null;
        if (statusCode === 404 || statusCode === 410) {
          await this.pushSubscriptionRepository.deleteByEndpoint(subscription.endpoint);
        }
      }
    }
  }
}

export function createReferralMilestoneNotifier(): ReferralMilestoneNotifier {
  return new BrowserPushReferralMilestoneNotifier(
    getPushSubscriptionRepository(),
    getUserPreferencesDataMapper(),
  );
}