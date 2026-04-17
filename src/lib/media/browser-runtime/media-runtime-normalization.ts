import type { BrowserCapabilityExecutionStatus } from "@/core/entities/browser-capability";
import type { CapabilityExecutionMode } from "@/core/entities/capability-presentation";
import type {
  JobFailureClass,
  JobRecoveryMode,
  JobStatus,
} from "@/core/entities/job";
import type {
  MediaRuntimeFailureStage,
  MediaRuntimeLifecyclePhase,
  MediaRuntimeState,
  PersistedMediaRuntimeStatus,
} from "@/core/entities/media-runtime-state";
import type { PersistedBrowserRuntimeStatus } from "./browser-runtime-state";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasDurableAsset(toolName: string, payload: unknown): boolean {
  if (!isRecord(payload)) {
    return false;
  }

  if (toolName === "compose_media") {
    return hasString(payload.primaryAssetId);
  }

  return hasString(payload.assetId);
}

function normalizeFailureClass(options: {
  jobStatus: JobStatus;
  browserExecutionStatus: BrowserCapabilityExecutionStatus | null;
  failureClass?: JobFailureClass | null;
}): JobFailureClass | null {
  if (options.failureClass !== undefined) {
    return options.failureClass;
  }

  if (options.jobStatus === "canceled") {
    return "canceled";
  }

  if (options.jobStatus !== "failed") {
    return null;
  }

  if (options.browserExecutionStatus === "fallback_required") {
    return "transient";
  }

  if (options.browserExecutionStatus === "interrupted") {
    return "unknown";
  }

  return "terminal";
}

function normalizeRecoveryMode(options: {
  recoveryMode?: JobRecoveryMode | null;
  browserExecutionStatus: BrowserCapabilityExecutionStatus | null;
}): JobRecoveryMode | null {
  if (options.recoveryMode !== undefined) {
    return options.recoveryMode;
  }

  return options.browserExecutionStatus === "fallback_required" ? "rerun" : null;
}

function normalizeFailureStage(options: {
  toolName: string;
  jobStatus: JobStatus;
  executionMode?: CapabilityExecutionMode | null;
  failureStage?: MediaRuntimeFailureStage | null;
}): MediaRuntimeFailureStage | null {
  if (options.failureStage !== undefined) {
    return options.failureStage;
  }

  if (options.jobStatus !== "failed" && options.jobStatus !== "canceled") {
    return null;
  }

  if (options.executionMode === "deferred") {
    return options.toolName === "compose_media" ? "deferred_execution" : "unknown";
  }

  return options.toolName === "compose_media" ? "local_execution" : "asset_generation";
}

function normalizeBrowserExecutionStatus(options: {
  jobStatus: JobStatus;
  executionMode?: CapabilityExecutionMode | null;
  browserExecutionStatus?: BrowserCapabilityExecutionStatus | null;
  persistedStatus?: PersistedBrowserRuntimeStatus | null;
}): BrowserCapabilityExecutionStatus | null {
  if (options.browserExecutionStatus) {
    return options.browserExecutionStatus;
  }

  if (options.persistedStatus === "queued") {
    return "queued";
  }

  if (options.persistedStatus === "running") {
    return "running";
  }

  if (options.executionMode === "deferred") {
    return null;
  }

  if (options.jobStatus === "queued") {
    return "queued";
  }

  if (options.jobStatus === "running") {
    return "running";
  }

  if (options.jobStatus === "succeeded") {
    return "succeeded";
  }

  if (options.jobStatus === "canceled") {
    return "canceled";
  }

  return "failed";
}

function isDeferredComposeLifecycle(options: {
  executionMode?: CapabilityExecutionMode | null;
  failureStage: MediaRuntimeFailureStage | null;
}): boolean {
  return options.executionMode === "deferred"
    || options.failureStage === "deferred_enqueue"
    || options.failureStage === "deferred_execution";
}

