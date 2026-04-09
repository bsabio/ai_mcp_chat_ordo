import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminNotification, NotificationChannel } from "@/core/entities/NotificationChannel";

// ── ChatNotificationChannel ────────────────────────────────────────────

describe("ChatNotificationChannel", () => {
  it("creates a system message with severity prefix", async () => {
    const { ChatNotificationChannel } = await import(
      "@/adapters/ChatNotificationChannel"
    );
    const mockCreate = vi.fn().mockResolvedValue({});

    const channel = new ChatNotificationChannel(
      { create: mockCreate } as never,
      async () => "conv_123",
    );

    await channel.send({
      title: "Lead queue growing",
      body: "More than 5 uncontacted leads",
      severity: "warning",
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    const arg = mockCreate.mock.calls[0][0];
    expect(arg.conversationId).toBe("conv_123");
    expect(arg.role).toBe("system");
    expect(arg.content).toBe(
      "[WARNING] Lead queue growing: More than 5 uncontacted leads",
    );
    expect(arg.parts[0].type).toBe("text");
  });

  it("silently drops when no conversation exists", async () => {
    const { ChatNotificationChannel } = await import(
      "@/adapters/ChatNotificationChannel"
    );
    const mockCreate = vi.fn();
    const channel = new ChatNotificationChannel(
      { create: mockCreate } as never,
      async () => null,
    );

    await channel.send({
      title: "Test",
      body: "test body",
      severity: "info",
    });

    expect(mockCreate).not.toHaveBeenCalled();
  });
});

// ── PushNotificationChannel ────────────────────────────────────────────

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/lib/config/env", () => ({
  getWebPushPublicKey: () => "fake-public-key",
  getWebPushPrivateKey: () => "fake-private-key",
  getWebPushSubject: () => "mailto:admin@example.com",
}));

describe("PushNotificationChannel", () => {
  it("sends push notification to all subscriptions", async () => {
    const webpush = await import("web-push");
    const { PushNotificationChannel } = await import(
      "@/adapters/PushNotificationChannel"
    );

    const mockRepo = {
      listByUser: vi.fn().mockResolvedValue([
        {
          endpoint: "https://push.example.com/sub1",
          expirationTime: null,
          p256dhKey: "key1",
          authKey: "auth1",
          userId: "admin_1",
          userAgent: null,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
          lastNotifiedAt: null,
        },
      ]),
      markNotified: vi.fn().mockResolvedValue(undefined),
      deleteByEndpoint: vi.fn().mockResolvedValue(undefined),
      upsert: vi.fn(),
    };

    const channel = new PushNotificationChannel(mockRepo, "admin_1");
    await channel.send({
      title: "Alert",
      body: "Something happened",
      severity: "critical",
      actionUrl: "/admin/system",
    });

    expect(mockRepo.listByUser).toHaveBeenCalledWith("admin_1");
    expect(webpush.default.sendNotification).toHaveBeenCalled();
    expect(mockRepo.markNotified).toHaveBeenCalledWith(
      "https://push.example.com/sub1",
      expect.any(String),
    );
  });

  it("removes stale subscriptions on 410", async () => {
    const webpush = await import("web-push");
    const sendMock = vi.mocked(webpush.default.sendNotification);
    sendMock.mockRejectedValueOnce({ statusCode: 410 });

    const { PushNotificationChannel } = await import(
      "@/adapters/PushNotificationChannel"
    );

    const mockRepo = {
      listByUser: vi.fn().mockResolvedValue([
        {
          endpoint: "https://push.example.com/expired",
          expirationTime: null,
          p256dhKey: "key1",
          authKey: "auth1",
          userId: "admin_1",
          userAgent: null,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
          lastNotifiedAt: null,
        },
      ]),
      markNotified: vi.fn(),
      deleteByEndpoint: vi.fn().mockResolvedValue(undefined),
      upsert: vi.fn(),
    };

    const channel = new PushNotificationChannel(mockRepo, "admin_1");
    await channel.send({
      title: "Test",
      body: "body",
      severity: "info",
    });

    expect(mockRepo.deleteByEndpoint).toHaveBeenCalledWith(
      "https://push.example.com/expired",
    );
  });
});

// ── NotificationDispatcher ─────────────────────────────────────────────

