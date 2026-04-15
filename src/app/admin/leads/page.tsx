import type { Metadata } from "next";
import Link from "next/link";

import { AdminCard } from "@/components/admin/AdminCard";
import { AdminSection } from "@/components/admin/AdminSection";
import { AdminStatusCounts } from "@/components/admin/AdminStatusCounts";
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
import {
  getAdminLeadsDetailPath,
  getAdminLeadsListPath,
} from "@/lib/admin/leads/admin-leads-routes";
import { buildAdminPaginationParams } from "@/lib/admin/admin-pagination";
import {
  loadOverdueFollowUpsBlock,
} from "@/lib/admin/pipeline/admin-pipeline-attention";
import {
  loadConsultationRequestQueueBlock,
  loadLeadQueueBlock,
  loadTrainingPathQueueBlock,
} from "@/lib/admin/leads/admin-leads-attention";

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

type LeadsWorkspaceView = "pipeline" | "attention";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function readSingleValue(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : value?.[0] ?? "";
}

function resolveWorkspaceView(raw: Record<string, string | string[] | undefined>): LeadsWorkspaceView {
  return readSingleValue(raw.view).trim().toLowerCase() === "attention"
    ? "attention"
    : "pipeline";
}

function buildLeadsHref({
  view = "pipeline",
  tab,
  status,
}: {
  view?: LeadsWorkspaceView;
  tab?: PipelineTab;
  status?: string;
}): string {
  const params = new URLSearchParams();

  if (view === "attention") {
    params.set("view", view);
  }

  if (tab && tab !== "leads") {
    params.set("tab", tab);
  }

  if (status) {
    params.set("status", status);
  }

  const query = params.toString();
  return query ? `${getAdminLeadsListPath()}?${query}` : getAdminLeadsListPath();
}

function formatDateLabel(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : DATE_FORMATTER.format(date);
}

function getTrainingPathLabel(item: {
  primaryGoal: string | null;
  currentRoleOrBackground: string | null;
}): string {
  return item.primaryGoal ?? item.currentRoleOrBackground ?? "Training path";
}

