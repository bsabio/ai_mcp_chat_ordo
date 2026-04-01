import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import type { ToolCommand } from "@/core/tool-registry/ToolCommand";
import type { UserProfileViewModel } from "@/lib/profile/types";
import type {
  AdminReferralAnalyticsService,
  AdminReferralExceptionKind,
} from "@/lib/referrals/admin-referral-analytics";
import { ADMIN_REFERRAL_EXCEPTION_KINDS } from "@/lib/referrals/admin-referral-analytics";
import type {
  AffiliateOverviewData,
  AffiliatePipelineData,
  ReferralAnalyticsService,
} from "@/lib/referrals/referral-analytics";
import type { ReferralActivityItem } from "@/lib/referrals/referral-milestones";

type AffiliateToolAction = "get_my_affiliate_summary" | "list_my_referral_activity";

type AffiliateToolErrorResult = {
  action: AffiliateToolAction;
  error: string;
  affiliate_enabled: false;
  manage_route: "/referrals";
};

type AffiliateSummaryResult = {
  action: "get_my_affiliate_summary";
  message: string;
  manage_route: "/referrals";
  summary: {
    introductions: number;
    started_chats: number;
    registered: number;
    qualified_opportunities: number;
    credit_status_label: string;
    credit_status_counts: AffiliateOverviewData["creditStatusCounts"];
    narrative: string;
  };
  pipeline: {
    stages: AffiliatePipelineData["stages"];
    outcomes: AffiliatePipelineData["outcomes"];
  };
};

type AdminSummaryResult = {
  action: "get_admin_affiliate_summary";
  message: string;
  manage_route: "/admin/affiliates";
  overview: {
    affiliates_enabled: number;
    active_affiliates: number;
    introductions: number;
    started_chats: number;
    registered: number;
    qualified_opportunities: number;
    credit_pending_review: number;
    approved_credits: number;
    paid_credits: number;
    exceptions: number;
    narrative: string;
  };
  leaderboard: Array<{
    user_id: string;
    name: string;
    referral_code: string | null;
    introductions: number;
    qualified_opportunities: number;
    approved: number;
    paid: number;
    detail_href: string;
  }>;
  pipeline: {
    stages: AffiliatePipelineData["stages"];
    outcomes: AffiliatePipelineData["outcomes"];
  };
};

type AdminExceptionsResult = {
  action: "list_admin_referral_exceptions";
  message: string;
  manage_route: "/admin/affiliates";
  filters: {
    kind: AdminReferralExceptionKind | "all";
  };
  exceptions: Array<{
    id: string;
    kind: AdminReferralExceptionKind;
    title: string;
    description: string;
    occurred_at: string;
    href: string;
    referral_id: string | null;
    referral_code: string | null;
    conversation_id: string | null;
    user_id: string | null;
    credit_status: string | null;
  }>;
};

type ReferralActivityResult = {
  action: "list_my_referral_activity";
  message: string;
  manage_route: "/referrals";
  activities: Array<{
    id: string;
    referral_id: string;
    referral_code: string;
    milestone: ReferralActivityItem["milestone"];
    title: string;
    description: string;
    occurred_at: string;
    href: string;
  }>;
};

interface AffiliateProfileReader {
  getProfile(userId: string): Promise<UserProfileViewModel>;
}

function authError() {
  return { error: "Authentication required to access referral analytics." };
}

function adminError() {
  return { error: "Administrator access is required to access global affiliate analytics." };
}

function affiliateDisabledResult(action: AffiliateToolAction): AffiliateToolErrorResult {
  return {
    action,
    error: "Referral self-service is not enabled for this account yet.",
    affiliate_enabled: false,
    manage_route: "/referrals",
  };
}

class GetMyAffiliateSummaryCommand implements ToolCommand<Record<string, unknown>, AffiliateSummaryResult | AffiliateToolErrorResult | { error: string }> {
  constructor(
    private readonly profileService: AffiliateProfileReader,
    private readonly analyticsService: ReferralAnalyticsService,
  ) {}

