import type { UserDataMapper } from "@/adapters/UserDataMapper";
import type { RoleName } from "@/core/entities/user";

const VALID_ROLE_IDS: Record<RoleName, string> = {
  ANONYMOUS: "role_anonymous",
  AUTHENTICATED: "role_authenticated",
  APPRENTICE: "role_apprentice",
  STAFF: "role_staff",
  ADMIN: "role_admin",
};

const ROLE_ID_SET = new Set(Object.values(VALID_ROLE_IDS));

export class UserAdminInteractor {
  constructor(private readonly userMapper: UserDataMapper) {}

  async updateRole(userId: string, roleId: string, _adminUserId: string): Promise<void> {
    if (!ROLE_ID_SET.has(roleId)) {
      throw new Error(`Invalid role ID: ${roleId}`);
    }
    const user = await this.userMapper.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    await this.userMapper.updateRole(userId, roleId);
  }

  async toggleAffiliate(userId: string, enabled: boolean): Promise<void> {
    const user = await this.userMapper.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    await this.userMapper.toggleAffiliate(userId, enabled);
  }
}

export { VALID_ROLE_IDS };
