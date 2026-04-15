import { getConversationDataMapper } from "@/adapters/RepositoryFactory";
import { ConversationDataMapper } from "@/adapters/ConversationDataMapper";
import { ReferralDataMapper } from "@/adapters/ReferralDataMapper";
import { ReferralEventDataMapper } from "@/adapters/ReferralEventDataMapper";
import type {
  CreditStatus,
  Referral,
  ReferralStatus,
  TrustedReferralContext,
} from "@/core/entities/Referral";
import type { ReferralEvent } from "@/core/entities/ReferralEvent";
import type { ReferralLifecycleRecorder } from "@/core/use-cases/ReferralLifecycleRecorder";
import { getDb } from "@/lib/db";
import {
  createReferralMilestoneNotifier,
  type ReferralMilestoneNotifier,
} from "@/lib/referrals/referral-notifier";
import type { ValidatedReferralVisit } from "@/lib/referrals/referral-visit";

const STATUS_RANK: Record<ReferralStatus, number> = {
  visited: 0,
  engaged: 1,
  registered: 2,
  lead: 3,
  consultation: 4,
  deal: 5,
  training: 5,
  credited: 6,
  void: 7,
};

function isAnonymousUserId(userId: string): boolean {
  return userId.startsWith("anon_");
}

function maxStatus(current: ReferralStatus, next: ReferralStatus | undefined): ReferralStatus {
  if (!next) {
    return current;
  }

  return STATUS_RANK[next] > STATUS_RANK[current] ? next : current;
}

function buildReferrerMetadata(visit: ValidatedReferralVisit): string {
  return JSON.stringify({
    referrerName: visit.referrer.name,
    referrerCredential: visit.referrer.credential,
  });
}

function defaultStatusForCreditStatus(creditStatus: CreditStatus): ReferralStatus | undefined {
  if (creditStatus === "approved" || creditStatus === "paid") {
    return "credited";
  }

  if (creditStatus === "void") {
    return "void";
  }

  return undefined;
}

function normalizeReason(reason: string): string {
  return reason.trim().replace(/\s+/g, " ");
}

export class ReferralLedgerService implements ReferralLifecycleRecorder {
  constructor(
    private readonly conversations: ConversationDataMapper,
    private readonly referrals: ReferralDataMapper,
    private readonly referralEvents: ReferralEventDataMapper,
    private readonly notifier?: ReferralMilestoneNotifier,
  ) {}

  async recordValidatedVisit(input: { visit: ValidatedReferralVisit }): Promise<Referral | null> {
    const { referral } = await this.recordValidatedVisitInternal(input.visit);
    return referral;
  }

  async attachValidatedVisitToConversation(input: {
    conversationId: string;
    userId: string;
    visit: ValidatedReferralVisit;
  }): Promise<Referral | null> {
    const { referral } = await this.recordValidatedVisitInternal(input.visit);
    if (!referral) {
      return null;
    }

    this.referrals.linkConversation(referral.id, input.conversationId);
    if (!isAnonymousUserId(input.userId)) {
      this.referrals.linkReferredUser(referral.id, input.userId);
    }

    await this.conversations.setReferralAttribution(
      input.conversationId,
      referral.id,
      referral.referralCode,
    );

    const event = this.referralEvents.append({
      referralId: referral.id,
      conversationId: input.conversationId,
      eventType: "conversation_started",
      idempotencyKey: `conversation_started:${input.conversationId}`,
      payload: {
        visitId: input.visit.visitId,
        referralCode: input.visit.code,
        referrerName: input.visit.referrer.name,
      },
    });

    const updatedReferral = this.referrals.update(referral.id, {
      conversationId: input.conversationId,
      referredUserId: isAnonymousUserId(input.userId) ? referral.referredUserId : input.userId,
      status: maxStatus(referral.status, "engaged"),
      lastValidatedAt: new Date().toISOString(),
      lastEventAt: event.wasInserted ? event.createdAt : referral.lastEventAt,
    });

    await this.notifyMilestoneIfInserted(updatedReferral, event);
    return updatedReferral;
  }

  async linkConversationToAuthenticatedUser(input: {
    conversationId: string;
    userId: string;
    source: "login" | "registration";
  }): Promise<void> {
    const referral = this.referrals.findByConversation(input.conversationId);
    if (!referral) {
      return;
    }

    this.referrals.linkReferredUser(referral.id, input.userId);
    const eventType = input.source === "registration" ? "registered" : "user_linked";
    const event = this.referralEvents.append({
      referralId: referral.id,
      conversationId: input.conversationId,
      eventType,
      idempotencyKey: `${eventType}:${input.userId}`,
      payload: {
        userId: input.userId,
        source: input.source,
      },
    });

    const updatedReferral = this.referrals.update(referral.id, {
      referredUserId: input.userId,
      status: input.source === "registration"
        ? maxStatus(referral.status, "registered")
        : referral.status,
      lastEventAt: event.wasInserted ? event.createdAt : referral.lastEventAt,
    });

    await this.notifyMilestoneIfInserted(updatedReferral, event);
  }

