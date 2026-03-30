export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";

export type JobEventType =
  | "queued"
  | "started"
  | "progress"
  | "result"
  | "failed"
  | "canceled"
  | "notification_sent";

export type JobInitiatorType = "user" | "anonymous_session" | "system";

export interface JobRequest {
  id: string;
  conversationId: string;
  userId: string | null;
  toolName: string;
  status: JobStatus;
  priority: number;
  dedupeKey: string | null;
  initiatorType: JobInitiatorType;
  requestPayload: Record<string, unknown>;
  resultPayload: unknown | null;
  errorMessage: string | null;
  progressPercent: number | null;
  progressLabel: string | null;
  attemptCount: number;
  leaseExpiresAt: string | null;
  claimedBy: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface JobRequestSeed {
  conversationId: string;
  userId?: string | null;
  toolName: string;
  priority?: number;
  dedupeKey?: string | null;
  initiatorType?: JobInitiatorType;
  requestPayload: Record<string, unknown>;
}

export interface JobEvent {
  id: string;
  jobId: string;
  conversationId: string;
  sequence: number;
  eventType: JobEventType;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface JobEventSeed {
  jobId: string;
  conversationId: string;
  eventType: JobEventType;
  payload?: Record<string, unknown>;
}

export interface JobStatusUpdate {
  status: JobStatus;
  resultPayload?: unknown | null;
  errorMessage?: string | null;
  progressPercent?: number | null;
  progressLabel?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  leaseExpiresAt?: string | null;
  claimedBy?: string | null;
  incrementAttemptCount?: boolean;
}

export interface JobClaimOptions {
  workerId: string;
  leaseExpiresAt: string;
  now?: string;
}
