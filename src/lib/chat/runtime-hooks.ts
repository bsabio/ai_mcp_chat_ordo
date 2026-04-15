import type { ChatResponseState } from "@/core/entities/chat-message";
import type { RoleName } from "@/core/entities/user";
import type { ConversationRoutingSnapshot } from "@/core/entities/conversation-routing";
import type { MessagePart } from "@/core/entities/message-parts";
import type { getSessionUser } from "@/lib/auth";
import type { ContextMessage, ContextWindowGuard } from "@/lib/chat/context-window";
import type { RouteContext } from "@/lib/chat/http-facade";
import type { PromptAssemblyBuilder, PromptRuntimeResult } from "@/lib/chat/prompt-runtime";
import type { SessionResolutionKind } from "@/lib/chat/session-resolution";
import type { TaskOriginHandoff } from "@/lib/chat/task-origin-handoff";

type MaybePromise<T> = T | Promise<T>;

export type RuntimeHookFailureMode = "fatal" | "best_effort";

export type HookChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export interface ResolvedChatRuntimeSession {
  user: Awaited<ReturnType<typeof getSessionUser>>;
  role: RoleName;
  userId: string;
  isAnonymous: boolean;
}

export interface InboundClaimHookState {
  routeContext: RouteContext | null;
  meta: Record<string, unknown>;
}

export interface InboundClaimSuccessHookState extends InboundClaimHookState {
  session: ResolvedChatRuntimeSession;
}

export interface InboundClaimErrorHookState extends InboundClaimHookState {
  error: unknown;
}

export type RequestAssemblyMode = "primary" | "fallback";

export interface RequestAssemblyHookState {
  routeContext: RouteContext | null;
  mode: RequestAssemblyMode;
  builder: PromptAssemblyBuilder;
  incomingMessages: HookChatMessage[];
  latestUserContent: string;
  taskOriginHandoff: TaskOriginHandoff | null;
  conversationId?: string;
  userId?: string;
  latestUserText?: string;
  meta: Record<string, unknown>;
}

export interface RequestAssemblySuccessHookState extends RequestAssemblyHookState {
  routingSnapshot: ConversationRoutingSnapshot;
  contextMessages: ContextMessage[];
  guard: ContextWindowGuard;
  systemPrompt: string;
  promptRuntimeResult?: PromptRuntimeResult | null;
}

export interface RequestAssemblyErrorHookState extends RequestAssemblyHookState {
  error: unknown;
}

export type TurnCompletionStatus = "completed" | "stopped" | "interrupted";

export interface TurnCompletionHookState {
  routeContext: RouteContext | null;
  conversationId: string;
  userId: string;
  role: RoleName;
  streamId: string;
  status: TurnCompletionStatus;
  assistantText: string;
  assistantParts: MessagePart[];
  lifecycleEventType?: "generation_stopped" | "generation_interrupted";
  lifecycleActor?: "user" | "system";
  lifecycleReason?: string;
  sessionResolutionKind?: SessionResolutionKind;
  sessionResolutionReason?: string;
  sessionResolutionResponseState?: ChatResponseState;
  meta: Record<string, unknown>;
}

export interface TurnCompletionSuccessHookState extends TurnCompletionHookState {
  persistedMessageId?: string;
  recordedAt?: string;
  partialContentRetained?: boolean;
}

export interface TurnCompletionErrorHookState extends TurnCompletionHookState {
  error: unknown;
}

export interface ChatRuntimeStageShortCircuit<SuccessState> {
  type: "short_circuit";
  state: SuccessState;
}

export interface ChatRuntimeHook {
  readonly failureMode?: RuntimeHookFailureMode;
  beforeInboundClaim?(
    state: InboundClaimHookState,
  ): MaybePromise<ChatRuntimeStageShortCircuit<InboundClaimSuccessHookState> | void>;
  afterInboundClaim?(state: InboundClaimSuccessHookState): MaybePromise<void>;
  onInboundClaimError?(state: InboundClaimErrorHookState): MaybePromise<void>;
  beforeRequestAssembly?(
    state: RequestAssemblyHookState,
  ): MaybePromise<ChatRuntimeStageShortCircuit<RequestAssemblySuccessHookState> | void>;
  afterRequestAssembly?(state: RequestAssemblySuccessHookState): MaybePromise<void>;
  onRequestAssemblyError?(state: RequestAssemblyErrorHookState): MaybePromise<void>;
  beforeTurnCompletion?(state: TurnCompletionHookState): MaybePromise<void>;
  afterTurnCompletion?(state: TurnCompletionSuccessHookState): MaybePromise<void>;
  onTurnCompletionError?(state: TurnCompletionErrorHookState): MaybePromise<void>;
}

