import type Database from "better-sqlite3";

import type { CreditStatus } from "@/core/entities/Referral";
import { getDb } from "@/lib/db";
import type { FeedNotification } from "@/lib/notifications/feed-notification";
import {
  buildCreditStatusLabel,
  getReferralNotificationMilestone,
  toReferralActivityItem,
  toReferralFeedNotification,
  type ReferralActivityItem,
  type ReferralMilestoneEventRecord,
} from "@/lib/referrals/referral-milestones";

interface ReferralRecordRow {
  id: string;
  referral_code: string;
  credit_status: CreditStatus;
  created_at: string;
}

interface ReferralEventJoinRow {
  event_id: string;
  referral_id: string;
  referral_code: string;
  event_type: string;
  created_at: string;
  conversation_id: string | null;
  payload_json: string;
}

export interface AffiliateOverviewData {
  introductions: number;
  startedChats: number;
  registered: number;
  qualifiedOpportunities: number;
  creditStatusLabel: string;
  creditStatusCounts: Record<CreditStatus, number>;
  narrative: string;
}

export interface AffiliateTimeseriesPoint {
  date: string;
  introductions: number;
  startedChats: number;
  registered: number;
  qualifiedOpportunities: number;
}

export interface AffiliatePipelineStage {
  stage: string;
  label: string;
  count: number;
  conversionRate: number;
}

export interface AffiliateOutcomeCount {
  outcome: "lead_submitted" | "consultation_requested" | "deal_created" | "training_path_created";
  label: string;
  count: number;
}

export interface AffiliatePipelineData {
  stages: AffiliatePipelineStage[];
  outcomes: AffiliateOutcomeCount[];
}

export interface ReferralAnalyticsService {
  getOverview(userId: string): Promise<AffiliateOverviewData>;
  getTimeseries(userId: string): Promise<AffiliateTimeseriesPoint[]>;
  getPipeline(userId: string): Promise<AffiliatePipelineData>;
  getRecentActivity(userId: string, limit?: number): Promise<ReferralActivityItem[]>;
  getNotificationFeed(userId: string, limit?: number): Promise<FeedNotification[]>;
}

function parsePayload(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch (error) {
    void error;
    return {};
  }
}

function countUniqueReferrals(records: ReadonlyArray<{ referralId: string }>): number {
  return new Set(records.map((record) => record.referralId)).size;
}

function findEarliestPerReferral(
  records: ReferralMilestoneEventRecord[],
): ReferralMilestoneEventRecord[] {
  const earliest = new Map<string, ReferralMilestoneEventRecord>();

  for (const record of records) {
    const current = earliest.get(record.referralId);
    if (!current || current.createdAt > record.createdAt) {
      earliest.set(record.referralId, record);
    }
  }

  return Array.from(earliest.values());
}

function countUniqueEventTypes(
  events: ReferralMilestoneEventRecord[],
  eventType: string,
): number {
  return countUniqueReferrals(events.filter((event) => event.eventType === eventType));
}

function buildNarrative(summary: {
  introductions: number;
  startedChats: number;
  qualifiedOpportunities: number;
  creditStatusLabel: string;
}): string {
  if (summary.introductions === 0) {
    return "Your referral workspace is ready, but there is no attributed activity yet.";
  }

  if (summary.startedChats === 0) {
    return "Introductions are landing, but none have started a chat yet.";
  }

  if (summary.qualifiedOpportunities === 0) {
    return "Referred visitors are engaging, but none have reached a qualified opportunity yet.";
  }

  return `${summary.qualifiedOpportunities} qualified ${summary.qualifiedOpportunities === 1 ? "opportunity" : "opportunities"} reached downstream milestones. Credit state: ${summary.creditStatusLabel}.`;
}

class SqliteReferralAnalyticsService implements ReferralAnalyticsService {
  constructor(private readonly db: Database.Database) {}

