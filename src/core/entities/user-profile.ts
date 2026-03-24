import type { RoleName } from "./user";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  credential: string | null;
  affiliateEnabled: boolean;
  referralCode: string | null;
  roles: RoleName[];
}

export interface UserProfilePatch {
  name?: string;
  email?: string;
  credential?: string | null;
}