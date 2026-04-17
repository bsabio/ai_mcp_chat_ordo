import type { BrowserCapabilityExecutionStatus } from "@/core/entities/browser-capability";
import { getBrowserCapabilityDescriptor } from "./browser-capability-registry";
import type { BrowserRuntimeCandidate } from "./job-snapshots";
import type { PersistedBrowserRuntimeEntry } from "./browser-runtime-state";

export const DEFAULT_BROWSER_RUNTIME_ACTIVE_LIMIT = 1;
export const DEFAULT_BROWSER_RUNTIME_QUEUE_LIMIT = 2;

export interface BrowserRuntimeTerminalDecision {
  candidate: BrowserRuntimeCandidate;
  runtimeStatus: Extract<BrowserCapabilityExecutionStatus, "fallback_required" | "failed" | "interrupted">;
  reason: string;
}

export interface BrowserCapabilityRuntimePlan {
  reconcile: BrowserRuntimeTerminalDecision[];
  queue: BrowserRuntimeCandidate[];
  start: BrowserRuntimeCandidate[];
  overflow: BrowserRuntimeTerminalDecision[];
  cleanupJobIds: string[];
}

function isTerminalSnapshotStatus(
  status: NonNullable<BrowserRuntimeCandidate["snapshot"]>["status"] | undefined,
): boolean {
  return status === "succeeded" || status === "failed" || status === "canceled";
}

function buildRecoveryDecision(candidate: BrowserRuntimeCandidate): BrowserRuntimeTerminalDecision {
  const descriptor = getBrowserCapabilityDescriptor(candidate.toolName);
  if (descriptor?.recoveryPolicy === "fallback_to_server") {
    return {
      candidate,
      runtimeStatus: "fallback_required",
      reason: "Local browser execution was interrupted and must reroute to the server.",
    };
  }

  return {
    candidate,
    runtimeStatus: "interrupted",
    reason: "Local browser execution was interrupted before completion.",
  };
}

function buildOverflowDecision(candidate: BrowserRuntimeCandidate): BrowserRuntimeTerminalDecision {
  const descriptor = getBrowserCapabilityDescriptor(candidate.toolName);
  if (descriptor?.fallbackPolicy === "server") {
    return {
      candidate,
      runtimeStatus: "fallback_required",
      reason: "Local browser execution capacity is full, so this run must reroute to the server.",
    };
  }

  return {
    candidate,
    runtimeStatus: "failed",
    reason: "Local browser execution capacity is full for this capability.",
  };
}

export function planBrowserCapabilityRuntimeCycle(options: {
  candidates: BrowserRuntimeCandidate[];
  activeJobIds: ReadonlySet<string>;
  persistedEntries: PersistedBrowserRuntimeEntry[];
  maxActiveExecutions?: number;
  maxQueuedExecutions?: number;
}): BrowserCapabilityRuntimePlan {
  const maxActiveExecutions = options.maxActiveExecutions ?? DEFAULT_BROWSER_RUNTIME_ACTIVE_LIMIT;
  const maxQueuedExecutions = options.maxQueuedExecutions ?? DEFAULT_BROWSER_RUNTIME_QUEUE_LIMIT;
  const persistedByJobId = new Map(options.persistedEntries.map((entry) => [entry.jobId, entry]));

  const cleanupJobIds: string[] = [];
  const reconcile: BrowserRuntimeTerminalDecision[] = [];
  const queue: BrowserRuntimeCandidate[] = [];
  const start: BrowserRuntimeCandidate[] = [];
  const overflow: BrowserRuntimeTerminalDecision[] = [];

  let remainingActiveSlots = Math.max(0, maxActiveExecutions - options.activeJobIds.size);
  let remainingQueueSlots = maxQueuedExecutions;

  for (const candidate of options.candidates) {
    if (isTerminalSnapshotStatus(candidate.snapshot?.status)) {
      if (persistedByJobId.has(candidate.jobId)) {
        cleanupJobIds.push(candidate.jobId);
      }
      continue;
    }

    const persisted = persistedByJobId.get(candidate.jobId);
    if (persisted && !options.activeJobIds.has(candidate.jobId)) {
      reconcile.push(buildRecoveryDecision(candidate));
      cleanupJobIds.push(candidate.jobId);
      continue;
    }

    if (options.activeJobIds.has(candidate.jobId)) {
      continue;
    }

    if (remainingActiveSlots > 0) {
      start.push(candidate);
      remainingActiveSlots -= 1;
      continue;
    }

    if (remainingQueueSlots > 0) {
      queue.push(candidate);
      remainingQueueSlots -= 1;
      continue;
    }

    overflow.push(buildOverflowDecision(candidate));
  }

  return {
    reconcile,
    queue,
    start,
    overflow,
    cleanupJobIds,
  };
}