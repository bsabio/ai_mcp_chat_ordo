import type { RoleDirectiveSource } from "@/core/ports/RoleDirectiveSource";
import type { RoleName } from "@/core/entities/user";
import { ROLE_DIRECTIVES } from "@/core/entities/role-directives";

export class HardcodedRoleDirectiveSource implements RoleDirectiveSource {
  getDirective(role: RoleName): string {
    return ROLE_DIRECTIVES[role] ?? "";
  }
}
