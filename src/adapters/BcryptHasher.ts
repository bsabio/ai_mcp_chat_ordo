import bcrypt from "bcryptjs";
import type { PasswordHasher } from "@/core/use-cases/PasswordHasher";

const DEFAULT_ROUNDS = 12;

export class BcryptHasher implements PasswordHasher {
  private rounds: number;

  constructor() {
    const env = process.env.BCRYPT_ROUNDS;
    this.rounds = env ? parseInt(env, 10) : DEFAULT_ROUNDS;
  }

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
