import type { RoleName } from "@/core/entities/user";

export interface UserProfileViewModel {
  id: string;
  email: string;
  name: string;
  credential: string;
  pushNotificationsEnabled: boolean;
  affiliateEnabled: boolean;
  referralCode: string | null;
  referralUrl: string | null;
  qrCodeUrl: string | null;
  roles: RoleName[];
}