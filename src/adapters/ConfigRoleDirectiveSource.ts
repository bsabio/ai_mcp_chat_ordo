import type { RoleDirectiveSource } from "@/core/ports/RoleDirectiveSource";
import type { RoleName } from "@/core/entities/user";
import { ROLE_DIRECTIVES } from "@/core/entities/role-directives";

/**
 * Implements the RoleDirectiveSource port using the hardcoded ROLE_DIRECTIVES.
 * Sprint 0 does not externalize role directives to config — this adapter
 * provides forward compatibility for when prompts.json gains per-role fields.
 */
export class ConfigRoleDirectiveSource implements RoleDirectiveSource {
  getDirective(role: RoleName): string {
    return ROLE_DIRECTIVES[role] ?? "";
  }
}
