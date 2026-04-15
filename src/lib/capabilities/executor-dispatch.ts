import type { CapabilityDefinition } from "@/core/capability-catalog/capability-definition";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";

import type {
  CapabilityExecutionPlan,
  CapabilityExecutionTarget,
  ExecutionTargetKind,
} from "./execution-targets";

export interface ExecutionDispatchRequest<
  TInput = unknown,
  TTarget extends CapabilityExecutionTarget = CapabilityExecutionTarget,
> {
  capability: CapabilityDefinition;
  input: TInput;
  context?: ToolExecutionContext;
  plan: CapabilityExecutionPlan;
  target: TTarget;
}

export interface ExecutionTargetAdapter<
  TKind extends ExecutionTargetKind = ExecutionTargetKind,
  TResult = unknown,
> {
  kind: TKind;
  invoke(
    request: ExecutionDispatchRequest<unknown, Extract<CapabilityExecutionTarget, { kind: TKind }>>,
  ): Promise<TResult>;
}

export type AnyExecutionTargetAdapter = {
  [K in ExecutionTargetKind]: ExecutionTargetAdapter<K>;
}[ExecutionTargetKind];

type AdapterByKind = {
  [K in ExecutionTargetKind]: ExecutionTargetAdapter<K>;
};

export type ExecutionTargetAdapterRegistry = Partial<AdapterByKind>;

export class MissingExecutionTargetAdapterError extends Error {
  constructor(targetKind: ExecutionTargetKind) {
    super(`No execution-target adapter registered for "${targetKind}".`);
    this.name = "MissingExecutionTargetAdapterError";
  }
}

export class ExecutionPlanUnavailableError extends Error {
  constructor(capabilityName: string, reason: CapabilityExecutionPlan["blockReason"]) {
    super(
      `Execution plan for "${capabilityName}" has no active target${reason ? ` (${reason})` : ""}.`,
    );
    this.name = "ExecutionPlanUnavailableError";
  }
}

export function createExecutionTargetAdapterRegistry(
  adapters: readonly AnyExecutionTargetAdapter[],
): ExecutionTargetAdapterRegistry {
  const registry: ExecutionTargetAdapterRegistry = {};
  const mutableRegistry = registry as Record<ExecutionTargetKind, AnyExecutionTargetAdapter | undefined>;

  for (const adapter of adapters) {
    if (mutableRegistry[adapter.kind]) {
      throw new Error(`Duplicate execution-target adapter registration for "${adapter.kind}".`);
    }

    mutableRegistry[adapter.kind] = adapter;
  }

  return registry;
}

export function resolveExecutionTargetAdapter<
  TTarget extends CapabilityExecutionTarget,
>(
  target: TTarget,
  registry: ExecutionTargetAdapterRegistry,
): ExecutionTargetAdapter<TTarget["kind"]> {
  const adapter = registry[target.kind];
  if (!adapter) {
    throw new MissingExecutionTargetAdapterError(target.kind);
  }

  return adapter as ExecutionTargetAdapter<TTarget["kind"]>;
}

export async function dispatchExecutionPlan<TInput = unknown, TResult = unknown>(options: {
  capability: CapabilityDefinition;
  input: TInput;
  context?: ToolExecutionContext;
  plan: CapabilityExecutionPlan;
  registry: ExecutionTargetAdapterRegistry;
  target?: CapabilityExecutionTarget;
}): Promise<TResult> {
  const target = options.target ?? options.plan.primaryTarget;
  if (!target) {
    throw new ExecutionPlanUnavailableError(
      options.capability.core.name,
      options.plan.blockReason,
    );
  }

  const adapter = resolveExecutionTargetAdapter(target, options.registry);
  return adapter.invoke({
    capability: options.capability,
    input: options.input,
    context: options.context,
    plan: options.plan,
    target,
  }) as Promise<TResult>;
}