describe("NotificationDispatcher", () => {
  it("dispatches to all channels via Promise.allSettled", async () => {
    const { NotificationDispatcher } = await import(
      "@/lib/admin/notifications/notification-dispatcher"
    );

    const ch1: NotificationChannel = { send: vi.fn().mockResolvedValue(undefined) };
    const ch2: NotificationChannel = { send: vi.fn().mockResolvedValue(undefined) };
    const dispatcher = new NotificationDispatcher([ch1, ch2]);

    const notification: AdminNotification = {
      title: "Test",
      body: "body",
      severity: "info",
    };

    await dispatcher.dispatch(notification);

    expect(ch1.send).toHaveBeenCalledWith(notification);
    expect(ch2.send).toHaveBeenCalledWith(notification);
  });

  it("does not throw when a channel fails", async () => {
    const { NotificationDispatcher } = await import(
      "@/lib/admin/notifications/notification-dispatcher"
    );

    const failing: NotificationChannel = {
      send: vi.fn().mockRejectedValue(new Error("push failed")),
    };
    const succeeding: NotificationChannel = {
      send: vi.fn().mockResolvedValue(undefined),
    };
    const dispatcher = new NotificationDispatcher([failing, succeeding]);

    await expect(
      dispatcher.dispatch({ title: "t", body: "b", severity: "critical" }),
    ).resolves.toBeUndefined();

    expect(succeeding.send).toHaveBeenCalled();
  });
});

// ── AdminSignalEvaluator ───────────────────────────────────────────────

describe("AdminSignalEvaluator", () => {
  it("fires notification when lead queue exceeds threshold", async () => {
    const { AdminSignalEvaluator, DEFAULT_SIGNAL_RULES } = await import(
      "@/lib/admin/notifications/admin-signal-evaluator"
    );

    const mockDispatch = vi.fn().mockResolvedValue(undefined);
    const dispatcher = { dispatch: mockDispatch } as never;
    const evaluator = new AdminSignalEvaluator(DEFAULT_SIGNAL_RULES, dispatcher);

    await evaluator.evaluate([
      { blockId: "lead_queue", state: "ready", data: { uncontactedCount: 8 } },
    ]);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        signalId: "lead_queue",
        severity: "warning",
      }),
    );
  });

  it("does not fire when below threshold", async () => {
    const { AdminSignalEvaluator, DEFAULT_SIGNAL_RULES } = await import(
      "@/lib/admin/notifications/admin-signal-evaluator"
    );

    const mockDispatch = vi.fn();
    const evaluator = new AdminSignalEvaluator(
      DEFAULT_SIGNAL_RULES,
      { dispatch: mockDispatch } as never,
    );

    await evaluator.evaluate([
      { blockId: "lead_queue", state: "ready", data: { uncontactedCount: 3 } },
    ]);

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("fires critical for system health degraded", async () => {
    const { AdminSignalEvaluator, DEFAULT_SIGNAL_RULES } = await import(
      "@/lib/admin/notifications/admin-signal-evaluator"
    );

    const mockDispatch = vi.fn().mockResolvedValue(undefined);
    const evaluator = new AdminSignalEvaluator(
      DEFAULT_SIGNAL_RULES,
      { dispatch: mockDispatch } as never,
    );

    await evaluator.evaluate([
      { blockId: "system_health", state: "ready", data: { status: "degraded" } },
    ]);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        signalId: "system_health",
        severity: "critical",
        title: "System health degraded",
      }),
    );
  });
});

// ── Follow-up overdue rules ────────────────────────────────────────────

describe("Follow-up overdue rules", () => {
  it("fires warning for 24–72 hour overdue", async () => {
    const { AdminSignalEvaluator, DEFAULT_SIGNAL_RULES } = await import(
      "@/lib/admin/notifications/admin-signal-evaluator"
    );

    const mockDispatch = vi.fn().mockResolvedValue(undefined);
    const evaluator = new AdminSignalEvaluator(
      DEFAULT_SIGNAL_RULES,
      { dispatch: mockDispatch } as never,
    );

    await evaluator.evaluate([
      { blockId: "overdue_follow_ups", state: "ready", data: { overdueHours: 48 } },
    ]);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        signalId: "overdue_follow_ups",
        severity: "warning",
      }),
    );
  });

  it("fires critical for >72 hour overdue", async () => {
    const { AdminSignalEvaluator, DEFAULT_SIGNAL_RULES } = await import(
      "@/lib/admin/notifications/admin-signal-evaluator"
    );

    const mockDispatch = vi.fn().mockResolvedValue(undefined);
    const evaluator = new AdminSignalEvaluator(
      DEFAULT_SIGNAL_RULES,
      { dispatch: mockDispatch } as never,
    );

    await evaluator.evaluate([
      { blockId: "overdue_follow_ups", state: "ready", data: { overdueHours: 100 } },
    ]);

    // Should fire both warning and critical
    const criticalCall = mockDispatch.mock.calls.find(
      (call: unknown[]) =>
        (call[0] as AdminNotification).severity === "critical" &&
        (call[0] as AdminNotification).signalId === "overdue_follow_ups",
    );
    expect(criticalCall).toBeDefined();
  });
});

