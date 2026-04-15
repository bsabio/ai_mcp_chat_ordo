import type { ToolBundleDescriptor } from "@/core/tool-registry/ToolBundleDescriptor";
import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { projectCatalogBoundToolDescriptor } from "@/core/capability-catalog/runtime-tool-binding";
import { createProfileService } from "@/lib/profile/profile-service";
import { createAdminReferralAnalyticsService } from "@/lib/referrals/admin-referral-analytics";
import { createReferralAnalyticsService } from "@/lib/referrals/referral-analytics";
import {
  createRegisteredToolBundle,
  registerToolBundle,
  type ToolBundleRegistration,
} from "./bundle-registration";

interface AffiliateToolRegistrationDeps {
  readonly profileService: ReturnType<typeof createProfileService>;
  readonly analyticsService: ReturnType<typeof createReferralAnalyticsService>;
  readonly adminAnalyticsService: ReturnType<typeof createAdminReferralAnalyticsService>;
}

const AFFILIATE_TOOL_REGISTRATIONS = [
  {
    toolName: "get_my_affiliate_summary",
    createTool: ({ profileService, analyticsService }) =>
      projectCatalogBoundToolDescriptor("get_my_affiliate_summary", { profileService, analyticsService }),
  },
  {
    toolName: "list_my_referral_activity",
    createTool: ({ profileService, analyticsService }) =>
      projectCatalogBoundToolDescriptor("list_my_referral_activity", { profileService, analyticsService }),
  },
  {
    toolName: "get_admin_affiliate_summary",
    createTool: ({ adminAnalyticsService }) =>
      projectCatalogBoundToolDescriptor("get_admin_affiliate_summary", { adminAnalyticsService }),
  },
  {
    toolName: "list_admin_referral_exceptions",
    createTool: ({ adminAnalyticsService }) =>
      projectCatalogBoundToolDescriptor("list_admin_referral_exceptions", { adminAnalyticsService }),
  },
] as const satisfies readonly ToolBundleRegistration<
  | "get_my_affiliate_summary"
  | "list_my_referral_activity"
  | "get_admin_affiliate_summary"
  | "list_admin_referral_exceptions",
  AffiliateToolRegistrationDeps
>[];

export const AFFILIATE_BUNDLE: ToolBundleDescriptor = createRegisteredToolBundle(
  "affiliate",
  "Affiliate Tools",
  AFFILIATE_TOOL_REGISTRATIONS,
);

export function registerAffiliateAnalyticsTools(registry: ToolRegistry): void {
  registerToolBundle(registry, AFFILIATE_TOOL_REGISTRATIONS, {
    profileService: createProfileService(),
    analyticsService: createReferralAnalyticsService(),
    adminAnalyticsService: createAdminReferralAnalyticsService(),
  });
}