import type { RoleName } from "@/core/entities/user";

export interface UserProfileViewModel {
  id: string;
  email: string;
  name: string;
  credential: string;
  affiliateEnabled: boolean;
  referralCode: string | null;
  referralUrl: string | null;
  qrCodeUrl: string | null;
  roles: RoleName[];
}