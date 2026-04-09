import type { RoleName } from "@/core/entities/user";
import {
  type JobArtifactPolicyMode,
  type JobExecutionPrincipal,
  type JobRetryBackoffStrategy,
  type JobRecoveryMode,
  type JobResultRetentionMode,
  type JobRetryMode,
} from "@/core/entities/job";
import { type DeferredJobHandlerName } from "@/lib/jobs/deferred-job-handler-names";

export type JobSurface = "self" | "global";
export type JobFamily = "editorial" | "content" | "workflow" | "training" | "system" | "other";

export interface JobRetryPolicy {
  mode: JobRetryMode;
  maxAttempts?: number;
  backoffStrategy?: JobRetryBackoffStrategy;
  baseDelayMs?: number;
}

export interface JobArtifactPolicy {
  mode: JobArtifactPolicyMode;
}

export interface JobCapabilityDefinition {
  toolName: DeferredJobHandlerName;
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
}

export interface JobCapabilityPresentation {
  toolName: DeferredJobHandlerName;
  label: string;
  family: JobFamily;
  defaultSurface: JobSurface;
}

export const CURRENT_SIGNED_IN_JOB_AUDIENCE_ROLES = [
  "AUTHENTICATED",
  "APPRENTICE",
  "STAFF",
  "ADMIN",
] as const satisfies readonly RoleName[];

export const CURRENT_GLOBAL_JOB_OPERATOR_ROLES = ["ADMIN"] as const satisfies readonly RoleName[];

const ADMIN_ONLY_EDITORIAL_POLICY = {
  family: "editorial",
  executionPrincipal: "system_worker",
  executionAllowedRoles: CURRENT_GLOBAL_JOB_OPERATOR_ROLES,
  retryPolicy: { mode: "manual_only" },
  recoveryMode: "rerun",
  resultRetention: "retain",
  artifactPolicy: { mode: "retain" },
  initiatorRoles: CURRENT_GLOBAL_JOB_OPERATOR_ROLES,
  ownerViewerRoles: CURRENT_GLOBAL_JOB_OPERATOR_ROLES,
  ownerActionRoles: CURRENT_GLOBAL_JOB_OPERATOR_ROLES,
  globalViewerRoles: CURRENT_GLOBAL_JOB_OPERATOR_ROLES,
  globalActionRoles: CURRENT_GLOBAL_JOB_OPERATOR_ROLES,
  defaultSurface: "global",
} satisfies Omit<JobCapabilityDefinition, "toolName" | "label" | "description">;

const AUTOMATIC_EDITORIAL_RETRY_POLICY = {
  mode: "automatic",
  maxAttempts: 3,
  backoffStrategy: "fixed",
  baseDelayMs: 3_000,
} satisfies JobRetryPolicy;

function defineEditorialCapability(
  toolName: DeferredJobHandlerName,
  label: string,
  description: string,
  overrides: Partial<Omit<JobCapabilityDefinition, "toolName" | "label" | "description">> = {},
): JobCapabilityDefinition {
  return {
    toolName,
    label,
    description,
    ...ADMIN_ONLY_EDITORIAL_POLICY,
    ...overrides,
  };
}

