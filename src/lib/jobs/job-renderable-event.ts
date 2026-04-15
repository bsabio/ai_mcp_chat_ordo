import type { JobEventType } from "@/core/entities/job";

export const AUDIT_ONLY_JOB_EVENT_TYPES: ReadonlySet<JobEventType> = new Set([
  "notification_sent",
  "notification_failed",
  "ownership_transferred",
]);

export function isAuditOnlyJobEventType(eventType: JobEventType): boolean {
  return AUDIT_ONLY_JOB_EVENT_TYPES.has(eventType);
}

export function isRenderableJobEventType(eventType: JobEventType): boolean {
  return !isAuditOnlyJobEventType(eventType);
}