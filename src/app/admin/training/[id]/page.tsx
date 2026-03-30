import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminSection } from "@/components/admin/AdminSection";
import { AdminDetailShell } from "@/components/admin/AdminDetailShell";
import { requireAdminPageAccess } from "@/lib/journal/admin-journal";
import { loadAdminPipelineDetail } from "@/lib/admin/leads/admin-leads";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Training Detail",
  robots: { index: false, follow: false },
};

export default async function AdminTrainingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPageAccess();
  const { id } = await params;
  const detail = await loadAdminPipelineDetail(id);
  if (detail.entityType !== "training") notFound();

  const { record } = detail;

  return (
    <AdminSection
      title={record.id}
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Training", href: "/admin/training" },
        { label: record.id },
      ]}
    >
      <div className="px-(--space-inset-panel)">
        <AdminDetailShell
          backHref="/admin/training"
          backLabel="All Training"
          main={
            <div className="grid gap-(--space-section-default)">
              <p className="text-sm text-foreground/60">Training ID: {record.id}</p>
            </div>
          }
        />
      </div>
    </AdminSection>
  );
}
