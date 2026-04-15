import type Database from "better-sqlite3";

import type { CreditStatus, ReferralStatus } from "@/core/entities/Referral";
import { getAdminAffiliatesPath, getAdminUserDetailPath } from "@/lib/admin/admin-routes";
import { getDb } from "@/lib/db";
import type { FeedNotification } from "@/lib/notifications/feed-notification";
import type { AffiliatePipelineData } from "@/lib/referrals/referral-analytics";

export type AdminReferralExceptionKind =
  | "invalid_referral_source"
  | "missing_referral_join"
  | "disabled_referral_code"
  | "credit_review_backlog";

export const ADMIN_REFERRAL_EXCEPTION_KINDS: readonly AdminReferralExceptionKind[] = [
  "invalid_referral_source",
  "missing_referral_join",
  "disabled_referral_code",
  "credit_review_backlog",
] as const;

export interface AdminAffiliateOverviewData {
  affiliatesEnabled: number;
  activeAffiliates: number;
  introductions: number;
  startedChats: number;
  registered: number;
  qualifiedOpportunities: number;
  creditPendingReview: number;
  approvedCredits: number;
  paidCredits: number;
  exceptions: number;
  narrative: string;
}

export interface AdminAffiliateLeaderboardEntry {
  userId: string;
  name: string;
  email: string;
  credential: string | null;
  referralCode: string | null;
  introductions: number;
  startedChats: number;
  registered: number;
  qualifiedOpportunities: number;
  pendingReview: number;
  approved: number;
  paid: number;
  detailHref: string;
}

export interface AdminAffiliateLeaderboardResult {
  total: number;
  items: AdminAffiliateLeaderboardEntry[];
}

export interface AdminReferralExceptionItem {
  id: string;
  kind: AdminReferralExceptionKind;
  title: string;
  description: string;
  occurredAt: string;
  href: string;
  referralId: string | null;
  referralCode: string | null;
  conversationId: string | null;
  userId: string | null;
  creditStatus: CreditStatus | null;
}

export interface AdminReferralExceptionsResult {
  total: number;
  counts: Record<AdminReferralExceptionKind, number>;
  items: AdminReferralExceptionItem[];
}

export interface ReferralPayoutExportRow {
  referralId: string;
  referralCode: string;
  referrerUserId: string;
  referrerName: string;
  referrerEmail: string;
  referrerCredential: string | null;
  referredUserId: string | null;
  conversationId: string | null;
  referralStatus: ReferralStatus;
  creditStatus: CreditStatus;
  outcome: string | null;
  lastEventAt: string | null;
  createdAt: string;
}

export interface AdminReferralAnalyticsService {
  getOverview(): Promise<AdminAffiliateOverviewData>;
  getLeaderboard(options?: { limit?: number; offset?: number }): Promise<AdminAffiliateLeaderboardResult>;
  getPipeline(): Promise<AffiliatePipelineData>;
  getExceptions(options?: { kind?: AdminReferralExceptionKind | "all"; limit?: number; offset?: number }): Promise<AdminReferralExceptionsResult>;
  getNotificationFeed(limit?: number): Promise<FeedNotification[]>;
  getPayoutExportRows(): Promise<ReferralPayoutExportRow[]>;
}

interface AffiliateUserRow {
  id: string;
  name: string;
  email: string;
  credential: string | null;
  referral_code: string | null;
}

interface ReferralRow {
  id: string;
  referrer_user_id: string;
  referrer_name: string;
  referrer_email: string;
  referrer_credential: string | null;
  referred_user_id: string | null;
  conversation_id: string | null;
  referral_code: string;
  status: ReferralStatus;
  credit_status: CreditStatus;
  outcome: string | null;
  last_event_at: string | null;
  created_at: string;
}

interface ReferralEventRow {
  event_id: string;
  referral_id: string;
  event_type: string;
  created_at: string;
}

interface ConversationExceptionRow {
  conversation_id: string;
  user_id: string;
  updated_at: string;
  referral_source: string;
  active_referrer_user_id: string | null;
  disabled_referrer_user_id: string | null;
}

