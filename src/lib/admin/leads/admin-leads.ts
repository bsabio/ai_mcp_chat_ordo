import { notFound } from "next/navigation";

import {
  getLeadRecordDataMapper,
  getConsultationRequestDataMapper,
  getDealRecordDataMapper,
  getTrainingPathRecordDataMapper,
} from "@/adapters/RepositoryFactory";
import type { LeadAdminRow } from "@/adapters/LeadRecordDataMapper";
import type { ConsultationAdminRow } from "@/adapters/ConsultationRequestDataMapper";
import type { DealAdminRow } from "@/adapters/DealRecordDataMapper";
import type { TrainingAdminRow } from "@/adapters/TrainingPathRecordDataMapper";
import type { LeadRecord } from "@/core/entities/lead-record";
import type { ConsultationRequest } from "@/core/entities/consultation-request";
import type { DealRecord } from "@/core/entities/deal-record";
import type { TrainingPathRecord } from "@/core/entities/training-path-record";
import { getAdminLeadsDetailPath } from "@/lib/admin/leads/admin-leads-routes";
import { getDb } from "@/lib/db";

// ── Tab types ──────────────────────────────────────────────────────────

export type PipelineTab = "leads" | "consultations" | "deals" | "training";

const VALID_TABS: readonly PipelineTab[] = ["leads", "consultations", "deals", "training"];

// ── Shared helpers ─────────────────────────────────────────────────────

function readSingleValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : "";
  return typeof value === "string" ? value : "";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

function formatPrice(value: number | null): string {
  if (value == null) return "—";
  return `$${value.toLocaleString()}`;
}

// ── Lead tab data ──────────────────────────────────────────────────────

export interface AdminLeadEntry {
  id: string;
  name: string;
  email: string;
  organization: string;
  lane: string;
  triageState: string;
  triageLabel: string;
  createdLabel: string;
  detailHref: string;
  isOverdue: boolean;
}

export interface AdminLeadsTabData {
  tab: "leads";
  statusFilter: string;
  statusCounts: Record<string, number>;
  entries: AdminLeadEntry[];
  total: number;
}

function mapLeadEntry(r: LeadAdminRow): AdminLeadEntry {
  const isOverdue = r.followUpAt !== null && new Date(r.followUpAt) < new Date();
  return {
    id: r.id,
    name: r.name ?? "—",
    email: r.email ?? "—",
    organization: r.organization ?? "—",
    lane: r.lane,
    triageState: r.triageState,
    triageLabel: r.triageState.charAt(0).toUpperCase() + r.triageState.slice(1),
    createdLabel: formatDate(r.createdAt),
    detailHref: getAdminLeadsDetailPath(r.id),
    isOverdue,
  };
}

async function loadLeadsTab(statusFilter: string): Promise<AdminLeadsTabData> {
  const mapper = getLeadRecordDataMapper();
  const filters = statusFilter && statusFilter !== "all"
    ? { triageState: statusFilter }
    : {};

  const [total, statusCounts, rows] = await Promise.all([
    mapper.countForAdmin(filters),
    mapper.countByTriageState(),
    mapper.listForAdmin(filters),
  ]);

  return {
    tab: "leads",
    statusFilter,
    statusCounts,
    entries: rows.map(mapLeadEntry),
    total,
  };
}

// ── Consultation tab data ──────────────────────────────────────────────

export interface AdminConsultationEntry {
  id: string;
  lane: string;
  requestSummary: string;
  status: string;
  statusLabel: string;
  userName: string;
  createdLabel: string;
  detailHref: string;
}

export interface AdminConsultationsTabData {
  tab: "consultations";
  statusFilter: string;
  statusCounts: Record<string, number>;
  entries: AdminConsultationEntry[];
  total: number;
}

function mapConsultationEntry(r: ConsultationAdminRow): AdminConsultationEntry {
  return {
    id: r.id,
    lane: r.lane,
    requestSummary: r.requestSummary.length > 80
      ? r.requestSummary.slice(0, 80) + "…"
      : r.requestSummary,
    status: r.status,
    statusLabel: r.status.charAt(0).toUpperCase() + r.status.slice(1).replace(/_/g, " "),
    userName: r.userName ?? r.userEmail ?? "—",
    createdLabel: formatDate(r.createdAt),
    detailHref: getAdminLeadsDetailPath(r.id),
  };
}

async function loadConsultationsTab(statusFilter: string): Promise<AdminConsultationsTabData> {
  const mapper = getConsultationRequestDataMapper();
  const filters = statusFilter && statusFilter !== "all"
    ? { status: statusFilter }
    : {};

  const [total, statusCounts, rows] = await Promise.all([
    mapper.countForAdmin(filters),
    mapper.countByStatus(),
    mapper.listForAdmin(filters),
  ]);

  return {
    tab: "consultations",
    statusFilter,
    statusCounts,
    entries: rows.map(mapConsultationEntry),
    total,
  };
}

