import { revalidatePath } from "next/cache";

import { readRequiredText } from "@/lib/admin/shared/admin-form-parsers";
import { withAdminAction } from "@/lib/admin/shared/admin-action-helpers";
import { getJobQueueDataMapper } from "@/adapters/RepositoryFactory";
import type { JobStatus } from "@/core/entities/job";

// ── Single actions ─────────────────────────────────────────────────────

export const cancelJobAction = withAdminAction(async (_admin, formData) => {
  const id = readRequiredText(formData, "id");
  const mapper = getJobQueueDataMapper();
  const now = new Date().toISOString();
  await mapper.cancelJob(id, now);
  revalidatePath("/admin/jobs");
});

export const retryJobAction = withAdminAction(async (_admin, formData) => {
  const id = readRequiredText(formData, "id");
  const mapper = getJobQueueDataMapper();
  const job = await mapper.findJobById(id);
  if (!job) throw new Error(`Job not found: ${id}`);

  const retriableStatuses: JobStatus[] = ["failed", "canceled"];
  if (!retriableStatuses.includes(job.status)) {
    throw new Error(`Job ${id} cannot be retried from status: ${job.status}`);
  }

  await mapper.createJob({
    conversationId: job.conversationId,
    userId: job.userId ?? undefined,
    toolName: job.toolName,
    priority: job.priority,
    dedupeKey: job.dedupeKey ?? undefined,
    initiatorType: job.initiatorType,
    requestPayload: job.requestPayload as Record<string, unknown>,
  });
  revalidatePath("/admin/jobs");
});

// ── Bulk actions ───────────────────────────────────────────────────────

const CANCELABLE_STATUSES = new Set<JobStatus>(["queued", "running"]);
const RETRIABLE_STATUSES = new Set<JobStatus>(["failed", "canceled"]);

export const bulkCancelJobsAction = withAdminAction(async (_admin, formData) => {
  const idsRaw = readRequiredText(formData, "ids");
  const ids = idsRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const mapper = getJobQueueDataMapper();
  const now = new Date().toISOString();

  for (const id of ids) {
    const job = await mapper.findJobById(id);
    if (job && CANCELABLE_STATUSES.has(job.status)) {
      await mapper.cancelJob(id, now);
    }
  }
  revalidatePath("/admin/jobs");
});

export const bulkRetryJobsAction = withAdminAction(async (_admin, formData) => {
  const idsRaw = readRequiredText(formData, "ids");
  const ids = idsRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const mapper = getJobQueueDataMapper();

  for (const id of ids) {
    const job = await mapper.findJobById(id);
    if (job && RETRIABLE_STATUSES.has(job.status)) {
      await mapper.createJob({
        conversationId: job.conversationId,
        userId: job.userId ?? undefined,
        toolName: job.toolName,
        priority: job.priority,
        dedupeKey: job.dedupeKey ?? undefined,
        initiatorType: job.initiatorType,
        requestPayload: job.requestPayload as Record<string, unknown>,
      });
    }
  }
  revalidatePath("/admin/jobs");
});
