import { notFound } from "next/navigation";

import type { JobStatus } from "@/core/entities/job";
import { getJobQueueDataMapper } from "@/adapters/RepositoryFactory";
import { getAdminJobsDetailPath } from "@/lib/admin/jobs/admin-jobs-routes";

// ── Filters ────────────────────────────────────────────────────────────

const VALID_STATUSES: readonly string[] = ["queued", "running", "succeeded", "failed", "canceled"];

function readSingleValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : "";
  return typeof value === "string" ? value : "";
}

export interface AdminJobListFilters {
  status: JobStatus | "all";
  toolName: string;
}

export function parseAdminJobFilters(
  rawSearchParams: Record<string, string | string[] | undefined>,
): AdminJobListFilters {
  const rawStatus = readSingleValue(rawSearchParams.status).trim().toLowerCase();
  const toolName = readSingleValue(rawSearchParams.toolName).trim();

  let status: JobStatus | "all" = "all";
  if (rawStatus.length > 0 && rawStatus !== "all") {
    if (VALID_STATUSES.includes(rawStatus)) {
      status = rawStatus as JobStatus;
    }
  }

  return { status, toolName };
}

// ── List view model ────────────────────────────────────────────────────

export interface AdminJobListEntry {
  id: string;
  toolName: string;
  status: string;
  priority: number;
  userName: string | null;
  conversationTitle: string | null;
  progressPercent: number | null;
  progressLabel: string | null;
  attemptCount: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  detailHref: string;
  duration: string | null;
}

export interface AdminJobListViewModel {
  filters: AdminJobListFilters;
  statusCounts: Record<string, number>;
  toolNameCounts: Record<string, number>;
  total: number;
  jobs: AdminJobListEntry[];
}

function formatDuration(startedAt: string | null, completedAt: string | null, status: string): string | null {
  if (!startedAt) return null;
  if (status === "running") return "running";
  if (!completedAt) return null;
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function toListEntry(job: {
  id: string;
  toolName: string;
  status: string;
  priority: number;
  userId: string | null;
  progressPercent: number | null;
  progressLabel: string | null;
  attemptCount: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  conversationId: string;
}): AdminJobListEntry {
  return {
    id: job.id,
    toolName: job.toolName,
    status: job.status,
    priority: job.priority,
    userName: job.userId,
    conversationTitle: null,
    progressPercent: job.progressPercent,
    progressLabel: job.progressLabel,
    attemptCount: job.attemptCount,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    detailHref: getAdminJobsDetailPath(job.id),
    duration: formatDuration(job.startedAt, job.completedAt, job.status),
  };
}

export async function loadAdminJobList(
  rawSearchParams: Record<string, string | string[] | undefined>,
): Promise<AdminJobListViewModel> {
  const filters = parseAdminJobFilters(rawSearchParams);
  const mapper = getJobQueueDataMapper();

  const queryFilters = {
    ...(filters.status !== "all" ? { status: filters.status } : {}),
    ...(filters.toolName ? { toolName: filters.toolName } : {}),
  };

  const [total, statusCounts, toolNameCounts, jobs] = await Promise.all([
    mapper.countForAdmin(queryFilters),
    mapper.countByStatus(),
    mapper.countByToolName(),
    mapper.listForAdmin(queryFilters),
  ]);

  return {
    filters,
    statusCounts,
    toolNameCounts,
    total,
    jobs: jobs.map(toListEntry),
  };
}

// ── Detail view model ──────────────────────────────────────────────────

export interface AdminJobDetailViewModel {
  job: AdminJobListEntry & {
    requestPayload: unknown;
    resultPayload: unknown | null;
    errorMessage: string | null;
    dedupeKey: string | null;
    initiatorType: string;
    claimedBy: string | null;
    leaseExpiresAt: string | null;
  };
  events: Array<{
    id: string;
    eventType: string;
    eventPayload: unknown;
    createdAt: string;
  }>;
}

export async function loadAdminJobDetail(
  jobId: string,
): Promise<AdminJobDetailViewModel> {
  const mapper = getJobQueueDataMapper();
  const job = await mapper.findJobById(jobId);

  if (!job) {
    notFound();
  }

  const events = await mapper.listEventsForJob(jobId);

  return {
    job: {
      ...toListEntry(job),
      requestPayload: job.requestPayload,
      resultPayload: job.resultPayload,
      errorMessage: job.errorMessage,
      dedupeKey: job.dedupeKey,
      initiatorType: job.initiatorType,
      claimedBy: job.claimedBy,
      leaseExpiresAt: job.leaseExpiresAt,
    },
    events: events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      eventPayload: e.payload,
      createdAt: e.createdAt,
    })),
  };
}