// ── Deal tab data ──────────────────────────────────────────────────────

export interface AdminDealEntry {
  id: string;
  title: string;
  organizationName: string;
  serviceType: string;
  priceLabel: string;
  status: string;
  statusLabel: string;
  createdLabel: string;
  detailHref: string;
  isOverdue: boolean;
}

export interface AdminDealsTabData {
  tab: "deals";
  statusFilter: string;
  statusCounts: Record<string, number>;
  entries: AdminDealEntry[];
  total: number;
}

function mapDealEntry(r: DealAdminRow): AdminDealEntry {
  const isOverdue = r.followUpAt !== null && new Date(r.followUpAt) < new Date();
  return {
    id: r.id,
    title: r.title,
    organizationName: r.organizationName ?? "—",
    serviceType: r.recommendedServiceType,
    priceLabel: formatPrice(r.estimatedPrice),
    status: r.status,
    statusLabel: r.status.charAt(0).toUpperCase() + r.status.slice(1).replace(/_/g, " "),
    createdLabel: formatDate(r.createdAt),
    detailHref: getAdminLeadsDetailPath(r.id),
    isOverdue,
  };
}

async function loadDealsTab(statusFilter: string): Promise<AdminDealsTabData> {
  const mapper = getDealRecordDataMapper();
  const filters = statusFilter && statusFilter !== "all"
    ? { status: statusFilter }
    : {};

  const [total, statusCounts, rows] = await Promise.all([
    mapper.countForAdmin(filters),
    mapper.countByStatus(),
    mapper.listForAdmin(filters),
  ]);

  return {
    tab: "deals",
    statusFilter,
    statusCounts,
    entries: rows.map(mapDealEntry),
    total,
  };
}

// ── Training tab data ──────────────────────────────────────────────────

export interface AdminTrainingEntry {
  id: string;
  lane: string;
  role: string;
  primaryGoal: string;
  recommendedPath: string;
  pathLabel: string;
  status: string;
  statusLabel: string;
  createdLabel: string;
  detailHref: string;
}

export interface AdminTrainingTabData {
  tab: "training";
  statusFilter: string;
  statusCounts: Record<string, number>;
  entries: AdminTrainingEntry[];
  total: number;
}

function mapTrainingEntry(r: TrainingAdminRow): AdminTrainingEntry {
  return {
    id: r.id,
    lane: r.lane,
    role: r.currentRoleOrBackground ?? "—",
    primaryGoal: r.primaryGoal ?? "—",
    recommendedPath: r.recommendedPath,
    pathLabel: r.recommendedPath.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    status: r.status,
    statusLabel: r.status.charAt(0).toUpperCase() + r.status.slice(1).replace(/_/g, " "),
    createdLabel: formatDate(r.createdAt),
    detailHref: getAdminLeadsDetailPath(r.id),
  };
}

async function loadTrainingTab(statusFilter: string): Promise<AdminTrainingTabData> {
  const mapper = getTrainingPathRecordDataMapper();
  const filters = statusFilter && statusFilter !== "all"
    ? { status: statusFilter }
    : {};

  const [total, statusCounts, rows] = await Promise.all([
    mapper.countForAdmin(filters),
    mapper.countByStatus(),
    mapper.listForAdmin(filters),
  ]);

  return {
    tab: "training",
    statusFilter,
    statusCounts,
    entries: rows.map(mapTrainingEntry),
    total,
  };
}

// ── Pipeline view model ────────────────────────────────────────────────

export type AdminLeadsTabDataUnion =
  | AdminLeadsTabData
  | AdminConsultationsTabData
  | AdminDealsTabData
  | AdminTrainingTabData;

export interface AdminLeadsPipelineViewModel {
  activeTab: PipelineTab;
  pipelineCounts: {
    leads: number;
    consultations: number;
    deals: number;
    training: number;
  };
  tabData: AdminLeadsTabDataUnion;
}

