"use client";

import { AdminBulkTableWrapper } from "@/components/admin/AdminBulkTableWrapper";
import type { ColumnDef } from "@/components/admin/AdminDataTable";

interface JobRow {
  toolName: string;
  status: string;
  progressPercent: number | null;
  progressLabel: string | null;
  userName: string;
  attemptCount: number;
  createdAt: string;
  duration: string | null;
  detailHref: string;
}

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  canceled: "Canceled",
};

const columns: ColumnDef[] = [
  {
    key: "toolName",
    header: "Tool",
    render: (_value: unknown, row: Record<string, unknown>) => {
      const entry = row as unknown as JobRow;
      return (
        <a href={entry.detailHref} className="text-foreground underline underline-offset-4">
          {entry.toolName}
        </a>
      );
    },
  },
  {
    key: "status",
    header: "Status",
    render: (value: unknown) => {
      const status = String(value);
      const tone = status === "succeeded"
        ? "jobs-status-succeeded"
        : status === "failed" || status === "canceled"
          ? "jobs-status-failed"
          : status === "running"
            ? "jobs-status-running"
            : "jobs-count-pill";
      return (
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] ${tone}`}>
          {STATUS_LABELS[status] ?? status}
        </span>
      );
    },
  },
  {
    key: "progressPercent",
    header: "Progress",
    render: (value: unknown, row: Record<string, unknown>) => {
      const entry = row as unknown as JobRow;
      if (value == null) return "—";
      return (
        <span className="tabular-nums">
          {Number(value)}%{entry.progressLabel ? ` (${entry.progressLabel})` : ""}
        </span>
      );
    },
  },
  { key: "userName", header: "User" },
  {
    key: "attemptCount",
    header: "Attempts",
    render: (value: unknown) => <span className="tabular-nums">{String(value)}</span>,
  },
  {
    key: "createdAt",
    header: "Created",
    render: (value: unknown) => {
      const d = new Date(String(value));
      return Number.isNaN(d.getTime())
        ? String(value)
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
    },
  },
  {
    key: "duration",
    header: "Duration",
    render: (value: unknown) => value ? String(value) : "—",
  },
];

export function JobsTableClient({
  action,
  rows,
}: {
  action: (formData: FormData) => void;
  rows: Record<string, unknown>[];
}) {
  return (
    <AdminBulkTableWrapper
      action={action}
      columns={columns}
      rows={rows}
      emptyMessage="No jobs in the queue."
      bulkActions={[
        { label: "Cancel selected", action: "cancel", variant: "destructive" },
        { label: "Retry selected", action: "retry" },
      ]}
    />
  );
}
