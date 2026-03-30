"use client";

import { AdminDataTable, type ColumnDef } from "@/components/admin/AdminDataTable";
import { AdminBulkTableWrapper } from "@/components/admin/AdminBulkTableWrapper";

// ── Lead columns ───────────────────────────────────────────────────────

const LEAD_COLUMNS: ColumnDef[] = [
  {
    key: "name",
    header: "Name",
    render: (_v: unknown, row: Record<string, unknown>) => {
      const e = row as unknown as { name: string; detailHref: string; isOverdue: boolean };
      return (
        <span className="flex items-center gap-1">
          <a href={e.detailHref} className="text-foreground underline underline-offset-4">{e.name}</a>
          {e.isOverdue && <span className="rounded bg-amber-500/15 px-1 text-[0.6rem] font-bold text-amber-600" title="Overdue follow-up">OVERDUE</span>}
        </span>
      );
    },
  },
  { key: "email", header: "Email" },
  { key: "organization", header: "Org" },
  { key: "lane", header: "Lane" },
  {
    key: "triageLabel",
    header: "Triage",
    render: (value: unknown) => (
      <span className="inline-flex rounded-full border border-foreground/12 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em]">
        {String(value)}
      </span>
    ),
  },
  { key: "createdLabel", header: "Created" },
];

// ── Consultation columns ───────────────────────────────────────────────

const CONSULTATION_COLUMNS: ColumnDef[] = [
  { key: "lane", header: "Lane" },
  {
    key: "requestSummary",
    header: "Summary",
    render: (_v: unknown, row: Record<string, unknown>) => {
      const e = row as unknown as { requestSummary: string; detailHref: string };
      return <a href={e.detailHref} className="text-foreground underline underline-offset-4">{e.requestSummary}</a>;
    },
  },
  {
    key: "statusLabel",
    header: "Status",
    render: (value: unknown) => (
      <span className="inline-flex rounded-full border border-foreground/12 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em]">
        {String(value)}
      </span>
    ),
  },
  { key: "userName", header: "User" },
  { key: "createdLabel", header: "Created" },
];

// ── Deal columns ───────────────────────────────────────────────────────

const DEAL_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    header: "Title",
    render: (_v: unknown, row: Record<string, unknown>) => {
      const e = row as unknown as { title: string; detailHref: string; isOverdue: boolean };
      return (
        <span className="flex items-center gap-1">
          <a href={e.detailHref} className="text-foreground underline underline-offset-4">{e.title}</a>
          {e.isOverdue && <span className="rounded bg-amber-500/15 px-1 text-[0.6rem] font-bold text-amber-600" title="Overdue follow-up">OVERDUE</span>}
        </span>
      );
    },
  },
  { key: "organizationName", header: "Org" },
  { key: "serviceType", header: "Service type" },
  { key: "priceLabel", header: "Est. price" },
  {
    key: "statusLabel",
    header: "Status",
    render: (value: unknown) => (
      <span className="inline-flex rounded-full border border-foreground/12 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em]">
        {String(value)}
      </span>
    ),
  },
  { key: "createdLabel", header: "Created" },
];

// ── Training columns ───────────────────────────────────────────────────

const TRAINING_COLUMNS: ColumnDef[] = [
  {
    key: "role",
    header: "Role",
    render: (_v: unknown, row: Record<string, unknown>) => {
      const e = row as unknown as { role: string; detailHref: string };
      return <a href={e.detailHref} className="text-foreground underline underline-offset-4">{e.role}</a>;
    },
  },
  { key: "primaryGoal", header: "Primary goal" },
  { key: "pathLabel", header: "Recommended path" },
  {
    key: "statusLabel",
    header: "Status",
    render: (value: unknown) => (
      <span className="inline-flex rounded-full border border-foreground/12 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em]">
        {String(value)}
      </span>
    ),
  },
  { key: "createdLabel", header: "Created" },
];

// ── Column map ─────────────────────────────────────────────────────────

const COLUMN_MAP: Record<string, ColumnDef[]> = {
  leads: LEAD_COLUMNS,
  consultations: CONSULTATION_COLUMNS,
  deals: DEAL_COLUMNS,
  training: TRAINING_COLUMNS,
};

const EMPTY_MESSAGES: Record<string, string> = {
  leads: "No leads yet — the AI concierge captures them during conversations.",
  consultations: "No consultation requests yet.",
  deals: "No deals yet.",
  training: "No training paths yet.",
};

// ── Exported client component ──────────────────────────────────────────

export function LeadsTableClient({
  activeTab,
  rows,
  bulkTriageAction,
}: {
  activeTab: string;
  rows: Record<string, unknown>[];
  bulkTriageAction: (formData: FormData) => void;
}) {
  const columns = COLUMN_MAP[activeTab] ?? LEAD_COLUMNS;
  const emptyMessage = EMPTY_MESSAGES[activeTab] ?? "";

  if (activeTab === "leads") {
    return (
      <AdminBulkTableWrapper
        action={bulkTriageAction}
        columns={columns}
        rows={rows}
        emptyMessage={emptyMessage}
        bulkActions={[
          { label: "Mark Contacted", action: "contacted" },
          { label: "Mark Qualified", action: "qualified" },
          { label: "Defer", action: "deferred", variant: "destructive" },
        ]}
      />
    );
  }

  return (
    <AdminDataTable
      columns={columns}
      rows={rows}
      emptyMessage={emptyMessage}
    />
  );
}
