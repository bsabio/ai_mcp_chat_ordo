import type { BrowserCapabilityExecutionStatus } from "./browser-capability";
import type { JobFailureClass, JobRecoveryMode, JobStatus } from "./job";

export type PersistedMediaRuntimeStatus = "queued" | "running";

export type MediaRuntimeLifecyclePhase =
  | "pending_local_generation"
  | "durable_asset_available"
  | "generation_failed_terminal"
  | "compose_queued_local"
  | "compose_running_local"
  | "compose_fallback_required"
  | "compose_queued_deferred"
  | "compose_running_deferred"
  | "compose_succeeded"
  | "compose_failed_terminal"
  | "unknown_legacy";

export type MediaRuntimeFailureStage =
  | "asset_generation"
  | "composition_preflight"
  | "local_execution"
  | "playback_verification"
  | "deferred_enqueue"
  | "deferred_execution"
  | "recovery"
  | "unknown";

export interface MediaRuntimeState {
  lifecyclePhase: MediaRuntimeLifecyclePhase;
  jobStatus: JobStatus;
  browserExecutionStatus: BrowserCapabilityExecutionStatus | null;
  persistedStatus: PersistedMediaRuntimeStatus | null;
  hasDurableAsset: boolean;
  isTerminal: boolean;
  failureCode: string | null;
  failureStage: MediaRuntimeFailureStage | null;
  failureClass: JobFailureClass | null;
  recoveryMode: JobRecoveryMode | null;
}