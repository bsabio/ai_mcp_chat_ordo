import type { Metadata } from "next";

import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminSection } from "@/components/admin/AdminSection";
import { loadJournalAttribution } from "@/lib/admin/attribution/admin-attribution";
import { requireAdminPageAccess } from "@/lib/journal/admin-journal";
import {
  getAdminJournalDetailPath,
} from "@/lib/journal/admin-journal-routes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Content Attribution — Admin",
  robots: { index: false, follow: false },
};

export default async function AttributionPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string; before?: string }>;
}) {
  await requireAdminPageAccess();
  const params = await searchParams;

  const now = new Date();
  const defaultAfter = new Date(now.getTime() - 90 * 86_400_000).toISOString().slice(0, 10);
  const afterDate = params.after ?? defaultAfter;
  const beforeDate = params.before;

  const entries = await loadJournalAttribution({
    afterDate,
    beforeDate,
  });

  const totals = entries.reduce(
    (acc, e) => ({
      conversations: acc.conversations + e.conversationsSourced,
      leads: acc.leads + e.leadsGenerated,
      deals: acc.deals + e.dealsGenerated,
      revenue: acc.revenue + e.estimatedRevenue,
    }),
    { conversations: 0, leads: 0, deals: 0, revenue: 0 },
  );

  return (
    <AdminSection
      title="Content Attribution"
      description="See how journal articles drive conversations, leads, and revenue through the AI concierge."
    >
      <div className="grid gap-(--space-stack-default)">
        {/* Date range filter */}
        <form method="get" className="flex flex-wrap items-end gap-(--space-cluster-default)">
          <label className="grid gap-(--space-1) text-sm text-foreground/66">
            <span className="font-medium text-foreground/72">After</span>
            <input
              type="date"
              name="after"
              defaultValue={afterDate}
              className="rounded-2xl border border-foreground/12 bg-foreground/[0.02] px-(--space-inset-default) py-(--space-inset-compact) text-foreground"
            />
          </label>
          <label className="grid gap-(--space-1) text-sm text-foreground/66">
            <span className="font-medium text-foreground/72">Before</span>
            <input
              type="date"
              name="before"
              defaultValue={beforeDate ?? ""}
              className="rounded-2xl border border-foreground/12 bg-foreground/[0.02] px-(--space-inset-default) py-(--space-inset-compact) text-foreground"
            />
          </label>
          <button
            type="submit"
            className="rounded-full border border-foreground/16 px-(--space-inset-default) py-(--space-2) text-sm font-medium text-foreground"
          >
            Filter
          </button>
        </form>

        {entries.length === 0 ? (
          <AdminEmptyState
            heading="No attribution data yet"
            description="Publish articles and share them — attribution data appears as visitors convert through the AI concierge."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-admin-attribution-table="true">
              <thead>
                <tr className="border-b border-foreground/10 text-left text-xs font-semibold uppercase tracking-wider text-foreground/50">
                  <th scope="col" className="px-(--space-inset-compact) py-(--space-2)">Article</th>
                  <th scope="col" className="px-(--space-inset-compact) py-(--space-2)">Published</th>
                  <th scope="col" className="px-(--space-inset-compact) py-(--space-2) text-right">Conversations</th>
                  <th scope="col" className="px-(--space-inset-compact) py-(--space-2) text-right">Leads</th>
                  <th scope="col" className="px-(--space-inset-compact) py-(--space-2) text-right">Deals</th>
                  <th scope="col" className="px-(--space-inset-compact) py-(--space-2) text-right">Est. Revenue</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.postId} className="border-b border-foreground/6">
                    <td className="px-(--space-inset-compact) py-(--space-2)">
                      <a href={getAdminJournalDetailPath(entry.postId)} className="font-medium text-foreground underline-offset-4 hover:underline">
                        {entry.postTitle}
                      </a>
                    </td>
                    <td className="px-(--space-inset-compact) py-(--space-2) text-foreground/60">
                      {entry.publishedAt?.slice(0, 10) ?? "—"}
                    </td>
                    <td className="px-(--space-inset-compact) py-(--space-2) text-right tabular-nums">{entry.conversationsSourced}</td>
                    <td className="px-(--space-inset-compact) py-(--space-2) text-right tabular-nums">{entry.leadsGenerated}</td>
                    <td className="px-(--space-inset-compact) py-(--space-2) text-right tabular-nums">{entry.dealsGenerated}</td>
                    <td className="px-(--space-inset-compact) py-(--space-2) text-right tabular-nums">
                      {entry.estimatedRevenue > 0 ? `$${entry.estimatedRevenue.toLocaleString()}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-foreground/16 font-semibold">
                  <td className="px-(--space-inset-compact) py-(--space-2)" colSpan={2}>Total</td>
                  <td className="px-(--space-inset-compact) py-(--space-2) text-right tabular-nums">{totals.conversations}</td>
                  <td className="px-(--space-inset-compact) py-(--space-2) text-right tabular-nums">{totals.leads}</td>
                  <td className="px-(--space-inset-compact) py-(--space-2) text-right tabular-nums">{totals.deals}</td>
                  <td className="px-(--space-inset-compact) py-(--space-2) text-right tabular-nums">
                    {totals.revenue > 0 ? `$${totals.revenue.toLocaleString()}` : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </AdminSection>
  );
}