  async execute(
    _input: Record<string, unknown>,
    context?: ToolExecutionContext,
  ): Promise<AffiliateSummaryResult | AffiliateToolErrorResult | { error: string }> {
    if (!context || context.role === "ANONYMOUS") {
      return authError();
    }

    const profile = await this.profileService.getProfile(context.userId);
    if (!profile.affiliateEnabled) {
      return affiliateDisabledResult("get_my_affiliate_summary");
    }

    const [summary, pipeline] = await Promise.all([
      this.analyticsService.getOverview(context.userId),
      this.analyticsService.getPipeline(context.userId),
    ]);

    return {
      action: "get_my_affiliate_summary",
      manage_route: "/referrals",
      message: "Returned the current account's referral summary metrics, credit state, and funnel progress.",
      summary: {
        introductions: summary.introductions,
        started_chats: summary.startedChats,
        registered: summary.registered,
        qualified_opportunities: summary.qualifiedOpportunities,
        credit_status_label: summary.creditStatusLabel,
        credit_status_counts: summary.creditStatusCounts,
        narrative: summary.narrative,
      },
      pipeline: {
        stages: pipeline.stages,
        outcomes: pipeline.outcomes,
      },
    };
  }
}

class ListMyReferralActivityCommand implements ToolCommand<Record<string, unknown>, ReferralActivityResult | AffiliateToolErrorResult | { error: string }> {
  constructor(
    private readonly profileService: AffiliateProfileReader,
    private readonly analyticsService: ReferralAnalyticsService,
  ) {}

  async execute(
    input: Record<string, unknown>,
    context?: ToolExecutionContext,
  ): Promise<ReferralActivityResult | AffiliateToolErrorResult | { error: string }> {
    if (!context || context.role === "ANONYMOUS") {
      return authError();
    }

    const profile = await this.profileService.getProfile(context.userId);
    if (!profile.affiliateEnabled) {
      return affiliateDisabledResult("list_my_referral_activity");
    }

    const limit = typeof input.limit === "number" && Number.isFinite(input.limit)
      ? Math.max(1, Math.min(50, Math.floor(input.limit)))
      : 12;
    const activity = await this.analyticsService.getRecentActivity(context.userId, limit);

    return {
      action: "list_my_referral_activity",
      manage_route: "/referrals",
      message: "Returned recent referral milestones and status changes for the current account.",
      activities: activity.map((item) => ({
        id: item.id,
        referral_id: item.referralId,
        referral_code: item.referralCode,
        milestone: item.milestone,
        title: item.title,
        description: item.description,
        occurred_at: item.occurredAt,
        href: item.href,
      })),
    };
  }
}

class GetAdminAffiliateSummaryCommand implements ToolCommand<Record<string, unknown>, AdminSummaryResult | { error: string }> {
  constructor(private readonly analyticsService: AdminReferralAnalyticsService) {}

  async execute(
    _input: Record<string, unknown>,
    context?: ToolExecutionContext,
  ): Promise<AdminSummaryResult | { error: string }> {
    if (!context || context.role !== "ADMIN") {
      return adminError();
    }

    const [overview, leaderboard, pipeline] = await Promise.all([
      this.analyticsService.getOverview(),
      this.analyticsService.getLeaderboard({ limit: 5 }),
      this.analyticsService.getPipeline(),
    ]);

    return {
      action: "get_admin_affiliate_summary",
      manage_route: "/admin/affiliates",
      message: "Returned global affiliate totals, leaderboard highlights, exception pressure, and funnel progress.",
      overview: {
        affiliates_enabled: overview.affiliatesEnabled,
        active_affiliates: overview.activeAffiliates,
        introductions: overview.introductions,
        started_chats: overview.startedChats,
        registered: overview.registered,
        qualified_opportunities: overview.qualifiedOpportunities,
        credit_pending_review: overview.creditPendingReview,
        approved_credits: overview.approvedCredits,
        paid_credits: overview.paidCredits,
        exceptions: overview.exceptions,
        narrative: overview.narrative,
      },
      leaderboard: leaderboard.items.map((entry) => ({
        user_id: entry.userId,
        name: entry.name,
        referral_code: entry.referralCode,
        introductions: entry.introductions,
        qualified_opportunities: entry.qualifiedOpportunities,
        approved: entry.approved,
        paid: entry.paid,
        detail_href: entry.detailHref,
      })),
      pipeline: {
        stages: pipeline.stages,
        outcomes: pipeline.outcomes,
      },
    };
  }
}

