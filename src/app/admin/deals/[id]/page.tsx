import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminSection } from "@/components/admin/AdminSection";
import { AdminDetailShell } from "@/components/admin/AdminDetailShell";
import { requireAdminPageAccess } from "@/lib/journal/admin-journal";
import { loadAdminPipelineDetail } from "@/lib/admin/leads/admin-leads";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Deal Detail",
  robots: { index: false, follow: false },
};

export default async function AdminDealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPageAccess();
  const { id } = await params;
  const detail = await loadAdminPipelineDetail(id);
  if (detail.entityType !== "deal") notFound();

  const { record } = detail;

  return (
    <AdminSection
      title={record.title}
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Deals", href: "/admin/deals" },
        { label: record.title },
      ]}
    >
      <div className="px-(--space-inset-panel)">
        <AdminDetailShell
          backHref="/admin/deals"
          backLabel="All Deals"
          main={
            <div className="grid gap-(--space-section-default)">
              <p className="text-sm text-foreground/60">Deal ID: {record.id}</p>
            </div>
          }
        />
      </div>
    </AdminSection>
  );
}
