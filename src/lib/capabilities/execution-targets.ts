import {
  projectBrowserCapability,
  projectJobCapability,
  projectMcpExportIntent,
} from "@/core/capability-catalog/catalog";
import type {
  CapabilityDefinition,
  CapabilityExecutionSurface,
} from "@/core/capability-catalog/capability-definition";
import type { BrowserCapabilityDescriptor } from "@/core/entities/browser-capability";
import type { RoleName } from "@/core/entities/user";
import type { JobCapabilityDefinition } from "@/lib/jobs/job-capability-registry";

export type ExecutionTargetKind =
  | "host_ts"
  | "deferred_job"
  | "browser_wasm"
  | "mcp_stdio"
  | "mcp_container"
  | "native_process"
  | "remote_service";

export type ExecutionTargetSourceFacet =
  | "executor_binding"
  | "job"
  | "browser"
  | "mcp_export"
  | "target_override";

export type ExecutionTargetReadiness = "active" | "declared";

export type ExecutionPlanBlockReason = "no_declared_targets" | "no_active_targets";

export interface DeclaredMcpContainerTarget {
  serviceName: string;
  label?: string;
  sharedModule?: string;
}

export interface DeclaredNativeProcessTarget {
  processId: string;
  command: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  label?: string;
}

export interface DeclaredRemoteServiceTarget {
  serviceId: string;
  endpoint: string;
  method?: "POST" | "PUT";
  headers?: Record<string, string>;
  timeoutMs?: number;
  bridgeExecutionContext?: boolean;
  label?: string;
}

interface BaseExecutionTarget {
  capabilityName: string;
  label: string;
  kind: ExecutionTargetKind;
  sourceFacet: ExecutionTargetSourceFacet;
  readiness: ExecutionTargetReadiness;
}

export interface HostTsExecutionTarget extends BaseExecutionTarget {
  kind: "host_ts";
  sourceFacet: "executor_binding";
  bundleId: string;
  executorId: string;
  executionSurface: Extract<CapabilityExecutionSurface, "internal" | "shared">;
}

export interface DeferredJobExecutionTarget extends BaseExecutionTarget {
  kind: "deferred_job";
  sourceFacet: "job";
  executionMode: CapabilityDefinition["runtime"]["executionMode"];
  executionPrincipal: JobCapabilityDefinition["executionPrincipal"];
  recoveryMode: JobCapabilityDefinition["recoveryMode"];
  retryMode: JobCapabilityDefinition["retryPolicy"]["mode"];
  defaultSurface: JobCapabilityDefinition["defaultSurface"];
  allowedRoles: readonly RoleName[];
}

export interface BrowserWasmExecutionTarget extends BaseExecutionTarget {
  kind: "browser_wasm";
  sourceFacet: "browser";
  runtimeKind: BrowserCapabilityDescriptor["runtimeKind"];
  moduleId: string;
  fallbackPolicy: BrowserCapabilityDescriptor["fallbackPolicy"];
  recoveryPolicy: BrowserCapabilityDescriptor["recoveryPolicy"];
  requiresCrossOriginIsolation?: boolean;
  maxConcurrentExecutions?: number;
  supportedAssetKinds: BrowserCapabilityDescriptor["supportedAssetKinds"];
}

export interface McpStdioExecutionTarget extends BaseExecutionTarget {
  kind: "mcp_stdio";
  sourceFacet: "mcp_export";
  sharedModule: string;
  description: string;
  allowedRoles: RoleName[] | "ALL";
}

export interface McpContainerExecutionTarget extends BaseExecutionTarget {
  kind: "mcp_container";
  sourceFacet: "target_override" | "mcp_export";
  serviceName: string;
  sharedModule?: string;
}

