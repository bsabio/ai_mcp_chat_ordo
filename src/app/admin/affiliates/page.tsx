import type { Metadata } from "next";
import Link from "next/link";

import { AdminBrowseFilters } from "@/components/admin/AdminBrowseFilters";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminSection } from "@/components/admin/AdminSection";
import { AdminStatusCounts } from "@/components/admin/AdminStatusCounts";
import { getAdminAffiliatesPath } from "@/lib/admin/admin-routes";
import {
  loadAdminAffiliatesWorkspace,
  type AdminAffiliatesView,
} from "@/lib/admin/affiliates/admin-affiliates";
import { updateReferralCreditStateAction } from "@/lib/admin/affiliates/admin-affiliates-actions";
import { requireAdminPageAccess } from "@/lib/journal/admin-journal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Affiliates",
  robots: { index: false, follow: false },
};

const VIEW_OPTIONS: Array<{ id: AdminAffiliatesView; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "pipeline", label: "Pipeline" },
  { id: "exceptions", label: "Exceptions" },
];

function buildAffiliatesHref(view: AdminAffiliatesView, kind?: string): string {
  const search = new URLSearchParams();
  if (view !== "overview") {
    search.set("view", view);
  }
  if (view === "exceptions" && kind && kind !== "all") {
    search.set("kind", kind);
  }
  const query = search.toString();
  return query ? `${getAdminAffiliatesPath()}?${query}` : getAdminAffiliatesPath();
}

