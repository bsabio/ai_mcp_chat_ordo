import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import type { ToolCommand } from "@/core/tool-registry/ToolCommand";
import type { UserProfileViewModel } from "@/lib/profile/types";

type SerializedProfile = {
  id: string;
  name: string;
  email: string;
  credential: string | null;
  push_notifications_enabled: boolean;
  affiliate_enabled: boolean;
  referral_code: string | null;
  referral_url: string | null;
  qr_code_url: string | null;
  roles: string[];
};

type ProfileToolResult = {
  action: "get_my_profile" | "update_my_profile";
  message: string;
  profile: SerializedProfile;
};

type ReferralQrToolResult =
  | {
      action: "get_my_referral_qr";
      message: string;
      referral_code: string;
      referral_url: string;
      qr_code_url: string;
      manage_route: "/profile";
    }
  | {
      action: "get_my_referral_qr";
      error: string;
      affiliate_enabled: false;
      manage_route: "/profile";
    };

interface UserProfileService {
  getProfile(userId: string): Promise<UserProfileViewModel>;
  updateProfile(
    userId: string,
    patch: { name?: string; email?: string; credential?: string | null },
  ): Promise<UserProfileViewModel>;
}

function authError() {
  return { error: "Authentication required to manage your profile." };
}

function serializeProfile(profile: UserProfileViewModel) {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    credential: profile.credential || null,
    push_notifications_enabled: profile.pushNotificationsEnabled,
    affiliate_enabled: profile.affiliateEnabled,
    referral_code: profile.referralCode,
    referral_url: profile.referralUrl,
    qr_code_url: profile.qrCodeUrl,
    roles: profile.roles,
  };
}

class GetMyProfileCommand implements ToolCommand<Record<string, unknown>, ProfileToolResult | { error: string }> {
  constructor(private readonly profileService: UserProfileService) {}

  async execute(
    _input: Record<string, unknown>,
    context?: ToolExecutionContext,
  ): Promise<ProfileToolResult | { error: string }> {
    if (!context || context.role === "ANONYMOUS") {
      return authError();
    }

    const profile = await this.profileService.getProfile(context.userId);
    return {
      action: "get_my_profile",
      profile: serializeProfile(profile),
      message: "Returned the current profile fields and referral settings for this account.",
    };
  }
}

class UpdateMyProfileCommand implements ToolCommand<Record<string, unknown>, ProfileToolResult | { error: string }> {
  constructor(private readonly profileService: UserProfileService) {}

  async execute(
    input: Record<string, unknown>,
    context?: ToolExecutionContext,
  ): Promise<ProfileToolResult | { error: string }> {
    if (!context || context.role === "ANONYMOUS") {
      return authError();
    }

    const profile = await this.profileService.updateProfile(context.userId, {
      name: typeof input.name === "string" ? input.name : undefined,
      email: typeof input.email === "string" ? input.email : undefined,
      credential:
        typeof input.credential === "string"
          ? input.credential
          : input.credential === null
            ? null
            : undefined,
    });

    return {
      action: "update_my_profile",
      profile: serializeProfile(profile),
      message: "Updated the account profile using the shared profile service.",
    };
  }
}

class GetMyReferralQrCommand implements ToolCommand<Record<string, unknown>, ReferralQrToolResult | { error: string }> {
  constructor(private readonly profileService: UserProfileService) {}

  async execute(
    _input: Record<string, unknown>,
    context?: ToolExecutionContext,
  ): Promise<ReferralQrToolResult | { error: string }> {
    if (!context || context.role === "ANONYMOUS") {
      return authError();
    }

    const profile = await this.profileService.getProfile(context.userId);
    if (!profile.affiliateEnabled || !profile.referralCode || !profile.qrCodeUrl || !profile.referralUrl) {
      return {
        action: "get_my_referral_qr",
        error: "Referral QR access is not enabled for this account yet.",
        affiliate_enabled: false,
        manage_route: "/profile",
      };
    }

    return {
      action: "get_my_referral_qr",
      referral_code: profile.referralCode,
      referral_url: profile.referralUrl,
      qr_code_url: profile.qrCodeUrl,
      manage_route: "/profile",
      message: "Returned the share link and QR code URL for this account's referral code.",
    };
  }
}

export function createGetMyProfileTool(profileService: UserProfileService): ToolDescriptor {
  return {
    name: "get_my_profile",
    schema: {
      description:
        "Get the current user's profile details, including name, email, credential, and referral settings. Use when the user asks to see their account info or referral details.",
      input_schema: {
        type: "object",
        properties: {},
      },
    },
    command: new GetMyProfileCommand(profileService),
    roles: ["AUTHENTICATED", "APPRENTICE", "STAFF", "ADMIN"],
    category: "system",
  };
}

export function createUpdateMyProfileTool(profileService: UserProfileService): ToolDescriptor {
  return {
    name: "update_my_profile",
    schema: {
      description:
        "Update the current user's profile fields. Use for name, email, or credential changes requested by the user. This writes to the same profile backend used by the profile page.",
      input_schema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Updated display name for the account.",
          },
          email: {
            type: "string",
            description: "Updated email address for the account.",
          },
          credential: {
            type: ["string", "null"],
            description: "Credential or short public descriptor used for referrals. Use null to clear it.",
          },
        },
      },
    },
    command: new UpdateMyProfileCommand(profileService),
    roles: ["AUTHENTICATED", "APPRENTICE", "STAFF", "ADMIN"],
    category: "system",
  };
}

export function createGetMyReferralQrTool(profileService: UserProfileService): ToolDescriptor {
  return {
    name: "get_my_referral_qr",
    schema: {
      description:
        "Get the current user's referral code, referral landing URL, and QR code image URL when affiliate access is enabled.",
      input_schema: {
        type: "object",
        properties: {},
      },
    },
    command: new GetMyReferralQrCommand(profileService),
    roles: ["AUTHENTICATED", "APPRENTICE", "STAFF", "ADMIN"],
    category: "system",
  };
}