  async recordLeadSubmitted(input: {
    conversationId: string;
    leadRecordId: string;
    captureStatus: string;
    triageState: string;
    lane: string;
  }): Promise<void> {
    await this.recordMilestone({
      conversationId: input.conversationId,
      eventType: "lead_submitted",
      idempotencyKey: `lead_submitted:${input.leadRecordId}`,
      payload: {
        leadRecordId: input.leadRecordId,
        captureStatus: input.captureStatus,
        triageState: input.triageState,
        lane: input.lane,
      },
      nextStatus: "lead",
    });
  }

  async recordConsultationRequested(input: {
    conversationId: string;
    consultationRequestId: string;
    lane: string;
  }): Promise<void> {
    await this.recordMilestone({
      conversationId: input.conversationId,
      eventType: "consultation_requested",
      idempotencyKey: `consultation_requested:${input.consultationRequestId}`,
      payload: {
        consultationRequestId: input.consultationRequestId,
        lane: input.lane,
      },
      nextStatus: "consultation",
    });
  }

  async recordDealCreated(input: {
    conversationId: string;
    dealId: string;
    lane: string;
    sourceType: string;
    sourceId: string;
  }): Promise<void> {
    await this.recordMilestone({
      conversationId: input.conversationId,
      eventType: "deal_created",
      idempotencyKey: `deal_created:${input.dealId}`,
      payload: {
        dealId: input.dealId,
        lane: input.lane,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
      nextStatus: "deal",
      outcome: "deal",
    });
  }

  async recordTrainingPathCreated(input: {
    conversationId: string;
    trainingPathId: string;
    recommendedPath: string;
    sourceType: string;
    sourceId: string;
  }): Promise<void> {
    await this.recordMilestone({
      conversationId: input.conversationId,
      eventType: "training_path_created",
      idempotencyKey: `training_path_created:${input.trainingPathId}`,
      payload: {
        trainingPathId: input.trainingPathId,
        recommendedPath: input.recommendedPath,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
      nextStatus: "training",
      outcome: "training",
    });
  }

  async recordCreditStateChanged(input: {
    referralId: string;
    actorUserId: string;
    creditStatus: CreditStatus;
    reason: string;
    referralStatus?: ReferralStatus;
    idempotencyKey?: string;
  }): Promise<void> {
    const referral = this.referrals.findById(input.referralId);
    if (!referral) {
      throw new Error(`Referral not found: ${input.referralId}`);
    }

    const reason = normalizeReason(input.reason);
    const nextStatus = input.referralStatus ?? defaultStatusForCreditStatus(input.creditStatus);
    const idempotencyKey = input.idempotencyKey
      ?? `credit_state_changed:${input.actorUserId}:${input.creditStatus}:${reason}`;

    const event = this.referralEvents.append({
      referralId: referral.id,
      conversationId: referral.conversationId,
      eventType: "credit_state_changed",
      idempotencyKey,
      payload: {
        actorUserId: input.actorUserId,
        previousCreditStatus: referral.creditStatus,
        creditStatus: input.creditStatus,
        reason,
        referralStatus: nextStatus ?? referral.status,
      },
    });

    let updatedReferral = this.referrals.update(referral.id, {
      creditStatus: input.creditStatus,
      status: nextStatus ? maxStatus(referral.status, nextStatus) : referral.status,
      lastEventAt: event.wasInserted ? event.createdAt : referral.lastEventAt,
    });

    await this.notifyMilestoneIfInserted(updatedReferral, event);

    const milestoneEventType = input.creditStatus === "pending_review"
      ? "credit_pending_review"
      : input.creditStatus === "approved"
        ? "credit_approved"
        : input.creditStatus === "paid"
          ? "credit_paid"
          : null;

    if (milestoneEventType) {
      updatedReferral = await this.recordDerivedMilestoneEvent(updatedReferral, {
        eventType: milestoneEventType,
        idempotencyKey: `${milestoneEventType}:${updatedReferral.id}`,
        conversationId: updatedReferral.conversationId,
        payload: {
          actorUserId: input.actorUserId,
          creditStatus: input.creditStatus,
          reason,
        },
      });
    }
  }

  async getTrustedReferrerContext(conversationId: string): Promise<TrustedReferralContext | null> {
    return this.referrals.getTrustedContextByConversation(conversationId);
  }

  private async recordMilestone(input: {
    conversationId: string;
    eventType: string;
    idempotencyKey: string;
    payload: Record<string, unknown>;
    nextStatus: ReferralStatus;
    outcome?: string;
  }): Promise<void> {
    const referral = this.referrals.findByConversation(input.conversationId);
    if (!referral) {
      return;
    }

    const event = this.referralEvents.append({
      referralId: referral.id,
      conversationId: input.conversationId,
      eventType: input.eventType,
      idempotencyKey: input.idempotencyKey,
      payload: input.payload,
    });

    let updatedReferral = this.referrals.update(referral.id, {
      lastEventAt: event.wasInserted ? event.createdAt : referral.lastEventAt,
      status: maxStatus(referral.status, input.nextStatus),
      convertedAt: input.outcome ? referral.convertedAt ?? event.createdAt : referral.convertedAt,
      outcome: input.outcome ?? referral.outcome,
    });

    await this.notifyMilestoneIfInserted(updatedReferral, event);

    if (event.wasInserted && [
      "lead_submitted",
      "consultation_requested",
      "deal_created",
      "training_path_created",
    ].includes(input.eventType)) {
      updatedReferral = await this.recordDerivedMilestoneEvent(updatedReferral, {
        eventType: "qualified_opportunity",
        idempotencyKey: `qualified_opportunity:${updatedReferral.id}`,
        conversationId: input.conversationId,
        payload: {
          triggerEventType: input.eventType,
          triggerIdempotencyKey: input.idempotencyKey,
        },
      });
    }
  }

  private async recordValidatedVisitInternal(visit: ValidatedReferralVisit): Promise<{ referral: Referral | null }> {
    const referral = this.upsertValidatedVisit(visit);
    if (!referral) {
      return { referral: null };
    }

    const event = this.referralEvents.append({
      referralId: referral.id,
      conversationId: referral.conversationId,
      eventType: "validated_visit",
      idempotencyKey: `validated_visit:${visit.visitId}`,
      payload: {
        visitId: visit.visitId,
        referralCode: visit.code,
        referrerName: visit.referrer.name,
      },
    });

    const updatedReferral = this.referrals.update(referral.id, event.wasInserted
      ? {
          lastValidatedAt: new Date().toISOString(),
          lastEventAt: event.createdAt,
          status: maxStatus(referral.status, "visited"),
        }
      : {
          lastValidatedAt: new Date().toISOString(),
        });

    await this.notifyMilestoneIfInserted(updatedReferral, event);
    return { referral: updatedReferral };
  }

  private async recordDerivedMilestoneEvent(
    referral: Referral,
    input: {
      eventType: string;
      idempotencyKey: string;
      conversationId: string | null;
      payload: Record<string, unknown>;
    },
  ): Promise<Referral> {
    const event = this.referralEvents.append({
      referralId: referral.id,
      conversationId: input.conversationId,
      eventType: input.eventType,
      idempotencyKey: input.idempotencyKey,
      payload: input.payload,
    });

    const updatedReferral = event.wasInserted
      ? this.referrals.update(referral.id, { lastEventAt: event.createdAt })
      : referral;

    await this.notifyMilestoneIfInserted(updatedReferral, event);
    return updatedReferral;
  }

  private async notifyMilestoneIfInserted(
    referral: Referral,
    event: ReferralEvent & { wasInserted: boolean },
  ): Promise<void> {
    if (!event.wasInserted || !this.notifier) {
      return;
    }

    await this.notifier.notify(referral, event);
  }

  private upsertValidatedVisit(visit: ValidatedReferralVisit): Referral | null {
    const referrerUserId = visit.referrer.userId
      || this.referrals.getReferrerUser(visit.code)?.id
      || null;

    if (!referrerUserId) {
      return null;
    }

    const existing = this.referrals.findByVisitId(visit.visitId);
    if (existing) {
      return this.referrals.update(existing.id, {
        referrerUserId,
        referralCode: visit.code,
        visitId: visit.visitId,
        scannedAt: existing.scannedAt ?? visit.issuedAt,
        lastValidatedAt: new Date().toISOString(),
        metadataJson: buildReferrerMetadata(visit),
      });
    }

    return this.referrals.create({
      id: `ref_${crypto.randomUUID()}`,
      referrerUserId,
      referredUserId: null,
      conversationId: null,
      referralCode: visit.code,
      visitId: visit.visitId,
      status: "visited",
      creditStatus: "tracked",
      scannedAt: visit.issuedAt,
      convertedAt: null,
      lastValidatedAt: new Date().toISOString(),
      lastEventAt: visit.issuedAt,
      outcome: null,
      metadataJson: buildReferrerMetadata(visit),
    });
  }
}

export function getReferralLedgerService(): ReferralLedgerService {
  // getDb() approved: referral default parameter + raw SQL — see data-access-canary.test.ts (Sprint 9)
  const db = getDb();
  return new ReferralLedgerService(
    getConversationDataMapper(),
    new ReferralDataMapper(db),
    new ReferralEventDataMapper(db),
    createReferralMilestoneNotifier(),
  );
}