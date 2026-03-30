import type { Metadata } from "next";
import Link from "next/link";

import { AdminCard } from "@/components/admin/AdminCard";
import { AdminSection } from "@/components/admin/AdminSection";
import {
  loadConsultationRequestQueueBlock,
  loadDealQueueBlock,
  loadLeadQueueBlock,
  loadOverdueFollowUpsBlock,
  loadRoutingReviewBlock,
  loadSystemHealthBlock,
  loadTrainingPathQueueBlock,
} from "@/lib/operator/loaders/admin-loaders";
import {
  loadAnonymousOpportunitiesBlock,
  loadFunnelRecommendationsBlock,
  loadRecurringPainThemesBlock,
} from "@/lib/operator/loaders/analytics-loaders";
import { requireAdminPageAccess } from "@/lib/journal/admin-journal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

function unavailableCard(title: string) {
  return (
    <AdminCard title={title} status="neutral">
      <p className="text-sm text-foreground/40">Data unavailable</p>
    </AdminCard>
  );
}

export default async function AdminDashboardPage() {
  const user = await requireAdminPageAccess();

  const results = await Promise.allSettled([
    loadSystemHealthBlock(user),
    loadLeadQueueBlock(user),
    loadConsultationRequestQueueBlock(user),
    loadDealQueueBlock(user),
    loadTrainingPathQueueBlock(user),
    loadOverdueFollowUpsBlock(user),
    loadRoutingReviewBlock(user),
    loadFunnelRecommendationsBlock(user),
    loadAnonymousOpportunitiesBlock(user),
    loadRecurringPainThemesBlock(user),
  ]);

  const [
    systemHealthResult,
    leadQueueResult,
    consultationResult,
    dealResult,
    trainingResult,
    overdueResult,
    routingResult,
    funnelResult,
    anonymousResult,
    themesResult,
  ] = results;

  const systemHealth = systemHealthResult.status === "fulfilled" ? systemHealthResult.value : null;
  const leadQueue = leadQueueResult.status === "fulfilled" ? leadQueueResult.value : null;
  const consultationQueue = consultationResult.status === "fulfilled" ? consultationResult.value : null;
  const dealQueue = dealResult.status === "fulfilled" ? dealResult.value : null;
  const trainingPaths = trainingResult.status === "fulfilled" ? trainingResult.value : null;
  const overdueFollowUps = overdueResult.status === "fulfilled" ? overdueResult.value : null;
  const routingReview = routingResult.status === "fulfilled" ? routingResult.value : null;
  const funnelRecs = funnelResult.status === "fulfilled" ? funnelResult.value : null;
  const anonymousOpps = anonymousResult.status === "fulfilled" ? anonymousResult.value : null;
  const painThemes = themesResult.status === "fulfilled" ? themesResult.value : null;

  return (
    <AdminSection
      title="Admin dashboard"
      description="Command center for health, queues, and next actions."
    >
      <div className="grid gap-(--space-section-default) lg:grid-cols-3 px-(--space-inset-panel)">
        {/* 1. System Health */}
        {systemHealth ? (
          <AdminCard
            title="System health"
            description={systemHealth.data.warnings.length === 0 ? "All clear." : systemHealth.data.warnings[0]}
            status={systemHealth.data.summary.overallStatus === "ok" ? "ok" : "warning"}
          >
            <div className="grid gap-(--space-3)">
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                {systemHealth.data.summary.overallStatus === "ok" ? "Healthy" : "Needs review"}
              </p>
              <div className="flex gap-(--space-2)">
                <Link href="/admin/system" className="rounded-lg bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/14 haptic-press">View details</Link>
              </div>
            </div>
          </AdminCard>
        ) : unavailableCard("System health")}

        {/* 2. Lead Queue */}
        {leadQueue ? (
          <AdminCard
            title="Lead queue"
            description={leadQueue.state === "empty" ? "No leads yet." : "Recent leads and follow-up priority."}
            status={leadQueue.data.summary.newLeadCount > 0 ? "warning" : "neutral"}
          >
            <div className="grid gap-(--space-3)">
              <p className="text-3xl font-semibold tracking-tight text-foreground">{leadQueue.data.summary.submittedLeadCount}</p>
              <dl className="grid gap-(--space-2) text-sm text-foreground/62">
                <div className="flex items-center justify-between gap-(--space-cluster-default)"><dt>New</dt><dd>{leadQueue.data.summary.newLeadCount}</dd></div>
                <div className="flex items-center justify-between gap-(--space-cluster-default)"><dt>Contacted</dt><dd>{leadQueue.data.summary.contactedLeadCount}</dd></div>
              </dl>
              <div className="flex gap-(--space-2)">
                <Link href="/admin/leads" className="rounded-lg bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/14 haptic-press">View all</Link>
              </div>
            </div>
          </AdminCard>
        ) : unavailableCard("Lead queue")}

        {/* 3. Consultation Queue */}
        {consultationQueue ? (
          <AdminCard
            title="Consultations"
            description={consultationQueue.state === "empty" ? "No pending consultations." : `${consultationQueue.data.summary.pendingCount} pending requests.`}
            status={consultationQueue.data.summary.pendingCount > 0 ? "warning" : "neutral"}
          >
            <div className="grid gap-(--space-3)">
              <p className="text-3xl font-semibold tracking-tight text-foreground">{consultationQueue.data.summary.pendingCount}</p>
              <div className="flex gap-(--space-2)">
                <Link href="/admin/leads" className="rounded-lg bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/14 haptic-press">View oldest pending</Link>
              </div>
            </div>
          </AdminCard>
        ) : unavailableCard("Consultations")}

        {/* 4. Deal Queue */}
        {dealQueue ? (
          <AdminCard
            title="Deals"
            description={dealQueue.state === "empty" ? "No active deals." : `${dealQueue.data.summary.draftCount + dealQueue.data.summary.qualifiedCount} active deals.`}
            status="neutral"
          >
            <div className="grid gap-(--space-3)">
              <p className="text-3xl font-semibold tracking-tight text-foreground">{dealQueue.data.summary.draftCount + dealQueue.data.summary.qualifiedCount}</p>
              <div className="flex gap-(--space-2)">
                <Link href="/admin/leads" className="rounded-lg bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/14 haptic-press">View deal</Link>
              </div>
            </div>
          </AdminCard>
        ) : unavailableCard("Deals")}

        {/* 5. Training Paths */}
        {trainingPaths ? (
          <AdminCard
            title="Training paths"
            description={trainingPaths.state === "empty" ? "No active paths." : `${trainingPaths.data.summary.draftCount} drafts, ${trainingPaths.data.summary.recommendedCount} recommended.`}
            status={trainingPaths.data.summary.followUpNowCount > 0 ? "warning" : "neutral"}
          >
            <div className="grid gap-(--space-3)">
              <p className="text-3xl font-semibold tracking-tight text-foreground">{trainingPaths.data.summary.draftCount + trainingPaths.data.summary.recommendedCount}</p>
              <div className="flex gap-(--space-2)">
                <Link href="/admin/leads" className="rounded-lg bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/14 haptic-press">View active path</Link>
              </div>
            </div>
          </AdminCard>
        ) : unavailableCard("Training paths")}

        {/* 6. Overdue Follow-ups */}
        {overdueFollowUps ? (
          <AdminCard
            title="Overdue follow-ups"
            description={overdueFollowUps.state === "empty" ? "No overdue items." : `${overdueFollowUps.data.summary.totalOverdueCount} overdue across leads and deals.`}
            status={overdueFollowUps.data.summary.totalOverdueCount > 0 ? "warning" : "ok"}
          >
            <div className="grid gap-(--space-3)">
              <p className="text-3xl font-semibold tracking-tight text-foreground">{overdueFollowUps.data.summary.totalOverdueCount}</p>
              <dl className="grid gap-(--space-2) text-sm text-foreground/62">
                <div className="flex items-center justify-between gap-(--space-cluster-default)"><dt>Leads</dt><dd>{overdueFollowUps.data.summary.overdueLeadCount}</dd></div>
                <div className="flex items-center justify-between gap-(--space-cluster-default)"><dt>Deals</dt><dd>{overdueFollowUps.data.summary.overdueDealCount}</dd></div>
              </dl>
              <div className="flex gap-(--space-2)">
                <Link href="/admin/leads" className="rounded-lg bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/14 haptic-press">Triage oldest</Link>
                <Link href="/admin/leads" className="rounded-lg border border-foreground/12 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/5 haptic-press">View all</Link>
              </div>
            </div>
          </AdminCard>
        ) : unavailableCard("Overdue follow-ups")}

        {/* 7. Routing Review */}
        {routingReview ? (
          <AdminCard
            title="Routing review"
            description={routingReview.state === "empty" ? "No conversations need review." : `${routingReview.data.summary.uncertainCount} uncertain conversations.`}
            status={routingReview.data.summary.uncertainCount > 0 ? "warning" : "neutral"}
          >
            <div className="grid gap-(--space-3)">
              <p className="text-3xl font-semibold tracking-tight text-foreground">{routingReview.data.summary.uncertainCount}</p>
              <div className="flex gap-(--space-2)">
                <Link href="/admin/conversations" className="rounded-lg bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/14 haptic-press">Review uncertain</Link>
              </div>
            </div>
          </AdminCard>
        ) : unavailableCard("Routing review")}

        {/* 8. Funnel Recommendations */}
        {funnelRecs ? (
          <AdminCard
            title="Funnel"
            description={funnelRecs.state === "empty" ? "No funnel data yet." : `${funnelRecs.data.recommendations.length} recommendations.`}
            status="neutral"
          >
            <div className="grid gap-(--space-3)">
              <p className="text-3xl font-semibold tracking-tight text-foreground">{funnelRecs.data.recommendations.length}</p>
              <div className="flex gap-(--space-2)">
                <Link href="/admin/leads" className="rounded-lg bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/14 haptic-press">View funnel</Link>
              </div>
            </div>
          </AdminCard>
        ) : unavailableCard("Funnel")}

        {/* 9. Anonymous Opportunities */}
        {anonymousOpps ? (
          <AdminCard
            title="Anonymous opportunities"
            description={anonymousOpps.state === "empty" ? "No high-value anonymous sessions." : `${anonymousOpps.data.opportunities.length} potential converts.`}
            status={anonymousOpps.data.opportunities.length > 0 ? "neutral" : "neutral"}
          >
            <div className="grid gap-(--space-3)">
              <p className="text-3xl font-semibold tracking-tight text-foreground">{anonymousOpps.data.opportunities.length}</p>
              <div className="flex gap-(--space-2)">
                <Link href="/admin/conversations" className="rounded-lg bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/14 haptic-press">View conversation</Link>
              </div>
            </div>
          </AdminCard>
        ) : unavailableCard("Anonymous opportunities")}

        {/* 10. Recurring Pain Themes */}
        {painThemes ? (
          <AdminCard
            title="Pain themes"
            description={painThemes.state === "empty" ? "No recurring themes detected." : `${painThemes.data.themes.length} themes identified.`}
            status="neutral"
          >
            <div className="grid gap-(--space-3)">
              <p className="text-3xl font-semibold tracking-tight text-foreground">{painThemes.data.themes.length}</p>
              <div className="flex gap-(--space-2)">
                <Link href="/admin/leads" className="rounded-lg bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/14 haptic-press">View leads</Link>
              </div>
            </div>
          </AdminCard>
        ) : unavailableCard("Pain themes")}
      </div>
    </AdminSection>
  );
}