import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  disablePushNotifications,
  fetchPushNotificationsEnabledPreference,
  subscribeCurrentBrowserToPush,
} from "@/lib/push/browser-push";

const registerMock = vi.fn();
const getSubscriptionMock = vi.fn();
const subscribeMock = vi.fn();
const unsubscribeMock = vi.fn();
const fetchMock = vi.fn();

describe("browser push helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY", "BEl6bnlQdWJsaWNLZXlGb3JUZXN0aW5nMTIzNDU2Nzg");
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("Notification", {
      permission: "granted",
      requestPermission: vi.fn().mockResolvedValue("granted"),
    });
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: class PushManager {},
    });

    subscribeMock.mockResolvedValue({
      endpoint: "https://push.example/sub_1",
      toJSON: () => ({
        endpoint: "https://push.example/sub_1",
        expirationTime: null,
        keys: {
          p256dh: "p256dh-key",
          auth: "auth-key",
        },
      }),
    });
    getSubscriptionMock.mockResolvedValue(null);
    unsubscribeMock.mockResolvedValue(true);
    registerMock.mockResolvedValue({
      pushManager: {
        getSubscription: getSubscriptionMock,
        subscribe: subscribeMock,
      },
    });

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        register: registerMock,
      },
    });
  });

  it("defaults to enabled when the preferences endpoint is unavailable", async () => {
    fetchMock.mockResolvedValue({ ok: false });

    await expect(fetchPushNotificationsEnabledPreference()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("/api/preferences", { cache: "no-store" });
  });

  it("rejects subscription when browser permission is denied", async () => {
    vi.stubGlobal("Notification", {
      permission: "default",
      requestPermission: vi.fn().mockResolvedValue("denied"),
    });

    await expect(subscribeCurrentBrowserToPush()).rejects.toThrow(
      "Notification permission was not granted.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("disables the preference and removes the existing browser subscription", async () => {
    getSubscriptionMock.mockResolvedValue({
      endpoint: "https://push.example/sub_1",
      unsubscribe: unsubscribeMock,
    });
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ preferences: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    await disablePushNotifications();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/preferences",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(unsubscribeMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/notifications/push",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});