  async getOverview(userId: string): Promise<AffiliateOverviewData> {
    const referrals = this.listReferrals(userId);
    const events = this.listEvents(userId);
    const introductions = this.listIntroductionRecords(referrals, events);
    const qualifiedOpportunities = this.listQualifiedOpportunityRecords(referrals, events);
    const creditStatusCounts = this.buildCreditStatusCounts(referrals);
    const creditStatusLabel = buildCreditStatusLabel(creditStatusCounts);

    const summary = {
      introductions: countUniqueReferrals(introductions),
      startedChats: countUniqueEventTypes(events, "conversation_started"),
      registered: countUniqueEventTypes(events, "registered"),
      qualifiedOpportunities: countUniqueReferrals(qualifiedOpportunities),
      creditStatusLabel,
      creditStatusCounts,
    };

    return {
      ...summary,
      narrative: buildNarrative(summary),
    };
  }

  async getTimeseries(userId: string): Promise<AffiliateTimeseriesPoint[]> {
    const referrals = this.listReferrals(userId);
    const events = this.listEvents(userId);
    const introductions = this.listIntroductionRecords(referrals, events);
    const qualifiedOpportunities = this.listQualifiedOpportunityRecords(referrals, events);
    const rows = new Map<string, AffiliateTimeseriesPoint>();

    const ensureRow = (date: string) => {
      const existing = rows.get(date);
      if (existing) {
        return existing;
      }

      const created: AffiliateTimeseriesPoint = {
        date,
        introductions: 0,
        startedChats: 0,
        registered: 0,
        qualifiedOpportunities: 0,
      };
      rows.set(date, created);
      return created;
    };

    for (const record of introductions) {
      ensureRow(record.createdAt.slice(0, 10)).introductions += 1;
    }

    for (const record of findEarliestPerReferral(events.filter((event) => event.eventType === "conversation_started"))) {
      ensureRow(record.createdAt.slice(0, 10)).startedChats += 1;
    }

    for (const record of findEarliestPerReferral(events.filter((event) => event.eventType === "registered"))) {
      ensureRow(record.createdAt.slice(0, 10)).registered += 1;
    }

    for (const record of qualifiedOpportunities) {
      ensureRow(record.createdAt.slice(0, 10)).qualifiedOpportunities += 1;
    }

    return Array.from(rows.values()).sort((left, right) => left.date.localeCompare(right.date));
  }

  async getPipeline(userId: string): Promise<AffiliatePipelineData> {
    const overview = await this.getOverview(userId);
    const events = this.listEvents(userId);
    const base = overview.introductions || 1;
    const stages: AffiliatePipelineStage[] = [
      {
        stage: "introductions",
        label: "Introductions",
        count: overview.introductions,
        conversionRate: overview.introductions === 0 ? 0 : 100,
      },
      {
        stage: "started_chats",
        label: "Started chats",
        count: overview.startedChats,
        conversionRate: overview.startedChats === 0 ? 0 : Math.round((overview.startedChats / base) * 100),
      },
      {
        stage: "registered",
        label: "Registered",
        count: overview.registered,
        conversionRate: overview.registered === 0 ? 0 : Math.round((overview.registered / base) * 100),
      },
      {
        stage: "qualified_opportunities",
        label: "Qualified opportunities",
        count: overview.qualifiedOpportunities,
        conversionRate: overview.qualifiedOpportunities === 0 ? 0 : Math.round((overview.qualifiedOpportunities / base) * 100),
      },
    ];

    const outcomes: AffiliateOutcomeCount[] = [
      {
        outcome: "lead_submitted",
        label: "Lead submitted",
        count: countUniqueEventTypes(events, "lead_submitted"),
      },
      {
        outcome: "consultation_requested",
        label: "Consultation requested",
        count: countUniqueEventTypes(events, "consultation_requested"),
      },
      {
        outcome: "deal_created",
        label: "Deal created",
        count: countUniqueEventTypes(events, "deal_created"),
      },
      {
        outcome: "training_path_created",
        label: "Training path created",
        count: countUniqueEventTypes(events, "training_path_created"),
      },
    ];

    return { stages, outcomes };
  }

  async getRecentActivity(userId: string, limit = 12): Promise<ReferralActivityItem[]> {
    return this.listEvents(userId)
      .map((event) => toReferralActivityItem(event))
      .filter((event): event is ReferralActivityItem => event != null)
      .slice(0, limit);
  }

