import type {
  MediaAssetDescriptor,
  MediaAssetKind,
} from "./media-asset";
import type { CapabilityResultEnvelope } from "./capability-result";

export type BrowserCapabilityRuntimeKind = "wasm_worker" | "worker_only";

export type BrowserCapabilityFallbackPolicy = "server" | "fail";

export type BrowserCapabilityRecoveryPolicy =
  | "fallback_to_server"
  | "fail_interrupted";

export type BrowserCapabilityExecutionStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "fallback_required"
  | "interrupted"
  | "canceled";

export interface BrowserCapabilityDescriptor {
  capabilityId: string;
  runtimeKind: BrowserCapabilityRuntimeKind;
  moduleId: string;
  supportedAssetKinds: readonly MediaAssetKind[];
  maxInputBytes?: number;
  maxDurationSeconds?: number;
  requiresCrossOriginIsolation?: boolean;
  maxConcurrentExecutions?: number;
  fallbackPolicy: BrowserCapabilityFallbackPolicy;
  recoveryPolicy: BrowserCapabilityRecoveryPolicy;
}

export interface BrowserCapabilityExecutionRequest<TPlan = unknown> {
  capabilityId: string;
  plan: TPlan;
  assetInputs: MediaAssetDescriptor[];
}

export interface BrowserCapabilityExecutionResult {
  status: Exclude<BrowserCapabilityExecutionStatus, "queued" | "running" | "canceled">;
  envelope?: CapabilityResultEnvelope;
  failureCode?: string;
}
