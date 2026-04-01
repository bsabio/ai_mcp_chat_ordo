import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";

import { runMigrations } from "@/lib/db/migrations";
import { createTables } from "@/lib/db/tables";
import { createAdminReferralAnalyticsService } from "@/lib/referrals/admin-referral-analytics";

function createDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  createTables(db);
  runMigrations(db);
  return db;
}

function seedUser(db: Database.Database, input: {
  id: string;
  email: string;
  name: string;
  affiliateEnabled?: number;
  referralCode?: string | null;
  credential?: string | null;
}) {
  db.prepare(
    `INSERT INTO users (
       id,
       email,
       name,
       affiliate_enabled,
       referral_code,
       credential
     ) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    input.id,
    input.email,
    input.name,
    input.affiliateEnabled ?? 0,
    input.referralCode ?? null,
    input.credential ?? null,
  );
}

function seedConversation(db: Database.Database, input: {
  id: string;
  userId: string;
  updatedAt: string;
  referralId?: string | null;
  referralSource?: string | null;
}) {
  db.prepare(
    `INSERT INTO conversations (
       id,
       user_id,
       title,
       referral_id,
       referral_source,
       session_source,
       created_at,
       updated_at
     ) VALUES (?, ?, '', ?, ?, 'web', ?, ?)`,
  ).run(
    input.id,
    input.userId,
    input.referralId ?? null,
    input.referralSource ?? null,
    input.updatedAt,
    input.updatedAt,
  );
}

function seedReferral(db: Database.Database, input: {
  id: string;
  referrerUserId: string;
  referredUserId?: string | null;
  conversationId?: string | null;
  referralCode: string;
  status: string;
  creditStatus: string;
  outcome?: string | null;
  createdAt: string;
  lastEventAt?: string | null;
}) {
  db.prepare(
    `INSERT INTO referrals (
       id,
       referrer_user_id,
       referred_user_id,
       conversation_id,
       referral_code,
       status,
       credit_status,
       outcome,
       created_at,
       last_event_at,
       metadata_json
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}')`,
  ).run(
    input.id,
    input.referrerUserId,
    input.referredUserId ?? null,
    input.conversationId ?? null,
    input.referralCode,
    input.status,
    input.creditStatus,
    input.outcome ?? null,
    input.createdAt,
    input.lastEventAt ?? input.createdAt,
  );
}

function seedEvent(db: Database.Database, input: {
  id: string;
  referralId: string;
  conversationId?: string | null;
  eventType: string;
  createdAt: string;
}) {
  db.prepare(
    `INSERT INTO referral_events (
       id,
       referral_id,
       conversation_id,
       event_type,
       idempotency_key,
       payload_json,
       created_at
     ) VALUES (?, ?, ?, ?, ?, '{}', ?)`,
  ).run(
    input.id,
    input.referralId,
    input.conversationId ?? null,
    input.eventType,
    `${input.referralId}:${input.eventType}:${input.id}`,
    input.createdAt,
  );
}