export default async function AdminAffiliatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPageAccess();
  const workspace = await loadAdminAffiliatesWorkspace(await searchParams);
  const { filters, overview, leaderboard, pipeline, exceptions } = workspace;

  const summaryCards = [
    { label: "Enabled affiliates", count: overview.affiliatesEnabled, filterHref: buildAffiliatesHref("overview"), active: filters.view === "overview" },
    { label: "Qualified", count: overview.qualifiedOpportunities, filterHref: buildAffiliatesHref("pipeline"), active: filters.view === "pipeline" },
    { label: "Approved", count: overview.approvedCredits, filterHref: buildAffiliatesHref("exceptions"), active: filters.view === "exceptions" },
    { label: "Exceptions", count: overview.exceptions, filterHref: buildAffiliatesHref("exceptions"), active: filters.view === "exceptions" },
  ];

  const exceptionCards = [
    { label: "All", count: exceptions.total, filterHref: buildAffiliatesHref("exceptions", "all"), active: filters.kind === "all" },
    { label: "Invalid", count: exceptions.counts.invalid_referral_source, filterHref: buildAffiliatesHref("exceptions", "invalid_referral_source"), active: filters.kind === "invalid_referral_source" },
    { label: "Missing joins", count: exceptions.counts.missing_referral_join, filterHref: buildAffiliatesHref("exceptions", "missing_referral_join"), active: filters.kind === "missing_referral_join" },
    { label: "Disabled", count: exceptions.counts.disabled_referral_code, filterHref: buildAffiliatesHref("exceptions", "disabled_referral_code"), active: filters.kind === "disabled_referral_code" },
    { label: "Review backlog", count: exceptions.counts.credit_review_backlog, filterHref: buildAffiliatesHref("exceptions", "credit_review_backlog"), active: filters.kind === "credit_review_backlog" },
  ];

  return (
    <AdminSection
      title="Affiliate program"
      description="Global affiliate performance, unresolved attribution records, and manual-first credit review."
    >
      <div className="grid gap-(--space-section-default) px-(--space-inset-panel)">
        <AdminStatusCounts items={summaryCards} />

        <nav className="flex flex-wrap gap-(--space-2) border-b border-foreground/8 pb-(--space-2)" aria-label="Affiliate views">
          {VIEW_OPTIONS.map((view) => (
            <a
              key={view.id}
              href={buildAffiliatesHref(view.id, filters.kind)}
              className={`rounded-full border px-(--space-3) py-(--space-2) text-sm font-medium transition ${
                filters.view === view.id
                  ? "border-foreground/20 bg-foreground/8 text-foreground"
                  : "border-foreground/8 text-foreground/58 hover:border-foreground/16 hover:text-foreground/78"
              }`}
            >
              {view.label}
            </a>
          ))}
        </nav>

        {filters.view === "overview" ? (
          <div className="grid gap-(--space-section-default) lg:grid-cols-[1.2fr_0.8fr]">
            <AdminCard
              title="Program health"
              description={overview.narrative}
              status={overview.exceptions > 0 ? "warning" : "ok"}
            >
              <dl className="grid gap-(--space-2) text-sm text-foreground/62 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-(--space-cluster-default)"><dt>Active affiliates</dt><dd>{overview.activeAffiliates}</dd></div>
                <div className="flex items-center justify-between gap-(--space-cluster-default)"><dt>Introductions</dt><dd>{overview.introductions}</dd></div>
                <div className="flex items-center justify-between gap-(--space-cluster-default)"><dt>Started chats</dt><dd>{overview.startedChats}</dd></div>
                <div className="flex items-center justify-between gap-(--space-cluster-default)"><dt>Registered</dt><dd>{overview.registered}</dd></div>
                <div className="flex items-center justify-between gap-(--space-cluster-default)"><dt>Pending review</dt><dd>{overview.creditPendingReview}</dd></div>
                <div className="flex items-center justify-between gap-(--space-cluster-default)"><dt>Paid credits</dt><dd>{overview.paidCredits}</dd></div>
              </dl>
            </AdminCard>

            <AdminCard
              title="Exception pressure"
              description="Invalid sources, disabled codes, missing joins, and review backlog stay visible here instead of hiding in cleanup work."
              status={overview.exceptions > 0 ? "warning" : "neutral"}
            >
              <div className="grid gap-(--space-3)">
                <AdminStatusCounts items={exceptionCards.slice(1)} />
                <div className="flex flex-wrap gap-(--space-2)">
                  <a
                    href={buildAffiliatesHref("exceptions")}
                    className="rounded-full border border-foreground/12 px-(--space-3) py-(--space-2) text-sm font-medium text-foreground transition hover:bg-foreground/5"
                  >
                    Review exceptions
                  </a>
                  <Link
                    href="/api/admin/affiliates/export"
                    prefetch={false}
                    className="rounded-full border border-foreground/12 px-(--space-3) py-(--space-2) text-sm font-medium text-foreground transition hover:bg-foreground/5"
                  >
                    Download payout-ready CSV
                  </Link>
                </div>
                <p className="text-xs text-foreground/46">
                  Exported rows are review artifacts only. Payment execution remains manual.
                </p>
              </div>
            </AdminCard>

            <AdminCard
              title="Leaderboard highlights"
              description="Per-user drill-down stays in the user detail route so there is one durable admin record per affiliate."
              status="neutral"
            >
              {leaderboard.items.length === 0 ? (
                <p className="text-sm text-foreground/52">No affiliate activity has been attributed yet.</p>
              ) : (
                <ul className="grid gap-(--space-2) text-sm text-foreground/64">
                  {leaderboard.items.slice(0, 5).map((entry) => (
                    <li key={entry.userId} className="flex items-center justify-between gap-(--space-cluster-default)">
                      <div>
                        <Link href={entry.detailHref} className="font-medium text-foreground underline-offset-4 hover:underline">{entry.name}</Link>
                        <p className="text-xs text-foreground/46">{entry.qualifiedOpportunities} qualified · {entry.approved + entry.paid} approved or paid</p>
                      </div>
                      <span className="text-xs text-foreground/46">{entry.introductions} intros</span>
                    </li>
                  ))}
                </ul>
              )}
            </AdminCard>
          </div>
        ) : null}

        {filters.view === "leaderboard" ? (
          <AdminCard title="Affiliate leaderboard" description="Rankable affiliate performance stays global here while the detailed history stays in each user record.">
            {leaderboard.items.length === 0 ? (
              <AdminEmptyState heading="No affiliate activity yet" description="Once referral activity lands, the leaderboard will rank affiliates by qualified outcomes and credited progress." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Affiliate leaderboard">
                  <thead>
                    <tr className="border-b border-foreground/8 text-left text-xs uppercase tracking-[0.14em] text-foreground/46">
                      <th scope="col" className="px-(--space-3) py-(--space-2)">Affiliate</th>
                      <th scope="col" className="px-(--space-3) py-(--space-2)">Introductions</th>
                      <th scope="col" className="px-(--space-3) py-(--space-2)">Started</th>
                      <th scope="col" className="px-(--space-3) py-(--space-2)">Registered</th>
                      <th scope="col" className="px-(--space-3) py-(--space-2)">Qualified</th>
                      <th scope="col" className="px-(--space-3) py-(--space-2)">Pending</th>
                      <th scope="col" className="px-(--space-3) py-(--space-2)">Approved</th>
                      <th scope="col" className="px-(--space-3) py-(--space-2)">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.items.map((entry) => (
                      <tr key={entry.userId} className="border-b border-foreground/6 align-top text-foreground/68">
                        <th scope="row" className="px-(--space-3) py-(--space-3) text-left font-medium text-foreground">
                          <Link href={entry.detailHref} className="underline-offset-4 hover:underline">{entry.name}</Link>
                          <p className="mt-1 text-xs font-normal text-foreground/46">{entry.referralCode ?? "No code yet"}</p>
                        </th>
                        <td className="px-(--space-3) py-(--space-3)">{entry.introductions}</td>
                        <td className="px-(--space-3) py-(--space-3)">{entry.startedChats}</td>
                        <td className="px-(--space-3) py-(--space-3)">{entry.registered}</td>
                        <td className="px-(--space-3) py-(--space-3)">{entry.qualifiedOpportunities}</td>
                        <td className="px-(--space-3) py-(--space-3)">{entry.pendingReview}</td>
                        <td className="px-(--space-3) py-(--space-3)">{entry.approved}</td>
                        <td className="px-(--space-3) py-(--space-3)">{entry.paid}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>
        ) : null}

        {filters.view === "pipeline" ? (
          <div className="grid gap-(--space-section-default) lg:grid-cols-[1.1fr_0.9fr]">
            <AdminCard title="Program funnel" description="Global conversion from first validated introduction through qualified opportunity." status="neutral">
              <div className="grid gap-(--space-3)">
                {pipeline.stages.map((stage) => (
                  <div key={stage.stage} className="rounded-xl border border-foreground/8 px-(--space-3) py-(--space-3)">
                    <div className="flex items-center justify-between gap-(--space-cluster-default)">
                      <div>
                        <p className="text-sm font-medium text-foreground">{stage.label}</p>
                        <p className="text-xs text-foreground/46">{stage.conversionRate}% of introductions</p>
                      </div>
                      <p className="text-2xl font-semibold tracking-tight text-foreground">{stage.count}</p>
                    </div>
                  </div>
                ))}
              </div>
            </AdminCard>

            <AdminCard title="Downstream outcomes" description="Qualified opportunity roll-up by concrete downstream event." status="neutral">
              <ul className="grid gap-(--space-2) text-sm text-foreground/64">
                {pipeline.outcomes.map((outcome) => (
                  <li key={outcome.outcome} className="flex items-center justify-between gap-(--space-cluster-default) rounded-xl border border-foreground/8 px-(--space-3) py-(--space-3)">
                    <span>{outcome.label}</span>
                    <span className="font-medium text-foreground">{outcome.count}</span>
                  </li>
                ))}
              </ul>
            </AdminCard>
          </div>
        ) : null}

        {filters.view === "exceptions" ? (
          <div className="grid gap-(--space-section-default)">
            <AdminBrowseFilters
              fields={[
                {
                  name: "kind",
                  label: "Exception type",
                  type: "select",
                  options: [
                    { value: "invalid_referral_source", label: "Invalid referral source" },
                    { value: "missing_referral_join", label: "Missing referral join" },
                    { value: "disabled_referral_code", label: "Disabled referral code" },
                    { value: "credit_review_backlog", label: "Credit review backlog" },
                  ],
                },
              ]}
              values={{ kind: filters.kind === "all" ? "" : filters.kind }}
              hiddenFields={{ view: "exceptions" }}
            />

            <AdminStatusCounts items={exceptionCards} />

            <AdminCard title="Exception queue" description="Disabled-code traffic, unresolved joins, and credit review backlog stay visible in one admin surface." status={exceptions.total > 0 ? "warning" : "ok"}>
              {exceptions.items.length === 0 ? (
                <AdminEmptyState heading="No open exceptions" description="The current filter has no unresolved attribution or review backlog items." />
              ) : (
                <div className="grid gap-(--space-4)">
                  {exceptions.items.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-foreground/8 p-(--space-inset-panel)">
                      <div className="flex flex-wrap items-start justify-between gap-(--space-3)">
                        <div className="grid gap-(--space-2)">
                          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-foreground/42">{item.kind.replace(/_/g, " ")}</p>
                          <h3 className="text-base font-semibold tracking-tight text-foreground">{item.title}</h3>
                          <p className="max-w-3xl text-sm leading-6 text-foreground/58">{item.description}</p>
                        </div>
                        <div className="text-xs text-foreground/46">{item.occurredAt.slice(0, 10)}</div>
                      </div>

                      <div className="mt-(--space-4) flex flex-wrap items-center gap-(--space-2)">
                        <a href={item.href} className="rounded-full border border-foreground/12 px-(--space-3) py-(--space-2) text-xs font-medium text-foreground transition hover:bg-foreground/5">
                          Open drill-down
                        </a>
                        {item.referralCode ? (
                          <code className="rounded-md bg-background/80 px-(--space-2) py-(--space-1) text-xs text-foreground/64">{item.referralCode}</code>
                        ) : null}
                      </div>

                      {item.referralId ? (
                        <form action={updateReferralCreditStateAction} className="mt-(--space-4) grid gap-(--space-2) border-t border-foreground/8 pt-(--space-4) sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto]">
                          <input type="hidden" name="referralId" value={item.referralId} />
                          <label className="grid gap-(--space-1) text-xs font-medium text-foreground/52">
                            Credit state
                            <select name="creditStatus" defaultValue={item.creditStatus ?? "tracked"} className="h-10 rounded-xl border border-foreground/12 bg-surface px-(--space-3) text-sm text-foreground outline-none focus:border-foreground/24">
                              <option value="tracked">Tracked</option>
                              <option value="pending_review">Pending review</option>
                              <option value="approved">Approved</option>
                              <option value="paid">Paid</option>
                              <option value="void">Void</option>
                            </select>
                          </label>
                          <label className="grid gap-(--space-1) text-xs font-medium text-foreground/52">
                            Review note
                            <input name="reason" required placeholder="Why is this state changing?" className="h-10 rounded-xl border border-foreground/12 bg-surface px-(--space-3) text-sm text-foreground outline-none focus:border-foreground/24" />
                          </label>
                          <div className="flex items-end">
                            <button type="submit" className="rounded-full border border-foreground/12 px-(--space-3) py-(--space-2) text-sm font-medium text-foreground transition hover:bg-foreground/5">
                              Save review
                            </button>
                          </div>
                        </form>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </AdminCard>
          </div>
        ) : null}
      </div>
    </AdminSection>
  );
}