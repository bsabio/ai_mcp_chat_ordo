import type { UserProfileViewModel } from "@/lib/profile/types";
import { createProfileService } from "@/lib/profile/profile-service";
import type {
  AffiliateOverviewData,
  AffiliatePipelineData,
  AffiliateTimeseriesPoint,
} from "@/lib/referrals/referral-analytics";
import { createReferralAnalyticsService } from "@/lib/referrals/referral-analytics";
import type { ReferralActivityItem } from "@/lib/referrals/referral-milestones";

export interface ReferralsWorkspaceData {
  profile: UserProfileViewModel;
  overview: AffiliateOverviewData | null;
  timeseries: AffiliateTimeseriesPoint[];
  pipeline: AffiliatePipelineData | null;
  recentActivity: ReferralActivityItem[];
}

export async function loadReferralsWorkspace(userId: string): Promise<ReferralsWorkspaceData> {
  const profile = await createProfileService().getProfile(userId);

  if (!profile.affiliateEnabled || !profile.referralCode || !profile.referralUrl || !profile.qrCodeUrl) {
    return {
      profile,
      overview: null,
      timeseries: [],
      pipeline: null,
      recentActivity: [],
    };
  }

  const analyticsService = createReferralAnalyticsService();
  const [overview, timeseries, pipeline, recentActivity] = await Promise.all([
    analyticsService.getOverview(userId),
    analyticsService.getTimeseries(userId),
    analyticsService.getPipeline(userId),
    analyticsService.getRecentActivity(userId, 12),
  ]);

  return {
    profile,
    overview,
    timeseries,
    pipeline,
    recentActivity,
  };
}