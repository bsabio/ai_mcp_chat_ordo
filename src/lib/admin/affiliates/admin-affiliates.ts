import {
  ADMIN_REFERRAL_EXCEPTION_KINDS,
  createAdminReferralAnalyticsService,
  type AdminAffiliateLeaderboardResult,
  type AdminAffiliateOverviewData,
  type AdminReferralExceptionKind,
  type AdminReferralExceptionsResult,
} from "@/lib/referrals/admin-referral-analytics";
import type { AffiliatePipelineData } from "@/lib/referrals/referral-analytics";

export type AdminAffiliatesView = "overview" | "leaderboard" | "pipeline" | "exceptions";

export interface AdminAffiliatesFilters {
  view: AdminAffiliatesView;
  kind: AdminReferralExceptionKind | "all";
}

export interface AdminAffiliatesWorkspace {
  filters: AdminAffiliatesFilters;
  overview: AdminAffiliateOverviewData;
  leaderboard: AdminAffiliateLeaderboardResult;
  pipeline: AffiliatePipelineData;
  exceptions: AdminReferralExceptionsResult;
}

function readSingleValue(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : value?.[0] ?? "";
}

export function parseAdminAffiliatesFilters(
  raw: Record<string, string | string[] | undefined>,
): AdminAffiliatesFilters {
  const rawView = readSingleValue(raw.view).trim().toLowerCase();
  const rawKind = readSingleValue(raw.kind).trim().toLowerCase();
  const view: AdminAffiliatesView = rawView === "leaderboard"
    || rawView === "pipeline"
    || rawView === "exceptions"
    ? rawView
    : "overview";
  const kind = ADMIN_REFERRAL_EXCEPTION_KINDS.includes(rawKind as AdminReferralExceptionKind)
    ? rawKind as AdminReferralExceptionKind
    : "all";

  return { view, kind };
}

export async function loadAdminAffiliatesWorkspace(
  raw: Record<string, string | string[] | undefined>,
): Promise<AdminAffiliatesWorkspace> {
  const filters = parseAdminAffiliatesFilters(raw);
  const service = createAdminReferralAnalyticsService();
  const [overview, leaderboard, pipeline, exceptions] = await Promise.all([
    service.getOverview(),
    service.getLeaderboard({ limit: 12 }),
    service.getPipeline(),
    service.getExceptions({ kind: filters.kind, limit: 24 }),
  ]);

  return {
    filters,
    overview,
    leaderboard,
    pipeline,
    exceptions,
  };
}