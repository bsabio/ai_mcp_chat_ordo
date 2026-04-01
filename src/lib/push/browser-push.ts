"use client";

import {
  isPushNotificationsEnabledValue,
  PUSH_NOTIFICATIONS_ENABLED_VALUE,
  PUSH_NOTIFICATIONS_PREFERENCE_KEY,
  PUSH_NOTIFICATIONS_DISABLED_VALUE,
} from "@/lib/push/push-preferences";

type PreferencesResponse = {
  preferences?: Array<{
    key?: unknown;
    value?: unknown;
  }>;
};

function base64UrlToUint8Array(value: string): BufferSource {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const normalized = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const decoded = window.atob(normalized);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0)) as BufferSource;
}

function getPublicKey(): string | null {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
  return publicKey && publicKey.length > 0 ? publicKey : null;
}

export function getPushNotificationsRenderUnavailableReason(): string | null {
  if (!getPublicKey()) {
    return "Push notifications are not configured for this deployment yet.";
  }

  return null;
}

export function getPushNotificationsUnavailableReason(): string | null {
  const renderUnavailableReason = getPushNotificationsRenderUnavailableReason();
  if (renderUnavailableReason) {
    return renderUnavailableReason;
  }

  if (typeof window === "undefined") {
    return "Push notifications are only available in the browser.";
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "This browser does not support web push notifications.";
  }

  if (!getPublicKey()) {
    return "Push notifications are not configured for this deployment yet.";
  }

  return null;
}

async function updatePushNotificationsPreference(enabled: boolean): Promise<void> {
  const response = await fetch("/api/preferences", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      preferences: [{
        key: PUSH_NOTIFICATIONS_PREFERENCE_KEY,
        value: enabled
          ? PUSH_NOTIFICATIONS_ENABLED_VALUE
          : PUSH_NOTIFICATIONS_DISABLED_VALUE,
      }],
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? "Unable to update your notification preference.");
  }
}

async function upsertPushSubscription(subscription: PushSubscription): Promise<void> {
  const response = await fetch("/api/notifications/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? "Unable to register push notifications for this browser.");
  }
}

async function deletePushSubscription(endpoint: string): Promise<void> {
  const response = await fetch("/api/notifications/push", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ endpoint }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? "Unable to remove this browser push subscription.");
  }
}

export async function fetchPushNotificationsEnabledPreference(): Promise<boolean> {
  const response = await fetch("/api/preferences", { cache: "no-store" });
  if (!response.ok) {
    return true;
  }

  const payload = await response.json().catch(() => null) as PreferencesResponse | null;
  const preference = payload?.preferences?.find(
    (entry) => entry.key === PUSH_NOTIFICATIONS_PREFERENCE_KEY,
  );

  return isPushNotificationsEnabledValue(
    typeof preference?.value === "string" ? preference.value : null,
  );
}

export async function subscribeCurrentBrowserToPush(): Promise<PushSubscription> {
  const unavailableReason = getPushNotificationsUnavailableReason();
  if (unavailableReason) {
    throw new Error(unavailableReason);
  }

  const publicKey = getPublicKey();
  if (!publicKey) {
    throw new Error("Push notifications are not configured for this deployment yet.");
  }

  const registration = await navigator.serviceWorker.register("/push-worker.js");

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToUint8Array(publicKey),
  });

  await upsertPushSubscription(subscription);
  return subscription;
}

export async function enablePushNotifications(): Promise<void> {
  await subscribeCurrentBrowserToPush();
  await updatePushNotificationsPreference(true);
}

export async function disablePushNotifications(): Promise<void> {
  await updatePushNotificationsPreference(false);

  try {
    const registration = await navigator.serviceWorker.register("/push-worker.js");
    const existing = await registration.pushManager.getSubscription();
    if (!existing) {
      return;
    }

    await existing.unsubscribe();
    await deletePushSubscription(existing.endpoint);
  } catch {
    // The account-level preference already disables delivery server-side.
  }
}