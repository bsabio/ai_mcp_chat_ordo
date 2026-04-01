import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import {
  createGetAdminAffiliateSummaryTool,
  createGetMyAffiliateSummaryTool,
  createListAdminReferralExceptionsTool,
  createListMyReferralActivityTool,
} from "@/core/use-cases/tools/affiliate-analytics.tool";
import { createProfileService } from "@/lib/profile/profile-service";
import { createAdminReferralAnalyticsService } from "@/lib/referrals/admin-referral-analytics";
import { createReferralAnalyticsService } from "@/lib/referrals/referral-analytics";

export function registerAffiliateAnalyticsTools(registry: ToolRegistry): void {
  const profileService = createProfileService();
  const analyticsService = createReferralAnalyticsService();
  const adminAnalyticsService = createAdminReferralAnalyticsService();

  registry.register(createGetMyAffiliateSummaryTool(profileService, analyticsService));
  registry.register(createListMyReferralActivityTool(profileService, analyticsService));
  registry.register(createGetAdminAffiliateSummaryTool(adminAnalyticsService));
  registry.register(createListAdminReferralExceptionsTool(adminAnalyticsService));
}