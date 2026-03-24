import type { UserProfile } from "@/core/entities/user-profile";

export interface UserProfileRepository {
  findProfileById(id: string): Promise<UserProfile | null>;
  updateProfile(
    id: string,
    input: { name: string; email: string; credential: string | null },
  ): Promise<UserProfile>;
}