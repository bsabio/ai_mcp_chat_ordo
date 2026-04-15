import type { RoleName } from "@/core/entities/user";

export const ADMIN_ROLES = ["ADMIN"] as const satisfies readonly RoleName[];

export const SIGNED_IN_ROLES = [
  "AUTHENTICATED",
  "APPRENTICE",
  "STAFF",
  "ADMIN",
] as const satisfies readonly RoleName[];

export const AUTOMATIC_RETRY_EDITORIAL = {
  mode: "automatic" as const,
  maxAttempts: 3,
  backoffStrategy: "fixed" as const,
  baseDelayMs: 3_000,
};

export const MANUAL_ONLY_RETRY = {
  mode: "manual_only" as const,
};