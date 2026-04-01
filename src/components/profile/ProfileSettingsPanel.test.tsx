import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserProfileViewModel } from "@/lib/profile/types";

import { ProfileSettingsPanel } from "@/components/profile/ProfileSettingsPanel";

const registerMock = vi.fn();
const getSubscriptionMock = vi.fn();
const subscribeMock = vi.fn();
const unsubscribeMock = vi.fn();

function buildProfile(overrides: Partial<UserProfileViewModel> = {}): UserProfileViewModel {
  return {
    id: "usr_1",
    name: "Morgan Lee",
    email: "morgan@example.com",
    credential: "Enterprise AI practitioner",
    pushNotificationsEnabled: true,
    affiliateEnabled: true,
    referralCode: "mentor-42",
    referralUrl: "https://studioordo.com/r/mentor-42",
    qrCodeUrl: "/api/qr/mentor-42",
    roles: ["APPRENTICE"],
    ...overrides,
  };
}

describe("ProfileSettingsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY", "BEl6bnlQdWJsaWNLZXlGb3JUZXN0aW5nMTIzNDU2Nzg");
    vi.stubGlobal("fetch", vi.fn());
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

  it("renders a compact referral workspace entry for affiliate-enabled accounts", () => {
    const { container } = render(
      <ProfileSettingsPanel
        initialProfile={buildProfile()}
      />,
    );

    expect(container.querySelector('[data-profile-surface="details-panel"]')?.className).toContain("profile-panel-surface");
    expect(container.querySelector('[data-profile-surface="referral-panel"]')?.className).toContain("profile-feature-surface");
    expect(screen.getByRole("link", { name: "Open referrals workspace" })).toHaveAttribute("href", "/referrals");
    expect(screen.queryByRole("button", { name: "Download QR" })).not.toBeInTheDocument();
  });

  it("enables push notifications from the profile panel", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ subscription: {} }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ preferences: [] }) } as Response);

    render(
      <ProfileSettingsPanel
        initialProfile={buildProfile({ pushNotificationsEnabled: false })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Enable notifications" }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith("/push-worker.js");
    });
    await waitFor(() => {
      expect(subscribeMock).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/notifications/push",
        expect.objectContaining({ method: "POST" }),
      );
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/preferences",
        expect.objectContaining({ method: "PUT" }),
      );
    });
    expect(await screen.findByText("Push notifications enabled for deferred job updates.")).toBeInTheDocument();
  });

  it("disables push notifications from the profile panel", async () => {
    const fetchMock = vi.mocked(fetch);
    getSubscriptionMock.mockResolvedValueOnce({
      endpoint: "https://push.example/sub_1",
      unsubscribe: unsubscribeMock,
    });
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ preferences: [] }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) } as Response);

    render(<ProfileSettingsPanel initialProfile={buildProfile()} />);

    fireEvent.click(screen.getByRole("button", { name: "Disable notifications" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/preferences",
        expect.objectContaining({ method: "PUT" }),
      );
    });
    await waitFor(() => {
      expect(unsubscribeMock).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/notifications/push",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
    expect(await screen.findByText("Push notifications disabled for your account.")).toBeInTheDocument();
  });

  it("renders the deployment-level push configuration message deterministically", () => {
    vi.stubEnv("NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY", "");

    render(<ProfileSettingsPanel initialProfile={buildProfile({ pushNotificationsEnabled: false })} />);

    expect(
      screen.getByText("Push notifications are not configured for this deployment yet."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enable notifications" })).toBeDisabled();
  });
});