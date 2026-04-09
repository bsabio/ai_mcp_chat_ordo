import type { UserProfile } from "@/core/entities/user-profile";
import type { UserProfileRepository } from "@/core/use-cases/UserProfileRepository";
import { NotFoundError } from "@/core/common/errors";

export class UserProfileNotFoundError extends NotFoundError {
  constructor(userId: string) {
    super(`User profile not found for ${userId}.`);
  }
}

export class GetUserProfileInteractor {
  constructor(private readonly repo: UserProfileRepository) {}

  async execute(input: { userId: string }): Promise<UserProfile> {
    const profile = await this.repo.findProfileById(input.userId);
    if (!profile) {
      throw new UserProfileNotFoundError(input.userId);
    }
    return profile;
  }
}