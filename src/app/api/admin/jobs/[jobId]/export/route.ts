import type { NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getJobQueueDataMapper } from "@/adapters/RepositoryFactory";
import { canRolesViewGlobalJob, getJobCapability } from "@/lib/jobs/job-capability-registry";

type RouteParams = {
  params: Promise<{ jobId: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const user = await getSessionUser();

  if (!user.roles.includes("ADMIN")) {
    return Response.json(
      { error: "Job log export is restricted to administrators." },
      { status: 403 },
    );
  }

  const { jobId } = await params;
  const mapper = getJobQueueDataMapper();
  const job = await mapper.findJobById(jobId);

  if (!job) {
    return Response.json({ error: "Job not found." }, { status: 404 });
  }

  if (!canRolesViewGlobalJob(job.toolName, user.roles)) {
    return Response.json({ error: "Job not found." }, { status: 404 });
  }

  const capability = getJobCapability(job.toolName);
  if (!capability) {
    return Response.json({ error: "Job not found." }, { status: 404 });
  }

  const events = await mapper.listEventsForJob(jobId);
  const payload = {
    exportedAt: new Date().toISOString(),
    job: {
      id: job.id,
      toolName: job.toolName,
      label: capability.label,
      description: capability.description,
      family: capability.family,
      defaultSurface: capability.defaultSurface,
      executionPrincipal: capability.executionPrincipal,
      executionAllowedRoles: capability.executionAllowedRoles,
      globalViewerRoles: capability.globalViewerRoles,
      globalActionRoles: capability.globalActionRoles,
      resultRetention: capability.resultRetention,
      artifactPolicy: capability.artifactPolicy.mode,
      conversationId: job.conversationId,
      userId: job.userId,
      status: job.status,
      priority: job.priority,
      dedupeKey: job.dedupeKey,
      initiatorType: job.initiatorType,
      attemptCount: job.attemptCount,
      claimedBy: job.claimedBy,
      leaseExpiresAt: job.leaseExpiresAt,
      failureClass: job.failureClass,
      nextRetryAt: job.nextRetryAt,
      recoveryMode: job.recoveryMode,
      replayedFromJobId: job.replayedFromJobId,
      supersededByJobId: job.supersededByJobId,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      updatedAt: job.updatedAt,
      requestPayload: job.requestPayload,
      resultPayload: job.resultPayload,
      errorMessage: job.errorMessage,
    },
    events: events.map((event) => ({
      id: event.id,
      sequence: event.sequence,
      eventType: event.eventType,
      payload: event.payload,
      createdAt: event.createdAt,
    })),
  };

  return new Response(`${JSON.stringify(payload, null, 2)}\n`, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="job-${job.id}-log.json"`,
      "Cache-Control": "no-store",
    },
  });
}