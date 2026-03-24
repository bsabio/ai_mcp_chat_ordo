import type Database from "better-sqlite3";
import type { User, RoleName } from "../core/entities/user";
import type { UserRepository, UserRecord } from "../core/use-cases/UserRepository";
import type { UserProfile } from "@/core/entities/user-profile";
import type { UserProfileRepository } from "@/core/use-cases/UserProfileRepository";
import { generateReferralCode } from "@/lib/referral/generate-code";

export class UserDataMapper implements UserRepository, UserProfileRepository {
  constructor(private db: Database.Database) {}

  async create(input: {
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<User> {
    const id = `usr_${crypto.randomUUID()}`;
    this.db
      .prepare(`INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)`)
      .run(id, input.email, input.name, input.passwordHash);

    // Assign AUTHENTICATED role
    this.db
      .prepare(`INSERT INTO user_roles (user_id, role_id) VALUES (?, 'role_authenticated')`)
      .run(id);

    return {
      id,
      email: input.email,
      name: input.name,
      roles: ["AUTHENTICATED"],
    };
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const row = this.db
      .prepare(`SELECT id, email, name, password_hash FROM users WHERE email = ?`)
      .get(email) as
      | { id: string; email: string; name: string; password_hash: string | null }
      | undefined;

    if (!row) return null;

    const roles = this.getRoles(row.id);

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.password_hash,
      roles,
    };
  }

  async findById(id: string): Promise<User | null> {
    const row = this.db
      .prepare(`SELECT id, email, name FROM users WHERE id = ?`)
      .get(id) as
      | { id: string; email: string; name: string }
      | undefined;

    if (!row) return null;

    const roles = this.getRoles(row.id);

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      roles,
    };
  }

  async findProfileById(id: string): Promise<UserProfile | null> {
    const row = this.db
      .prepare(
        `SELECT id, email, name, credential, affiliate_enabled, referral_code FROM users WHERE id = ?`,
      )
      .get(id) as
      | {
          id: string;
          email: string;
          name: string;
          credential: string | null;
          affiliate_enabled: number | null;
          referral_code: string | null;
        }
      | undefined;

    if (!row) {
      return null;
    }

    const roles = this.getRoles(row.id);
    const normalizedProfile = this.ensureDefaultAffiliateAccess({
      id: row.id,
      email: row.email,
      name: row.name,
      credential: row.credential,
      affiliateEnabled: row.affiliate_enabled === 1,
      referralCode: row.referral_code,
      roles,
    });

    return normalizedProfile;
  }

  async updateProfile(
    id: string,
    input: { name: string; email: string; credential: string | null },
  ): Promise<UserProfile> {
    this.db
      .prepare(`UPDATE users SET name = ?, email = ?, credential = ? WHERE id = ?`)
      .run(input.name, input.email, input.credential, id);

    const updated = await this.findProfileById(id);
    if (!updated) {
      throw new Error(`User profile not found after update: ${id}`);
    }
    return updated;
  }

  /** Adapter-specific method for mock auth — NOT part of UserRepository port */
  public findByActiveRole(activeRoleName: RoleName): User | null {
    const mockUserRow = this.db
      .prepare(
        `
            SELECT u.id, u.email, u.name 
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name = ?
        `,
      )
      .get(activeRoleName) as
      | { id: string; email: string; name: string }
      | undefined;

    if (!mockUserRow) return null;

    const roles = this.getRoles(mockUserRow.id);

    return {
      id: mockUserRow.id,
      email: mockUserRow.email,
      name: mockUserRow.name,
      roles,
    };
  }

  private getRoles(userId: string): RoleName[] {
    const rolesRows = this.db
      .prepare(
        `SELECT r.name
         FROM roles r
         JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = ?`,
      )
      .all(userId) as { name: RoleName }[];

    return rolesRows.map((r) => r.name);
  }

  private ensureDefaultAffiliateAccess(profile: UserProfile): UserProfile {
    const shouldProvisionAdminReferral = profile.roles.includes("ADMIN")
      && (!profile.affiliateEnabled || !profile.referralCode);

    if (!shouldProvisionAdminReferral) {
      return profile;
    }

    const referralCode = profile.referralCode ?? generateReferralCode();

    this.db
      .prepare(`UPDATE users SET affiliate_enabled = 1, referral_code = ? WHERE id = ?`)
      .run(referralCode, profile.id);

    return {
      ...profile,
      affiliateEnabled: true,
      referralCode,
    };
  }
}