// ── Page component ─────────────────────────────────────────────────────

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdminPageAccess();
  const raw = await searchParams;
  const activeView = resolveWorkspaceView(raw);
  const pagination = buildAdminPaginationParams(raw);
  const pipeline = await loadAdminLeadsPipeline(raw);
  const attentionData = activeView === "attention"
    ? await Promise.all([
        loadLeadQueueBlock(user),
        loadConsultationRequestQueueBlock(user),
        loadTrainingPathQueueBlock(user),
        loadOverdueFollowUpsBlock(user),
      ])
    : null;

  if (activeView === "attention" && !attentionData) {
    throw new Error("Attention data is unavailable.");
  }

  const { activeTab, pipelineCounts, tabData } = pipeline;
  // Pipeline summary cards (always visible)
  const pipelineCards = TAB_DEFS.map((tab) => ({
    label: tab.label,
    count: pipelineCounts[tab.key],
    filterHref: buildLeadsHref({ tab: tab.key }),
    active: activeTab === tab.key,
  }));

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

  const statusCountCards = [
    {
      label: "All",
      count: total,
      filterHref: buildLeadsHref({ tab: activeTab }),
      active: !tabData.statusFilter,
    },
    ...statusOptions.map((opt) => ({
      label: opt.label,
      count: statusCounts[opt.value] ?? 0,
      filterHref: buildLeadsHref({ tab: activeTab, status: opt.value }),
      active: tabData.statusFilter === opt.value,
    })),
  ];

  return (
    <AdminSection
      title="Leads Pipeline"
      description="Lead capture, consultation requests, deals, and training paths."
    >
      <div className="admin-route-stack">
        {/* Pipeline summary cards */}
        <nav aria-label="Pipeline tabs">
          <AdminStatusCounts items={pipelineCards} />
        </nav>

        {activeView === "pipeline" ? (
          <>
            <AdminStatusCounts items={statusCountCards} />

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
          </>
        ) : attentionData ? (
          (() => {
            const [leadQueue, consultationQueue, trainingQueue, overdueFollowUps] = attentionData;

            return (
              <div className="grid gap-(--space-section-default) lg:grid-cols-2">
                <AdminCard
                  title="Submitted leads"
                  description="Recent captures waiting for founder triage and first follow-up."
                  status={leadQueue.data.summary.newLeadCount > 0 ? "warning" : "ok"}
                >
                  <div className="grid gap-(--space-4)">
                    <div className="flex flex-wrap items-end gap-(--space-3)">
                      <p className="text-3xl font-semibold tracking-tight text-foreground">
                        {leadQueue.data.summary.submittedLeadCount}
                      </p>
                      <p className="pb-1 text-sm text-foreground/62">submitted captures in queue</p>
                    </div>

                    <div className="flex flex-wrap gap-(--space-2)">
                      <Link
                        href={buildLeadsHref({ tab: "leads", status: "new" })}
                        className="rounded-full border border-foreground/12 px-3 py-1 text-sm font-medium text-foreground/78 transition hover:bg-foreground/5"
                      >
                        New {leadQueue.data.summary.newLeadCount}
                      </Link>
                      <Link
                        href={buildLeadsHref({ tab: "leads", status: "contacted" })}
                        className="rounded-full border border-foreground/12 px-3 py-1 text-sm font-medium text-foreground/78 transition hover:bg-foreground/5"
                      >
                        Contacted {leadQueue.data.summary.contactedLeadCount}
                      </Link>
                      <Link
                        href={buildLeadsHref({ tab: "leads", status: "qualified" })}
                        className="rounded-full border border-foreground/12 px-3 py-1 text-sm font-medium text-foreground/78 transition hover:bg-foreground/5"
                      >
                        Qualified {leadQueue.data.summary.qualifiedLeadCount}
                      </Link>
                    </div>

                    {leadQueue.data.leads.length > 0 ? (
                      <ul className="grid gap-(--space-3)">
                        {leadQueue.data.leads.slice(0, 3).map((lead) => {
                          const submittedLabel = formatDateLabel(lead.submittedAt);

                          return (
                            <li
                              key={lead.id}
                              className="flex items-start justify-between gap-(--space-3) rounded-[1.15rem] border border-foreground/8 bg-background/55 px-(--space-4) py-(--space-3)"
                            >
                              <div className="min-w-0 grid gap-1">
                                <Link
                                  href={getAdminLeadsDetailPath(lead.id)}
                                  className="truncate text-sm font-semibold text-foreground hover:underline"
                                >
                                  {lead.name}
                                </Link>
                                <p className="text-xs text-foreground/62">
                                  {lead.organization ?? lead.email}
                                </p>
                                {lead.recommendedNextAction ? (
                                  <p className="text-xs text-foreground/50">{lead.recommendedNextAction}</p>
                                ) : null}
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-foreground/45">
                                  {lead.triageState}
                                </p>
                                {submittedLabel ? (
                                  <p className="mt-1 text-xs text-foreground/45">{submittedLabel}</p>
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm leading-6 text-foreground/62">{leadQueue.data.emptyReason}</p>
                    )}
                  </div>
                </AdminCard>

                <AdminCard
                  title="Consultation requests"
                  description="Requests that still need founder review or scheduling decisions."
                  status={consultationQueue.data.summary.pendingCount > 0 ? "warning" : "ok"}
                >
                  <div className="grid gap-(--space-4)">
                    <div className="flex flex-wrap items-end gap-(--space-3)">
                      <p className="text-3xl font-semibold tracking-tight text-foreground">
                        {consultationQueue.data.summary.pendingCount}
                      </p>
                      <p className="pb-1 text-sm text-foreground/62">pending review</p>
                    </div>

                    <div className="flex flex-wrap gap-(--space-2)">
                      <Link
                        href={buildLeadsHref({ tab: "consultations", status: "pending" })}
                        className="rounded-full border border-foreground/12 px-3 py-1 text-sm font-medium text-foreground/78 transition hover:bg-foreground/5"
                      >
                        Pending {consultationQueue.data.summary.pendingCount}
                      </Link>
                      <Link
                        href={buildLeadsHref({ tab: "consultations", status: "reviewed" })}
                        className="rounded-full border border-foreground/12 px-3 py-1 text-sm font-medium text-foreground/78 transition hover:bg-foreground/5"
                      >
                        Reviewed {consultationQueue.data.summary.reviewedCount}
                      </Link>
                    </div>

                    {consultationQueue.data.requests.length > 0 ? (
                      <ul className="grid gap-(--space-3)">
                        {consultationQueue.data.requests.slice(0, 3).map((request) => (
                          <li
                            key={request.id}
                            className="flex items-start justify-between gap-(--space-3) rounded-[1.15rem] border border-foreground/8 bg-background/55 px-(--space-4) py-(--space-3)"
                          >
                            <div className="min-w-0 grid gap-1">
                              <Link
                                href={getAdminLeadsDetailPath(request.id)}
                                className="truncate text-sm font-semibold text-foreground hover:underline"
                              >
                                {request.conversationTitle || "Consultation request"}
                              </Link>
                              <p className="text-xs text-foreground/62">{request.requestSummary}</p>
                              {request.founderNote ? (
                                <p className="text-xs text-foreground/50">{request.founderNote}</p>
                              ) : null}
                            </div>
                            <p className="shrink-0 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-foreground/45">
                              {request.status}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm leading-6 text-foreground/62">
                        {consultationQueue.data.emptyReason}
                      </p>
                    )}
                  </div>
                </AdminCard>

                <AdminCard
                  title="Training paths"
                  description="Draft and screening-stage recommendations that still need a founder decision."
                  status={trainingQueue.data.summary.followUpNowCount > 0 ? "warning" : "ok"}
                >
                  <div className="grid gap-(--space-4)">
                    <div className="flex flex-wrap items-end gap-(--space-3)">
                      <p className="text-3xl font-semibold tracking-tight text-foreground">
                        {trainingQueue.data.summary.followUpNowCount}
                      </p>
                      <p className="pb-1 text-sm text-foreground/62">items ready for follow-up now</p>
                    </div>

                    <div className="flex flex-wrap gap-(--space-2)">
                      <Link
                        href={buildLeadsHref({ tab: "training", status: "draft" })}
                        className="rounded-full border border-foreground/12 px-3 py-1 text-sm font-medium text-foreground/78 transition hover:bg-foreground/5"
                      >
                        Draft {trainingQueue.data.summary.draftCount}
                      </Link>
                      <Link
                        href={buildLeadsHref({ tab: "training", status: "recommended" })}
                        className="rounded-full border border-foreground/12 px-3 py-1 text-sm font-medium text-foreground/78 transition hover:bg-foreground/5"
                      >
                        Recommended {trainingQueue.data.summary.recommendedCount}
                      </Link>
                      <Link
                        href={buildLeadsHref({ tab: "training", status: "screening_requested" })}
                        className="rounded-full border border-foreground/12 px-3 py-1 text-sm font-medium text-foreground/78 transition hover:bg-foreground/5"
                      >
                        Screening requested {trainingQueue.data.summary.followUpNowCount}
                      </Link>
                    </div>

                    {trainingQueue.data.trainingPaths.length > 0 ? (
                      <ul className="grid gap-(--space-3)">
                        {trainingQueue.data.trainingPaths.slice(0, 3).map((trainingPath) => (
                          <li
                            key={trainingPath.id}
                            className="flex items-start justify-between gap-(--space-3) rounded-[1.15rem] border border-foreground/8 bg-background/55 px-(--space-4) py-(--space-3)"
                          >
                            <div className="min-w-0 grid gap-1">
                              <Link
                                href={getAdminLeadsDetailPath(trainingPath.id)}
                                className="truncate text-sm font-semibold text-foreground hover:underline"
                              >
                                {getTrainingPathLabel(trainingPath)}
                              </Link>
                              <p className="text-xs text-foreground/62">
                                {trainingPath.nextAction ?? "Needs founder review."}
                              </p>
                              <p className="text-xs text-foreground/50">
                                Path: {trainingPath.recommendedPath.replaceAll("_", " ")}
                              </p>
                            </div>
                            <p className="shrink-0 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-foreground/45">
                              {trainingPath.status}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm leading-6 text-foreground/62">{trainingQueue.data.emptyReason}</p>
                    )}
                  </div>
                </AdminCard>

                <AdminCard
                  title="Overdue follow-ups"
                  description="Anything past a lead or deal follow-up date is surfaced here."
                  status={overdueFollowUps.data.summary.totalOverdueCount > 0 ? "warning" : "ok"}
                >
                  <div className="grid gap-(--space-4)">
                    <div className="flex flex-wrap items-end gap-(--space-3)">
                      <p className="text-3xl font-semibold tracking-tight text-foreground">
                        {overdueFollowUps.data.summary.totalOverdueCount}
                      </p>
                      <p className="pb-1 text-sm text-foreground/62">records past their follow-up date</p>
                    </div>

                    <div className="flex flex-wrap gap-(--space-2)">
                      <Link
                        href={buildLeadsHref({ tab: "leads" })}
                        className="rounded-full border border-foreground/12 px-3 py-1 text-sm font-medium text-foreground/78 transition hover:bg-foreground/5"
                      >
                        Leads {overdueFollowUps.data.summary.overdueLeadCount}
                      </Link>
                      <Link
                        href={buildLeadsHref({ tab: "deals" })}
                        className="rounded-full border border-foreground/12 px-3 py-1 text-sm font-medium text-foreground/78 transition hover:bg-foreground/5"
                      >
                        Deals {overdueFollowUps.data.summary.overdueDealCount}
                      </Link>
                    </div>

                    {overdueFollowUps.data.summary.totalOverdueCount > 0 ? (
                      <div className="grid gap-(--space-3) sm:grid-cols-2">
                        {overdueFollowUps.data.oldestOverdueLead ? (
                          <Link
                            href={getAdminLeadsDetailPath(overdueFollowUps.data.oldestOverdueLead.id)}
                            className="rounded-[1.15rem] border border-foreground/8 bg-background/55 px-(--space-4) py-(--space-3) transition hover:bg-background/75"
                          >
                            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-foreground/45">
                              Oldest lead follow-up
                            </p>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                              {overdueFollowUps.data.oldestOverdueLead.name}
                            </p>
                            <p className="mt-1 text-xs text-foreground/50">
                              Due {formatDateLabel(overdueFollowUps.data.oldestOverdueLead.followUpAt) ?? "earlier"}
                            </p>
                          </Link>
                        ) : null}

                        {overdueFollowUps.data.oldestOverdueDeal ? (
                          <Link
                            href={getAdminLeadsDetailPath(overdueFollowUps.data.oldestOverdueDeal.id)}
                            className="rounded-[1.15rem] border border-foreground/8 bg-background/55 px-(--space-4) py-(--space-3) transition hover:bg-background/75"
                          >
                            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-foreground/45">
                              Oldest deal follow-up
                            </p>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                              {overdueFollowUps.data.oldestOverdueDeal.title}
                            </p>
                            <p className="mt-1 text-xs text-foreground/50">
                              Due {formatDateLabel(overdueFollowUps.data.oldestOverdueDeal.followUpAt) ?? "earlier"}
                            </p>
                          </Link>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm leading-6 text-foreground/62">
                        No lead or deal follow-ups are overdue right now.
                      </p>
                    )}
                  </div>
                </AdminCard>
              </div>
            );
          })()
        ) : null}
      </div>
    </AdminSection>
  );
}