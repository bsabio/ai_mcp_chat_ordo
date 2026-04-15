import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/AdminSection";
import { AdminStatusCounts } from "@/components/admin/AdminStatusCounts";
import { AdminBrowseFilters } from "@/components/admin/AdminBrowseFilters";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import {
  loadAdminJournalList,
  requireAdminPageAccess,
  requireJournalWorkspaceAccess,
} from "@/lib/journal/admin-journal";
import { buildAdminPaginationParams } from "@/lib/admin/admin-pagination";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Journal Admin",
  robots: {
    index: false,
    follow: false,
  },
};

function buildJournalListHref({
  q,
  status,
  section,
}: {
  q?: string;
  status?: string;
  section?: string;
}): string {
  const params = new URLSearchParams();

  if (q) {
    params.set("q", q);
  }

  if (status && status !== "all") {
    params.set("status", status);
  }

  if (section && section !== "all") {
    params.set("section", section);
  }

  const query = params.toString();
  return query ? `/admin/journal?${query}` : "/admin/journal";
}

export default async function AdminJournalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireJournalWorkspaceAccess();
  const raw = await searchParams;
  const pagination = buildAdminPaginationParams(raw);
  const listView = await loadAdminJournalList(raw);

  const total = listView.counts.all ?? 0;
  const workflowCards = [
    {
      label: "All",
      count: total,
      filterHref: buildJournalListHref({
        q: listView.filters.search || undefined,
        section: listView.filters.section === "all" ? undefined : listView.filters.section,
      }),
      active: listView.filters.status === "all",
    },
    {
      label: "Draft",
      count: listView.counts.draft ?? 0,
      filterHref: buildJournalListHref({
        q: listView.filters.search || undefined,
        status: "draft",
        section: listView.filters.section === "all" ? undefined : listView.filters.section,
      }),
      active: listView.filters.status === "draft",
    },
    {
      label: "In review",
      count: listView.counts.review ?? 0,
      filterHref: buildJournalListHref({
        q: listView.filters.search || undefined,
        status: "review",
        section: listView.filters.section === "all" ? undefined : listView.filters.section,
      }),
      active: listView.filters.status === "review",
    },
    {
      label: "Approved",
      count: listView.counts.approved ?? 0,
      filterHref: buildJournalListHref({
        q: listView.filters.search || undefined,
        status: "approved",
        section: listView.filters.section === "all" ? undefined : listView.filters.section,
      }),
      active: listView.filters.status === "approved",
    },
    {
      label: "Published",
      count: listView.counts.published ?? 0,
      filterHref: buildJournalListHref({
        q: listView.filters.search || undefined,
        status: "published",
        section: listView.filters.section === "all" ? undefined : listView.filters.section,
      }),
      active: listView.filters.status === "published",
    },
  ];

  return (
    <AdminSection
      title="Journal workspace"
      description="Inspect journal inventory, review workflow state, and manage preview and detail surfaces."
    >
      <div className="admin-route-stack">
        <AdminStatusCounts items={workflowCards} />

        <AdminBrowseFilters
          fields={[
            { name: "q", label: "Search", type: "search", placeholder: "Search title or slug" },
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
            section: listView.filters.section === "all" ? "" : listView.filters.section,
          }}
        />

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
          <>
            <div className="grid gap-(--space-3) sm:hidden" data-admin-journal-mobile-list="true">
              {listView.posts.map((post) => (
                <article
                  key={post.id}
                  className="admin-panel-surface rounded-2xl p-(--space-inset-default)"
                  data-admin-journal-card="true"
                >
                  <div className="grid gap-(--space-3)">
                    <div className="grid gap-(--space-2)">
                      <div className="flex flex-wrap items-center gap-(--space-2)">
                        <span className="inline-flex rounded-full border border-foreground/10 px-(--space-2) py-[0.18rem] text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-foreground/62">
                          {post.sectionLabel}
                        </span>
                        <span className="inline-flex rounded-full border border-foreground/10 px-(--space-2) py-[0.18rem] text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-foreground/62">
                          {post.statusLabel}
                        </span>
                      </div>
                      <div className="grid gap-(--space-1)">
                        <h2 className="text-base font-semibold tracking-tight text-foreground">{post.title}</h2>
                        <p className="text-sm text-foreground/52">{post.slug}</p>
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 gap-(--space-2)">
                      <div className="rounded-xl border border-foreground/8 bg-foreground/2.5 px-(--space-2) py-(--space-2)">
                        <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-foreground/45">Updated</dt>
                        <dd className="mt-1 text-sm text-foreground/78">{post.updatedLabel}</dd>
                      </div>
                      <div className="rounded-xl border border-foreground/8 bg-foreground/2.5 px-(--space-2) py-(--space-2)">
                        <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-foreground/45">Workflow</dt>
                        <dd className="mt-1 text-sm text-foreground/78">{post.statusLabel}</dd>
                      </div>
                    </dl>

                    <div className="flex flex-wrap gap-(--space-2)">
                      <a
                        href={post.previewHref}
                        aria-label="Preview"
                        className="rounded-full border border-foreground/12 px-(--space-3) py-(--space-2) text-sm font-medium text-foreground transition hover:bg-foreground/5"
                      >
                        Preview<span className="sr-only"> ({post.title})</span>
                      </a>
                      <a
                        href={post.detailHref}
                        aria-label="Manage"
                        className="rounded-full border border-foreground/12 px-(--space-3) py-(--space-2) text-sm font-medium text-foreground transition hover:bg-foreground/5"
                      >
                        Manage<span className="sr-only"> ({post.title})</span>
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="admin-scroll-shell hidden sm:block" data-admin-scroll-shell="journal-list">
            <table
              className="admin-scroll-table admin-scroll-table-wide min-w-full border-collapse text-left text-sm"
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
          </>
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