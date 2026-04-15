import { logEvent } from "@/lib/observability/logger";

import type {
  ToolDeniedEvent,
  ToolDeniedReason,
  ToolExecutionContext,
} from "./ToolExecutionContext";
import type { ToolExecutionHook, ToolExecutionHookState } from "./ToolMiddleware";
import { shortCircuitToolExecution } from "./ToolMiddleware";
import type { ToolRegistry } from "./ToolRegistry";

export interface ToolPermissionDeniedResult {
  ok: false;
  action: "tool_permission_denied";
  toolName: string;
  role: ToolExecutionContext["role"];
  reason: ToolDeniedReason;
  lane: string | null;
  message: string;
}

function createToolPermissionDeniedResult(
  state: ToolExecutionHookState,
  reason: ToolDeniedReason,
): ToolPermissionDeniedResult {
  const lane = state.context.conversationLane ?? null;
  const scope = reason === "manifest_prefiltered"
    ? "the current turn scope"
    : `role \"${state.context.role}\"`;

  return {
    ok: false,
    action: "tool_permission_denied",
    toolName: state.name,
    role: state.context.role,
    reason,
    lane,
    message: `Tool \"${state.name}\" is not available for ${scope}.`,
  };
}

function resolveDeniedReason(
  registry: ToolRegistry,
  state: ToolExecutionHookState,
): ToolDeniedReason | null {
  if (!registry.canExecute(state.name, state.context.role)) {
    return "role_denied";
  }

  if (
    state.context.allowedToolNames
    && !state.context.allowedToolNames.includes(state.name)
  ) {
    return "manifest_prefiltered";
  }

  return null;
}

export class ToolCapabilityMiddleware implements ToolExecutionHook {
  constructor(private readonly registry: ToolRegistry) {}

  async beforeToolExecute(state: ToolExecutionHookState) {
    if (!this.registry.getDescriptor(state.name)) {
      return;
    }

    const deniedReason = resolveDeniedReason(this.registry, state);
    if (!deniedReason) {
      return;
    }

    const event: ToolDeniedEvent = {
      toolName: state.name,
      role: state.context.role,
      reason: deniedReason,
      conversationId: state.context.conversationId,
      lane: state.context.conversationLane ?? null,
      allowedToolCount: state.context.allowedToolNames?.length,
    };

    await state.context.onToolDenied?.(event);

    logEvent("warn", "tool.denied", {
      tool: state.name,
      role: state.context.role,
      reason: deniedReason,
      lane: state.context.conversationLane ?? null,
      conversationId: state.context.conversationId ?? null,
      allowedToolCount: state.context.allowedToolNames?.length ?? null,
    });

    return shortCircuitToolExecution(
      createToolPermissionDeniedResult(state, deniedReason),
    );
  }
}