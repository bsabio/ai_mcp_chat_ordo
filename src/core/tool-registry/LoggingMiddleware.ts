import type {
  ToolExecutionErrorHookState,
  ToolExecutionHook,
  ToolExecutionHookState,
  ToolExecutionSuccessHookState,
  ToolExecuteFn,
  ToolMiddleware,
} from "./ToolMiddleware";
import type { ToolExecutionContext } from "./ToolExecutionContext";
import type {
  ChatRuntimeHook,
  InboundClaimErrorHookState,
  InboundClaimHookState,
  InboundClaimSuccessHookState,
  RequestAssemblyErrorHookState,
  RequestAssemblyHookState,
  RequestAssemblySuccessHookState,
  TurnCompletionErrorHookState,
  TurnCompletionHookState,
  TurnCompletionSuccessHookState,
} from "@/lib/chat/runtime-hooks";
import { logEvent } from "@/lib/observability/logger";

type LogLevel = "info" | "warn" | "error";

function emitLogEvent(level: LogLevel, message: string, context: Record<string, unknown>) {
  if (typeof logEvent === "function") {
    logEvent(level, message, context);
  }
}

function resolveStartedAt(meta: Record<string, unknown>): number {
  return typeof meta.startedAt === "number" ? meta.startedAt : Date.now();
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function resolveLogger(context: ToolExecutionContext) {
  return context.logger ?? {
    info: (msg: string, ctx?: Record<string, unknown>) => emitLogEvent("info", msg, ctx ?? {}),
    warn: (msg: string, ctx?: Record<string, unknown>) => emitLogEvent("warn", msg, ctx ?? {}),
    error: (msg: string, ctx?: Record<string, unknown>) => emitLogEvent("error", msg, ctx ?? {}),
  };
}

export class LoggingMiddleware implements ToolExecutionHook, ToolMiddleware, ChatRuntimeHook {
  readonly failureMode = "best_effort" as const;

  async execute(
    name: string,
    input: Record<string, unknown>,
    context: ToolExecutionContext,
    next: ToolExecuteFn,
  ): Promise<unknown> {
    const state: ToolExecutionHookState = {
      name,
      input,
      context,
      meta: {},
    };

    await this.beforeToolExecute(state);

    try {
      const result = await next(name, input, context);
      await this.afterToolExecute({
        ...state,
        result,
      });
      return result;
    } catch (error) {
      await this.onToolExecuteError({
        ...state,
        error,
      });
      throw error;
    }
  }

  beforeToolExecute(state: ToolExecutionHookState): void | Promise<void> {
    state.meta.startedAt = Date.now();
    resolveLogger(state.context).info("tool.start", { tool: state.name, role: state.context.role });
  }

  afterToolExecute(state: ToolExecutionSuccessHookState): void | Promise<void> {
    const startedAt = resolveStartedAt(state.meta);
    resolveLogger(state.context).info("tool.success", {
      tool: state.name,
      durationMs: Date.now() - startedAt,
    });
  }

  onToolExecuteError(state: ToolExecutionErrorHookState): void | Promise<void> {
    const startedAt = resolveStartedAt(state.meta);
    resolveLogger(state.context).error("tool.error", {
      tool: state.name,
      durationMs: Date.now() - startedAt,
      error: toErrorMessage(state.error),
    });
  }

  beforeInboundClaim(state: InboundClaimHookState): void | Promise<void> {
    state.meta.startedAt = Date.now();
    emitLogEvent("info", "chat.inbound_claim.start", {
      route: state.routeContext?.route ?? null,
    });
  }

  afterInboundClaim(state: InboundClaimSuccessHookState): void | Promise<void> {
    const startedAt = resolveStartedAt(state.meta);
    emitLogEvent("info", "chat.inbound_claim.success", {
      route: state.routeContext?.route ?? null,
      role: state.session.role,
      userId: state.session.userId,
      isAnonymous: state.session.isAnonymous,
      durationMs: Date.now() - startedAt,
    });
  }

  onInboundClaimError(state: InboundClaimErrorHookState): void | Promise<void> {
    const startedAt = resolveStartedAt(state.meta);
    emitLogEvent("error", "chat.inbound_claim.error", {
      route: state.routeContext?.route ?? null,
      durationMs: Date.now() - startedAt,
      error: toErrorMessage(state.error),
    });
  }

  beforeRequestAssembly(state: RequestAssemblyHookState): void | Promise<void> {
    state.meta.startedAt = Date.now();
    emitLogEvent("info", "chat.request_assembly.start", {
      route: state.routeContext?.route ?? null,
      mode: state.mode,
      conversationId: state.conversationId ?? null,
    });
  }

  afterRequestAssembly(state: RequestAssemblySuccessHookState): void | Promise<void> {
    const startedAt = resolveStartedAt(state.meta);
    emitLogEvent("info", "chat.request_assembly.success", {
      route: state.routeContext?.route ?? null,
      mode: state.mode,
      conversationId: state.conversationId ?? null,
      guardStatus: state.guard.status,
      contextMessageCount: state.contextMessages.length,
      durationMs: Date.now() - startedAt,
    });
  }

  onRequestAssemblyError(state: RequestAssemblyErrorHookState): void | Promise<void> {
    const startedAt = resolveStartedAt(state.meta);
    emitLogEvent("error", "chat.request_assembly.error", {
      route: state.routeContext?.route ?? null,
      mode: state.mode,
      conversationId: state.conversationId ?? null,
      durationMs: Date.now() - startedAt,
      error: toErrorMessage(state.error),
    });
  }

  beforeTurnCompletion(state: TurnCompletionHookState): void | Promise<void> {
    state.meta.startedAt = Date.now();
    emitLogEvent("info", "chat.turn_completion.start", {
      route: state.routeContext?.route ?? null,
      conversationId: state.conversationId,
      streamId: state.streamId,
      status: state.status,
      sessionResolutionKind: state.sessionResolutionKind ?? null,
    });
  }

  afterTurnCompletion(state: TurnCompletionSuccessHookState): void | Promise<void> {
    const startedAt = resolveStartedAt(state.meta);
    emitLogEvent("info", "chat.turn_completion.success", {
      route: state.routeContext?.route ?? null,
      conversationId: state.conversationId,
      streamId: state.streamId,
      status: state.status,
      persistedMessageId: state.persistedMessageId ?? null,
      sessionResolutionKind: state.sessionResolutionKind ?? null,
      sessionResolutionReason: state.sessionResolutionReason ?? null,
      sessionResolutionResponseState: state.sessionResolutionResponseState ?? null,
      durationMs: Date.now() - startedAt,
    });
  }

  onTurnCompletionError(state: TurnCompletionErrorHookState): void | Promise<void> {
    const startedAt = resolveStartedAt(state.meta);
    emitLogEvent("error", "chat.turn_completion.error", {
      route: state.routeContext?.route ?? null,
      conversationId: state.conversationId,
      streamId: state.streamId,
      status: state.status,
      durationMs: Date.now() - startedAt,
      error: toErrorMessage(state.error),
    });
  }
}
