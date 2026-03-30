"use client";

import type { ColumnDef } from "@/components/admin/AdminDataTable";

interface ConversationRow {
  id: string;
  title: string | null;
  userId: string;
  status: string;
  conversationMode?: string | null;
  detectedNeedSummary: string | null;
  createdAt: string;
}

const COLUMNS: ColumnDef[] = [
  { key: "title", header: "Title" },
  { key: "userId", header: "User" },
  { key: "status", header: "Status" },
  { key: "createdAt", header: "Created" },
];

export function ConversationsTableClient({
  rows,
}: {
  rows: ConversationRow[];
  total: number;
  page: number;
  pageSize: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" aria-label="Conversations">
        <thead>
          <tr className="border-b border-foreground/8">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="px-3 py-2 text-left text-xs font-medium tracking-wide text-foreground/50"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length} className="py-8 text-center text-sm text-foreground/40">
                No conversations found.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b border-foreground/5 hover:bg-foreground/3">
                <th scope="row" className="px-3 py-2 text-left font-normal text-foreground/80">
                  <a
                    href={`/admin/conversations/${row.id}`}
                    className="text-foreground underline underline-offset-4"
                  >
                    {row.title ?? "(untitled)"}
                  </a>
                  {row.conversationMode === "human" && (
                    <span className="ml-2 inline-flex rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-700">HUMAN</span>
                  )}
                </th>
                <td className="px-3 py-2 text-foreground/80">{row.userId}</td>
                <td className="px-3 py-2 text-foreground/80">{row.status}</td>
                <td className="px-3 py-2 text-foreground/80">{row.createdAt}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
