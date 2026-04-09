import type { UseCase } from "../common/UseCase";
import { ValidationError as BaseValidationError, ConflictError } from "../common/errors";
import type { User } from "../entities/user";
import type { PasswordHasher } from "./PasswordHasher";
import type { SessionRepository } from "./SessionRepository";
import type { UserRepository } from "./UserRepository";

export interface SignupEventRecorder {
  recordSignup(user: User): Promise<void>;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResult {
  user: User;
  sessionToken: string;
}

export class RegisterUserInteractor
  implements UseCase<RegisterRequest, AuthResult>
{
  constructor(
    private userRepo: UserRepository,
    private hasher: PasswordHasher,
    private sessionRepo: SessionRepository,
    private signupEventRecorder?: SignupEventRecorder,
  ) {}

  async execute(req: RegisterRequest): Promise<AuthResult> {
    const email = req.email.trim().toLowerCase();
    const name = req.name.trim();
    const { password } = req;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new RegistrationValidationError("Invalid email format");
    }

    // Validate password
    if (!password || password.length < 8) {
      throw new RegistrationValidationError(
        "Password must be at least 8 characters",
      );
    }
    if (password.length > 72) {
      throw new RegistrationValidationError(
        "Password must be at most 72 characters",
      );
    }

    // Validate name
    if (!name) {
      throw new RegistrationValidationError("Name is required");
    }
    if (name.length > 100) {
      throw new RegistrationValidationError(
        "Name must be at most 100 characters",
      );
    }

    // Check uniqueness
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new DuplicateEmailError("Email already registered");
    }

    // Hash & create user
    const passwordHash = await this.hasher.hash(password);
    const user = await this.userRepo.create({ email, name, passwordHash });

    // Create session
    const sessionToken = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await this.sessionRepo.create({
      id: sessionToken,
      userId: user.id,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    // Emit signup event for downstream consumers (Sprint 6 notifications)
    await this.signupEventRecorder?.recordSignup(user);

    return { user, sessionToken };
  }
}

export class RegistrationValidationError extends BaseValidationError {}

/** @deprecated Use RegistrationValidationError — kept for backward compatibility. Remove after 2025-10-01. */
export { RegistrationValidationError as RegisterValidationError };

// Re-export under the old name so existing consumers keep working.
export { RegistrationValidationError as ValidationError };

export class DuplicateEmailError extends ConflictError {}

