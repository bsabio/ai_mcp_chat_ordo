import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";

import { ConversationDataMapper } from "@/adapters/ConversationDataMapper";
import { ReferralDataMapper } from "@/adapters/ReferralDataMapper";
import { ReferralEventDataMapper } from "@/adapters/ReferralEventDataMapper";
import { ensureSchema } from "@/lib/db/schema";
import { ReferralLedgerService } from "@/lib/referrals/referral-ledger";

function createDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  ensureSchema(db);
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

function createService(db: Database.Database) {
  return new ReferralLedgerService(
    new ConversationDataMapper(db),
    new ReferralDataMapper(db),
    new ReferralEventDataMapper(db),
  );
}

describe("ReferralLedgerService", () => {
  let db: Database.Database;
  let conversations: ConversationDataMapper;
  let referrals: ReferralDataMapper;
  let referralEvents: ReferralEventDataMapper;
  let service: ReferralLedgerService;

  beforeEach(async () => {
    db = createDb();
    seedUser(db, {
      id: "usr_affiliate",
      email: "affiliate@test.com",
      name: "Ada Lovelace",
      affiliateEnabled: 1,
      referralCode: "mentor-42",
      credential: "Founder",
    });
    seedUser(db, {
      id: "anon_seed",
      email: "anon_seed@anonymous.local",
      name: "Anonymous",
    });
    db.prepare(`INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES ('anon_seed', 'role_anonymous')`).run();

    conversations = new ConversationDataMapper(db);
    referrals = new ReferralDataMapper(db);
    referralEvents = new ReferralEventDataMapper(db);
    service = createService(db);

    await conversations.create({
      id: "conv_1",
      userId: "anon_seed",
      title: "Referral conversation",
      status: "active",
      sessionSource: "anonymous_cookie",
    });
  });

  it("creates one canonical referral row and conversation_started event per validated visit", async () => {
    await service.attachValidatedVisitToConversation({
      conversationId: "conv_1",
      userId: "anon_seed",
      visit: {
        visitId: "visit_1",
        code: "mentor-42",
        issuedAt: "2026-04-01T10:00:00.000Z",
        referrer: {
          userId: "usr_affiliate",
          code: "mentor-42",
          name: "Ada Lovelace",
          credential: "Founder",
        },
      },
    });
    await service.attachValidatedVisitToConversation({
      conversationId: "conv_1",
      userId: "anon_seed",
      visit: {
        visitId: "visit_1",
        code: "mentor-42",
        issuedAt: "2026-04-01T10:00:00.000Z",
        referrer: {
          userId: "usr_affiliate",
          code: "mentor-42",
          name: "Ada Lovelace",
          credential: "Founder",
        },
      },
    });

    const conversation = await conversations.findById("conv_1");
    expect(conversation?.referralId).toBeTruthy();
    expect(conversation?.referralSource).toBe("mentor-42");

    const referral = referrals.findByConversation("conv_1");
    expect(referral?.visitId).toBe("visit_1");
    expect(referral?.status).toBe("engaged");

    const events = referralEvents.listByReferralId(referral?.id ?? "");
    expect(events.filter((event) => event.eventType === "conversation_started")).toHaveLength(1);
  });

  it("links the authenticated user and writes a registration event idempotently", async () => {
    await service.attachValidatedVisitToConversation({
      conversationId: "conv_1",
      userId: "anon_seed",
      visit: {
        visitId: "visit_1",
        code: "mentor-42",
        issuedAt: "2026-04-01T10:00:00.000Z",
        referrer: {
          userId: "usr_affiliate",
          code: "mentor-42",
          name: "Ada Lovelace",
          credential: "Founder",
        },
      },
    });
    seedUser(db, {
      id: "usr_member",
      email: "member@test.com",
      name: "Member",
    });

    await service.linkConversationToAuthenticatedUser({
      conversationId: "conv_1",
      userId: "usr_member",
      source: "registration",
    });
    await service.linkConversationToAuthenticatedUser({
      conversationId: "conv_1",
      userId: "usr_member",
      source: "registration",
    });

    const referral = referrals.findByConversation("conv_1");
    expect(referral?.referredUserId).toBe("usr_member");
    expect(referral?.status).toBe("registered");

    const events = referralEvents.listByReferralId(referral?.id ?? "");
    expect(events.filter((event) => event.eventType === "registered")).toHaveLength(1);
  });

  it("records lead and consultation milestones idempotently", async () => {
    await service.attachValidatedVisitToConversation({
      conversationId: "conv_1",
      userId: "anon_seed",
      visit: {
        visitId: "visit_1",
        code: "mentor-42",
        issuedAt: "2026-04-01T10:00:00.000Z",
        referrer: {
          userId: "usr_affiliate",
          code: "mentor-42",
          name: "Ada Lovelace",
          credential: "Founder",
        },
      },
    });

    await service.recordLeadSubmitted({
      conversationId: "conv_1",
      leadRecordId: "lead_1",
      captureStatus: "submitted",
      triageState: "qualified",
      lane: "organization",
    });
    await service.recordLeadSubmitted({
      conversationId: "conv_1",
      leadRecordId: "lead_1",
      captureStatus: "submitted",
      triageState: "qualified",
      lane: "organization",
    });
    await service.recordConsultationRequested({
      conversationId: "conv_1",
      consultationRequestId: "cr_1",
      lane: "organization",
    });
    await service.recordConsultationRequested({
      conversationId: "conv_1",
      consultationRequestId: "cr_1",
      lane: "organization",
    });

    const referral = referrals.findByConversation("conv_1");
    const events = referralEvents.listByReferralId(referral?.id ?? "");

    expect(events.filter((event) => event.eventType === "lead_submitted")).toHaveLength(1);
    expect(events.filter((event) => event.eventType === "consultation_requested")).toHaveLength(1);
    expect(referral?.status).toBe("consultation");
  });

  it("records a deal milestone and marks the referral converted", async () => {
    await service.attachValidatedVisitToConversation({
      conversationId: "conv_1",
      userId: "anon_seed",
      visit: {
        visitId: "visit_1",
        code: "mentor-42",
        issuedAt: "2026-04-01T10:00:00.000Z",
        referrer: {
          userId: "usr_affiliate",
          code: "mentor-42",
          name: "Ada Lovelace",
          credential: "Founder",
        },
      },
    });

    await service.recordDealCreated({
      conversationId: "conv_1",
      dealId: "deal_1",
      lane: "organization",
      sourceType: "lead_record",
      sourceId: "lead_1",
    });
    await service.recordDealCreated({
      conversationId: "conv_1",
      dealId: "deal_1",
      lane: "organization",
      sourceType: "lead_record",
      sourceId: "lead_1",
    });

    const referral = referrals.findByConversation("conv_1");
    const events = referralEvents.listByReferralId(referral?.id ?? "");

    expect(events.filter((event) => event.eventType === "deal_created")).toHaveLength(1);
    expect(referral?.status).toBe("deal");
    expect(referral?.outcome).toBe("deal");
    expect(referral?.convertedAt).toBeTruthy();
  });

  it("normalizes stale referral_source values and records credit-state changes idempotently", async () => {
    db.prepare(`UPDATE conversations SET referral_source = 'stale-invalid-code' WHERE id = 'conv_1'`).run();

    await service.attachValidatedVisitToConversation({
      conversationId: "conv_1",
      userId: "anon_seed",
      visit: {
        visitId: "visit_1",
        code: "mentor-42",
        issuedAt: "2026-04-01T10:00:00.000Z",
        referrer: {
          userId: "usr_affiliate",
          code: "mentor-42",
          name: "Ada Lovelace",
          credential: "Founder",
        },
      },
    });

    const conversation = await conversations.findById("conv_1");
    expect(conversation?.referralSource).toBe("mentor-42");

    const referral = referrals.findByConversation("conv_1");
    expect(referral).toBeTruthy();
    if (!referral) {
      throw new Error("Expected referral to exist for conv_1.");
    }

    await service.recordCreditStateChanged({
      referralId: referral.id,
      actorUserId: "usr_admin",
      creditStatus: "approved",
      reason: "Approved for payout review",
    });
    await service.recordCreditStateChanged({
      referralId: referral.id,
      actorUserId: "usr_admin",
      creditStatus: "approved",
      reason: "Approved for payout review",
    });

    const updatedReferral = referrals.findById(referral.id);
    expect(updatedReferral?.creditStatus).toBe("approved");
    expect(updatedReferral?.status).toBe("credited");

    const events = referralEvents.listByReferralId(referral.id);
    expect(events.filter((event) => event.eventType === "credit_state_changed")).toHaveLength(1);
    expect(events.find((event) => event.eventType === "credit_state_changed")?.payload).toEqual(
      expect.objectContaining({
        actorUserId: "usr_admin",
        previousCreditStatus: "tracked",
        creditStatus: "approved",
        reason: "Approved for payout review",
        referralStatus: "credited",
      }),
    );
  });

  it("returns trusted referrer context for the current conversation", async () => {
    await service.attachValidatedVisitToConversation({
      conversationId: "conv_1",
      userId: "anon_seed",
      visit: {
        visitId: "visit_1",
        code: "mentor-42",
        issuedAt: "2026-04-01T10:00:00.000Z",
        referrer: {
          userId: "usr_affiliate",
          code: "mentor-42",
          name: "Ada Lovelace",
          credential: "Founder",
        },
      },
    });

    const context = await service.getTrustedReferrerContext("conv_1");

    expect(context).toEqual(expect.objectContaining({
      referralCode: "mentor-42",
      referrerName: "Ada Lovelace",
      referrerCredential: "Founder",
    }));
  });
});