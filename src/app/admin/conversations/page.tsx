import type { Metadata } from "next";
import Link from "next/link";

import { AdminCard } from "@/components/admin/AdminCard";
import { AdminSection } from "@/components/admin/AdminSection";
import { AdminStatusCounts } from "@/components/admin/AdminStatusCounts";
import { AdminBrowseFilters } from "@/components/admin/AdminBrowseFilters";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { ConversationsTableClient } from "@/components/admin/ConversationsTableClient";
import { requireAdminPageAccess } from "@/lib/journal/admin-journal";
import { loadAdminConversations } from "@/lib/admin/conversations/admin-conversations";
import { buildAdminPaginationParams } from "@/lib/admin/admin-pagination";
import { bulkArchiveConversationsAction } from "@/lib/admin/conversations/admin-conversations-actions";
import { loadRoutingReviewBlock } from "@/lib/operator/loaders/admin-loaders";
import {
  loadAnonymousOpportunitiesBlock,
  loadRecurringPainThemesBlock,
} from "@/lib/operator/loaders/analytics-loaders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Conversations",
  robots: { index: false, follow: false },
};

type ConversationsWorkspaceView = "inbox" | "review" | "opportunities" | "themes";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function readSingleValue(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : value?.[0] ?? "";
}

function resolveWorkspaceView(
  raw: Record<string, string | string[] | undefined>,
): ConversationsWorkspaceView {
  const view = readSingleValue(raw.view).trim().toLowerCase();

  if (view === "review" || view === "opportunities" || view === "themes") {
    return view;
  }

  return "inbox";
}

function buildConversationsHref({
  view = "inbox",
  status,
  lane,
  sessionSource,
}: {
  view?: ConversationsWorkspaceView;
  status?: string;
  lane?: string;
  sessionSource?: string;
}): string {
  const params = new URLSearchParams();

  if (view !== "inbox") {
    params.set("view", view);
  }

  if (status && status !== "all") {
    params.set("status", status);
  }

  if (lane) {
    params.set("lane", lane);
  }

  if (sessionSource) {
    params.set("sessionSource", sessionSource);
  }

  const query = params.toString();
  return query ? `/admin/conversations?${query}` : "/admin/conversations";
}

function formatDateLabel(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : DATE_FORMATTER.format(date);
}

function formatLaneConfidence(value: number | null): string | null {
  if (typeof value !== "number") {
    return null;
  }

  return `${Math.round(value * 100)}% confidence`;
}

// ── Page ───────────────────────────────────────────────────────────────

