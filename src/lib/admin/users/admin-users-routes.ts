import { createAdminEntityRoutes } from "@/lib/admin/shared/admin-route-helpers";

const userRoutes = createAdminEntityRoutes("/admin/users");

export function getAdminUsersListPath(): string {
  return userRoutes.list();
}

export function getAdminUsersDetailPath(userId: string): string {
  return userRoutes.detail(userId);
}
