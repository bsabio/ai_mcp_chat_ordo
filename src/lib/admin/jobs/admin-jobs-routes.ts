import { createAdminEntityRoutes } from "@/lib/admin/shared/admin-route-helpers";

const jobRoutes = createAdminEntityRoutes("/admin/jobs");

export function getAdminJobsListPath(): string {
  return jobRoutes.list();
}

export function getAdminJobsDetailPath(id: string): string {
  return jobRoutes.detail(id);
}