export default async function AdminConversationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdminPageAccess();
  const raw = await searchParams;
  const activeView = resolveWorkspaceView(raw);
  const pagination = buildAdminPaginationParams(raw);
  const data = await loadAdminConversations(raw);
  const reviewData = activeView === "review" ? await loadRoutingReviewBlock(user) : null;
  const opportunitiesData = activeView === "opportunities"
    ? await loadAnonymousOpportunitiesBlock(user)
    : null;
  const themesData = activeView === "themes"
    ? await loadRecurringPainThemesBlock(user)
    : null;

  if (activeView === "review" && !reviewData) {
    throw new Error("Routing review data is unavailable.");
  }

  if (activeView === "opportunities" && !opportunitiesData) {
    throw new Error("Opportunity data is unavailable.");
  }

  if (activeView === "themes" && !themesData) {
    throw new Error("Theme data is unavailable.");
  }

  const review = reviewData?.data ?? null;
  const opportunities = opportunitiesData?.data ?? null;
  const themes = themesData?.data ?? null;

  const statusCards = [
    {
      label: "All",
      count: data.total,
      filterHref: buildConversationsHref({
        lane: data.filters.lane || undefined,
        sessionSource: data.filters.sessionSource || undefined,
      }),
      active: !data.filters.status || data.filters.status === "all",
    },
    ...Object.entries(data.statusCounts).map(([key, value]) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      count: value,
      filterHref: buildConversationsHref({
        status: key,
        lane: data.filters.lane || undefined,
        sessionSource: data.filters.sessionSource || undefined,
      }),
      active: data.filters.status === key,
    })),
  ];

  const laneCards = [
    {
      label: "All lanes",
      count: data.total,
      filterHref: buildConversationsHref({
        status: data.filters.status || undefined,
        sessionSource: data.filters.sessionSource || undefined,
      }),
      active: !data.filters.lane || data.filters.lane === "all",
    },
    ...Object.entries(data.laneCounts).map(([key, value]) => ({
      label: key,
      count: value,
      filterHref: buildConversationsHref({
        status: data.filters.status || undefined,
        lane: key,
        sessionSource: data.filters.sessionSource || undefined,
      }),
      active: data.filters.lane === key,
    })),
  ];

  const description = activeView === "review"
    ? "Routing changes, uncertain lane assignments, and follow-up-ready conversations."
    : activeView === "opportunities"
      ? "Anonymous conversations with high intent signals that deserve founder review."
      : activeView === "themes"
        ? "Recurring pain patterns pulled from recent conversations and linked back to examples."
        : `${data.total} conversation${data.total !== 1 ? "s" : ""} — read-only inspection and analytics.`;

  return (
    <AdminSection
      title="Conversations"
      description={description}
    >
      <div className="admin-route-stack">
        {activeView === "inbox" ? (
          <>
            <AdminStatusCounts items={statusCards} />

            {laneCards.length > 0 && <AdminStatusCounts items={laneCards} />}

            <AdminBrowseFilters
              fields={[
                {
                  name: "sessionSource",
                  label: "Source",
                  type: "search",
                  placeholder: "Filter by source…",
                },
              ]}
              values={{
                sessionSource: data.filters.sessionSource || "",
              }}
            />

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
                action={bulkArchiveConversationsAction}
              />
            )}

            <AdminPagination
              page={pagination.page}
              total={data.total}
              pageSize={pagination.pageSize}
              baseHref="/admin/conversations"
            />
          </>
        ) : activeView === "review" && review ? (
          (() => {
            return (
              <div className="grid gap-(--space-section-default) xl:grid-cols-3">
                <AdminCard
                  title="Recently changed"
                  description="Lane changes that need a quick human sanity check."
                  status={review.summary.recentlyChangedCount > 0 ? "warning" : "ok"}
                >
                  <div className="grid gap-(--space-4)">
                    <div className="flex flex-wrap items-end gap-(--space-3)">
                      <p className="text-3xl font-semibold tracking-tight text-foreground">
                        {review.summary.recentlyChangedCount}
                      </p>
                      <p className="pb-1 text-sm text-foreground/62">recent lane changes</p>
                    </div>

                    {review.recentlyChanged.length > 0 ? (
                      <ul className="grid gap-(--space-3)">
                        {review.recentlyChanged.map((conversation) => (
                          <li
                            key={conversation.conversationId}
                            className="rounded-[1.15rem] border border-foreground/8 bg-background/55 px-(--space-4) py-(--space-3)"
                          >
                            <Link
                              href={conversation.href}
                              className="text-sm font-semibold text-foreground hover:underline"
                            >
                              {conversation.title}
                            </Link>
                            <p className="mt-1 text-xs text-foreground/62">
                              {conversation.fromLane} → {conversation.toLane}
                            </p>
                            {conversation.recommendedNextStep ? (
                              <p className="mt-1 text-xs text-foreground/50">
                                {conversation.recommendedNextStep}
                              </p>
                            ) : null}
                            {formatDateLabel(conversation.changedAt) ? (
                              <p className="mt-1 text-xs text-foreground/45">
                                Changed {formatDateLabel(conversation.changedAt)}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm leading-6 text-foreground/62">
                        No recent routing changes currently need review.
                      </p>
                    )}
                  </div>
                </AdminCard>

                <AdminCard
                  title="Uncertain routes"
                  description="Conversations with weak lane confidence or ambiguous next steps."
                  status={review.summary.uncertainCount > 0 ? "warning" : "ok"}
                >
                  <div className="grid gap-(--space-4)">
                    <div className="flex flex-wrap items-end gap-(--space-3)">
                      <p className="text-3xl font-semibold tracking-tight text-foreground">
                        {review.summary.uncertainCount}
                      </p>
                      <p className="pb-1 text-sm text-foreground/62">conversations needing lane review</p>
                    </div>

                    {review.uncertainConversations.length > 0 ? (
                      <ul className="grid gap-(--space-3)">
                        {review.uncertainConversations.map((conversation) => (
                          <li
                            key={conversation.conversationId}
                            className="rounded-[1.15rem] border border-foreground/8 bg-background/55 px-(--space-4) py-(--space-3)"
                          >
                            <Link
                              href={conversation.href}
                              className="text-sm font-semibold text-foreground hover:underline"
                            >
                              {conversation.title}
                            </Link>
                            <p className="mt-1 text-xs text-foreground/62">
                              {conversation.lane}
                              {formatLaneConfidence(conversation.laneConfidence)
                                ? ` • ${formatLaneConfidence(conversation.laneConfidence)}`
                                : " • Confidence unavailable"}
                            </p>
                            <p className="mt-1 text-xs text-foreground/50">
                              {conversation.recommendedNextStep
                                ?? conversation.detectedNeedSummary
                                ?? "Needs manual review."}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm leading-6 text-foreground/62">
                        No uncertain routing decisions are waiting right now.
                      </p>
                    )}
                  </div>
                </AdminCard>

                <AdminCard
                  title="Follow-up ready"
                  description="Conversations that have enough context for a concrete next step."
                  status={review.summary.followUpReadyCount > 0 ? "warning" : "ok"}
                >
                  <div className="grid gap-(--space-4)">
                    <div className="flex flex-wrap items-end gap-(--space-3)">
                      <p className="text-3xl font-semibold tracking-tight text-foreground">
                        {review.summary.followUpReadyCount}
                      </p>
                      <p className="pb-1 text-sm text-foreground/62">ready for human follow-up</p>
                    </div>

                    {review.followUpReady.length > 0 ? (
                      <ul className="grid gap-(--space-3)">
                        {review.followUpReady.map((conversation) => (
                          <li
                            key={conversation.conversationId}
                            className="rounded-[1.15rem] border border-foreground/8 bg-background/55 px-(--space-4) py-(--space-3)"
                          >
                            <Link
                              href={conversation.href}
                              className="text-sm font-semibold text-foreground hover:underline"
                            >
                              {conversation.title}
                            </Link>
                            <p className="mt-1 text-xs text-foreground/62">{conversation.lane}</p>
                            <p className="mt-1 text-xs text-foreground/50">
                              {conversation.recommendedNextStep
                                ?? conversation.detectedNeedSummary
                                ?? "Conversation is ready for a founder decision."}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm leading-6 text-foreground/62">
                        No conversations are currently flagged as follow-up ready.
                      </p>
                    )}
                  </div>
                </AdminCard>
              </div>
            );
          })()
        ) : activeView === "opportunities" && opportunities ? (
          <AdminCard
            title="Anonymous opportunities"
            description="High-intent anonymous conversations that are likely worth founder outreach."
            status={opportunities.summary.opportunityCount > 0 ? "warning" : "ok"}
          >
            <div className="grid gap-(--space-4)">
              <div className="flex flex-wrap items-end gap-(--space-3)">
                <p className="text-3xl font-semibold tracking-tight text-foreground">
                  {opportunities.summary.opportunityCount}
                </p>
                <p className="pb-1 text-sm text-foreground/62">anonymous conversations above the review threshold</p>
              </div>

              <div className="flex flex-wrap gap-(--space-2)">
                <span className="rounded-full border border-foreground/12 px-3 py-1 text-sm font-medium text-foreground/72">
                  Organizations {opportunities.summary.organizationCount}
                </span>
                <span className="rounded-full border border-foreground/12 px-3 py-1 text-sm font-medium text-foreground/72">
                  Individuals {opportunities.summary.individualCount}
                </span>
                <span className="rounded-full border border-foreground/12 px-3 py-1 text-sm font-medium text-foreground/72">
                  Development {opportunities.summary.developmentCount}
                </span>
              </div>

              {opportunities.opportunities.length > 0 ? (
                <ul className="grid gap-(--space-3)">
                  {opportunities.opportunities.map((opportunity) => (
                    <li
                      key={opportunity.conversationId}
                      className="rounded-[1.15rem] border border-foreground/8 bg-background/55 px-(--space-4) py-(--space-3)"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-(--space-3)">
                        <div className="min-w-0 grid gap-1">
                          <Link
                            href={opportunity.href}
                            className="truncate text-sm font-semibold text-foreground hover:underline"
                          >
                            {opportunity.title}
                          </Link>
                          <p className="text-xs text-foreground/62">
                            {opportunity.lane} • {opportunity.messageCount} messages
                          </p>
                          <p className="text-xs text-foreground/50">
                            {opportunity.recommendedNextStep
                              ?? opportunity.detectedNeedSummary
                              ?? opportunity.likelyFrictionReason
                              ?? "Needs founder review."}
                          </p>
                        </div>
                        <p className="shrink-0 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-foreground/45">
                          Score {opportunity.opportunityScore}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-6 text-foreground/62">
                  {opportunities.emptyReason}
                </p>
              )}
            </div>
          </AdminCard>
        ) : themes ? (
          <AdminCard
            title="Recurring pain themes"
            description="Repeated needs and friction patterns gathered from recent conversation summaries."
            status={themes.summary.recurringThemeCount > 0 ? "warning" : "ok"}
          >
            <div className="grid gap-(--space-4)">
              <div className="flex flex-wrap items-end gap-(--space-3)">
                <p className="text-3xl font-semibold tracking-tight text-foreground">
                  {themes.summary.recurringThemeCount}
                </p>
                <p className="pb-1 text-sm text-foreground/62">
                  recurring themes across {themes.summary.analyzedSummaryCount} analyzed summaries
                </p>
              </div>

              {themes.themes.length > 0 ? (
                <ul className="grid gap-(--space-3)">
                  {themes.themes.map((theme) => (
                    <li
                      key={theme.id}
                      className="rounded-[1.15rem] border border-foreground/8 bg-background/55 px-(--space-4) py-(--space-3)"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-(--space-3)">
                        <div className="min-w-0 grid gap-1">
                          <p className="text-sm font-semibold text-foreground">{theme.label}</p>
                          <p className="text-xs text-foreground/62">{theme.exampleSummary}</p>
                          <div className="flex flex-wrap gap-(--space-2)">
                            {theme.sampleConversations.slice(0, 2).map((conversation) => (
                              <Link
                                key={conversation.conversationId}
                                href={conversation.href}
                                className="text-xs font-medium text-foreground/72 underline decoration-foreground/20 underline-offset-4 transition hover:text-foreground"
                              >
                                {conversation.title}
                              </Link>
                            ))}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-foreground/45">
                            {theme.occurrenceCount} mentions
                          </p>
                          {formatDateLabel(theme.latestSeenAt) ? (
                            <p className="mt-1 text-xs text-foreground/45">
                              Last seen {formatDateLabel(theme.latestSeenAt)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-6 text-foreground/62">{themes.emptyReason}</p>
              )}
            </div>
          </AdminCard>
        ) : null}
      </div>
    </AdminSection>
  );
}