export const JOB_CAPABILITY_REGISTRY = Object.freeze({
  draft_content: defineEditorialCapability(
    "draft_content",
    "Draft Content",
    "Draft a structured journal article and persist the draft for editorial review.",
    {
      retryPolicy: AUTOMATIC_EDITORIAL_RETRY_POLICY,
      artifactPolicy: { mode: "open_artifact" },
    },
  ),
  publish_content: defineEditorialCapability(
    "publish_content",
    "Publish Content",
    "Publish an editorial draft and align any linked hero assets for public visibility.",
    {
      retryPolicy: AUTOMATIC_EDITORIAL_RETRY_POLICY,
      artifactPolicy: { mode: "open_artifact" },
    },
  ),
  prepare_journal_post_for_publish: defineEditorialCapability(
    "prepare_journal_post_for_publish",
    "Journal Publish Readiness",
    "Check whether a journal post is ready to publish and summarize blockers, active work, and QA findings.",
    {
      retryPolicy: AUTOMATIC_EDITORIAL_RETRY_POLICY,
    },
  ),
  generate_blog_image: defineEditorialCapability(
    "generate_blog_image",
    "Generate Blog Image",
    "Generate the editorial hero image asset for a prepared article.",
    {
      retryPolicy: AUTOMATIC_EDITORIAL_RETRY_POLICY,
    },
  ),
  compose_blog_article: defineEditorialCapability(
    "compose_blog_article",
    "Compose Blog Article",
    "Compose the first editorial article draft from a brief.",
    {
      retryPolicy: AUTOMATIC_EDITORIAL_RETRY_POLICY,
    },
  ),
  qa_blog_article: defineEditorialCapability(
    "qa_blog_article",
    "QA Blog Article",
    "Run editorial QA against the current article draft and return structured findings.",
  ),
  resolve_blog_article_qa: defineEditorialCapability(
    "resolve_blog_article_qa",
    "Resolve Blog Article QA",
    "Apply editorial fixes from a normalized QA report to the current article draft.",
    {
      artifactPolicy: { mode: "open_artifact" },
    },
  ),
  generate_blog_image_prompt: defineEditorialCapability(
    "generate_blog_image_prompt",
    "Generate Blog Image Prompt",
    "Design the editorial hero-image prompt and related metadata for a finished article.",
  ),
  produce_blog_article: defineEditorialCapability(
    "produce_blog_article",
    "Produce Blog Article",
    "Run the full editorial production pipeline from composition through draft persistence.",
    {
      artifactPolicy: { mode: "open_artifact" },
    },
  ),
}) satisfies Readonly<Record<DeferredJobHandlerName, JobCapabilityDefinition>>;

export function isRegisteredJobCapability(toolName: string): toolName is DeferredJobHandlerName {
  return Object.prototype.hasOwnProperty.call(JOB_CAPABILITY_REGISTRY, toolName);
}

export function getJobCapability(toolName: string): JobCapabilityDefinition | null {
  return isRegisteredJobCapability(toolName) ? JOB_CAPABILITY_REGISTRY[toolName] : null;
}

export function listJobCapabilities(): readonly JobCapabilityDefinition[] {
  return Object.values(JOB_CAPABILITY_REGISTRY);
}

export function listGlobalJobCapabilitiesForRole(role: RoleName): JobCapabilityDefinition[] {
  return listJobCapabilities().filter((capability) => capability.globalViewerRoles.includes(role));
}

export function listGlobalJobCapabilitiesForRoles(
  roles: readonly RoleName[],
): JobCapabilityDefinition[] {
  const seen = new Set<DeferredJobHandlerName>();
  const capabilities: JobCapabilityDefinition[] = [];

  for (const role of roles) {
    for (const capability of listGlobalJobCapabilitiesForRole(role)) {
      if (seen.has(capability.toolName)) {
        continue;
      }

      seen.add(capability.toolName);
      capabilities.push(capability);
    }
  }

  return capabilities;
}

export function canRoleViewGlobalJob(toolName: string, role: RoleName): boolean {
  const capability = getJobCapability(toolName);
  return capability ? capability.globalViewerRoles.includes(role) : false;
}

export function canRolesViewGlobalJob(
  toolName: string,
  roles: readonly RoleName[],
): boolean {
  return roles.some((role) => canRoleViewGlobalJob(toolName, role));
}

export function canRoleManageGlobalJob(toolName: string, role: RoleName): boolean {
  const capability = getJobCapability(toolName);
  return capability ? capability.globalActionRoles.includes(role) : false;
}

export function canRolesManageGlobalJob(
  toolName: string,
  roles: readonly RoleName[],
): boolean {
  return roles.some((role) => canRoleManageGlobalJob(toolName, role));
}

export function getJobCapabilityPresentation(toolName: string): JobCapabilityPresentation | null {
  const capability = getJobCapability(toolName);
  if (!capability) {
    return null;
  }

  return {
    toolName: capability.toolName,
    label: capability.label,
    family: capability.family,
    defaultSurface: capability.defaultSurface,
  };
}

export function getSignedInJobAudienceRoles(): RoleName[] {
  return [...CURRENT_SIGNED_IN_JOB_AUDIENCE_ROLES];
}

export function getGlobalJobOperatorRoles(): RoleName[] {
  return [...CURRENT_GLOBAL_JOB_OPERATOR_ROLES];
}