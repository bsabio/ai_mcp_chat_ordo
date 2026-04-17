import { notFound, redirect } from "next/navigation";

import { getSessionUser, type SessionUser } from "@/lib/auth";
import type { RoleName } from "@/core/entities/user";

export const OPERATIONS_WORKSPACE_ROLES: readonly RoleName[] = ["STAFF", "ADMIN"];

export function canAccessOperationsWorkspace(userRoles: readonly RoleName[]): boolean {
  return userRoles.some((role) => OPERATIONS_WORKSPACE_ROLES.includes(role));
}

export async function requireOperationsWorkspaceAccess(): Promise<SessionUser> {
  const user = await getSessionUser();

  if (user.roles.includes("ANONYMOUS")) {
    redirect("/login");
  }

  if (!canAccessOperationsWorkspace(user.roles)) {
    notFound();
  }

  return user;
}