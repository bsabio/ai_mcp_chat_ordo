/**
 * Fallback ROLE_DIRECTIVES — used by DefaultingSystemPromptRepository
 * when the database has no active prompt. Exported for seed reference.
 *
 * Sprint 13: All entries are now assembled from the catalog-driven
 * assembleRoleDirective() function. Tool-specific directive lines come from
 * catalog promptHint facets, not hardcoded strings.
 */
import type { RoleName } from "./user";
import { assembleRoleDirective } from "./role-directive-assembler";

export const ROLE_DIRECTIVES: Record<RoleName, string> = {
  ANONYMOUS: assembleRoleDirective("ANONYMOUS"),
  AUTHENTICATED: assembleRoleDirective("AUTHENTICATED"),
  APPRENTICE: assembleRoleDirective("APPRENTICE"),
  STAFF: assembleRoleDirective("STAFF"),
  ADMIN: assembleRoleDirective("ADMIN"),
};
