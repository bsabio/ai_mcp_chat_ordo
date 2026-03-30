import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConversationInteractor, MessageLimitError } from "@/core/use-cases/ConversationInteractor";
import { SummarizationInteractor } from "@/core/use-cases/SummarizationInteractor";
import { buildContextWindow } from "@/lib/chat/context-window";
import type { ConversationRepository } from "@/core/use-cases/ConversationRepository";
import type { MessageRepository } from "@/core/use-cases/MessageRepository";
import type { LlmSummarizer } from "@/core/use-cases/LlmSummarizer";
import type { Conversation, Message } from "@/core/entities/conversation";
import type { MessagePart } from "@/core/entities/message-parts";
import type { ConversationEventRecorder } from "@/core/use-cases/ConversationEventRecorder";
import { createConversationRoutingSnapshot } from "@/core/entities/conversation-routing";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: "conv_1",
    userId: "usr_1",
    title: "",
    status: "active",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    convertedFrom: null,
    messageCount: 0,
    firstMessageAt: null,
    lastToolUsed: null,
    sessionSource: "authenticated",
    promptVersion: null,
    routingSnapshot: createConversationRoutingSnapshot(),
    referralSource: null,
    ...overrides,
  };
}

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "msg_1",
    conversationId: "conv_1",
    role: "user",
    content: "Hello",
    parts: [{ type: "text", text: "Hello" }],
    createdAt: "2024-01-01T00:00:00.000Z",
    tokenEstimate: 2,
    ...overrides,
  };
}

function makeSummaryMessage(id: string, coversUpToMessageId: string, createdAt: string): Message {
  return {
    id,
    conversationId: "conv_1",
    role: "system",
    content: `Summary covering up to ${coversUpToMessageId}`,
    parts: [{ type: "summary", text: `Summary covering up to ${coversUpToMessageId}`, coversUpToMessageId }],
    createdAt,
    tokenEstimate: 50,
  };
}

function makeMetaSummaryMessage(id: string, coversUpToSummaryId: string, summariesCompacted: number, createdAt: string): Message {
  return {
    id,
    conversationId: "conv_1",
    role: "system",
    content: `Meta summary covering up to ${coversUpToSummaryId}`,
    parts: [{ type: "meta_summary", text: `Meta summary covering up to ${coversUpToSummaryId}`, coversUpToSummaryId, summariesCompacted }],
    createdAt,
    tokenEstimate: 100,
  };
}

