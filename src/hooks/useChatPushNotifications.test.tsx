import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChatPushNotifications } from "@/hooks/useChatPushNotifications";

const registerMock = vi.fn();
const getSubscriptionMock = vi.fn();
const subscribeMock = vi.fn();
const fetchMock = vi.fn();

describe("useChatPushNotifications", () => {
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

    getSubscriptionMock.mockResolvedValue(null);
    subscribeMock.mockResolvedValue({
      toJSON: () => ({
        endpoint: "https://push.example/sub_1",
        expirationTime: null,
        keys: {
          p256dh: "p256dh-key",
          auth: "auth-key",
        },
      }),
    });
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

  it("registers the service worker and posts the subscription for authenticated users", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          preferences: [{ key: "push_notifications", value: "enabled" }],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    renderHook(() => useChatPushNotifications("AUTHENTICATED"));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith("/push-worker.js");
    });
    await waitFor(() => {
      expect(subscribeMock).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/notifications/push", expect.objectContaining({ method: "POST" }));
    });
  });

  it("does not subscribe when the stored preference is disabled", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        preferences: [{ key: "push_notifications", value: "disabled" }],
      }),
    });

    renderHook(() => useChatPushNotifications("AUTHENTICATED"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/preferences", { cache: "no-store" });
    });
    expect(registerMock).not.toHaveBeenCalled();
    expect(subscribeMock).not.toHaveBeenCalled();
  });

  it("does nothing for anonymous users", async () => {
    renderHook(() => useChatPushNotifications("ANONYMOUS"));

    await Promise.resolve();
    expect(registerMock).not.toHaveBeenCalled();
  });
});