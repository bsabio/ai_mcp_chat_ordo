"use client";

import { useEffect } from "react";
import type { RoleName } from "@/core/entities/user";
import {
  fetchPushNotificationsEnabledPreference,
  getPushNotificationsUnavailableReason,
  subscribeCurrentBrowserToPush,
} from "@/lib/push/browser-push";

export function useChatPushNotifications(initialRole: RoleName): void {
  useEffect(() => {
    if (initialRole === "ANONYMOUS" || getPushNotificationsUnavailableReason()) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const enabled = await fetchPushNotificationsEnabledPreference();
        if (!enabled || cancelled) {
          return;
        }

        if (!cancelled) {
          await subscribeCurrentBrowserToPush();
        }
      } catch {
        // Push enablement is opportunistic and should not break chat startup.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialRole]);
}