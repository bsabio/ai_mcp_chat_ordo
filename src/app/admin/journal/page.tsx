import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/AdminSection";
import { AdminBrowseFilters } from "@/components/admin/AdminBrowseFilters";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { loadAdminJournalList, requireAdminPageAccess } from "@/lib/journal/admin-journal";
import { buildAdminPaginationParams } from "@/lib/admin/admin-pagination";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Journal Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminJournalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPageAccess();
  const raw = await searchParams;
  const pagination = buildAdminPaginationParams(raw);
  const listView = await loadAdminJournalList(raw);

  const total = listView.counts.all ?? 0;

  return (
    <AdminSection
      title="Journal workspace"
      description="Inspect journal inventory, review workflow state, and manage preview and detail surfaces."
    >
      <div className="grid gap-(--space-section-default) px-(--space-inset-panel)">
        <AdminBrowseFilters
          fields={[
            { name: "q", label: "Search", type: "search", placeholder: "Search title or slug" },
            {
              name: "status",
              label: "Workflow",
              type: "select",
              options: [
                { value: "draft", label: "Draft" },
                { value: "review", label: "In review" },
                { value: "approved", label: "Approved" },
                { value: "published", label: "Published" },
              ],
            },
            {
              name: "section",
              label: "Section",
              type: "select",
              options: [
                { value: "essay", label: "Essay" },
                { value: "briefing", label: "Briefing" },
              ],
            },
          ]}
          values={{
            q: listView.filters.search,
            status: listView.filters.status === "all" ? "" : listView.filters.status,
            section: listView.filters.section === "all" ? "" : listView.filters.section,
          }}
        />

        <p className="text-xs text-foreground/50">
          <span>{listView.counts.all}</span> posts in workspace
        </p>

        {listView.filters.invalid.length > 0 && (
          <div role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-(--space-inset-default) py-(--space-inset-compact) text-sm text-amber-100">
            Invalid filters were supplied. Results are hidden until the filters are corrected.
          </div>
        )}

        {listView.posts.length === 0 ? (
          <AdminEmptyState
            heading="No journal posts found"
            description="No journal posts match the current filters."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-foreground/8 bg-background">
            <table
              className="min-w-full border-collapse text-left text-sm"
              aria-label="Journal posts"
            >
              <thead>
                <tr className="border-b border-foreground/10 text-xs uppercase tracking-[0.16em] text-foreground/46">
                  <th scope="col" className="px-(--space-inset-panel) py-(--space-4) font-semibold">Title</th>
                  <th scope="col" className="px-(--space-inset-panel) py-(--space-4) font-semibold">Slug</th>
                  <th scope="col" className="px-(--space-inset-panel) py-(--space-4) font-semibold">Section</th>
                  <th scope="col" className="px-(--space-inset-panel) py-(--space-4) font-semibold">Workflow</th>
                  <th scope="col" className="px-(--space-inset-panel) py-(--space-4) font-semibold">Updated</th>
                  <th scope="col" className="px-(--space-inset-panel) py-(--space-4) font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listView.posts.map((post) => (
                  <tr key={post.id} className="border-b border-foreground/8 last:border-b-0">
                    <td className="px-(--space-inset-panel) py-(--space-4) text-foreground">{post.title}</td>
                    <td className="px-(--space-inset-panel) py-(--space-4) text-foreground/62">{post.slug}</td>
                    <td className="px-(--space-inset-panel) py-(--space-4) text-foreground/62">{post.sectionLabel}</td>
                    <td className="px-(--space-inset-panel) py-(--space-4) text-foreground/62">{post.statusLabel}</td>
                    <td className="px-(--space-inset-panel) py-(--space-4) text-foreground/62">{post.updatedLabel}</td>
                    <td className="px-(--space-inset-panel) py-(--space-4)">
                      <div className="flex flex-wrap gap-(--space-cluster-default)">
                        <a href={post.previewHref} aria-label="Preview" className="text-foreground underline underline-offset-4">
                          Preview<span className="sr-only"> ({post.title})</span>
                        </a>
                        <a href={post.detailHref} aria-label="Manage" className="text-foreground underline underline-offset-4">
                          Manage<span className="sr-only"> ({post.title})</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <AdminPagination
          page={pagination.page}
          total={total}
          pageSize={pagination.pageSize}
          baseHref="/admin/journal"
        />
      </div>
    </AdminSection>
  );
}