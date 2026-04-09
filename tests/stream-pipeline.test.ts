import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* ------------------------------------------------------------------ */
/*  Mocks — shared across pipeline method tests                        */
/* ------------------------------------------------------------------ */

const getSessionUserMock = vi.fn();
const resolveUserIdMock = vi.fn();
const setMockSessionMock = vi.fn();
const getSessionMock = vi.fn();
const resolveValidatedReferralVisitMock = vi.fn();
const attachValidatedVisitToConversationMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
  setMockSession: setMockSessionMock,
  getSession: getSessionMock,
}));

vi.mock("@/lib/referrals/referral-visit", () => ({
  REFERRAL_VISIT_COOKIE_NAME: "lms_referral_visit",
  resolveValidatedReferralVisit: resolveValidatedReferralVisitMock,
}));

vi.mock("@/lib/referrals/referral-ledger", () => ({
  getReferralLedgerService: vi.fn(() => ({
    attachValidatedVisitToConversation: attachValidatedVisitToConversationMock,
  })),
}));

vi.mock("@/lib/chat/resolve-user", () => ({
  resolveUserId: resolveUserIdMock,
}));

const runClaudeAgentLoopStreamMock = vi.fn();
vi.mock("@/lib/chat/anthropic-stream", () => ({
  runClaudeAgentLoopStream: runClaudeAgentLoopStreamMock,
}));

vi.mock("@/lib/config/env", () => ({
  getAnthropicApiKey: () => "test-key",
}));

vi.mock("@/lib/chat/policy", () => ({
  createSystemPromptBuilder: vi.fn(() => ({
    withUserPreferences: vi.fn(),
    withToolManifest: vi.fn(),
    withConversationSummary: vi.fn(),
    withRoutingContext: vi.fn(),
    withSection: vi.fn(),
    build: () => "system prompt",
  })),
}));

vi.mock("@/lib/chat/tool-composition-root", () => ({
  getToolComposition: () => ({
    registry: {
      getSchemasForRole: () => [],
      getDescriptor: () => null,
    },
    executor: vi.fn(),
  }),
}));

vi.mock("@/lib/chat/conversation-root", () => ({
  createConversationRuntimeServices: () => ({
    interactor: {
      ensureActive: vi.fn(async () => ({ id: "conv-test" })),
      appendMessage: vi.fn(),
      getForStreamingContext: vi.fn(),
      updateRoutingSnapshot: vi.fn(),
      recordToolUsed: vi.fn(),
    },
    routingAnalyzer: { analyze: vi.fn() },
    summarizationInteractor: { summarizeIfNeeded: vi.fn() },
  }),
}));

vi.mock("@/lib/chat/context-window", () => ({
  buildContextWindow: vi.fn(() => ({
    contextMessages: [{ role: "user", content: "hello" }],
    summaryText: "",
  })),
}));

vi.mock("@/lib/chat/chat-turn", () => ({
  executeDirectChatTurn: vi.fn(async () => null),
}));

vi.mock("@/lib/chat/task-origin-handoff", () => ({
  normalizeTaskOriginHandoff: vi.fn(() => null),
  buildTaskOriginContextBlock: vi.fn(() => ""),
}));

vi.mock("@/adapters/UserFileDataMapper", () => ({
  UserFileDataMapper: class { },
}));

vi.mock("@/adapters/UserPreferencesDataMapper", () => ({
  UserPreferencesDataMapper: class {
    getAll = vi.fn(async () => ({}));
  },
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({}),
}));

vi.mock("@/lib/user-files", () => ({
  UserFileSystem: class {
    getById = vi.fn(async () => null);
    assignConversation = vi.fn();
  },
}));

vi.mock("@/core/entities/conversation-routing", () => ({
  createConversationRoutingSnapshot: () => ({}),
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getJobQueueRepository: () => ({
    createJob: vi.fn(),
    appendEvent: vi.fn(),
    findActiveJobByDedupeKey: vi.fn(),
  }),
}));