export async function loadAdminLeadsPipeline(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<AdminLeadsPipelineViewModel> {
  const rawTab = readSingleValue(searchParams.tab).toLowerCase();
  const activeTab: PipelineTab = (VALID_TABS as readonly string[]).includes(rawTab)
    ? (rawTab as PipelineTab)
    : "leads";

  const statusFilter = readSingleValue(searchParams.status);

  // Pipeline totals (always load all four for the summary cards)
  const [leadTotal, consultationTotal, dealTotal, trainingTotal] = await Promise.all([
    getLeadRecordDataMapper().countForAdmin({}),
    getConsultationRequestDataMapper().countForAdmin({}),
    getDealRecordDataMapper().countForAdmin({}),
    getTrainingPathRecordDataMapper().countForAdmin({}),
  ]);

  // Load only the active tab's data
  let tabData: AdminLeadsTabDataUnion;
  switch (activeTab) {
    case "leads":
      tabData = await loadLeadsTab(statusFilter);
      break;
    case "consultations":
      tabData = await loadConsultationsTab(statusFilter);
      break;
    case "deals":
      tabData = await loadDealsTab(statusFilter);
      break;
    case "training":
      tabData = await loadTrainingTab(statusFilter);
      break;
  }

  return {
    activeTab,
    pipelineCounts: {
      leads: leadTotal,
      consultations: consultationTotal,
      deals: dealTotal,
      training: trainingTotal,
    },
    tabData,
  };
}

// ── Detail loaders ─────────────────────────────────────────────────────

export type PipelineEntityType = "lead" | "consultation" | "deal" | "training";

export interface AdminLeadDetailViewModel {
  entityType: "lead";
  record: LeadRecord;
  followUpAt: string | null;
  linkedConsultation: ConsultationRequest | null;
  linkedDeal: DealRecord | null;
}

export interface AdminConsultationDetailViewModel {
  entityType: "consultation";
  record: ConsultationRequest;
}

export interface AdminDealDetailViewModel {
  entityType: "deal";
  record: DealRecord;
  followUpAt: string | null;
}

export interface AdminTrainingDetailViewModel {
  entityType: "training";
  record: TrainingPathRecord;
}

export type AdminPipelineDetailViewModel =
  | AdminLeadDetailViewModel
  | AdminConsultationDetailViewModel
  | AdminDealDetailViewModel
  | AdminTrainingDetailViewModel;

export async function loadAdminPipelineDetail(id: string): Promise<AdminPipelineDetailViewModel> {
  function readFollowUpAt(table: string, recordId: string): string | null {
    // getDb() approved: raw SQL query — see data-access-canary.test.ts (Sprint 9)
    const row = getDb()
      .prepare(`SELECT follow_up_at FROM ${table} WHERE id = ?`)
      .get(recordId) as { follow_up_at: string | null } | undefined;
    return row?.follow_up_at ?? null;
  }

  // Look up the ID across all four tables by prefix
  if (id.startsWith("lead_")) {
    const mapper = getLeadRecordDataMapper();
    const record = await mapper.findById(id);
    if (!record) notFound();

    const [linkedConsultation, linkedDeal] = await Promise.all([
      getConsultationRequestDataMapper().findByConversationId(record.conversationId),
      getDealRecordDataMapper().findByLeadRecordId(record.id),
    ]);

    return { entityType: "lead", record, followUpAt: readFollowUpAt("lead_records", id), linkedConsultation, linkedDeal };
  }

  if (id.startsWith("cr_")) {
    const mapper = getConsultationRequestDataMapper();
    const record = await mapper.findById(id);
    if (!record) notFound();
    return { entityType: "consultation", record };
  }

  if (id.startsWith("deal_")) {
    const mapper = getDealRecordDataMapper();
    const record = await mapper.findById(id);
    if (!record) notFound();
    return { entityType: "deal", record, followUpAt: readFollowUpAt("deal_records", id) };
  }

  if (id.startsWith("training_")) {
    const mapper = getTrainingPathRecordDataMapper();
    const record = await mapper.findById(id);
    if (!record) notFound();
    return { entityType: "training", record };
  }

  // Unknown prefix — try all tables
  const leadMapper = getLeadRecordDataMapper();
  const lead = await leadMapper.findById(id);
  if (lead) {
    const [linkedConsultation, linkedDeal] = await Promise.all([
      getConsultationRequestDataMapper().findByConversationId(lead.conversationId),
      getDealRecordDataMapper().findByLeadRecordId(lead.id),
    ]);
    return { entityType: "lead", record: lead, followUpAt: readFollowUpAt("lead_records", id), linkedConsultation, linkedDeal };
  }

  const crMapper = getConsultationRequestDataMapper();
  const cr = await crMapper.findById(id);
  if (cr) return { entityType: "consultation", record: cr };

  const dealMapper = getDealRecordDataMapper();
  const deal = await dealMapper.findById(id);
  if (deal) return { entityType: "deal", record: deal, followUpAt: readFollowUpAt("deal_records", id) };

  const trainingMapper = getTrainingPathRecordDataMapper();
  const training = await trainingMapper.findById(id);
  if (training) return { entityType: "training", record: training };

  notFound();
}
