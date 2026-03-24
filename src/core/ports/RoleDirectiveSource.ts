import type { RoleName } from "@/core/entities/user";

export interface RoleDirectiveSource {
  getDirective(role: RoleName): string;
}
