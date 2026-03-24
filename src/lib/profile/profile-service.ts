import { UserDataMapper } from "@/adapters/UserDataMapper";
import type { UserProfilePatch } from "@/core/entities/user-profile";
import { GetUserProfileInteractor } from "@/core/use-cases/GetUserProfileInteractor";
import { UpdateUserProfileInteractor } from "@/core/use-cases/UpdateUserProfileInteractor";
import { getInstanceIdentity } from "@/lib/config/instance";
import { getDb } from "@/lib/db";
import type { UserProfileViewModel } from "@/lib/profile/types";

function buildReferralUrl(domain: string, referralCode: string): string {
  return `https://${domain}/?ref=${encodeURIComponent(referralCode)}`;
}

function buildQrCodeUrl(referralCode: string): string {
  return `/api/qr/${encodeURIComponent(referralCode)}`;
}

function toViewModel(
  profile: Awaited<ReturnType<GetUserProfileInteractor["execute"]>>,
): UserProfileViewModel {
  const referralUrl = profile.referralCode
    ? buildReferralUrl(getInstanceIdentity().domain, profile.referralCode)
    : null;

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    credential: profile.credential ?? "",
    affiliateEnabled: profile.affiliateEnabled,
    referralCode: profile.referralCode,
    referralUrl,
    qrCodeUrl: profile.referralCode ? buildQrCodeUrl(profile.referralCode) : null,
    roles: profile.roles,
  };
}

export function createProfileService() {
  const repo = new UserDataMapper(getDb());
  const getProfile = new GetUserProfileInteractor(repo);
  const updateProfile = new UpdateUserProfileInteractor(repo);

  return {
    async getProfile(userId: string): Promise<UserProfileViewModel> {
      return toViewModel(await getProfile.execute({ userId }));
    },
    async updateProfile(userId: string, patch: UserProfilePatch): Promise<UserProfileViewModel> {
      return toViewModel(await updateProfile.execute({ userId, patch }));
    },
  };
}