// ── Volume control (cooldown, quiet hours) ─────────────────────────────

describe("Volume control", () => {
  afterEach(async () => {
    const { resetCooldowns } = await import(
      "@/lib/admin/notifications/notification-preferences"
    );
    resetCooldowns();
  });

  it("detects quiet hours (same-day range)", async () => {
    const { isInQuietHours } = await import(
      "@/lib/admin/notifications/notification-preferences"
    );

    const prefs = {
      pushEnabled: true,
      chatEnabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      cooldownMinutes: 30,
    };

    // 23:30 → within quiet hours (overnight range)
    const lateNight = new Date("2024-06-15T23:30:00");
    expect(isInQuietHours(prefs, lateNight)).toBe(true);

    // 12:00 → outside quiet hours
    const midday = new Date("2024-06-15T12:00:00");
    expect(isInQuietHours(prefs, midday)).toBe(false);
  });

  it("enforces cooldown between same-signal alerts", async () => {
    const { isCooldownActive, recordSignalFired } = await import(
      "@/lib/admin/notifications/notification-preferences"
    );

    const now = Date.now();

    expect(isCooldownActive("lead_queue", 30, now)).toBe(false);

    recordSignalFired("lead_queue", now);

    // 10 minutes later → still in cooldown
    expect(isCooldownActive("lead_queue", 30, now + 10 * 60_000)).toBe(true);

    // 31 minutes later → cooldown expired
    expect(isCooldownActive("lead_queue", 30, now + 31 * 60_000)).toBe(false);
  });
});

// ── Empty states rendering ─────────────────────────────────────────────

describe("Empty states rendering", () => {
  it("AdminEmptyState renders heading and description", async () => {
    const { AdminEmptyState } = await import(
      "@/components/admin/AdminEmptyState"
    );

    render(
      <AdminEmptyState
        heading="No users found"
        description="No users match the current filters."
      />,
    );

    expect(screen.getByText("No users found")).toBeInTheDocument();
    expect(
      screen.getByText("No users match the current filters."),
    ).toBeInTheDocument();
  });

  it("AdminEmptyState has data-admin-empty-state attribute", async () => {
    const { AdminEmptyState } = await import(
      "@/components/admin/AdminEmptyState"
    );

    const { container } = render(
      <AdminEmptyState heading="Empty" description="Nothing here" />,
    );

    expect(
      container.querySelector("[data-admin-empty-state]"),
    ).toBeInTheDocument();
  });

  it("AdminEmptyState renders optional action", async () => {
    const { AdminEmptyState } = await import(
      "@/components/admin/AdminEmptyState"
    );

    render(
      <AdminEmptyState
        heading="No items"
        description="Nothing to show"
        action={<button>Create one</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "Create one" })).toBeInTheDocument();
  });
});

// ── Error boundary behavior ────────────────────────────────────────────

describe("Error boundary behavior", () => {
  it("AdminErrorFallback renders error message and actions", async () => {
    const { default: AdminErrorFallback } = await import(
      "@/components/admin/AdminErrorFallback"
    );

    const reset = vi.fn();
    render(
      <AdminErrorFallback
        error={Object.assign(new Error("DB connection failed"), { digest: "abc" })}
        reset={reset}
      />,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("DB connection failed")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
    expect(screen.getByText("Back to dashboard")).toBeInTheDocument();
  });

  it("calls reset when retry button is clicked", async () => {
    const { default: AdminErrorFallback } = await import(
      "@/components/admin/AdminErrorFallback"
    );

    const reset = vi.fn();
    render(
      <AdminErrorFallback
        error={Object.assign(new Error("fail"), { digest: "x" })}
        reset={reset}
      />,
    );

    fireEvent.click(screen.getByText("Try again"));
    expect(reset).toHaveBeenCalledOnce();
  });
});
