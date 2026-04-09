import { describe, expect, it, vi } from "vitest";

import {
  runConversationRetentionSweep,
  ANONYMOUS_CONVERSATION_HISTORY_CAP,
} from "@/lib/chat/conversation-retention-worker";
import { createConversationRoutingSnapshot } from "@/core/entities/conversation-routing";
import type { Conversation } from "@/core/entities/conversation";

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: overrides.id ?? "conv_1",
    userId: overrides.userId ?? "usr_1",
    title: overrides.title ?? "Conversation",
    status: overrides.status ?? "archived",
    createdAt: overrides.createdAt ?? "2026-04-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-01T00:00:00.000Z",
    convertedFrom: overrides.convertedFrom ?? null,
    messageCount: overrides.messageCount ?? 1,
    firstMessageAt: overrides.firstMessageAt ?? null,
    lastToolUsed: overrides.lastToolUsed ?? null,
    sessionSource: overrides.sessionSource ?? "authenticated",
    promptVersion: overrides.promptVersion ?? null,
    routingSnapshot: overrides.routingSnapshot ?? createConversationRoutingSnapshot(),
    referralSource: overrides.referralSource ?? null,
    ...overrides,
  };
}

describe("conversation retention worker", () => {
  it("purges tombstones that are already eligible", async () => {
    const purge = vi.fn().mockResolvedValue(undefined);

    const report = await runConversationRetentionSweep(
      {
        listPurgeEligible: vi.fn().mockResolvedValue([
          makeConversation({ id: "conv_due", deletedAt: "2026-03-01T00:00:00.000Z", purgeAfter: "2026-04-01T00:00:00.000Z" }),
        ]),
        listAnonymousConversations: vi.fn().mockResolvedValue([]),
        purge,
      },
      { now: new Date("2026-04-08T00:00:00.000Z") },
    );

    expect(report.purgedDeletedConversationIds).toEqual(["conv_due"]);
    expect(report.purgedAnonymousConversationIds).toEqual([]);
    expect(purge).toHaveBeenCalledWith(
      "conv_due",
      expect.objectContaining({
        userId: "system_retention_worker",
        reason: "retention_policy",
      }),
    );
  });

  it("enforces the anonymous TTL and recent-history cap", async () => {
    const purge = vi.fn().mockResolvedValue(undefined);
    const anonymousConversations = Array.from({ length: ANONYMOUS_CONVERSATION_HISTORY_CAP + 2 }, (_, index) =>
      makeConversation({
        id: `anon_conv_${index + 1}`,
        userId: "anon_owner",
        sessionSource: "anonymous_cookie",
        updatedAt: new Date(Date.parse("2026-04-08T00:00:00.000Z") - index * 60_000).toISOString(),
      }),
    );
    anonymousConversations.push(
      makeConversation({
        id: "anon_expired",
        userId: "anon_owner",
        sessionSource: "anonymous_cookie",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    );

    const report = await runConversationRetentionSweep(
      {
        listPurgeEligible: vi.fn().mockResolvedValue([]),
        listAnonymousConversations: vi.fn().mockResolvedValue(anonymousConversations),
        purge,
      },
      {
        now: new Date("2026-04-08T00:00:00.000Z"),
      },
    );

    expect(report.purgedDeletedConversationIds).toEqual([]);
    expect(report.purgedAnonymousConversationIds).toEqual([
      "anon_conv_11",
      "anon_conv_12",
      "anon_expired",
    ]);
    expect(purge).toHaveBeenCalledTimes(3);
  });
});