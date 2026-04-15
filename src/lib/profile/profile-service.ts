import {
  getUserDataMapper,
  getUserPreferencesDataMapper,
} from "@/adapters/RepositoryFactory";
import type { UserProfilePatch } from "@/core/entities/user-profile";
import { GetUserProfileInteractor } from "@/core/use-cases/GetUserProfileInteractor";
import { UpdateUserProfileInteractor } from "@/core/use-cases/UpdateUserProfileInteractor";
import type { UserProfileViewModel } from "@/lib/profile/types";
import { buildPublicReferralUrl } from "@/lib/referrals/referral-origin";
import {
  isPushNotificationsEnabledValue,
  PUSH_NOTIFICATIONS_PREFERENCE_KEY,
} from "@/lib/push/push-preferences";

function buildQrCodeUrl(referralCode: string): string {
  return `/api/qr/${encodeURIComponent(referralCode)}`;
}

function toViewModel(
  profile: Awaited<ReturnType<GetUserProfileInteractor["execute"]>>,
  pushNotificationsEnabled: boolean,
): UserProfileViewModel {
  const referralUrl = profile.referralCode
    ? buildPublicReferralUrl(profile.referralCode)
    : null;

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    credential: profile.credential ?? "",
    pushNotificationsEnabled,
    affiliateEnabled: profile.affiliateEnabled,
    referralCode: profile.referralCode,
    referralUrl,
    qrCodeUrl: profile.referralCode ? buildQrCodeUrl(profile.referralCode) : null,
    roles: profile.roles,
  };
}

export function createProfileService() {
  const repo = getUserDataMapper();
  const preferencesRepo = getUserPreferencesDataMapper();
  const getProfile = new GetUserProfileInteractor(repo);
  const updateProfile = new UpdateUserProfileInteractor(repo);

  return {
    async getProfile(userId: string): Promise<UserProfileViewModel> {
      const [profile, pushPreference] = await Promise.all([
        getProfile.execute({ userId }),
        preferencesRepo.get(userId, PUSH_NOTIFICATIONS_PREFERENCE_KEY),
      ]);

      return toViewModel(profile, isPushNotificationsEnabledValue(pushPreference?.value));
    },
    async updateProfile(userId: string, patch: UserProfilePatch): Promise<UserProfileViewModel> {
      const [profile, pushPreference] = await Promise.all([
        updateProfile.execute({ userId, patch }),
        preferencesRepo.get(userId, PUSH_NOTIFICATIONS_PREFERENCE_KEY),
      ]);

      return toViewModel(profile, isPushNotificationsEnabledValue(pushPreference?.value));
    },
  };
}