const QUALIFIED_EVENT_TYPES = new Set([
  "qualified_opportunity",
  "lead_submitted",
  "consultation_requested",
  "deal_created",
  "training_path_created",
]);

const QUALIFIED_STATUSES = new Set<ReferralStatus>([
  "lead",
  "consultation",
  "deal",
  "training",
  "credited",
  "void",
]);

function capLimit(value: number | undefined, fallback: number): number {
  if (!value || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.min(100, Math.floor(value)));
}

function capOffset(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function countDistinctReferralIds(events: ReferralEventRow[], eventTypes: Iterable<string>): number {
  const allowed = new Set(eventTypes);
  return new Set(
    events
      .filter((event) => allowed.has(event.event_type))
      .map((event) => event.referral_id),
  ).size;
}

function buildOverviewNarrative(summary: Omit<AdminAffiliateOverviewData, "narrative">): string {
  if (summary.introductions === 0) {
    return "Affiliate access is enabled, but no validated introductions have been recorded yet.";
  }

  return `${summary.activeAffiliates} affiliate${summary.activeAffiliates === 1 ? " is" : "s are"} active, ${summary.qualifiedOpportunities} qualified ${summary.qualifiedOpportunities === 1 ? "opportunity" : "opportunities"} reached downstream milestones, and ${summary.exceptions} exception${summary.exceptions === 1 ? " needs" : "s need"} review.`;
}

function buildExceptionCounts(items: AdminReferralExceptionItem[]): Record<AdminReferralExceptionKind, number> {
  const counts: Record<AdminReferralExceptionKind, number> = {
    invalid_referral_source: 0,
    missing_referral_join: 0,
    disabled_referral_code: 0,
    credit_review_backlog: 0,
  };

  for (const item of items) {
    counts[item.kind] += 1;
  }

  return counts;
}

function buildExceptionHref(userId: string | null, conversationId: string | null): string {
  if (userId && !userId.startsWith("anon_")) {
    return getAdminUserDetailPath(userId);
  }

  if (conversationId) {
    return `/admin/conversations/${encodeURIComponent(conversationId)}`;
  }

  return `${getAdminAffiliatesPath()}?view=exceptions`;
}

function hasQualifiedOpportunity(referral: ReferralRow, events: ReferralEventRow[]): boolean {
  return QUALIFIED_STATUSES.has(referral.status)
    || events.some((event) => QUALIFIED_EVENT_TYPES.has(event.event_type));
}

function isCreditReviewBacklog(referral: ReferralRow, events: ReferralEventRow[]): boolean {
  if (referral.credit_status === "approved" || referral.credit_status === "paid" || referral.credit_status === "void") {
    return false;
  }

  if (referral.credit_status === "pending_review") {
    return true;
  }

  return hasQualifiedOpportunity(referral, events);
}

function buildCreditBacklogTitle(referral: ReferralRow): string {
  return referral.credit_status === "pending_review"
    ? "Credit pending review"
    : "Credit review backlog";
}

function buildCreditBacklogDescription(referral: ReferralRow): string {
  if (referral.credit_status === "pending_review") {
    return `Referral ${referral.referral_code} is pending review and still needs an approval decision.`;
  }

  return `Referral ${referral.referral_code} reached a qualified milestone but still has tracked credit status.`;
}

class SqliteAdminReferralAnalyticsService implements AdminReferralAnalyticsService {
  constructor(private readonly db: Database.Database) {}

  async getOverview(): Promise<AdminAffiliateOverviewData> {
    const affiliateUsers = this.listAffiliateUsers();
    const referrals = this.listReferrals();
    const events = this.listEvents();
    const exceptions = this.buildExceptions(referrals, events);
    const summary = {
      affiliatesEnabled: affiliateUsers.length,
      activeAffiliates: new Set(referrals.map((referral) => referral.referrer_user_id)).size,
      introductions: referrals.length,
      startedChats: countDistinctReferralIds(events, ["conversation_started"]),
      registered: countDistinctReferralIds(events, ["registered"]),
      qualifiedOpportunities: countDistinctReferralIds(events, QUALIFIED_EVENT_TYPES),
      creditPendingReview: referrals.filter((referral) => referral.credit_status === "pending_review").length,
      approvedCredits: referrals.filter((referral) => referral.credit_status === "approved").length,
      paidCredits: referrals.filter((referral) => referral.credit_status === "paid").length,
      exceptions: exceptions.length,
    };

    return {
      ...summary,
      narrative: buildOverviewNarrative(summary),
    };
  }

  async getLeaderboard(options: { limit?: number; offset?: number } = {}): Promise<AdminAffiliateLeaderboardResult> {
    const limit = capLimit(options.limit, 10);
    const offset = capOffset(options.offset);
    const affiliateUsers = this.listAffiliateUsers();
    const referrals = this.listReferrals();
    const eventsByReferral = this.groupEventsByReferral();
    const entries = new Map<string, AdminAffiliateLeaderboardEntry>();

    for (const user of affiliateUsers) {
      entries.set(user.id, {
        userId: user.id,
        name: user.name,
        email: user.email,
        credential: user.credential,
        referralCode: user.referral_code,
        introductions: 0,
        startedChats: 0,
        registered: 0,
        qualifiedOpportunities: 0,
        pendingReview: 0,
        approved: 0,
        paid: 0,
        detailHref: getAdminUserDetailPath(user.id),
      });
    }

    for (const referral of referrals) {
      const entry = entries.get(referral.referrer_user_id);
      if (!entry) {
        continue;
      }

      const referralEvents = eventsByReferral.get(referral.id) ?? [];
      entry.introductions += 1;
      if (referral.conversation_id || referralEvents.some((event) => event.event_type === "conversation_started")) {
        entry.startedChats += 1;
      }
      if (referral.referred_user_id || referralEvents.some((event) => event.event_type === "registered")) {
        entry.registered += 1;
      }
      if (hasQualifiedOpportunity(referral, referralEvents)) {
        entry.qualifiedOpportunities += 1;
      }
      if (referral.credit_status === "pending_review") {
        entry.pendingReview += 1;
      }
      if (referral.credit_status === "approved") {
        entry.approved += 1;
      }
      if (referral.credit_status === "paid") {
        entry.paid += 1;
      }
    }

    const ranked = Array.from(entries.values()).sort((left, right) => (
      right.qualifiedOpportunities - left.qualifiedOpportunities
      || (right.approved + right.paid) - (left.approved + left.paid)
      || right.introductions - left.introductions
      || right.startedChats - left.startedChats
      || left.name.localeCompare(right.name)
    ));

    return {
      total: ranked.length,
      items: ranked.slice(offset, offset + limit),
    };
  }

  async getPipeline(): Promise<AffiliatePipelineData> {
    const referrals = this.listReferrals();
    const events = this.listEvents();
    const introductions = referrals.length;
    const startedChats = countDistinctReferralIds(events, ["conversation_started"]);
    const registered = countDistinctReferralIds(events, ["registered"]);
    const qualifiedOpportunities = countDistinctReferralIds(events, QUALIFIED_EVENT_TYPES);
    const base = introductions || 1;

    return {
      stages: [
        {
          stage: "introductions",
          label: "Introductions",
          count: introductions,
          conversionRate: introductions === 0 ? 0 : 100,
        },
        {
          stage: "started_chats",
          label: "Started chats",
          count: startedChats,
          conversionRate: startedChats === 0 ? 0 : Math.round((startedChats / base) * 100),
        },
        {
          stage: "registered",
          label: "Registered",
          count: registered,
          conversionRate: registered === 0 ? 0 : Math.round((registered / base) * 100),
        },
        {
          stage: "qualified_opportunities",
          label: "Qualified opportunities",
          count: qualifiedOpportunities,
          conversionRate: qualifiedOpportunities === 0 ? 0 : Math.round((qualifiedOpportunities / base) * 100),
        },
      ],
      outcomes: [
        {
          outcome: "lead_submitted",
          label: "Lead submitted",
          count: countDistinctReferralIds(events, ["lead_submitted"]),
        },
        {
          outcome: "consultation_requested",
          label: "Consultation requested",
          count: countDistinctReferralIds(events, ["consultation_requested"]),
        },
        {
          outcome: "deal_created",
          label: "Deal created",
          count: countDistinctReferralIds(events, ["deal_created"]),
        },
        {
          outcome: "training_path_created",
          label: "Training path created",
          count: countDistinctReferralIds(events, ["training_path_created"]),
        },
      ],
    };
  }

  async getExceptions(options: {
    kind?: AdminReferralExceptionKind | "all";
    limit?: number;
    offset?: number;
  } = {}): Promise<AdminReferralExceptionsResult> {
    const kind = options.kind ?? "all";
    const limit = capLimit(options.limit, 20);
    const offset = capOffset(options.offset);
    const referrals = this.listReferrals();
    const events = this.listEvents();
    const allItems = this.buildExceptions(referrals, events);
    const filteredItems = kind === "all"
      ? allItems
      : allItems.filter((item) => item.kind === kind);

    return {
      total: filteredItems.length,
      counts: buildExceptionCounts(allItems),
      items: filteredItems.slice(offset, offset + limit),
    };
  }

  async getNotificationFeed(limit = 20): Promise<FeedNotification[]> {
    const cappedLimit = capLimit(limit, 20);
    const result = await this.getExceptions({ limit: cappedLimit });

    return result.items.slice(0, cappedLimit).map((item) => ({
      id: `notif_${item.id}`,
      title: item.title,
      body: item.description,
      href: item.href,
      scope: "admin",
      unread: true,
      createdAt: item.occurredAt,
    }));
  }

  async getPayoutExportRows(): Promise<ReferralPayoutExportRow[]> {
    return this.listReferrals()
      .filter((referral) => referral.credit_status === "approved" || referral.credit_status === "paid")
      .sort((left, right) => (right.last_event_at ?? right.created_at).localeCompare(left.last_event_at ?? left.created_at))
      .map((referral) => ({
        referralId: referral.id,
        referralCode: referral.referral_code,
        referrerUserId: referral.referrer_user_id,
        referrerName: referral.referrer_name,
        referrerEmail: referral.referrer_email,
        referrerCredential: referral.referrer_credential,
        referredUserId: referral.referred_user_id,
        conversationId: referral.conversation_id,
        referralStatus: referral.status,
        creditStatus: referral.credit_status,
        outcome: referral.outcome,
        lastEventAt: referral.last_event_at,
        createdAt: referral.created_at,
      }));
  }

  private listAffiliateUsers(): AffiliateUserRow[] {
    return this.db.prepare(
      `SELECT id, name, email, credential, referral_code
       FROM users
       WHERE affiliate_enabled = 1
       ORDER BY name COLLATE NOCASE ASC, id ASC`,
    ).all() as AffiliateUserRow[];
  }

  private listReferrals(): ReferralRow[] {
    return this.db.prepare(
      `SELECT
         r.id,
         r.referrer_user_id,
         u.name AS referrer_name,
         u.email AS referrer_email,
         u.credential AS referrer_credential,
         r.referred_user_id,
         r.conversation_id,
         r.referral_code,
         r.status,
         r.credit_status,
         r.outcome,
         r.last_event_at,
         r.created_at
       FROM referrals r
       INNER JOIN users u ON u.id = r.referrer_user_id
       ORDER BY r.created_at DESC, r.id DESC`,
    ).all() as ReferralRow[];
  }

  private listEvents(): ReferralEventRow[] {
    return this.db.prepare(
      `SELECT
         e.id AS event_id,
         e.referral_id,
         e.event_type,
         e.created_at
       FROM referral_events e
       ORDER BY e.created_at DESC, e.id DESC`,
    ).all() as ReferralEventRow[];
  }

  private listConversationExceptions(): ConversationExceptionRow[] {
    return this.db.prepare(
      `SELECT
         c.id AS conversation_id,
         c.user_id,
         c.updated_at,
         c.referral_source,
         active_u.id AS active_referrer_user_id,
         disabled_u.id AS disabled_referrer_user_id
       FROM conversations c
       LEFT JOIN users active_u
         ON active_u.referral_code = c.referral_source
        AND active_u.affiliate_enabled = 1
       LEFT JOIN users disabled_u
         ON disabled_u.referral_code = c.referral_source
        AND disabled_u.affiliate_enabled = 0
       WHERE c.referral_source IS NOT NULL
         AND TRIM(c.referral_source) != ''
         AND c.referral_id IS NULL
       ORDER BY c.updated_at DESC, c.id DESC`,
    ).all() as ConversationExceptionRow[];
  }

  private groupEventsByReferral(): Map<string, ReferralEventRow[]> {
    const grouped = new Map<string, ReferralEventRow[]>();

    for (const event of this.listEvents()) {
      const existing = grouped.get(event.referral_id);
      if (existing) {
        existing.push(event);
      } else {
        grouped.set(event.referral_id, [event]);
      }
    }

    return grouped;
  }

  private buildExceptions(referrals: ReferralRow[], events: ReferralEventRow[]): AdminReferralExceptionItem[] {
    const items: AdminReferralExceptionItem[] = [];

    for (const row of this.listConversationExceptions()) {
      const kind: AdminReferralExceptionKind = row.active_referrer_user_id
        ? "missing_referral_join"
        : row.disabled_referrer_user_id
          ? "disabled_referral_code"
          : "invalid_referral_source";

      const title = kind === "missing_referral_join"
        ? "Missing referral join"
        : kind === "disabled_referral_code"
          ? "Disabled referral code"
          : "Invalid referral source";
      const description = kind === "missing_referral_join"
        ? `Conversation ${row.conversation_id} still carries referral source ${row.referral_source} without a canonical referral join.`
        : kind === "disabled_referral_code"
          ? `Conversation ${row.conversation_id} references disabled referral code ${row.referral_source}.`
          : `Conversation ${row.conversation_id} still carries unknown referral source ${row.referral_source}.`;

      items.push({
        id: `${kind}:${row.conversation_id}`,
        kind,
        title,
        description,
        occurredAt: row.updated_at,
        href: buildExceptionHref(row.user_id, row.conversation_id),
        referralId: null,
        referralCode: row.referral_source,
        conversationId: row.conversation_id,
        userId: row.user_id,
        creditStatus: null,
      });
    }

    const eventsByReferral = new Map<string, ReferralEventRow[]>();
    for (const event of events) {
      const existing = eventsByReferral.get(event.referral_id);
      if (existing) {
        existing.push(event);
      } else {
        eventsByReferral.set(event.referral_id, [event]);
      }
    }

    for (const referral of referrals) {
      const referralEvents = eventsByReferral.get(referral.id) ?? [];
      if (!isCreditReviewBacklog(referral, referralEvents)) {
        continue;
      }

      items.push({
        id: `credit_review_backlog:${referral.id}`,
        kind: "credit_review_backlog",
        title: buildCreditBacklogTitle(referral),
        description: buildCreditBacklogDescription(referral),
        occurredAt: referral.last_event_at ?? referral.created_at,
        href: getAdminUserDetailPath(referral.referrer_user_id),
        referralId: referral.id,
        referralCode: referral.referral_code,
        conversationId: referral.conversation_id,
        userId: referral.referrer_user_id,
        creditStatus: referral.credit_status,
      });
    }

    return items.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  }
}

// getDb() approved: referral default parameter + raw SQL — see data-access-canary.test.ts (Sprint 9)
export function createAdminReferralAnalyticsService(
  db: Database.Database = getDb(),
): AdminReferralAnalyticsService {
  return new SqliteAdminReferralAnalyticsService(db);
}