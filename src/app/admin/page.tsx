import type { Metadata } from "next";
import Link from "next/link";

import { AdminCard } from "@/components/admin/AdminCard";
import { AdminSection } from "@/components/admin/AdminSection";
import {
  loadRoutingReviewBlock,
  loadSystemHealthBlock,
} from "@/lib/operator/loaders/admin-loaders";
import { loadOverdueFollowUpsBlock } from "@/lib/admin/pipeline/admin-pipeline-attention";
import {
  loadAnonymousOpportunitiesBlock,
  loadRecurringPainThemesBlock,
} from "@/lib/operator/loaders/analytics-loaders";
import {
  loadConsultationRequestQueueBlock,
  loadLeadQueueBlock,
  loadTrainingPathQueueBlock,
} from "@/lib/admin/leads/admin-leads-attention";
import {
  loadAdminJournalList,
  requireAdminPageAccess,
} from "@/lib/journal/admin-journal";
import {
  getAdminJournalAttributionPath,
  getAdminJournalListPath,
} from "@/lib/journal/admin-journal-routes";
import { loadAdminJobList } from "@/lib/admin/jobs/admin-jobs";
import { getAdminJobsListPath } from "@/lib/admin/jobs/admin-jobs-routes";
import { getAdminLeadsListPath } from "@/lib/admin/leads/admin-leads-routes";

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
    loadTrainingPathQueueBlock(user),
    loadOverdueFollowUpsBlock(user),
    loadRoutingReviewBlock(user),
    loadAnonymousOpportunitiesBlock(user),
    loadRecurringPainThemesBlock(user),
    loadAdminJournalList({}),
    loadAdminJobList({}, user.roles, { limit: 10, offset: 0 }),
  ]);

  const [
    systemHealthResult,
    leadQueueResult,
    consultationResult,
    trainingResult,
    overdueResult,
    routingResult,
    anonymousResult,
    themesResult,
    journalResult,
    jobsResult,
  ] = results;

  const systemHealth = systemHealthResult.status === "fulfilled" ? systemHealthResult.value : null;
  const leadQueue = leadQueueResult.status === "fulfilled" ? leadQueueResult.value : null;
  const consultationQueue = consultationResult.status === "fulfilled" ? consultationResult.value : null;
  const trainingPaths = trainingResult.status === "fulfilled" ? trainingResult.value : null;
  const overdueFollowUps = overdueResult.status === "fulfilled" ? overdueResult.value : null;
  const routingReview = routingResult.status === "fulfilled" ? routingResult.value : null;
  const anonymousOpps = anonymousResult.status === "fulfilled" ? anonymousResult.value : null;
  const painThemes = themesResult.status === "fulfilled" ? themesResult.value : null;
  const journalWorkspace = journalResult.status === "fulfilled" ? journalResult.value : null;
  const jobQueue = jobsResult.status === "fulfilled" ? jobsResult.value : null;

  const pipelineAttentionCount = (leadQueue?.data.summary.newLeadCount ?? 0)
    + (consultationQueue?.data.summary.pendingCount ?? 0)
    + (trainingPaths?.data.summary.followUpNowCount ?? 0)
    + (overdueFollowUps?.data.summary.totalOverdueCount ?? 0);
  const conversationAttentionCount = (routingReview?.data.summary.uncertainCount ?? 0)
    + (anonymousOpps?.data.opportunities.length ?? 0)
    + (painThemes?.data.themes.length ?? 0);
  const contentInProgressCount = journalWorkspace
    ? (journalWorkspace.counts.draft ?? 0) + (journalWorkspace.counts.review ?? 0)
    : 0;
  const activeJobCount = jobQueue
    ? (jobQueue.statusCounts.queued ?? 0) + (jobQueue.statusCounts.running ?? 0)
    : 0;
  const failedJobCount = jobQueue?.statusCounts.failed ?? 0;

  return (
    <AdminSection
      title="Admin dashboard"
      description="Cross-workspace overview for platform health, attention queues, content operations, and deferred-job pressure."
    >
      <div className="admin-route-stack lg:grid-cols-3" data-admin-dashboard="true">
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

        {leadQueue && consultationQueue && trainingPaths && overdueFollowUps ? (
          <AdminCard
            title="Pipeline attention"
            description={pipelineAttentionCount === 0
              ? "No active pipeline follow-ups."
              : `${pipelineAttentionCount} items need review across leads, consultations, training, and overdue follow-ups.`}
            status={pipelineAttentionCount > 0 ? "warning" : "ok"}
          >
            <div className="grid gap-(--space-3)">
              <p className="text-3xl font-semibold tracking-tight text-foreground">{pipelineAttentionCount}</p>
              <dl className="grid gap-(--space-2) text-sm text-foreground/62">
                <div className="flex items-center justify-between gap-(--space-cluster-default)"><dt>New leads</dt><dd>{leadQueue.data.summary.newLeadCount}</dd></div>
                <div className="flex items-center justify-between gap-(--space-cluster-default)"><dt>Pending consultations</dt><dd>{consultationQueue.data.summary.pendingCount}</dd></div>
                <div className="flex items-center justify-between gap-(--space-cluster-default)"><dt>Training follow-up</dt><dd>{trainingPaths.data.summary.followUpNowCount}</dd></div>
                <div className="flex items-center justify-between gap-(--space-cluster-default)"><dt>Overdue</dt><dd>{overdueFollowUps.data.summary.totalOverdueCount}</dd></div>
              </dl>
              <div className="flex gap-(--space-2)">
                <Link href={getAdminLeadsListPath()} className="rounded-lg bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/14 haptic-press">Open pipeline</Link>
              </div>
            </div>
          </AdminCard>
        ) : unavailableCard("Pipeline attention")}

        {routingReview && anonymousOpps && painThemes ? (
          <AdminCard
            title="Conversation attention"
            description={conversationAttentionCount === 0
              ? "No conversations need review."
              : `${conversationAttentionCount} conversation signals need a closer look across routing, anonymous opportunities, and recurring pain themes.`}
            status={conversationAttentionCount > 0 ? "warning" : "ok"}
          >
            <div className="grid gap-(--space-3)">
              <p className="text-3xl font-semibold tracking-tight text-foreground">{conversationAttentionCount}</p>
              <dl className="grid gap-(--space-2) text-sm text-foreground/62">
                <div className="flex items-center justify-between gap-(--space-cluster-default)"><dt>Routing review</dt><dd>{routingReview.data.summary.uncertainCount}</dd></div>
                <div className="flex items-center justify-between gap-(--space-cluster-default)"><dt>Anonymous opportunities</dt><dd>{anonymousOpps.data.opportunities.length}</dd></div>
                <div className="flex items-center justify-between gap-(--space-cluster-default)"><dt>Pain themes</dt><dd>{painThemes.data.themes.length}</dd></div>
              </dl>
              <div className="flex gap-(--space-2)">
                <Link href="/admin/conversations" className="rounded-lg bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/14 haptic-press">Open workspace</Link>
              </div>
            </div>
          </AdminCard>
        ) : unavailableCard("Conversation attention")}

        {journalWorkspace ? (
          <AdminCard
            title="Content operations"
            description={journalWorkspace.counts.all === 0
              ? "No journal posts yet."
              : contentInProgressCount > 0
                ? `${contentInProgressCount} journal posts are still in draft or review.`
                : "All journal posts are either approved or published."}
            status={journalWorkspace.counts.review > 0 ? "warning" : journalWorkspace.counts.all > 0 ? "ok" : "neutral"}
          >
            <div className="grid gap-(--space-3)">
              <p className="text-3xl font-semibold tracking-tight text-foreground">{journalWorkspace.counts.all}</p>
              <dl className="grid gap-(--space-2) text-sm text-foreground/62">
                <div className="flex items-center justify-between gap-(--space-cluster-default)"><dt>Draft</dt><dd>{journalWorkspace.counts.draft}</dd></div>
                <div className="flex items-center justify-between gap-(--space-cluster-default)"><dt>In review</dt><dd>{journalWorkspace.counts.review}</dd></div>
                <div className="flex items-center justify-between gap-(--space-cluster-default)"><dt>Published</dt><dd>{journalWorkspace.counts.published}</dd></div>
              </dl>
              <div className="flex gap-(--space-2)">
                <Link href={getAdminJournalListPath()} className="rounded-lg bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/14 haptic-press">Open inventory</Link>
                <Link href={getAdminJournalAttributionPath()} className="rounded-lg border border-foreground/12 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/5 haptic-press">View attribution</Link>
              </div>
            </div>
          </AdminCard>
        ) : unavailableCard("Content operations")}

        {jobQueue ? (
          <AdminCard
            title="Jobs health"
            description={jobQueue.total === 0
              ? "No global deferred jobs are queued right now."
              : failedJobCount > 0
                ? `${failedJobCount} jobs failed and need operator review.`
                : `${activeJobCount} jobs are currently queued or running.`}
            status={failedJobCount > 0 ? "warning" : jobQueue.total > 0 ? "ok" : "neutral"}
          >
            <div className="grid gap-(--space-3)">
              <p className="text-3xl font-semibold tracking-tight text-foreground">{jobQueue.total}</p>
              <dl className="grid gap-(--space-2) text-sm text-foreground/62">
                <div className="flex items-center justify-between gap-(--space-cluster-default)"><dt>Queued</dt><dd>{jobQueue.statusCounts.queued ?? 0}</dd></div>
                <div className="flex items-center justify-between gap-(--space-cluster-default)"><dt>Running</dt><dd>{jobQueue.statusCounts.running ?? 0}</dd></div>
                <div className="flex items-center justify-between gap-(--space-cluster-default)"><dt>Failed</dt><dd>{failedJobCount}</dd></div>
              </dl>
              <div className="flex gap-(--space-2)">
                <Link href={getAdminJobsListPath()} className="rounded-lg bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/14 haptic-press">Open queue</Link>
                <Link href={`${getAdminJobsListPath()}?status=failed`} className="rounded-lg border border-foreground/12 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/5 haptic-press">Review failed</Link>
              </div>
            </div>
          </AdminCard>
        ) : unavailableCard("Jobs health")}
      </div>
    </AdminSection>
  );
}