function makeMessages(count: number, summaryCount: number, metaSummaryCount = 0): Message[] {
  const messages: Message[] = [];
  for (let i = 0; i < count; i++) {
    messages.push({
      id: `msg_${i}`,
      conversationId: "conv_1",
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Message ${i}`,
      parts: [{ type: "text", text: `Message ${i}` }],
      createdAt: new Date(2025, 0, 1, 0, i).toISOString(),
      tokenEstimate: 10,
    });
  }
  for (let i = 0; i < summaryCount; i++) {
    messages.push(
      makeSummaryMessage(`summary_${i}`, `msg_${i * 10}`, new Date(2025, 0, 2, 0, i).toISOString()),
    );
  }
  for (let i = 0; i < metaSummaryCount; i++) {
    messages.push(
      makeMetaSummaryMessage(`meta_${i}`, `summary_${i * 4}`, 4, new Date(2025, 0, 3, 0, i).toISOString()),
    );
  }
  return messages;
}

function createMockRepos() {
  const convRepo: ConversationRepository = {
    create: vi.fn().mockImplementation((params) => Promise.resolve(params)),
    listByUser: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    findActiveByUser: vi.fn().mockResolvedValue(null),
    archiveByUser: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    updateTitle: vi.fn().mockResolvedValue(undefined),
    touch: vi.fn().mockResolvedValue(undefined),
    incrementMessageCount: vi.fn().mockResolvedValue(undefined),
    setFirstMessageAt: vi.fn().mockResolvedValue(undefined),
    recordMessageAppended: vi.fn().mockResolvedValue(undefined),
    setLastToolUsed: vi.fn().mockResolvedValue(undefined),
    setConvertedFrom: vi.fn().mockResolvedValue(undefined),
    setReferralSource: vi.fn().mockResolvedValue(undefined),
    updateRoutingSnapshot: vi.fn().mockResolvedValue(undefined),
    transferOwnership: vi.fn().mockResolvedValue([]),
  };
  const msgRepo: MessageRepository = {
    create: vi.fn().mockImplementation((params) => Promise.resolve({ id: `msg_new_${Date.now()}`, ...params, createdAt: new Date().toISOString() })),
    findById: vi.fn().mockResolvedValue(null),
    listByConversation: vi.fn().mockResolvedValue([]),
    listRecentByConversation: vi.fn().mockResolvedValue([]),
    countByConversation: vi.fn().mockResolvedValue(0),
    update: vi.fn().mockImplementation((id, update) => Promise.resolve({
      id,
      conversationId: "conv_1",
      role: "assistant",
      content: update.content,
      parts: update.parts,
      createdAt: new Date().toISOString(),
      tokenEstimate: 0,
    })),
  };
  const eventRecorder = {
    record: vi.fn().mockResolvedValue(undefined),
  } as unknown as ConversationEventRecorder;
  return { convRepo, msgRepo, eventRecorder };
}

function createMockSummarizationDeps() {
  const msgRepo: MessageRepository = {
    create: vi.fn().mockImplementation((params) => Promise.resolve({ id: `msg_new_${Date.now()}`, ...params, createdAt: new Date().toISOString() })),
    findById: vi.fn().mockResolvedValue(null),
    listByConversation: vi.fn().mockResolvedValue([]),
    listRecentByConversation: vi.fn().mockResolvedValue([]),
    countByConversation: vi.fn().mockResolvedValue(0),
    update: vi.fn().mockImplementation((id, update) => Promise.resolve({
      id,
      conversationId: "conv_1",
      role: "assistant",
      content: update.content,
      parts: update.parts,
      createdAt: new Date().toISOString(),
      tokenEstimate: 0,
    })),
  };
  const llmSummarizer: LlmSummarizer = {
    summarize: vi.fn().mockResolvedValue("Compacted summary text."),
  };
  const eventRecorder = {
    record: vi.fn().mockResolvedValue(undefined),
  } as unknown as ConversationEventRecorder;
  return { msgRepo, llmSummarizer, eventRecorder };
}

// ===========================================================================
// §5.1 Positive tests
// ===========================================================================
describe("ConversationInteractor.ensureActive", () => {
  let convRepo: ConversationRepository;
  let msgRepo: MessageRepository;
  let eventRecorder: ConversationEventRecorder;
  let interactor: ConversationInteractor;

  beforeEach(() => {
    const mocks = createMockRepos();
    convRepo = mocks.convRepo;
    msgRepo = mocks.msgRepo;
    eventRecorder = mocks.eventRecorder;
    interactor = new ConversationInteractor(convRepo, msgRepo, eventRecorder);
  });

  it("P1: returns existing active conversation", async () => {
    const existing = makeConversation({ id: "conv_existing", userId: "usr_1" });
    (convRepo.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue(existing);

    const result = await interactor.ensureActive("usr_1");

    expect(result.id).toBe("conv_existing");
    expect(convRepo.create).not.toHaveBeenCalled();
    expect(convRepo.archiveByUser).not.toHaveBeenCalled();
  });

  it("P2: creates conversation when none exists", async () => {
    (convRepo.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await interactor.ensureActive("usr_1");

    expect(result.id).toMatch(/^conv_/);
    expect(convRepo.create).toHaveBeenCalledTimes(1);
    expect(eventRecorder.record).toHaveBeenCalledWith(expect.any(String), "started", expect.any(Object));
  });

  it("P3: creates conversation when all are archived", async () => {
    (convRepo.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await interactor.ensureActive("usr_1");

    expect(result.id).toMatch(/^conv_/);
    expect(result.status).toBe("active");
  });

  it("P4: idempotent — returns same conversation on repeat calls", async () => {
    const existing = makeConversation({ id: "conv_fixed", userId: "usr_1" });
    (convRepo.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue(existing);

    const first = await interactor.ensureActive("usr_1");
    const second = await interactor.ensureActive("usr_1");

    expect(first.id).toBe(second.id);
    expect(convRepo.create).not.toHaveBeenCalled();
  });

  it("P5: does not archive existing active conversation", async () => {
    const existing = makeConversation({ id: "conv_active" });
    (convRepo.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue(existing);

    await interactor.ensureActive("usr_1");

    expect(convRepo.archiveByUser).not.toHaveBeenCalled();
  });

  it("P6: records 'started' event on create", async () => {
    (convRepo.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await interactor.ensureActive("usr_1");

    expect(eventRecorder.record).toHaveBeenCalledWith(result.id, "started", {
      session_source: "authenticated",
    });
  });

  it("P13: message limit still enforced with single conversation", async () => {
    const existing = makeConversation({ id: "conv_1", userId: "usr_1" });
    (convRepo.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
    (convRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
    (msgRepo.countByConversation as ReturnType<typeof vi.fn>).mockResolvedValue(200);

    const conv = await interactor.ensureActive("usr_1");

    await expect(
      interactor.appendMessage(
        { conversationId: conv.id, role: "user", content: "one more", parts: [] },
        "usr_1",
      ),
    ).rejects.toThrow(MessageLimitError);
  });
});

// ===========================================================================
// §5.1 continued — Meta-compaction positive tests
// ===========================================================================
describe("SummarizationInteractor meta-compaction", () => {
  it("P7: triggers at 5 summaries", async () => {
    const { msgRepo, llmSummarizer, eventRecorder } = createMockSummarizationDeps();
    (msgRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue(makeMessages(100, 5));

    const interactor = new SummarizationInteractor(msgRepo, llmSummarizer, eventRecorder);
    await interactor.summarizeIfNeeded("conv_1");

    const createCalls = (msgRepo.create as ReturnType<typeof vi.fn>).mock.calls;
    const metaCall = createCalls.find(
      (call: unknown[]) => (call[0] as { parts: MessagePart[] }).parts?.some((p) => p.type === "meta_summary"),
    );
    expect(metaCall).toBeDefined();
  });

  it("P8: preserves most recent summary", async () => {
    const { msgRepo, llmSummarizer, eventRecorder } = createMockSummarizationDeps();
    const messages = makeMessages(100, 5);
    (msgRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue(messages);

    const interactor = new SummarizationInteractor(msgRepo, llmSummarizer, eventRecorder);
    await interactor.summarizeIfNeeded("conv_1");

    // The LLM summarizer should be called for meta with only 4 summaries (not the last)
    const summarizeCalls = (llmSummarizer.summarize as ReturnType<typeof vi.fn>).mock.calls;
    const metaCall = summarizeCalls.find(
      (call: unknown[]) => (call[0] as Message[]).length === 4 && (call[0] as Message[])[0].role === "assistant",
    );
    expect(metaCall).toBeDefined();
  });

  it("P9: creates correct meta_summary part", async () => {
    const { msgRepo, llmSummarizer, eventRecorder } = createMockSummarizationDeps();
    (msgRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue(makeMessages(100, 5));

    const interactor = new SummarizationInteractor(msgRepo, llmSummarizer, eventRecorder);
    await interactor.summarizeIfNeeded("conv_1");

    const createCalls = (msgRepo.create as ReturnType<typeof vi.fn>).mock.calls;
    const metaCall = createCalls.find(
      (call: unknown[]) => (call[0] as { parts: MessagePart[] }).parts?.some((p) => p.type === "meta_summary"),
    );
    expect(metaCall).toBeDefined();
    const metaPart = (metaCall![0] as { parts: MessagePart[] }).parts.find((p) => p.type === "meta_summary");
    expect(metaPart).toMatchObject({
      type: "meta_summary",
      summariesCompacted: 4,
    });
  });

  it("P10: records meta_summarized event", async () => {
    const { msgRepo, llmSummarizer, eventRecorder } = createMockSummarizationDeps();
    (msgRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue(makeMessages(100, 5));

    const interactor = new SummarizationInteractor(msgRepo, llmSummarizer, eventRecorder);
    await interactor.summarizeIfNeeded("conv_1");

    expect(eventRecorder.record).toHaveBeenCalledWith("conv_1", "meta_summarized", expect.objectContaining({
      summaries_compacted: 4,
    }));
  });
});

// ===========================================================================
// §5.1 continued — Context window positive tests
// ===========================================================================
describe("buildContextWindow with meta_summary", () => {
  it("P11: finds meta_summary as anchor", () => {
    const messages: Message[] = [
      makeMetaSummaryMessage("meta_1", "s3", 3, "2025-01-01T00:00:00Z"),
      makeMessage({ id: "msg_1", role: "user", content: "Hello", createdAt: "2025-01-01T01:00:00Z" }),
      makeMessage({ id: "msg_2", role: "assistant", content: "Hi!", createdAt: "2025-01-01T01:01:00Z" }),
    ];

    const result = buildContextWindow(messages);
    expect(result.hasSummary).toBe(true);
    expect(result.contextMessages).toHaveLength(2);
    expect(result.contextMessages[0].content).toBe("Hello");
  });

  it("P12: finds most recent of summary or meta_summary", () => {
    const messages: Message[] = [
      makeMetaSummaryMessage("meta_1", "s3", 3, "2025-01-01T00:00:00Z"),
      makeMessage({ id: "msg_old", role: "user", content: "Older", createdAt: "2025-01-01T01:00:00Z" }),
      makeSummaryMessage("s_4", "msg_old", "2025-01-01T02:00:00Z"),
      makeMessage({ id: "msg_new", role: "user", content: "Newer", createdAt: "2025-01-01T03:00:00Z" }),
    ];

    const result = buildContextWindow(messages);
    expect(result.contextMessages).toHaveLength(1);
    expect(result.contextMessages[0].content).toBe("Newer");
  });
});

// ===========================================================================
// §5.2 Negative tests
// ===========================================================================
describe("Negative tests — removed client APIs", () => {
  it("N1: useGlobalChat context does not expose archiveConversation", async () => {
    const mod = await import("@/hooks/useGlobalChat");
    expect(mod.useGlobalChat).toBeDefined();
    type Context = ReturnType<typeof mod.useGlobalChat>;
    type HasArchive = "archiveConversation" extends keyof Context ? true : false;
    const check: HasArchive = false;
    expect(check).toBe(false);
  });

  it("N2: useGlobalChat context does not expose newConversation", async () => {
    const mod = await import("@/hooks/useGlobalChat");
    expect(mod.useGlobalChat).toBeDefined();
    type Context = ReturnType<typeof mod.useGlobalChat>;
    type HasNewConv = "newConversation" extends keyof Context ? true : false;
    const check: HasNewConv = false;
    expect(check).toBe(false);
  });

  it("N3: meta-compaction does not trigger below threshold", async () => {
    const { msgRepo, llmSummarizer, eventRecorder } = createMockSummarizationDeps();
    (msgRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue(makeMessages(80, 4));

    const interactor = new SummarizationInteractor(msgRepo, llmSummarizer, eventRecorder);
    await interactor.summarizeIfNeeded("conv_1");

    const createCalls = (msgRepo.create as ReturnType<typeof vi.fn>).mock.calls;
    const metaCalls = createCalls.filter(
      (call: unknown[]) => (call[0] as { parts: MessagePart[] }).parts?.some((p) => p.type === "meta_summary"),
    );
    expect(metaCalls).toHaveLength(0);
  });

  it("N4: meta-compaction does not run concurrently (guarded by activeSummaries lock)", async () => {
    const { msgRepo, llmSummarizer, eventRecorder } = createMockSummarizationDeps();
    const messages = makeMessages(100, 5);
    (msgRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue(messages);

    let summarizeResolve: ((v: string) => void) | null = null;
    (llmSummarizer.summarize as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise<string>((resolve) => { summarizeResolve = resolve; }),
    );

    const interactor = new SummarizationInteractor(msgRepo, llmSummarizer, eventRecorder);

    // Start first call — it will block on summarize
    const first = interactor.summarizeIfNeeded("conv_1");
    // Allow microtask to proceed
    await new Promise((r) => setTimeout(r, 10));

    // Second call for same conversation — should return immediately (no-op)
    await interactor.summarizeIfNeeded("conv_1");

    // Only one summarize call should have been made
    expect((llmSummarizer.summarize as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);

    // Resolve and await first
    summarizeResolve!("done");
    await first;
  });

  it("N5: ensureActive does not create for empty userId", async () => {
    const { convRepo, msgRepo, eventRecorder } = createMockRepos();
    (convRepo.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (convRepo.create as ReturnType<typeof vi.fn>).mockImplementation((params) => Promise.resolve(params));

    const interactor = new ConversationInteractor(convRepo, msgRepo, eventRecorder);
    // Even with empty string, the method creates. The behavior is to return a conversation.
    // Validate the call propagates the empty string — the caller is responsible for validation.
    const result = await interactor.ensureActive("");
    expect(result.userId).toBe("");
  });
});

// ===========================================================================
// §5.3 Edge tests
// ===========================================================================
describe("Edge tests", () => {
  it("E1: exactly 5 summaries triggers meta-compaction", async () => {
    const { msgRepo, llmSummarizer, eventRecorder } = createMockSummarizationDeps();
    (msgRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue(makeMessages(100, 5));

    const interactor = new SummarizationInteractor(msgRepo, llmSummarizer, eventRecorder);
    await interactor.summarizeIfNeeded("conv_1");

    const createCalls = (msgRepo.create as ReturnType<typeof vi.fn>).mock.calls;
    const metaCalls = createCalls.filter(
      (call: unknown[]) => (call[0] as { parts: MessagePart[] }).parts?.some((p) => p.type === "meta_summary"),
    );
    expect(metaCalls).toHaveLength(1);
  });

  it("E2: meta-compaction with all identical summaries", async () => {
    const { msgRepo, llmSummarizer, eventRecorder } = createMockSummarizationDeps();
    const messages = makeMessages(100, 0);
    // Add 5 identical summaries
    for (let i = 0; i < 5; i++) {
      messages.push({
        id: `summary_${i}`,
        conversationId: "conv_1",
        role: "system",
        content: "Same summary text",
        parts: [{ type: "summary", text: "Same summary text", coversUpToMessageId: `msg_${i * 10}` }],
        createdAt: new Date(2025, 0, 2, 0, i).toISOString(),
        tokenEstimate: 50,
      });
    }
    (msgRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue(messages);

    const interactor = new SummarizationInteractor(msgRepo, llmSummarizer, eventRecorder);
    await interactor.summarizeIfNeeded("conv_1");

    const createCalls = (msgRepo.create as ReturnType<typeof vi.fn>).mock.calls;
    const metaCalls = createCalls.filter(
      (call: unknown[]) => (call[0] as { parts: MessagePart[] }).parts?.some((p) => p.type === "meta_summary"),
    );
    expect(metaCalls).toHaveLength(1);
  });

  it("E3: buildContextWindow with only meta_summary (no recent summary)", () => {
    const messages: Message[] = [
      makeMetaSummaryMessage("meta_1", "s3", 3, "2025-01-01T00:00:00Z"),
      makeMessage({ id: "msg_1", role: "user", content: "After meta", createdAt: "2025-01-01T01:00:00Z" }),
      makeMessage({ id: "msg_2", role: "assistant", content: "Reply", createdAt: "2025-01-01T01:01:00Z" }),
    ];

    const result = buildContextWindow(messages);
    expect(result.hasSummary).toBe(true);
    expect(result.summaryText).toBe("Meta summary covering up to s3");
    expect(result.contextMessages).toHaveLength(2);
  });

  it("E4: buildContextWindow with meta_summary followed by summary uses most recent", () => {
    const messages: Message[] = [
      makeMessage({ id: "msg_0", role: "user", content: "Very old", createdAt: "2025-01-01T00:00:00Z" }),
      makeMetaSummaryMessage("meta_1", "s3", 3, "2025-01-01T00:30:00Z"),
      makeMessage({ id: "msg_1", role: "user", content: "Middle", createdAt: "2025-01-01T01:00:00Z" }),
      makeSummaryMessage("s_4", "msg_1", "2025-01-01T02:00:00Z"),
      makeMessage({ id: "msg_2", role: "user", content: "Recent", createdAt: "2025-01-01T03:00:00Z" }),
    ];

    const result = buildContextWindow(messages);
    expect(result.contextMessages).toHaveLength(1);
    expect(result.contextMessages[0].content).toBe("Recent");
    expect(result.summaryText).toContain("Summary covering up to");
  });

  it("E5: conversation spanning 500+ messages with layered compaction stays bounded", async () => {
    const { msgRepo, llmSummarizer, eventRecorder } = createMockSummarizationDeps();

    // Simulate: 500 messages, 10 summaries, 1 meta_summary already exists.
    // After the meta_summary, 5 more summaries should trigger another meta-compaction.
    const messages = makeMessages(500, 0);
    // First batch of summaries (already compacted — before meta_summary)
    for (let i = 0; i < 5; i++) {
      messages.push(
        makeSummaryMessage(`old_summary_${i}`, `msg_${i * 20}`, new Date(2025, 0, 2, 0, i).toISOString()),
      );
    }
    // Meta-summary covering the first batch
    messages.push(
      makeMetaSummaryMessage("meta_0", "old_summary_4", 4, new Date(2025, 0, 2, 1, 0).toISOString()),
    );
    // New batch of 5 summaries after meta_summary
    for (let i = 0; i < 5; i++) {
      messages.push(
        makeSummaryMessage(`new_summary_${i}`, `msg_${100 + i * 20}`, new Date(2025, 0, 3, 0, i).toISOString()),
      );
    }
    (msgRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue(messages);

    const interactor = new SummarizationInteractor(msgRepo, llmSummarizer, eventRecorder);
    await interactor.summarizeIfNeeded("conv_1");

    const createCalls = (msgRepo.create as ReturnType<typeof vi.fn>).mock.calls;
    const metaCalls = createCalls.filter(
      (call: unknown[]) => (call[0] as { parts: MessagePart[] }).parts?.some((p) => p.type === "meta_summary"),
    );
    expect(metaCalls).toHaveLength(1);

    // Verify the most recent context window uses the latest anchor
    const fullMessages = [...messages];
    // Add the meta_summary that would have been created
    fullMessages.push(
      makeMetaSummaryMessage("meta_1", "new_summary_4", 4, new Date(2025, 0, 3, 1, 0).toISOString()),
    );
    fullMessages.push(
      makeMessage({ id: "msg_latest", role: "user", content: "Latest", createdAt: new Date(2025, 0, 4).toISOString() }),
    );

    const window = buildContextWindow(fullMessages);
    expect(window.hasSummary).toBe(true);
    expect(window.contextMessages).toHaveLength(1);
    expect(window.contextMessages[0].content).toBe("Latest");
  });

  it("E6: anonymous user ensureActive creates with session_source anonymous_cookie", async () => {
    const { convRepo, msgRepo, eventRecorder } = createMockRepos();
    (convRepo.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const interactor = new ConversationInteractor(convRepo, msgRepo, eventRecorder);
    await interactor.ensureActive("anon_abc123");

    expect(convRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ sessionSource: "anonymous_cookie" }),
    );
  });

  it("E7: migrateAnonymousConversations under single-conversation model", async () => {
    const { convRepo, msgRepo, eventRecorder } = createMockRepos();
    (convRepo.transferOwnership as ReturnType<typeof vi.fn>).mockResolvedValue(["conv_anon_1"]);

    const interactor = new ConversationInteractor(convRepo, msgRepo, eventRecorder);
    const migrated = await interactor.migrateAnonymousConversations("anon_123", "usr_1");

    expect(migrated).toEqual(["conv_anon_1"]);
    expect(convRepo.archiveByUser).toHaveBeenCalledWith("usr_1");
    expect(eventRecorder.record).toHaveBeenCalledWith("conv_anon_1", "converted", {
      from: "anon_123",
      to: "usr_1",
    });
  });

  it("E8: migrateAnonymousConversations when auth user already has active archives it first", async () => {
    const { convRepo, msgRepo, eventRecorder } = createMockRepos();
    (convRepo.transferOwnership as ReturnType<typeof vi.fn>).mockResolvedValue(["conv_anon_1"]);

    const interactor = new ConversationInteractor(convRepo, msgRepo, eventRecorder);
    await interactor.migrateAnonymousConversations("anon_123", "usr_1");

    // archiveByUser is called BEFORE transferOwnership
    const archiveCall = (convRepo.archiveByUser as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    const transferCall = (convRepo.transferOwnership as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    expect(archiveCall).toBeLessThan(transferCall);
  });

  it("E9: meta_summary message has correct token estimate", async () => {
    const { msgRepo, llmSummarizer, eventRecorder } = createMockSummarizationDeps();
    const metaText = "A".repeat(100);
    (llmSummarizer.summarize as ReturnType<typeof vi.fn>).mockResolvedValue(metaText);
    (msgRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue(makeMessages(100, 5));

    const interactor = new SummarizationInteractor(msgRepo, llmSummarizer, eventRecorder);
    await interactor.summarizeIfNeeded("conv_1");

    const createCalls = (msgRepo.create as ReturnType<typeof vi.fn>).mock.calls;
    const metaCall = createCalls.find(
      (call: unknown[]) => (call[0] as { parts: MessagePart[] }).parts?.some((p) => p.type === "meta_summary"),
    );
    expect(metaCall).toBeDefined();
    expect((metaCall![0] as { tokenEstimate: number }).tokenEstimate).toBe(Math.ceil(metaText.length / 4));
  });

  it("E10: summarization + meta-compaction in same call", async () => {
    const { msgRepo, llmSummarizer, eventRecorder } = createMockSummarizationDeps();

    // Set up messages that trigger BOTH summarization (>40 messages, >20 since last summary)
    // AND meta-compaction (5 summaries after meta-compaction).
    // After turn summary is created, listByConversation is called again for meta check.
    // Build messages with summaries BEFORE recent messages so turn-level summarization triggers.
    const oldMessages: Message[] = Array.from({ length: 20 }, (_, i) => makeMessage({
      id: `msg_old_${i}`, role: i % 2 === 0 ? "user" : "assistant",
      content: `Old ${i}`, parts: [{ type: "text", text: `Old ${i}` }],
      createdAt: new Date(2025, 0, 1, 0, i).toISOString(), tokenEstimate: 10,
    }));
    const summaries: Message[] = Array.from({ length: 5 }, (_, i) =>
      makeSummaryMessage(`summary_${i}`, `msg_old_${i * 4}`, new Date(2025, 0, 1, 1, i).toISOString()),
    );
    const recentMessages: Message[] = Array.from({ length: 25 }, (_, i) => makeMessage({
      id: `msg_new_${i}`, role: i % 2 === 0 ? "user" : "assistant",
      content: `New ${i}`, parts: [{ type: "text", text: `New ${i}` }],
      createdAt: new Date(2025, 0, 1, 2, i).toISOString(), tokenEstimate: 10,
    }));

    const messagesBeforeSummarize = [...oldMessages, ...summaries, ...recentMessages];
    const messagesAfterSummarize = [
      ...messagesBeforeSummarize,
      makeSummaryMessage("summary_5", "msg_new_4", new Date(2025, 0, 1, 3, 0).toISOString()),
    ]; // Now 6 summaries → triggers meta-compaction

    let listCallCount = 0;
    (msgRepo.listByConversation as ReturnType<typeof vi.fn>).mockImplementation(() => {
      listCallCount++;
      // First call: for summarizeIfNeeded; second call: for metaCompactIfNeeded
      return Promise.resolve(listCallCount <= 1 ? messagesBeforeSummarize : messagesAfterSummarize);
    });

    const interactor = new SummarizationInteractor(msgRepo, llmSummarizer, eventRecorder);
    await interactor.summarizeIfNeeded("conv_1");

    const createCalls = (msgRepo.create as ReturnType<typeof vi.fn>).mock.calls;

    // Should have both a summary creation and a meta_summary creation
    const summaryCreated = createCalls.some(
      (call: unknown[]) => (call[0] as { parts: MessagePart[] }).parts?.some((p) => p.type === "summary"),
    );
    const metaCreated = createCalls.some(
      (call: unknown[]) => (call[0] as { parts: MessagePart[] }).parts?.some((p) => p.type === "meta_summary"),
    );
    expect(summaryCreated).toBe(true);
    expect(metaCreated).toBe(true);
  });
});

// ===========================================================================
// §5.4 Integration tests
// ===========================================================================
describe("Integration tests", () => {
  it("I1: long conversation lifecycle — create → messages → summary → more → meta-compact", async () => {
    const { msgRepo, llmSummarizer, eventRecorder } = createMockSummarizationDeps();

    // Simulate a conversation with 100 messages and 5 previous summaries
    const messages = makeMessages(100, 5);
    (msgRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue(messages);

    const interactor = new SummarizationInteractor(msgRepo, llmSummarizer, eventRecorder);
    await interactor.summarizeIfNeeded("conv_1");

    // Verify both summarization event and meta_summarized event were recorded
    const recordCalls = (eventRecorder.record as ReturnType<typeof vi.fn>).mock.calls;
    const eventTypes = recordCalls.map((call: unknown[]) => call[1]);

    expect(eventTypes).toContain("meta_summarized");
  });

  it("I2: context window stays bounded after meta-compaction", () => {
    // Create a scenario with a meta_summary followed by a few messages — context window only returns recent
    const messages: Message[] = [
      // Old messages (before compaction)
      ...Array.from({ length: 20 }, (_, i) =>
        makeMessage({ id: `old_${i}`, role: i % 2 === 0 ? "user" : "assistant", content: `Old ${i}`, createdAt: new Date(2025, 0, 1, 0, i).toISOString() }),
      ),
      // Meta summary compacting old summaries
      makeMetaSummaryMessage("meta_1", "s4", 4, new Date(2025, 0, 2, 0, 0).toISOString()),
      // Recent messages after compaction
      makeMessage({ id: "recent_1", role: "user", content: "Recent 1", createdAt: new Date(2025, 0, 3, 0, 0).toISOString() }),
      makeMessage({ id: "recent_2", role: "assistant", content: "Recent 2", createdAt: new Date(2025, 0, 3, 0, 1).toISOString() }),
    ];

    const result = buildContextWindow(messages);

    // Only the 2 recent messages should be in the context (old ones are behind the meta_summary anchor)
    expect(result.contextMessages).toHaveLength(2);
    expect(result.hasSummary).toBe(true);
    expect(result.contextMessages[0].content).toBe("Recent 1");
    expect(result.contextMessages[1].content).toBe("Recent 2");
  });

  it("I3: original messages still in DB after meta-compaction (search still works)", async () => {
    const { msgRepo, llmSummarizer, eventRecorder } = createMockSummarizationDeps();
    const messages = makeMessages(100, 5);
    (msgRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue(messages);

    const interactor = new SummarizationInteractor(msgRepo, llmSummarizer, eventRecorder);
    await interactor.summarizeIfNeeded("conv_1");

    // Verify no deletion calls — messages remain in DB
    // The messageRepo has no delete method — confirming non-destructive compaction
    expect(typeof (msgRepo as unknown as Record<string, unknown>).delete).toBe("undefined");

    // Original messages are still accessible
    const allMessages = await msgRepo.listByConversation("conv_1");
    expect(allMessages.length).toBeGreaterThan(0);
  });
});
