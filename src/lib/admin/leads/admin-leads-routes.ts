import { createAdminEntityRoutes } from "@/lib/admin/shared/admin-route-helpers";

const leadRoutes = createAdminEntityRoutes("/admin/leads");

export function getAdminLeadsListPath(): string {
  return leadRoutes.list();
}

export function getAdminLeadsDetailPath(id: string): string {
  return leadRoutes.detail(id);
}