  async getNotificationFeed(userId: string, limit = 20): Promise<FeedNotification[]> {
    const notifications: FeedNotification[] = [];
    const seen = new Set<string>();

    for (const record of this.listEvents(userId)) {
      const milestone = getReferralNotificationMilestone(record);
      if (!milestone) {
        continue;
      }

      const dedupeKey = `${record.referralId}:${milestone}`;
      if (seen.has(dedupeKey)) {
        continue;
      }

      seen.add(dedupeKey);
      const notification = toReferralFeedNotification(record);
      if (notification) {
        notifications.push(notification);
      }

      if (notifications.length >= limit) {
        break;
      }
    }

    return notifications;
  }

  private listReferrals(userId: string): ReferralRecordRow[] {
    return this.db
      .prepare(
        `SELECT id, referral_code, credit_status, created_at
         FROM referrals
         WHERE referrer_user_id = ?
         ORDER BY created_at DESC`,
      )
      .all(userId) as ReferralRecordRow[];
  }

  private listEvents(userId: string): ReferralMilestoneEventRecord[] {
    const rows = this.db
      .prepare(
        `SELECT
           e.id AS event_id,
           e.referral_id,
           r.referral_code,
           e.event_type,
           e.created_at,
           e.conversation_id,
           e.payload_json
         FROM referral_events e
         INNER JOIN referrals r ON r.id = e.referral_id
         WHERE r.referrer_user_id = ?
         ORDER BY e.created_at DESC, e.id DESC`,
      )
      .all(userId) as ReferralEventJoinRow[];

    return rows.map((row) => ({
      eventId: row.event_id,
      referralId: row.referral_id,
      referralCode: row.referral_code,
      eventType: row.event_type,
      createdAt: row.created_at,
      conversationId: row.conversation_id,
      payload: parsePayload(row.payload_json),
    }));
  }

  private listIntroductionRecords(
    referrals: ReferralRecordRow[],
    events: ReferralMilestoneEventRecord[],
  ): ReferralMilestoneEventRecord[] {
    const explicit = findEarliestPerReferral(events.filter((event) => event.eventType === "validated_visit"));
    const explicitIds = new Set(explicit.map((event) => event.referralId));
    const fallback = referrals
      .filter((referral) => !explicitIds.has(referral.id))
      .map((referral) => ({
        eventId: `fallback_validated_visit_${referral.id}`,
        referralId: referral.id,
        referralCode: referral.referral_code,
        eventType: "validated_visit",
        createdAt: referral.created_at,
        conversationId: null,
        payload: {
          referralCode: referral.referral_code,
        },
      }));

    return [...explicit, ...fallback].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  private listQualifiedOpportunityRecords(
    referrals: ReferralRecordRow[],
    events: ReferralMilestoneEventRecord[],
  ): ReferralMilestoneEventRecord[] {
    const explicit = findEarliestPerReferral(events.filter((event) => event.eventType === "qualified_opportunity"));
    const explicitIds = new Set(explicit.map((event) => event.referralId));
    const fallbackByReferral = new Map<string, ReferralMilestoneEventRecord>();

    for (const event of events) {
      if (!["lead_submitted", "consultation_requested", "deal_created", "training_path_created"].includes(event.eventType)) {
        continue;
      }

      if (explicitIds.has(event.referralId)) {
        continue;
      }

      const current = fallbackByReferral.get(event.referralId);
      if (!current || current.createdAt > event.createdAt) {
        fallbackByReferral.set(event.referralId, {
          ...event,
          eventId: `fallback_qualified_opportunity_${event.eventId}`,
          eventType: "qualified_opportunity",
          payload: {
            ...event.payload,
            triggerEventType: event.eventType,
          },
        });
      }
    }

    for (const referral of referrals) {
      if (!explicitIds.has(referral.id) && !fallbackByReferral.has(referral.id)) {
        continue;
      }
    }

    return [...explicit, ...Array.from(fallbackByReferral.values())]
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  private buildCreditStatusCounts(referrals: ReferralRecordRow[]): Record<CreditStatus, number> {
    const counts: Record<CreditStatus, number> = {
      tracked: 0,
      pending_review: 0,
      approved: 0,
      paid: 0,
      void: 0,
    };

    for (const referral of referrals) {
      counts[referral.credit_status] += 1;
    }

    return counts;
  }
}

export function createReferralAnalyticsService(db: Database.Database = getDb()): ReferralAnalyticsService {
  return new SqliteReferralAnalyticsService(db);
}