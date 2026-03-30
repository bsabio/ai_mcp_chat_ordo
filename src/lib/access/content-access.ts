import type { RoleName } from "@/core/entities/user";

export type ContentAudience = "public" | "member" | "staff" | "admin";

const AUDIENCE_ROLES: Record<ContentAudience, readonly RoleName[]> = {
  public: ["ANONYMOUS", "AUTHENTICATED", "APPRENTICE", "STAFF", "ADMIN"],
  member: ["AUTHENTICATED", "APPRENTICE", "STAFF", "ADMIN"],
  staff: ["STAFF", "ADMIN"],
  admin: ["ADMIN"],
};

export function getAudienceRoles(audience: ContentAudience): readonly RoleName[] {
  return AUDIENCE_ROLES[audience];
}

export function canAccessAudience(audience: ContentAudience, role: RoleName): boolean {
  return AUDIENCE_ROLES[audience].includes(role);
}

export function isContentAudience(value: string): value is ContentAudience {
  return value === "public" || value === "member" || value === "staff" || value === "admin";
}

export function getPrimaryRole(roles: readonly RoleName[]): RoleName {
  return roles[0] ?? "ANONYMOUS";
}

const DENIED_AUDIENCE_PRIORITY: Record<RoleName, readonly ContentAudience[]> = {
  ANONYMOUS: ["member", "staff", "admin"],
  AUTHENTICATED: ["staff", "admin"],
  APPRENTICE: ["staff", "admin"],
  STAFF: ["admin"],
  ADMIN: [],
};

export function getDeniedAudienceForRole(
  audiences: readonly ContentAudience[],
  role: RoleName,
): ContentAudience | null {
  const audienceSet = new Set(audiences);
  for (const audience of DENIED_AUDIENCE_PRIORITY[role]) {
    if (audienceSet.has(audience)) {
      return audience;
    }
  }
  return null;
}