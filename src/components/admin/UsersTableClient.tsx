"use client";

import { AdminDataTable, type ColumnDef } from "@/components/admin/AdminDataTable";

interface UserRow {
  name: string;
  email: string;
  roleLabel: string;
  createdLabel: string;
  referralCode: string;
  detailHref: string;
}

const columns: ColumnDef[] = [
  {
    key: "name",
    header: "Name",
    render: (_value: unknown, row: Record<string, unknown>) => {
      const entry = row as unknown as UserRow;
      return (
        <a href={entry.detailHref} className="text-foreground underline underline-offset-4">
          {entry.name}
        </a>
      );
    },
  },
  { key: "email", header: "Email" },
  {
    key: "roleLabel",
    header: "Role",
    render: (value: unknown) => (
      <span className="inline-flex rounded-full border border-foreground/12 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em]">
        {String(value)}
      </span>
    ),
  },
  { key: "createdLabel", header: "Signed up" },
  { key: "referralCode", header: "Referral code" },
];

export function UsersTableClient({
  rows,
  emptyMessage,
}: {
  rows: Record<string, unknown>[];
  emptyMessage: string;
}) {
  return (
    <AdminDataTable
      columns={columns}
      rows={rows}
      emptyMessage={emptyMessage}
      selectable
    />
  );
}
