import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/AdminSection";
import { AdminStatusCounts } from "@/components/admin/AdminStatusCounts";
import { AdminBrowseFilters } from "@/components/admin/AdminBrowseFilters";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { ConversationsTableClient } from "@/components/admin/ConversationsTableClient";
import { requireAdminPageAccess } from "@/lib/journal/admin-journal";
import { loadAdminConversations } from "@/lib/admin/conversations/admin-conversations";
import { buildAdminPaginationParams } from "@/lib/admin/admin-pagination";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Conversations",
  robots: { index: false, follow: false },
};

// ── Page ───────────────────────────────────────────────────────────────

export default async function AdminConversationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPageAccess();
  const raw = await searchParams;
  const pagination = buildAdminPaginationParams(raw);
  const data = await loadAdminConversations(raw);

  const statusCards = Object.entries(data.statusCounts).map(([key, value]) => ({
    label: key.charAt(0).toUpperCase() + key.slice(1),
    count: value,
    active: data.filters.status === key,
  }));

  const laneCards = Object.entries(data.laneCounts).map(([key, value]) => ({
    label: key,
    count: value,
    active: data.filters.lane === key,
  }));

  return (
    <AdminSection
      title="Conversations"
      description={`${data.total} conversation${data.total !== 1 ? "s" : ""} — read-only inspection and analytics.`}
    >
      <div className="grid gap-(--space-section-default) px-(--space-inset-panel)">
        {/* Status count cards */}
        <AdminStatusCounts items={statusCards} />

        {/* Lane count cards */}
        {laneCards.length > 0 && <AdminStatusCounts items={laneCards} />}

        {/* Filters */}
        <AdminBrowseFilters
          fields={[
            {
              name: "status",
              label: "Status",
              type: "select",
              options: [
                { value: "active", label: "Active" },
                { value: "archived", label: "Archived" },
              ],
            },
            {
              name: "lane",
              label: "Lane",
              type: "select",
              options: Object.keys(data.laneCounts).map((l) => ({ value: l, label: l })),
            },
            {
              name: "sessionSource",
              label: "Source",
              type: "search",
              placeholder: "Filter by source…",
            },
          ]}
          values={{
            status: data.filters.status || "",
            lane: data.filters.lane || "",
            sessionSource: data.filters.sessionSource || "",
          }}
        />

        {/* Data table or empty state */}
        {data.total === 0 ? (
          <AdminEmptyState
            heading="No conversations found"
            description="No conversations match the current filters."
          />
        ) : (
          <ConversationsTableClient
            rows={data.entries.map((e) => ({
              id: e.id,
              title: e.title,
              userId: e.userName ?? e.userId,
              status: e.status,
              conversationMode: e.conversationMode ?? null,
              detectedNeedSummary: null,
              createdAt: e.createdAt,
            }))}
            total={data.total}
            page={pagination.page}
            pageSize={pagination.pageSize}
          />
        )}
        <AdminPagination
          page={pagination.page}
          total={data.total}
          pageSize={pagination.pageSize}
          baseHref="/admin/conversations"
        />
      </div>
    </AdminSection>
  );
}
