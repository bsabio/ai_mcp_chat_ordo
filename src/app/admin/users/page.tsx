import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/AdminSection";
import { AdminStatusCounts } from "@/components/admin/AdminStatusCounts";
import { AdminBrowseFilters } from "@/components/admin/AdminBrowseFilters";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { UsersTableClient } from "@/components/admin/UsersTableClient";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { requireAdminPageAccess } from "@/lib/journal/admin-journal";
import { loadAdminUserList } from "@/lib/admin/users/admin-users";
import { buildAdminPaginationParams } from "@/lib/admin/admin-pagination";
import { ROLE_OPTIONS, bulkRoleChangeAction } from "@/lib/admin/users/admin-users-actions";

function buildUsersHref({ q, role }: { q?: string; role?: string }): string {
  const params = new URLSearchParams();

  if (q) {
    params.set("q", q);
  }

  if (role && role !== "all") {
    params.set("role", role);
  }

  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Users",
  robots: { index: false, follow: false },
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPageAccess();
  const raw = await searchParams;
  const pagination = buildAdminPaginationParams(raw);
  const listView = await loadAdminUserList(raw);

  const roleCounts = [
    {
      label: "All",
      count: listView.total,
      filterHref: buildUsersHref({ q: listView.filters.search }),
      active: listView.filters.role === "all",
    },
    ...ROLE_OPTIONS.map((r) => ({
      label: r.label,
      count: listView.counts[r.roleName] ?? 0,
      filterHref: buildUsersHref({ q: listView.filters.search, role: r.roleName }),
      active: listView.filters.role === r.roleName,
    })),
  ];

  return (
    <AdminSection
      title="Users"
      description="People and roles. Browse, inspect, and manage user accounts."
    >
      <div className="admin-route-stack">
        <AdminStatusCounts items={roleCounts} />

        <AdminBrowseFilters
          fields={[
            { name: "q", label: "Search", type: "search", placeholder: "Search name or email…" },
          ]}
          values={{ q: listView.filters.search }}
        />

        {listView.users.length === 0 ? (
          <AdminEmptyState
            heading="No users found"
            description="No users match the current filters. Share your referral link to get started."
          />
        ) : (
          <UsersTableClient
            rows={listView.users as unknown as Record<string, unknown>[]}
            emptyMessage="No users yet — share your referral link to get started."
            action={bulkRoleChangeAction}
          />
        )}
        <AdminPagination
          page={pagination.page}
          total={listView.total}
          pageSize={pagination.pageSize}
          baseHref="/admin/users"
        />
      </div>
    </AdminSection>
  );
}