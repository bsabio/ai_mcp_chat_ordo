import type { UseCase } from "../common/UseCase";
import { AuthorizationError } from "../common/errors";
import type { PasswordHasher } from "./PasswordHasher";
import type { SessionRepository } from "./SessionRepository";
import type { UserRepository } from "./UserRepository";
import type { AuthResult } from "./RegisterUserInteractor";

export interface LoginRequest {
  email: string;
  password: string;
}

// Pre-computed bcrypt hash of empty string — used as dummy for timing safety
const DUMMY_HASH =
  "$2a$12$000000000000000000000uGBOtEFOVBkRCipBLOjMKe2V71dyxGG";

export class AuthenticateUserInteractor
  implements UseCase<LoginRequest, AuthResult>
{
  constructor(
    private userRepo: UserRepository,
    private hasher: PasswordHasher,
    private sessionRepo: SessionRepository,
  ) {}

  async execute(req: LoginRequest): Promise<AuthResult> {
    const email = req.email.trim().toLowerCase();

    const record = await this.userRepo.findByEmail(email);

    if (!record || !record.passwordHash) {
      // Timing safety: still run verify against dummy hash
      await this.hasher.verify(req.password, DUMMY_HASH);
      throw new InvalidCredentialsError("Invalid credentials");
    }

    const valid = await this.hasher.verify(req.password, record.passwordHash);
    if (!valid) {
      throw new InvalidCredentialsError("Invalid credentials");
    }

    // Create session
    const sessionToken = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await this.sessionRepo.create({
      id: sessionToken,
      userId: record.id,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    return {
      user: {
        id: record.id,
        email: record.email,
        name: record.name,
        roles: record.roles,
      },
      sessionToken,
    };
  }
}

export class InvalidCredentialsError extends AuthorizationError {}