export interface NativeProcessExecutionTarget extends BaseExecutionTarget {
  kind: "native_process";
  sourceFacet: "target_override";
  processId: string;
  command: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

export interface RemoteServiceExecutionTarget extends BaseExecutionTarget {
  kind: "remote_service";
  sourceFacet: "target_override";
  serviceId: string;
  endpoint: string;
  method: "POST" | "PUT";
  headers?: Record<string, string>;
  timeoutMs?: number;
  bridgeExecutionContext: boolean;
}

export type CapabilityExecutionTarget =
  | HostTsExecutionTarget
  | DeferredJobExecutionTarget
  | BrowserWasmExecutionTarget
  | McpStdioExecutionTarget
  | McpContainerExecutionTarget
  | NativeProcessExecutionTarget
  | RemoteServiceExecutionTarget;

export interface ExecutionPlanningContext {
  preferredTargetKinds?: readonly ExecutionTargetKind[];
  enabledTargetKinds?: readonly ExecutionTargetKind[];
  browserRuntimeAvailable?: boolean;
  allowDeferredJob?: boolean;
  mcpContainerTargets?: Partial<Record<string, DeclaredMcpContainerTarget>>;
  nativeProcessTargets?: Partial<Record<string, DeclaredNativeProcessTarget>>;
  remoteServiceTargets?: Partial<Record<string, DeclaredRemoteServiceTarget>>;
}

export interface CapabilityExecutionPlan {
  capabilityName: string;
  requestedExecutionMode: CapabilityDefinition["presentation"]["executionMode"];
  preferredTargetKinds: readonly ExecutionTargetKind[];
  candidates: CapabilityExecutionTarget[];
  primaryTarget: CapabilityExecutionTarget | null;
  fallbackTargets: CapabilityExecutionTarget[];
  blockReason: ExecutionPlanBlockReason | null;
}

const DEFAULT_ENABLED_TARGET_KINDS = Object.freeze<readonly ExecutionTargetKind[]>([
  "host_ts",
  "deferred_job",
]);

const DEFAULT_TARGET_PRIORITY: Readonly<Record<CapabilityDefinition["presentation"]["executionMode"], readonly ExecutionTargetKind[]>> = {
  inline: [
    "host_ts",
    "mcp_stdio",
    "deferred_job",
    "browser_wasm",
    "mcp_container",
    "native_process",
    "remote_service",
  ],
  deferred: [
    "deferred_job",
    "host_ts",
    "mcp_stdio",
    "browser_wasm",
    "mcp_container",
    "native_process",
    "remote_service",
  ],
  browser: [
    "browser_wasm",
    "host_ts",
    "mcp_stdio",
    "deferred_job",
    "mcp_container",
    "native_process",
    "remote_service",
  ],
  hybrid: [
    "browser_wasm",
    "deferred_job",
    "host_ts",
    "mcp_stdio",
    "mcp_container",
    "native_process",
    "remote_service",
  ],
};

function isTargetKindEnabled(kind: ExecutionTargetKind, context: ExecutionPlanningContext): boolean {
  switch (kind) {
    case "host_ts":
      return !context.enabledTargetKinds || context.enabledTargetKinds.includes("host_ts");
    case "deferred_job":
      return context.allowDeferredJob !== false
        && (!context.enabledTargetKinds || context.enabledTargetKinds.includes("deferred_job"));
    case "browser_wasm":
      return context.browserRuntimeAvailable === true;
    case "mcp_stdio":
    case "mcp_container":
    case "native_process":
    case "remote_service":
      return context.enabledTargetKinds?.includes(kind) ?? false;
    default:
      return false;
  }
}

function sortTargets(
  targets: CapabilityExecutionTarget[],
  preferredTargetKinds: readonly ExecutionTargetKind[],
): CapabilityExecutionTarget[] {
  const priority = new Map(preferredTargetKinds.map((kind, index) => [kind, index]));

  return [...targets].sort((left, right) => {
    const leftPriority = priority.get(left.kind) ?? Number.MAX_SAFE_INTEGER;
    const rightPriority = priority.get(right.kind) ?? Number.MAX_SAFE_INTEGER;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    if (left.readiness !== right.readiness) {
      return left.readiness === "active" ? -1 : 1;
    }

    return left.label.localeCompare(right.label);
  });
}

function buildHostTarget(
  def: CapabilityDefinition,
  context: ExecutionPlanningContext,
): HostTsExecutionTarget | null {
  const binding = def.executorBinding;
  if (!binding || (binding.executionSurface !== "internal" && binding.executionSurface !== "shared")) {
    return null;
  }

  return {
    capabilityName: def.core.name,
    label: def.core.label,
    kind: "host_ts",
    sourceFacet: "executor_binding",
    readiness: isTargetKindEnabled("host_ts", context) ? "active" : "declared",
    bundleId: binding.bundleId,
    executorId: binding.executorId,
    executionSurface: binding.executionSurface,
  };
}

function buildDeferredTarget(
  def: CapabilityDefinition,
  context: ExecutionPlanningContext,
): DeferredJobExecutionTarget | null {
  const job = projectJobCapability(def);
  if (!job) {
    return null;
  }

  return {
    capabilityName: def.core.name,
    label: job.label,
    kind: "deferred_job",
    sourceFacet: "job",
    readiness: isTargetKindEnabled("deferred_job", context) ? "active" : "declared",
    executionMode: def.runtime.executionMode,
    executionPrincipal: job.executionPrincipal,
    recoveryMode: job.recoveryMode,
    retryMode: job.retryPolicy.mode,
    defaultSurface: job.defaultSurface,
    allowedRoles: job.executionAllowedRoles,
  };
}

function buildBrowserTarget(
  def: CapabilityDefinition,
  context: ExecutionPlanningContext,
): BrowserWasmExecutionTarget | null {
  const browser = projectBrowserCapability(def);
  if (!browser) {
    return null;
  }

  return {
    capabilityName: def.core.name,
    label: def.core.label,
    kind: "browser_wasm",
    sourceFacet: "browser",
    readiness: isTargetKindEnabled("browser_wasm", context) ? "active" : "declared",
    runtimeKind: browser.runtimeKind,
    moduleId: browser.moduleId,
    fallbackPolicy: browser.fallbackPolicy,
    recoveryPolicy: browser.recoveryPolicy,
    requiresCrossOriginIsolation: browser.requiresCrossOriginIsolation,
    maxConcurrentExecutions: browser.maxConcurrentExecutions,
    supportedAssetKinds: browser.supportedAssetKinds,
  };
}

function buildMcpStdioTarget(
  def: CapabilityDefinition,
  context: ExecutionPlanningContext,
): McpStdioExecutionTarget | null {
  const mcpExport = projectMcpExportIntent(def);
  if (!mcpExport) {
    return null;
  }

  return {
    capabilityName: def.core.name,
    label: def.core.label,
    kind: "mcp_stdio",
    sourceFacet: "mcp_export",
    readiness: isTargetKindEnabled("mcp_stdio", context) ? "active" : "declared",
    sharedModule: mcpExport.sharedModule,
    description: mcpExport.mcpDescription ?? def.core.description,
    allowedRoles: def.core.roles,
  };
}

function buildMcpContainerTarget(
  def: CapabilityDefinition,
  context: ExecutionPlanningContext,
): McpContainerExecutionTarget | null {
  const target = context.mcpContainerTargets?.[def.core.name] ?? (
    def.localExecutionTargets?.mcpContainer
      ? {
          serviceName: def.localExecutionTargets.mcpContainer.serviceName,
          label: def.localExecutionTargets.mcpContainer.label,
          sharedModule: def.localExecutionTargets.mcpContainer.sharedModule,
        }
      : undefined
  );
  if (!target) {
    return null;
  }

  const mcpExport = projectMcpExportIntent(def);

  return {
    capabilityName: def.core.name,
    label: target.label ?? def.core.label,
    kind: "mcp_container",
    sourceFacet: mcpExport ? "mcp_export" : "target_override",
    readiness: isTargetKindEnabled("mcp_container", context) ? "active" : "declared",
    serviceName: target.serviceName,
    sharedModule: target.sharedModule ?? mcpExport?.sharedModule,
  };
}

function buildNativeProcessTarget(
  def: CapabilityDefinition,
  context: ExecutionPlanningContext,
): NativeProcessExecutionTarget | null {
  const target = context.nativeProcessTargets?.[def.core.name] ?? def.localExecutionTargets?.nativeProcess;
  if (!target) {
    return null;
  }

  return {
    capabilityName: def.core.name,
    label: target.label ?? def.core.label,
    kind: "native_process",
    sourceFacet: "target_override",
    readiness: isTargetKindEnabled("native_process", context) ? "active" : "declared",
    processId: target.processId,
    command: target.command,
    args: [...target.args],
    cwd: target.cwd,
    env: target.env,
    timeoutMs: target.timeoutMs,
  };
}

function buildRemoteServiceTarget(
  def: CapabilityDefinition,
  context: ExecutionPlanningContext,
): RemoteServiceExecutionTarget | null {
  const target = context.remoteServiceTargets?.[def.core.name] ?? def.localExecutionTargets?.remoteService;
  if (!target) {
    return null;
  }

  return {
    capabilityName: def.core.name,
    label: target.label ?? def.core.label,
    kind: "remote_service",
    sourceFacet: "target_override",
    readiness: isTargetKindEnabled("remote_service", context) ? "active" : "declared",
    serviceId: target.serviceId,
    endpoint: target.endpoint,
    method: target.method ?? "POST",
    headers: target.headers,
    timeoutMs: target.timeoutMs,
    bridgeExecutionContext: target.bridgeExecutionContext === true,
  };
}

export function getDefaultTargetPriority(
  def: CapabilityDefinition,
): readonly ExecutionTargetKind[] {
  return DEFAULT_TARGET_PRIORITY[def.presentation.executionMode];
}

export function projectCapabilityExecutionTargets(
  def: CapabilityDefinition,
  context: ExecutionPlanningContext = {},
): CapabilityExecutionTarget[] {
  const candidates = [
    buildHostTarget(def, context),
    buildDeferredTarget(def, context),
    buildBrowserTarget(def, context),
    buildMcpStdioTarget(def, context),
    buildMcpContainerTarget(def, context),
    buildNativeProcessTarget(def, context),
    buildRemoteServiceTarget(def, context),
  ].filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null);

  return sortTargets(candidates, context.preferredTargetKinds ?? getDefaultTargetPriority(def));
}

export function planCapabilityExecution(
  def: CapabilityDefinition,
  context: ExecutionPlanningContext = {},
): CapabilityExecutionPlan {
  const preferredTargetKinds = context.preferredTargetKinds ?? getDefaultTargetPriority(def);
  const candidates = projectCapabilityExecutionTargets(def, {
    ...context,
    enabledTargetKinds: context.enabledTargetKinds ?? DEFAULT_ENABLED_TARGET_KINDS,
  });
  const activeTargets = candidates.filter((candidate) => candidate.readiness === "active");

  return {
    capabilityName: def.core.name,
    requestedExecutionMode: def.presentation.executionMode,
    preferredTargetKinds,
    candidates,
    primaryTarget: activeTargets[0] ?? null,
    fallbackTargets: activeTargets.slice(1),
    blockReason:
      candidates.length === 0
        ? "no_declared_targets"
        : activeTargets.length === 0
          ? "no_active_targets"
          : null,
  };
}