import type { RoleName } from "@/core/entities/user";
import type {
  JobArtifactPolicyMode,
  JobExecutionPrincipal,
  JobRecoveryMode,
  JobResultRetentionMode,
  JobRetryBackoffStrategy,
  JobRetryMode,
} from "@/core/entities/job";

export type JobSurface = "self" | "global";
export type JobFamily = "editorial" | "content" | "workflow" | "training" | "system" | "media" | "other";

export interface JobRetryPolicy {
  mode: JobRetryMode;
  maxAttempts?: number;
  backoffStrategy?: JobRetryBackoffStrategy;
  baseDelayMs?: number;
}

export interface JobArtifactPolicy {
  mode: JobArtifactPolicyMode;
}

export interface JobProgressPhaseDefinition {
  key: string;
  label: string;
  baselinePercent: number;
}

export interface JobCapabilityDefinition<TToolName extends string = string> {
  toolName: TToolName;
  family: JobFamily;
  label: string;
  description: string;
  executionPrincipal: JobExecutionPrincipal;
  executionAllowedRoles: readonly RoleName[];
  retryPolicy: JobRetryPolicy;
  recoveryMode: JobRecoveryMode;
  resultRetention: JobResultRetentionMode;
  artifactPolicy: JobArtifactPolicy;
  initiatorRoles: readonly RoleName[];
  ownerViewerRoles: readonly RoleName[];
  ownerActionRoles: readonly RoleName[];
  globalViewerRoles: readonly RoleName[];
  globalActionRoles: readonly RoleName[];
  defaultSurface: JobSurface;
  progressPhases?: readonly JobProgressPhaseDefinition[];
}

export interface JobCapabilityPresentation<TToolName extends string = string> {
  toolName: TToolName;
  label: string;
  family: JobFamily;
  defaultSurface: JobSurface;
}