class ListAdminReferralExceptionsCommand implements ToolCommand<Record<string, unknown>, AdminExceptionsResult | { error: string }> {
  constructor(private readonly analyticsService: AdminReferralAnalyticsService) {}

  async execute(
    input: Record<string, unknown>,
    context?: ToolExecutionContext,
  ): Promise<AdminExceptionsResult | { error: string }> {
    if (!context || context.role !== "ADMIN") {
      return adminError();
    }

    const limit = typeof input.limit === "number" && Number.isFinite(input.limit)
      ? Math.max(1, Math.min(50, Math.floor(input.limit)))
      : 12;
    const kind = typeof input.kind === "string" && ADMIN_REFERRAL_EXCEPTION_KINDS.includes(input.kind as AdminReferralExceptionKind)
      ? input.kind as AdminReferralExceptionKind
      : "all";
    const exceptions = await this.analyticsService.getExceptions({ kind, limit });

    return {
      action: "list_admin_referral_exceptions",
      manage_route: "/admin/affiliates",
      message: "Returned unresolved attribution records and credit-review backlog items for admins.",
      filters: { kind },
      exceptions: exceptions.items.map((item) => ({
        id: item.id,
        kind: item.kind,
        title: item.title,
        description: item.description,
        occurred_at: item.occurredAt,
        href: item.href,
        referral_id: item.referralId,
        referral_code: item.referralCode,
        conversation_id: item.conversationId,
        user_id: item.userId,
        credit_status: item.creditStatus,
      })),
    };
  }
}

export function createGetMyAffiliateSummaryTool(
  profileService: AffiliateProfileReader,
  analyticsService: ReferralAnalyticsService,
): ToolDescriptor {
  return {
    name: "get_my_affiliate_summary",
    schema: {
      description:
        "Return the current signed-in affiliate account's referral summary metrics, credit status, and concise guidance. Use when the user asks how their referral link is performing.",
      input_schema: {
        type: "object",
        properties: {},
      },
    },
    command: new GetMyAffiliateSummaryCommand(profileService, analyticsService),
    roles: ["AUTHENTICATED", "APPRENTICE", "STAFF", "ADMIN"],
    category: "system",
  };
}

export function createListMyReferralActivityTool(
  profileService: AffiliateProfileReader,
  analyticsService: ReferralAnalyticsService,
): ToolDescriptor {
  return {
    name: "list_my_referral_activity",
    schema: {
      description:
        "Return recent referral milestones for the current signed-in affiliate account, including introductions, registrations, qualified opportunities, and credit-state changes.",
      input_schema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Optional maximum number of activity items to return. Defaults to 12 and is capped at 50.",
          },
        },
      },
    },
    command: new ListMyReferralActivityCommand(profileService, analyticsService),
    roles: ["AUTHENTICATED", "APPRENTICE", "STAFF", "ADMIN"],
    category: "system",
  };
}

export function createGetAdminAffiliateSummaryTool(
  analyticsService: AdminReferralAnalyticsService,
): ToolDescriptor {
  return {
    name: "get_admin_affiliate_summary",
    schema: {
      description:
        "Return the global affiliate program totals, leaderboard highlights, exception pressure, and funnel health. Use when an admin asks which affiliates are driving results or how much review backlog exists.",
      input_schema: {
        type: "object",
        properties: {},
      },
    },
    command: new GetAdminAffiliateSummaryCommand(analyticsService),
    roles: ["ADMIN"],
    category: "system",
  };
}

export function createListAdminReferralExceptionsTool(
  analyticsService: AdminReferralAnalyticsService,
): ToolDescriptor {
  return {
    name: "list_admin_referral_exceptions",
    schema: {
      description:
        "Return unresolved referral attribution records and credit-review backlog items for admins only. Use when the user asks what needs manual review or which referral records are still broken.",
      input_schema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Optional maximum number of exception items to return. Defaults to 12 and is capped at 50.",
          },
          kind: {
            type: "string",
            enum: [...ADMIN_REFERRAL_EXCEPTION_KINDS],
            description: "Optional exception filter. Use only one of the declared exception kinds.",
          },
        },
      },
    },
    command: new ListAdminReferralExceptionsCommand(analyticsService),
    roles: ["ADMIN"],
    category: "system",
  };
}