export interface ChatRuntimeHookRunner {
  runInboundClaim(
    initialState: InboundClaimHookState,
    execute: (state: InboundClaimHookState) => Promise<InboundClaimSuccessHookState>,
  ): Promise<InboundClaimSuccessHookState>;
  runRequestAssembly(
    initialState: RequestAssemblyHookState,
    execute: (state: RequestAssemblyHookState) => Promise<RequestAssemblySuccessHookState>,
  ): Promise<RequestAssemblySuccessHookState>;
  runTurnCompletion(
    initialState: TurnCompletionHookState,
    execute: (state: TurnCompletionHookState) => Promise<TurnCompletionSuccessHookState>,
  ): Promise<TurnCompletionSuccessHookState>;
}

export function shortCircuitChatRuntimeStage<SuccessState>(
  state: SuccessState,
): ChatRuntimeStageShortCircuit<SuccessState> {
  return {
    type: "short_circuit",
    state,
  };
}

function isShortCircuitState<SuccessState>(
  result: ChatRuntimeStageShortCircuit<SuccessState> | void,
): result is ChatRuntimeStageShortCircuit<SuccessState> {
  return Boolean(result && result.type === "short_circuit");
}

function isBestEffortHook(hook: { failureMode?: RuntimeHookFailureMode }): boolean {
  return hook.failureMode === "best_effort";
}

type StageSelectors<BeforeState, SuccessState, ErrorState> = {
  before: (
    hook: ChatRuntimeHook,
  ) =>
    | ((state: BeforeState) => MaybePromise<ChatRuntimeStageShortCircuit<SuccessState> | void>)
    | undefined;
  after: (hook: ChatRuntimeHook) => ((state: SuccessState) => MaybePromise<void>) | undefined;
  onError: (hook: ChatRuntimeHook) => ((state: ErrorState) => MaybePromise<void>) | undefined;
};

async function runStageHooks<
  BeforeState extends { meta: Record<string, unknown> },
  SuccessState extends BeforeState,
  ErrorState extends BeforeState & { error: unknown },
>(
  hooks: readonly ChatRuntimeHook[],
  initialState: BeforeState,
  execute: (state: BeforeState) => Promise<SuccessState>,
  selectors: StageSelectors<BeforeState, SuccessState, ErrorState>,
): Promise<SuccessState> {
  const enteredHooks: ChatRuntimeHook[] = [];

  try {
    for (const hook of hooks) {
      const beforeHook = selectors.before(hook);
      if (!beforeHook) {
        enteredHooks.push(hook);
        continue;
      }

      try {
        const hookResult = await beforeHook.call(hook, initialState);
        if (isShortCircuitState(hookResult)) {
          enteredHooks.push(hook);
          for (const enteredHook of enteredHooks) {
            try {
              await selectors.after(enteredHook)?.call(enteredHook, hookResult.state);
            } catch {
              // After hooks are best-effort and must not corrupt stage completion.
            }
          }
          return hookResult.state;
        }
        enteredHooks.push(hook);
      } catch (error) {
        if (isBestEffortHook(hook)) {
          continue;
        }
        throw error;
      }
    }

    const successState = await execute(initialState);
    for (const hook of enteredHooks) {
      try {
        await selectors.after(hook)?.call(hook, successState);
      } catch {
        // After hooks are best-effort and must not corrupt stage completion.
      }
    }
    return successState;
  } catch (error) {
    const errorState = {
      ...initialState,
      error,
    } as ErrorState;

    for (const hook of enteredHooks) {
      try {
        await selectors.onError(hook)?.call(hook, errorState);
      } catch {
        // Error hooks are best-effort and must not mask the original failure.
      }
    }

    throw error;
  }
}

export function createChatRuntimeHookRunner(
  hooks: readonly ChatRuntimeHook[],
): ChatRuntimeHookRunner {
  return {
    runInboundClaim(initialState, execute) {
      return runStageHooks(hooks, initialState, execute, {
        before: (hook) => hook.beforeInboundClaim,
        after: (hook) => hook.afterInboundClaim,
        onError: (hook) => hook.onInboundClaimError,
      });
    },
    runRequestAssembly(initialState, execute) {
      return runStageHooks(hooks, initialState, execute, {
        before: (hook) => hook.beforeRequestAssembly,
        after: (hook) => hook.afterRequestAssembly,
        onError: (hook) => hook.onRequestAssemblyError,
      });
    },
    runTurnCompletion(initialState, execute) {
      return runStageHooks(hooks, initialState, execute, {
        before: (hook) => hook.beforeTurnCompletion,
        after: (hook) => hook.afterTurnCompletion,
        onError: (hook) => hook.onTurnCompletionError,
      });
    },
  };
}