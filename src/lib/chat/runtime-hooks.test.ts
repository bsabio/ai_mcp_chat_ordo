import { describe, expect, it, vi } from "vitest";

import {
  createChatRuntimeHookRunner,
  shortCircuitChatRuntimeStage,
  type InboundClaimHookState,
  type RequestAssemblyHookState,
  type TurnCompletionHookState,
} from "./runtime-hooks";

function createContextWindowGuard() {
  return {
    status: "ok" as const,
    reasons: [],
    rawMessageCount: 1,
    rawCharacterCount: 5,
    finalMessageCount: 1,
    finalCharacterCount: 5,
    warnMessageCount: 32,
    warnCharacterCount: 64_000,
    maxMessageCount: 40,
    maxCharacterCount: 80_000,
  };
}

function createPromptAssemblyBuilder(): RequestAssemblyHookState["builder"] {
  return {
    withUserPreferences() {
      return this;
    },
    withConversationSummary() {
      return this;
    },
    withRoutingContext() {
      return this;
    },
    withTrustedReferralContext() {
      return this;
    },
    withToolManifest() {
      return this;
    },
    withSection() {
      return this;
    },
    async build() {
      return "prompt";
    },
    async buildResult() {
      return {} as never;
    },
  };
}

describe("createChatRuntimeHookRunner", () => {
  it("runs inbound-claim hooks in registration order around successful resolution", async () => {
    const callOrder: string[] = [];
    const runner = createChatRuntimeHookRunner([
      {
        beforeInboundClaim() {
          callOrder.push("hook-1:before");
        },
        afterInboundClaim(state) {
          callOrder.push(`hook-1:after:${state.session.role}`);
        },
      },
      {
        beforeInboundClaim() {
          callOrder.push("hook-2:before");
        },
        afterInboundClaim() {
          callOrder.push("hook-2:after");
        },
      },
    ]);

    const result = await runner.runInboundClaim({
      routeContext: { requestId: "r1", route: "/api/chat/stream", startedAt: Date.now() } as never,
      meta: {},
    }, async (state: InboundClaimHookState) => {
      callOrder.push("execute");
      return {
        ...state,
        session: {
          user: { id: "u1", roles: ["STAFF"] } as never,
          role: "STAFF",
          userId: "u1",
          isAnonymous: false,
        },
      };
    });

    expect(result.session.role).toBe("STAFF");
    expect(callOrder).toEqual([
      "hook-1:before",
      "hook-2:before",
      "execute",
      "hook-1:after:STAFF",
      "hook-2:after",
    ]);
  });

  it("supports short-circuiting request assembly before the executor runs", async () => {
    const execute = vi.fn(async () => {
      throw new Error("request assembly should have short-circuited");
    });

    const runner = createChatRuntimeHookRunner([
      {
        beforeRequestAssembly(state) {
          return shortCircuitChatRuntimeStage({
            ...state,
            routingSnapshot: {} as never,
            contextMessages: [],
            guard: createContextWindowGuard(),
            systemPrompt: "short-circuited prompt",
          });
        },
      },
    ]);

    const result = await runner.runRequestAssembly({
      routeContext: null,
      mode: "primary",
      builder: createPromptAssemblyBuilder(),
      conversationId: "conv_1",
      userId: "u1",
      latestUserText: "hello",
      latestUserContent: "hello",
      incomingMessages: [{ role: "user", content: "hello" }],
      taskOriginHandoff: null,
      meta: {},
    }, execute as never);

    expect(result.systemPrompt).toBe("short-circuited prompt");
    expect(execute).not.toHaveBeenCalled();
  });

  it("isolates best-effort runtime hook failures so later hooks and execution still run", async () => {
    const callOrder: string[] = [];
    const runner = createChatRuntimeHookRunner([
      {
        failureMode: "best_effort",
        beforeTurnCompletion() {
          throw new Error("telemetry unavailable");
        },
      },
      {
        beforeTurnCompletion() {
          callOrder.push("hook-2:before");
        },
        afterTurnCompletion(state) {
          callOrder.push(`hook-2:after:${state.persistedMessageId}`);
        },
      },
    ]);

    const result = await runner.runTurnCompletion({
      routeContext: null,
      conversationId: "conv_1",
      userId: "u1",
      role: "STAFF",
      streamId: "stream_1",
      status: "completed",
      assistantText: "done",
      assistantParts: [],
      meta: {},
    }, async (state: TurnCompletionHookState) => {
      callOrder.push("execute");
      return {
        ...state,
        persistedMessageId: "msg_1",
      };
    });

    expect(result.persistedMessageId).toBe("msg_1");
    expect(callOrder).toEqual([
      "hook-2:before",
      "execute",
      "hook-2:after:msg_1",
    ]);
  });
});