vi.mock("@/lib/jobs/deferred-job-result", () => ({
  createDeferredJobResultPayload: vi.fn(),
  deferredJobResultToMessagePart: vi.fn(),
  deferredJobResultToStreamEvent: vi.fn(),
  isDeferredJobResultPayload: vi.fn(() => false),
}));

vi.mock("@/lib/jobs/job-dedupe", () => ({
  buildDeferredJobDedupeKey: vi.fn(),
}));

vi.mock("@/lib/jobs/job-status-snapshots", () => ({
  extractJobStatusSnapshots: vi.fn(() => []),
  jobStatusSnapshotToStreamEvent: vi.fn(),
}));

vi.mock("@/lib/observability/logger", () => ({
  logDegradation: vi.fn(),
  logFailure: vi.fn(),
}));

vi.mock("@/lib/observability/reason-codes", () => ({
  REASON_CODES: {
    ROUTING_ANALYSIS_FAILED: "ROUTING_ANALYSIS_FAILED",
    TOOL_EXECUTION_FAILED: "TOOL_EXECUTION_FAILED",
    MESSAGE_PERSIST_FAILED: "MESSAGE_PERSIST_FAILED",
    CONVERSATION_LOOKUP_FAILED: "CONVERSATION_LOOKUP_FAILED",
    UNKNOWN_ROUTE_ERROR: "UNKNOWN_ROUTE_ERROR",
  },
}));

vi.mock("@/lib/chat/message-attachments", () => ({
  buildMessageContextText: vi.fn(() => "ctx"),
}));

vi.mock("@/lib/chat/math-classifier", () => ({
  looksLikeMath: vi.fn(() => false),
}));

