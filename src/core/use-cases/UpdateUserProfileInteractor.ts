import type { UserProfile, UserProfilePatch } from "@/core/entities/user-profile";
import type { UserProfileRepository } from "@/core/use-cases/UserProfileRepository";
import { ValidationError, ConflictError } from "@/core/common/errors";
import { UserProfileNotFoundError } from "@/core/use-cases/GetUserProfileInteractor";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class UserProfileValidationError extends ValidationError {}

export class UserProfileConflictError extends ConflictError {}


function normalizeName(name: string | undefined, fallback: string): string {
  const next = (name ?? fallback).trim();
  if (!next) {
    throw new UserProfileValidationError("Name is required.");
  }
  if (next.length > 100) {
    throw new UserProfileValidationError("Name must be 100 characters or fewer.");
  }
  return next;
}

function normalizeEmail(email: string | undefined, fallback: string): string {
  const next = (email ?? fallback).trim().toLowerCase();
  if (!next) {
    throw new UserProfileValidationError("Email is required.");
  }
  if (next.length > 320 || !EMAIL_PATTERN.test(next)) {
    throw new UserProfileValidationError("Enter a valid email address.");
  }
  return next;
}

function normalizeCredential(
  credential: string | null | undefined,
  fallback: string | null,
): string | null {
  const raw = credential === undefined ? fallback : credential;
  const next = raw?.trim() ?? "";
  if (!next) {
    return null;
  }
  if (next.length > 120) {
    throw new UserProfileValidationError("Credential must be 120 characters or fewer.");
  }
  return next;
}

export class UpdateUserProfileInteractor {
  constructor(private readonly repo: UserProfileRepository) {}

  async execute(input: { userId: string; patch: UserProfilePatch }): Promise<UserProfile> {
    if (
      input.patch.name === undefined
      && input.patch.email === undefined
      && input.patch.credential === undefined
    ) {
      throw new UserProfileValidationError("Provide at least one profile field to update.");
    }

    const existing = await this.repo.findProfileById(input.userId);
    if (!existing) {
      throw new UserProfileNotFoundError(input.userId);
    }

    const normalized = {
      name: normalizeName(input.patch.name, existing.name),
      email: normalizeEmail(input.patch.email, existing.email),
      credential: normalizeCredential(input.patch.credential, existing.credential),
    };

    try {
      return await this.repo.updateProfile(input.userId, normalized);
    } catch (error) {
      if (error instanceof Error && /UNIQUE constraint failed: users\.email/i.test(error.message)) {
        throw new UserProfileConflictError("That email address is already in use.");
      }
      throw error;
    }
  }
}