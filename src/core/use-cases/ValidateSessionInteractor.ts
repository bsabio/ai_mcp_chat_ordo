import type { UseCase } from "../common/UseCase";
import { AuthorizationError } from "../common/errors";
import type { User } from "../entities/user";
import type { SessionRepository } from "./SessionRepository";
import type { UserRepository } from "./UserRepository";

export class ValidateSessionInteractor
  implements UseCase<{ token: string }, User>
{
  constructor(
    private sessionRepo: SessionRepository,
    private userRepo: UserRepository,
  ) {}

  async execute(req: { token: string }): Promise<User> {
    const session = await this.sessionRepo.findByToken(req.token);
    if (!session) {
      throw new InvalidSessionError("Invalid session");
    }

    if (new Date(session.expiresAt) < new Date()) {
      await this.sessionRepo.delete(session.id);
      throw new InvalidSessionError("Session expired");
    }

    const user = await this.userRepo.findById(session.userId);
    if (!user) {
      await this.sessionRepo.delete(session.id);
      throw new InvalidSessionError("User not found");
    }

    return user;
  }
}

export class InvalidSessionError extends AuthorizationError {}

