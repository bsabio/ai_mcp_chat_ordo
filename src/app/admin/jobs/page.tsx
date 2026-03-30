import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/AdminSection";
import { AdminStatusCounts } from "@/components/admin/AdminStatusCounts";
import { AdminBrowseFilters } from "@/components/admin/AdminBrowseFilters";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { JobsTableClient } from "@/components/admin/JobsTableClient";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { JobsRefreshTrigger } from "@/components/admin/JobsRefreshTrigger";
import { requireAdminPageAccess } from "@/lib/journal/admin-journal";
import { loadAdminJobList } from "@/lib/admin/jobs/admin-jobs";
import { buildAdminPaginationParams } from "@/lib/admin/admin-pagination";
import { bulkCancelJobsAction, bulkRetryJobsAction } from "@/lib/admin/jobs/admin-jobs-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Jobs",
  robots: { index: false, follow: false },
};

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  canceled: "Canceled",
};

const STATUS_ORDER = ["queued", "running", "succeeded", "failed", "canceled"];

async function handleBulkAction(formData: FormData) {
  "use server";
  const action = formData.get("bulkAction");
  if (action === "cancel") {
    await bulkCancelJobsAction(formData);
  } else if (action === "retry") {
    await bulkRetryJobsAction(formData);
  }
}

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPageAccess();
  const raw = await searchParams;
  const pagination = buildAdminPaginationParams(raw, 50);
  const listView = await loadAdminJobList(raw);

  const toolFilterOptions = Object.keys(listView.toolNameCounts)
    .sort()
    .map((t) => ({ value: t, label: t }));

  const statusCounts = STATUS_ORDER.map((s) => ({
    label: STATUS_LABELS[s] ?? s,
    count: listView.statusCounts[s] ?? 0,
    active: listView.filters.status === s,
  }));

  return (
    <AdminSection
      title="Jobs"
      description="Background job queue. Browse, inspect, cancel, and retry deferred tool jobs."
    >
      <div className="grid gap-(--space-section-default) px-(--space-inset-panel)">
        <AdminBrowseFilters
          fields={[
            {
              name: "status",
              label: "Status",
              type: "select",
              options: STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] ?? s })),
            },
            {
              name: "toolName",
              label: "Tool",
              type: "select",
              options: toolFilterOptions,
            },
          ]}
          values={{
            status: listView.filters.status === "all" ? "" : listView.filters.status,
            toolName: listView.filters.toolName,
          }}
        />

        <AdminStatusCounts items={statusCounts} />

        {listView.jobs.length === 0 ? (
          <AdminEmptyState
            heading="No jobs found"
            description="No jobs match the current filters."
          />
        ) : (
          <JobsTableClient
            action={handleBulkAction}
            rows={listView.jobs as unknown as Record<string, unknown>[]}
          />
        )}
        <AdminPagination
          page={pagination.page}
          total={listView.total}
          pageSize={pagination.pageSize}
          baseHref="/admin/jobs"
        />
      </div>
      <JobsRefreshTrigger />
    </AdminSection>
  );
}