function resolveLifecyclePhase(options: {
  toolName: string;
  jobStatus: JobStatus;
  executionMode?: CapabilityExecutionMode | null;
  browserExecutionStatus: BrowserCapabilityExecutionStatus | null;
  persistedStatus: PersistedBrowserRuntimeStatus | null;
  hasDurableAsset: boolean;
  failureStage: MediaRuntimeFailureStage | null;
}): MediaRuntimeLifecyclePhase {
  if (options.toolName === "compose_media") {
    if (options.hasDurableAsset && options.jobStatus === "succeeded") {
      return "compose_succeeded";
    }

    if (options.browserExecutionStatus === "fallback_required") {
      return "compose_fallback_required";
    }

    if (options.persistedStatus === "queued") {
      return "compose_queued_local";
    }

    if (options.persistedStatus === "running") {
      return "compose_running_local";
    }

    if (options.jobStatus === "queued") {
      return isDeferredComposeLifecycle(options)
        ? "compose_queued_deferred"
        : "compose_queued_local";
    }

    if (options.jobStatus === "running") {
      return isDeferredComposeLifecycle(options)
        ? "compose_running_deferred"
        : "compose_running_local";
    }

    if (options.jobStatus === "failed" || options.jobStatus === "canceled") {
      return "compose_failed_terminal";
    }

    return options.hasDurableAsset ? "compose_succeeded" : "unknown_legacy";
  }

  if (options.hasDurableAsset) {
    return "durable_asset_available";
  }

  if (options.jobStatus === "failed" || options.jobStatus === "canceled") {
    return "generation_failed_terminal";
  }

  return "pending_local_generation";
}

export function normalizeMediaRuntimeState(options: {
  toolName: string;
  jobStatus: JobStatus;
  payload: unknown;
  executionMode?: CapabilityExecutionMode | null;
  browserExecutionStatus?: BrowserCapabilityExecutionStatus | null;
  persistedStatus?: PersistedBrowserRuntimeStatus | null;
  failureCode?: string | null;
  failureStage?: MediaRuntimeFailureStage | null;
  failureClass?: JobFailureClass | null;
  recoveryMode?: JobRecoveryMode | null;
}): MediaRuntimeState {
  const persistedStatus = options.persistedStatus ?? null;
  const browserExecutionStatus = normalizeBrowserExecutionStatus({
    jobStatus: options.jobStatus,
    executionMode: options.executionMode,
    browserExecutionStatus: options.browserExecutionStatus,
    persistedStatus,
  });
  const recoveryMode = normalizeRecoveryMode({
    recoveryMode: options.recoveryMode,
    browserExecutionStatus,
  });
  const normalizedFailureClass = normalizeFailureClass({
    jobStatus: options.jobStatus,
    browserExecutionStatus,
    failureClass: options.failureClass,
  });
  const normalizedFailureStage = normalizeFailureStage({
    toolName: options.toolName,
    jobStatus: options.jobStatus,
    executionMode: options.executionMode,
    failureStage: options.failureStage,
  });
  const durableAsset = hasDurableAsset(options.toolName, options.payload);

  return {
    lifecyclePhase: resolveLifecyclePhase({
      toolName: options.toolName,
      jobStatus: options.jobStatus,
      executionMode: options.executionMode,
      browserExecutionStatus,
      persistedStatus,
      hasDurableAsset: durableAsset,
      failureStage: normalizedFailureStage,
    }),
    jobStatus: options.jobStatus,
    browserExecutionStatus,
    persistedStatus,
    hasDurableAsset: durableAsset,
    isTerminal: options.jobStatus === "succeeded" || options.jobStatus === "failed" || options.jobStatus === "canceled",
    failureCode: options.failureCode ?? null,
    failureStage: normalizedFailureStage,
    failureClass: normalizedFailureClass,
    recoveryMode,
  };
}

export function normalizePersistedMediaRuntimeState(options: {
  toolName: string;
  persistedStatus: PersistedMediaRuntimeStatus;
  payload?: unknown;
}): MediaRuntimeState {
  return normalizeMediaRuntimeState({
    toolName: options.toolName,
    jobStatus: options.persistedStatus,
    persistedStatus: options.persistedStatus,
    payload: options.payload ?? null,
  });
}