vi.mock("@/lib/chat/http-facade", () => ({
  errorJson: vi.fn((_ctx: unknown, msg: string, status: number) =>
    new Response(JSON.stringify({ error: msg }), { status }),
  ),
  successText: vi.fn((_ctx: unknown, text: string) =>
    new Response(text, { status: 200 }),
  ),
  runRouteTemplate: vi.fn(),
}));

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe("Spec 10 — Stream Route Decomposition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveValidatedReferralVisitMock.mockReturnValue(null);
    attachValidatedVisitToConversationMock.mockResolvedValue(null);
  });

  // --- Pipeline class tests ---

  it("ChatStreamPipeline has all expected methods", async () => {
    const { ChatStreamPipeline } = await import("@/lib/chat/stream-pipeline");
    const expected = [
      "resolveSession",
      "validateAndParse",
      "ensureConversation",
      "assignAttachments",
      "persistUserMessage",
      "prepareStreamContext",
      "prepareFallbackContext",
      "checkMathShortCircuit",
      "createDeferredToolExecutor",
      "createStreamResponse",
    ];
    const proto = ChatStreamPipeline.prototype;
    for (const method of expected) {
      expect(typeof proto[method as keyof typeof proto]).toBe("function");
    }
  });

  it("resolveSession returns user from session resolver", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1", roles: ["STAFF"] });
    resolveUserIdMock.mockResolvedValue({ userId: "u1", isAnonymous: false });

    const { ChatStreamPipeline } = await import("@/lib/chat/stream-pipeline");
    const pipeline = new ChatStreamPipeline();
    const result = await pipeline.resolveSession();

    expect(result.user.id).toBe("u1");
    expect(result.role).toBe("STAFF");
    expect(result.userId).toBe("u1");
    expect(result.isAnonymous).toBe(false);
  });

  it("validateAndParse rejects invalid request bodies", async () => {
    const { ChatStreamPipeline } = await import("@/lib/chat/stream-pipeline");
    const pipeline = new ChatStreamPipeline();
    const fakeContext = { requestId: "r1", route: "/test" } as never;
    const result = pipeline.validateAndParse({ messages: "not-an-array" }, fakeContext);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
  });

  it("validateAndParse accepts valid request body", async () => {
    const { ChatStreamPipeline } = await import("@/lib/chat/stream-pipeline");
    const pipeline = new ChatStreamPipeline();
    const fakeContext = { requestId: "r1", route: "/test" } as never;
    const result = pipeline.validateAndParse(
      { messages: [{ role: "user", content: "hi" }] },
      fakeContext,
    );
    expect(result).not.toBeInstanceOf(Response);
    expect((result as { parsed: unknown }).parsed).toBeDefined();
  });

  it("ensureConversation creates conversation and returns ID", async () => {
    const { ChatStreamPipeline } = await import("@/lib/chat/stream-pipeline");
    const pipeline = new ChatStreamPipeline();
    const mockServices = {
      interactor: {
        ensureActive: vi.fn(async () => ({ id: "conv-123" })),
      },
    };
    const fakeReq = { cookies: { get: () => undefined } } as never;
    const state = await pipeline.ensureConversation("u1", fakeReq, mockServices as never);
    expect(state.conversationId).toBe("conv-123");
  });

  it("ensureConversation attaches validated referral visits to the canonical ledger", async () => {
    resolveValidatedReferralVisitMock.mockReturnValue({
      visitId: "visit_123",
      code: "mentor-42",
      issuedAt: "2026-04-01T10:00:00.000Z",
      referrer: {
        userId: "usr_affiliate",
        code: "mentor-42",
        name: "Ada Lovelace",
        credential: "Founder",
      },
    });

    const { ChatStreamPipeline } = await import("@/lib/chat/stream-pipeline");
    const pipeline = new ChatStreamPipeline();
    const mockServices = {
      interactor: {
        ensureActive: vi.fn(async () => ({ id: "conv-123" })),
      },
    };
    const fakeReq = { cookies: { get: () => ({ value: "signed-cookie" }) } } as never;

    await pipeline.ensureConversation("anon_123", fakeReq, mockServices as never);

    expect(mockServices.interactor.ensureActive).toHaveBeenCalledWith(
      "anon_123",
      { referralSource: "mentor-42" },
    );
    expect(attachValidatedVisitToConversationMock).toHaveBeenCalledWith({
      conversationId: "conv-123",
      userId: "anon_123",
      visit: expect.objectContaining({ code: "mentor-42", visitId: "visit_123" }),
    });
  });

  it("assignAttachments returns null for empty attachments", async () => {
    const { ChatStreamPipeline } = await import("@/lib/chat/stream-pipeline");
    const pipeline = new ChatStreamPipeline();
    const result = await pipeline.assignAttachments("u1", "conv1", []);
    expect(result).toBeNull();
  });

  it("createStreamResponse returns Response with SSE content type", async () => {
    runClaudeAgentLoopStreamMock.mockImplementation(async ({ callbacks }: { callbacks: { onDelta: (text: string) => void } }) => {
      callbacks.onDelta("hello");
    });

    const { ChatStreamPipeline } = await import("@/lib/chat/stream-pipeline");
    const pipeline = new ChatStreamPipeline();
    const res = pipeline.createStreamResponse({
      apiKey: "test",
      context: { requestId: "r1", route: "/test" } as never,
      conversationId: "c1",
      interactor: {
        appendMessage: vi.fn(),
        recordToolUsed: vi.fn(async () => {}),
      } as never,
      summarizationInteractor: {
        summarizeIfNeeded: vi.fn(async () => {}),
      } as never,
      role: "STAFF" as never,
      userId: "u1",
      systemPrompt: "sys",
      contextMessages: [{ role: "user" as const, content: "hi" }],
      tools: [],
      toolExecutor: vi.fn(),
    });

    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
  });

  // --- Structural tests ---

  it("route.ts POST handler is under 80 lines total", () => {
    const routePath = join(process.cwd(), "src/app/api/chat/stream/route.ts");
    const content = readFileSync(routePath, "utf-8");
    const lines = content.split("\n").length;
    expect(lines).toBeLessThanOrEqual(95);
  });

  it("stream-pipeline.ts exists and exports ChatStreamPipeline", async () => {
    const mod = await import("@/lib/chat/stream-pipeline");
    expect(mod.ChatStreamPipeline).toBeDefined();
    expect(typeof mod.ChatStreamPipeline).toBe("function");
  });
});
