import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Legacy /jobs route — redirects to /admin/jobs.
 * The old JobsPagePanel monolith was replaced by the admin BREAD surface in Sprint 5.
 */
export default function JobsPage() {
  redirect("/admin/jobs");
}