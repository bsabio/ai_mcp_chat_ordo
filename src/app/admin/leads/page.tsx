import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/AdminSection";
import { AdminStatusCounts } from "@/components/admin/AdminStatusCounts";
import { AdminBrowseFilters } from "@/components/admin/AdminBrowseFilters";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { LeadsTableClient } from "@/components/admin/LeadsTableClient";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { requireAdminPageAccess } from "@/lib/journal/admin-journal";
import {
  loadAdminLeadsPipeline,
  type PipelineTab,
  type AdminLeadsTabData,
  type AdminConsultationsTabData,
  type AdminDealsTabData,
  type AdminTrainingTabData,
} from "@/lib/admin/leads/admin-leads";
import {
  LEAD_TRIAGE_OPTIONS,
  CONSULTATION_STATUS_OPTIONS,
  DEAL_STATUS_OPTIONS,
  TRAINING_STATUS_OPTIONS,
  bulkTriageAction,
} from "@/lib/admin/leads/admin-leads-actions";
import { buildAdminPaginationParams } from "@/lib/admin/admin-pagination";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Leads Pipeline",
  robots: { index: false, follow: false },
};

// ── Tab configs ────────────────────────────────────────────────────────

const TAB_DEFS: Array<{ key: PipelineTab; label: string }> = [
  { key: "leads", label: "Leads" },
  { key: "consultations", label: "Consultations" },
  { key: "deals", label: "Deals" },
  { key: "training", label: "Training" },
];

const EMPTY_MESSAGES: Record<PipelineTab, string> = {
  leads: "No leads yet — the AI concierge captures them during conversations.",
  consultations: "No consultation requests yet.",
  deals: "No deals yet.",
  training: "No training paths yet.",
};

// ── Page component ─────────────────────────────────────────────────────

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPageAccess();
  const raw = await searchParams;
  const pagination = buildAdminPaginationParams(raw);
  const pipeline = await loadAdminLeadsPipeline(raw);

  const { activeTab, pipelineCounts, tabData } = pipeline;

  // Pipeline summary cards (always visible)
  const pipelineCards = [
    { label: "Leads", count: pipelineCounts.leads, active: activeTab === "leads" },
    { label: "Consultations", count: pipelineCounts.consultations, active: activeTab === "consultations" },
    { label: "Deals", count: pipelineCounts.deals, active: activeTab === "deals" },
    { label: "Training", count: pipelineCounts.training, active: activeTab === "training" },
  ];

  // Tab-specific status filter options + columns
  let statusOptions: Array<{ value: string; label: string }>;
  let statusCounts: Record<string, number>;
  let rows: Record<string, unknown>[];
  let total: number;

  switch (tabData.tab) {
    case "leads": {
      const data = tabData as AdminLeadsTabData;
      statusOptions = LEAD_TRIAGE_OPTIONS;
      statusCounts = data.statusCounts;
      rows = data.entries as unknown as Record<string, unknown>[];
      total = data.total;
      break;
    }
    case "consultations": {
      const data = tabData as AdminConsultationsTabData;
      statusOptions = CONSULTATION_STATUS_OPTIONS;
      statusCounts = data.statusCounts;
      rows = data.entries as unknown as Record<string, unknown>[];
      total = data.total;
      break;
    }
    case "deals": {
      const data = tabData as AdminDealsTabData;
      statusOptions = DEAL_STATUS_OPTIONS;
      statusCounts = data.statusCounts;
      rows = data.entries as unknown as Record<string, unknown>[];
      total = data.total;
      break;
    }
    case "training": {
      const data = tabData as AdminTrainingTabData;
      statusOptions = TRAINING_STATUS_OPTIONS;
      statusCounts = data.statusCounts;
      rows = data.entries as unknown as Record<string, unknown>[];
      total = data.total;
      break;
    }
  }

  const statusCountCards = statusOptions.map((opt) => ({
    label: opt.label,
    count: statusCounts[opt.value] ?? 0,
    active: tabData.statusFilter === opt.value,
  }));

  return (
    <AdminSection
      title="Leads Pipeline"
      description="Lead capture, consultation requests, deals, and training paths."
    >
      <div className="grid gap-(--space-section-default) px-(--space-inset-panel)">
        {/* Pipeline summary cards */}
        <AdminStatusCounts items={pipelineCards} />

        {/* Tab bar */}
        <nav className="flex gap-(--space-1) border-b border-foreground/8 pb-0" aria-label="Pipeline tabs">
          {TAB_DEFS.map((t) => (
            <a
              key={t.key}
              href={`/admin/leads${t.key === "leads" ? "" : `?tab=${t.key}`}`}
              className={`rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition ${
                activeTab === t.key
                  ? "border-foreground text-foreground"
                  : "border-transparent text-foreground/50 hover:text-foreground/70"
              }`}
            >
              {t.label}
            </a>
          ))}
        </nav>

        {/* Status filter + counts for active tab */}
        <AdminBrowseFilters
          fields={[
            { name: "status", label: "Status", type: "select", options: statusOptions },
          ]}
          values={{ status: tabData.statusFilter || "" }}
          hiddenFields={activeTab !== "leads" ? { tab: activeTab } : undefined}
        />

        <AdminStatusCounts items={statusCountCards} />

        {/* Data table or empty state */}
        {total === 0 ? (
          <AdminEmptyState
            heading={`No ${activeTab} found`}
            description={EMPTY_MESSAGES[activeTab]}
          />
        ) : (
          <LeadsTableClient
            activeTab={activeTab}
            rows={rows}
            bulkTriageAction={bulkTriageAction}
          />
        )}
        <AdminPagination
          page={pagination.page}
          total={total}
          pageSize={pagination.pageSize}
          baseHref="/admin/leads"
        />
      </div>
    </AdminSection>
  );
}