describe("admin referral analytics", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDb();
    seedUser(db, {
      id: "usr_affiliate",
      email: "ada@example.com",
      name: "Ada Lovelace",
      affiliateEnabled: 1,
      referralCode: "mentor-42",
      credential: "Founder",
    });
    seedUser(db, {
      id: "usr_partner",
      email: "grace@example.com",
      name: "Grace Hopper",
      affiliateEnabled: 1,
      referralCode: "partner-77",
      credential: "Advisor",
    });
    seedUser(db, {
      id: "usr_disabled",
      email: "disabled@example.com",
      name: "Disabled Affiliate",
      affiliateEnabled: 0,
      referralCode: "old-code",
    });
    seedUser(db, { id: "usr_member", email: "member@example.com", name: "Member" });
    seedUser(db, { id: "anon_seed", email: "anon@example.com", name: "Anonymous" });

    seedConversation(db, { id: "conv_missing_join", userId: "usr_member", referralSource: "mentor-42", updatedAt: "2026-04-10T09:00:00.000Z" });
    seedConversation(db, { id: "conv_disabled_code", userId: "usr_member", referralSource: "old-code", updatedAt: "2026-04-09T09:00:00.000Z" });
    seedConversation(db, { id: "conv_invalid_source", userId: "usr_member", referralSource: "bogus-code", updatedAt: "2026-04-08T09:00:00.000Z" });
    seedConversation(db, { id: "conv_ref_1", userId: "anon_seed", referralId: "ref_1", updatedAt: "2026-04-07T09:00:00.000Z" });
    seedConversation(db, { id: "conv_ref_2", userId: "anon_seed", referralId: "ref_2", updatedAt: "2026-04-06T09:00:00.000Z" });
    seedConversation(db, { id: "conv_ref_3", userId: "anon_seed", referralId: "ref_3", updatedAt: "2026-04-05T09:00:00.000Z" });
    seedConversation(db, { id: "conv_ref_4", userId: "anon_seed", referralId: "ref_4", updatedAt: "2026-04-04T09:00:00.000Z" });

    seedReferral(db, {
      id: "ref_1",
      referrerUserId: "usr_affiliate",
      referredUserId: "usr_member",
      conversationId: "conv_ref_1",
      referralCode: "mentor-42",
      status: "consultation",
      creditStatus: "pending_review",
      outcome: "consultation_requested",
      createdAt: "2026-04-01T09:00:00.000Z",
      lastEventAt: "2026-04-07T09:00:00.000Z",
    });
    seedReferral(db, {
      id: "ref_2",
      referrerUserId: "usr_partner",
      referredUserId: "usr_member",
      conversationId: "conv_ref_2",
      referralCode: "partner-77",
      status: "deal",
      creditStatus: "approved",
      outcome: "deal_created",
      createdAt: "2026-04-02T09:00:00.000Z",
      lastEventAt: "2026-04-06T09:00:00.000Z",
    });
    seedReferral(db, {
      id: "ref_3",
      referrerUserId: "usr_partner",
      conversationId: "conv_ref_3",
      referralCode: "partner-77",
      status: "engaged",
      creditStatus: "tracked",
      outcome: "lead_submitted",
      createdAt: "2026-04-03T09:00:00.000Z",
      lastEventAt: "2026-04-05T09:00:00.000Z",
    });
    seedReferral(db, {
      id: "ref_4",
      referrerUserId: "usr_affiliate",
      referredUserId: "usr_member",
      conversationId: "conv_ref_4",
      referralCode: "mentor-42",
      status: "registered",
      creditStatus: "tracked",
      createdAt: "2026-04-04T09:00:00.000Z",
      lastEventAt: "2026-04-04T09:00:00.000Z",
    });

    seedEvent(db, { id: "evt_1", referralId: "ref_1", conversationId: "conv_ref_1", eventType: "conversation_started", createdAt: "2026-04-01T09:00:00.000Z" });
    seedEvent(db, { id: "evt_2", referralId: "ref_1", conversationId: "conv_ref_1", eventType: "registered", createdAt: "2026-04-02T09:00:00.000Z" });
    seedEvent(db, { id: "evt_3", referralId: "ref_1", conversationId: "conv_ref_1", eventType: "lead_submitted", createdAt: "2026-04-03T09:00:00.000Z" });
    seedEvent(db, { id: "evt_4", referralId: "ref_1", conversationId: "conv_ref_1", eventType: "consultation_requested", createdAt: "2026-04-07T09:00:00.000Z" });
    seedEvent(db, { id: "evt_5", referralId: "ref_2", conversationId: "conv_ref_2", eventType: "conversation_started", createdAt: "2026-04-02T09:00:00.000Z" });
    seedEvent(db, { id: "evt_6", referralId: "ref_2", conversationId: "conv_ref_2", eventType: "registered", createdAt: "2026-04-03T09:00:00.000Z" });
    seedEvent(db, { id: "evt_7", referralId: "ref_2", conversationId: "conv_ref_2", eventType: "deal_created", createdAt: "2026-04-06T09:00:00.000Z" });
    seedEvent(db, { id: "evt_8", referralId: "ref_3", conversationId: "conv_ref_3", eventType: "conversation_started", createdAt: "2026-04-03T09:00:00.000Z" });
    seedEvent(db, { id: "evt_9", referralId: "ref_3", conversationId: "conv_ref_3", eventType: "lead_submitted", createdAt: "2026-04-05T09:00:00.000Z" });
    seedEvent(db, { id: "evt_10", referralId: "ref_4", conversationId: "conv_ref_4", eventType: "conversation_started", createdAt: "2026-04-04T09:00:00.000Z" });
    seedEvent(db, { id: "evt_11", referralId: "ref_4", conversationId: "conv_ref_4", eventType: "registered", createdAt: "2026-04-04T12:00:00.000Z" });
  });

  it("aggregates overview, leaderboard, pipeline, exceptions, and payout export rows", async () => {
    const service = createAdminReferralAnalyticsService(db);

    const overview = await service.getOverview();
    const leaderboard = await service.getLeaderboard({ limit: 5 });
    const pipeline = await service.getPipeline();
    const exceptions = await service.getExceptions();
    const reviewBacklog = await service.getExceptions({ kind: "credit_review_backlog" });
    const notifications = await service.getNotificationFeed(2);
    const payoutRows = await service.getPayoutExportRows();

    expect(overview).toMatchObject({
      affiliatesEnabled: 2,
      activeAffiliates: 2,
      introductions: 4,
      startedChats: 4,
      registered: 3,
      qualifiedOpportunities: 3,
      creditPendingReview: 1,
      approvedCredits: 1,
      paidCredits: 0,
      exceptions: 5,
    });
    expect(overview.narrative).toContain("exception");

    expect(leaderboard.total).toBe(2);
    expect(leaderboard.items[0]).toMatchObject({
      userId: "usr_partner",
      introductions: 2,
      qualifiedOpportunities: 2,
      approved: 1,
    });
    expect(leaderboard.items[1]).toMatchObject({
      userId: "usr_affiliate",
      introductions: 2,
      pendingReview: 1,
    });

    expect(pipeline.stages).toEqual(expect.arrayContaining([
      expect.objectContaining({ stage: "introductions", count: 4, conversionRate: 100 }),
      expect.objectContaining({ stage: "registered", count: 3, conversionRate: 75 }),
    ]));
    expect(pipeline.outcomes).toEqual(expect.arrayContaining([
      expect.objectContaining({ outcome: "lead_submitted", count: 2 }),
      expect.objectContaining({ outcome: "deal_created", count: 1 }),
    ]));

    expect(exceptions.total).toBe(5);
    expect(exceptions.counts).toEqual({
      invalid_referral_source: 1,
      missing_referral_join: 1,
      disabled_referral_code: 1,
      credit_review_backlog: 2,
    });
    expect(exceptions.items.map((item) => item.kind)).toEqual([
      "missing_referral_join",
      "disabled_referral_code",
      "invalid_referral_source",
      "credit_review_backlog",
      "credit_review_backlog",
    ]);

    expect(reviewBacklog.total).toBe(2);
    expect(reviewBacklog.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ referralId: "ref_1", creditStatus: "pending_review" }),
      expect.objectContaining({ referralId: "ref_3", creditStatus: "tracked" }),
    ]));

    expect(notifications).toHaveLength(2);
    expect(notifications[0]).toMatchObject({ scope: "admin", title: "Missing referral join" });

    expect(payoutRows).toEqual([
      expect.objectContaining({
        referralId: "ref_2",
        referrerUserId: "usr_partner",
        creditStatus: "approved",
      }),
    ]);
  });
});