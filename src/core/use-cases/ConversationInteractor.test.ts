import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConversationInteractor, NotFoundError, MessageLimitError } from "./ConversationInteractor";
import type { ConversationRepository } from "./ConversationRepository";
import type { MessageRepository } from "./MessageRepository";
import type { Conversation, ConversationSummary, Message, NewMessage } from "../entities/conversation";
import { createConversationRoutingSnapshot } from "../entities/conversation-routing";

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

function createMockRepos() {
  const convRepo = {
    create: vi.fn().mockResolvedValue(makeConversation()),
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
  } as ConversationRepository & { recordUserMessageAppendedWithEvent?: ReturnType<typeof vi.fn> };
  const msgRepo = {
    create: vi.fn().mockResolvedValue(makeMessage()),
    findById: vi.fn().mockResolvedValue(null),
    listByConversation: vi.fn().mockResolvedValue([]),
    listRecentByConversation: vi.fn().mockResolvedValue([]),
    countByConversation: vi.fn().mockResolvedValue(0),
    update: vi.fn().mockResolvedValue(makeMessage()),
  } as MessageRepository & { createWithinConversationLimit?: ReturnType<typeof vi.fn> };
  return { convRepo, msgRepo };
}

describe("ConversationInteractor", () => {
  let interactor: ConversationInteractor;
  let convRepo: ConversationRepository & { recordUserMessageAppendedWithEvent?: ReturnType<typeof vi.fn> };
  let msgRepo: MessageRepository & { createWithinConversationLimit?: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    const mocks = createMockRepos();
    convRepo = mocks.convRepo;
    msgRepo = mocks.msgRepo;
    interactor = new ConversationInteractor(convRepo, msgRepo);
  });

  describe("ensureActive", () => {
    it("creates a new conversation when none exists", async () => {
      await interactor.ensureActive("usr_1");
      expect(convRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "usr_1", title: "" }),
      );
      expect((convRepo.create as ReturnType<typeof vi.fn>).mock.calls[0][0].id).toMatch(/^conv_/);
    });

    it("returns existing active conversation without creating", async () => {
      const existing = makeConversation({ id: "conv_existing", userId: "usr_1" });
      (convRepo.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue(existing);

      const result = await interactor.ensureActive("usr_1");
      expect(result.id).toBe("conv_existing");
      expect(convRepo.create).not.toHaveBeenCalled();
      expect(convRepo.archiveByUser).not.toHaveBeenCalled();
    });
  });

  describe("get — ownership enforcement (NEG-SEC-6)", () => {
    it("returns conversation + messages for owner", async () => {
      (convRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeConversation({ id: "conv_1", userId: "usr_1" }),
      );
      (msgRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue([makeMessage()]);

      const result = await interactor.get("conv_1", "usr_1");
      expect(result.conversation.id).toBe("conv_1");
      expect(result.messages.length).toBe(1);
    });

    it("throws NotFoundError for wrong user (not 403)", async () => {
      (convRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeConversation({ id: "conv_1", userId: "usr_1" }),
      );

      await expect(interactor.get("conv_1", "usr_other")).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError for nonexistent conversation", async () => {
      (convRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      await expect(interactor.get("conv_999", "usr_1")).rejects.toThrow(NotFoundError);
    });

    it("uses the recent message path for streaming context when the summary boundary is present", async () => {
      (convRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeConversation({ id: "conv_1", userId: "usr_1", messageCount: 120 }),
      );
      (msgRepo.listRecentByConversation as ReturnType<typeof vi.fn>).mockResolvedValue([
        makeMessage({
          id: "msg_summary",
          role: "system",
          parts: [{ type: "summary", text: "Earlier summary", coversUpToMessageId: "msg_40" }],
          content: "Earlier summary",
        }),
        makeMessage({ id: "msg_recent", role: "user", content: "Latest", parts: [{ type: "text", text: "Latest" }] }),
      ]);

      const result = await interactor.getForStreamingContext("conv_1", "usr_1");

      expect(msgRepo.listRecentByConversation).toHaveBeenCalledWith("conv_1", 50);
      expect(msgRepo.listByConversation).not.toHaveBeenCalled();
      expect(result.usedFullHistory).toBe(false);
      expect(result.messages).toHaveLength(2);
    });

    it("falls back to full history for streaming context when the recent slice has no summary boundary", async () => {
      (convRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeConversation({ id: "conv_1", userId: "usr_1", messageCount: 120 }),
      );
      (msgRepo.listRecentByConversation as ReturnType<typeof vi.fn>).mockResolvedValue([
        makeMessage({ id: "msg_recent", role: "assistant", content: "Latest reply", parts: [{ type: "text", text: "Latest reply" }] }),
      ]);
      (msgRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue([
        makeMessage({ id: "msg_old", role: "user", content: "Older", parts: [{ type: "text", text: "Older" }] }),
        makeMessage({ id: "msg_recent", role: "assistant", content: "Latest reply", parts: [{ type: "text", text: "Latest reply" }] }),
      ]);

      const result = await interactor.getForStreamingContext("conv_1", "usr_1");

      expect(msgRepo.listRecentByConversation).toHaveBeenCalledWith("conv_1", 50);
      expect(msgRepo.listByConversation).toHaveBeenCalledWith("conv_1");
      expect(result.usedFullHistory).toBe(true);
      expect(result.messages).toHaveLength(2);
    });
  });

  describe("delete — ownership enforcement", () => {
    it("deletes owned conversation", async () => {
      (convRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeConversation({ id: "conv_1", userId: "usr_1" }),
      );

      await interactor.delete("conv_1", "usr_1");
      expect(convRepo.delete).toHaveBeenCalledWith("conv_1");
    });

    it("throws NotFoundError for wrong user", async () => {
      (convRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeConversation({ id: "conv_1", userId: "usr_1" }),
      );

      await expect(interactor.delete("conv_1", "usr_other")).rejects.toThrow(NotFoundError);
    });
  });

  describe("appendMessage", () => {
    beforeEach(() => {
      (convRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeConversation({ id: "conv_1", userId: "usr_1", title: "" }),
      );
    });

    it("appends message and records denormalized metadata in one repository call", async () => {
      const newMsg: NewMessage = {
        conversationId: "conv_1",
        role: "user",
        content: "Hello",
        parts: [],
      };

      await interactor.appendMessage(newMsg, "usr_1");
      expect(msgRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        conversationId: "conv_1",
        role: "user",
        content: "Hello",
      }));
      expect(convRepo.recordMessageAppended).toHaveBeenCalledWith(
        "conv_1",
        expect.any(String),
      );
      expect(convRepo.touch).not.toHaveBeenCalled();
      expect(convRepo.incrementMessageCount).not.toHaveBeenCalled();
      expect(convRepo.setFirstMessageAt).not.toHaveBeenCalled();
    });

    it("records user append metadata and message_sent in one repo transaction when supported", async () => {
      convRepo.recordUserMessageAppendedWithEvent = vi.fn().mockResolvedValue(undefined);

      const newMsg: NewMessage = {
        conversationId: "conv_1",
        role: "user",
        content: "Hello",
        parts: [],
      };

      await interactor.appendMessage(newMsg, "usr_1");

      expect(convRepo.recordUserMessageAppendedWithEvent).toHaveBeenCalledWith(
        "conv_1",
        expect.any(String),
        { role: "user", token_estimate: expect.any(Number) },
      );
      expect(convRepo.recordMessageAppended).not.toHaveBeenCalled();
    });

    it("uses the atomic limited-create path when the repository supports it", async () => {
      const createdMessage = makeMessage({ id: "msg_atomic" });
      msgRepo.createWithinConversationLimit = vi.fn().mockResolvedValue(createdMessage);

      const newMsg: NewMessage = {
        conversationId: "conv_1",
        role: "user",
        content: "Hello",
        parts: [],
      };

      await interactor.appendMessage(newMsg, "usr_1");

      expect(msgRepo.createWithinConversationLimit).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: "conv_1", content: "Hello" }),
        200,
      );
      expect(msgRepo.countByConversation).not.toHaveBeenCalled();
      expect(msgRepo.create).not.toHaveBeenCalled();
    });

    it("auto-titles from first user message when title is empty", async () => {
      const newMsg: NewMessage = {
        conversationId: "conv_1",
        role: "user",
        content: "What is the meaning of life?",
        parts: [],
      };

      await interactor.appendMessage(newMsg, "usr_1");
      expect(convRepo.updateTitle).toHaveBeenCalledWith("conv_1", "What is the meaning of life?");
    });

    it("truncates auto-title to 80 chars", async () => {
      const longContent = "A".repeat(120);
      const newMsg: NewMessage = {
        conversationId: "conv_1",
        role: "user",
        content: longContent,
        parts: [],
      };

      await interactor.appendMessage(newMsg, "usr_1");
      expect(convRepo.updateTitle).toHaveBeenCalledWith("conv_1", "A".repeat(80));
    });

    it("does NOT auto-title for assistant messages", async () => {
      const newMsg: NewMessage = {
        conversationId: "conv_1",
        role: "assistant",
        content: "I'm an AI",
        parts: [],
      };

      await interactor.appendMessage(newMsg, "usr_1");
      expect(convRepo.updateTitle).not.toHaveBeenCalled();
    });

    it("does NOT auto-title when title already set", async () => {
      (convRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeConversation({ id: "conv_1", userId: "usr_1", title: "Existing" }),
      );

      const newMsg: NewMessage = {
        conversationId: "conv_1",
        role: "user",
        content: "Hello",
        parts: [],
      };

      await interactor.appendMessage(newMsg, "usr_1");
      expect(convRepo.updateTitle).not.toHaveBeenCalled();
    });

    it("throws MessageLimitError at 200 messages", async () => {
      (msgRepo.countByConversation as ReturnType<typeof vi.fn>).mockResolvedValue(200);

      const newMsg: NewMessage = {
        conversationId: "conv_1",
        role: "user",
        content: "Over limit",
        parts: [],
      };

      await expect(interactor.appendMessage(newMsg, "usr_1")).rejects.toThrow(MessageLimitError);
      expect(msgRepo.create).not.toHaveBeenCalled();
    });

    it("throws MessageLimitError when the atomic limited-create path rejects the insert", async () => {
      msgRepo.createWithinConversationLimit = vi.fn().mockResolvedValue(null);

      const newMsg: NewMessage = {
        conversationId: "conv_1",
        role: "user",
        content: "Over limit",
        parts: [],
      };

      await expect(interactor.appendMessage(newMsg, "usr_1")).rejects.toThrow(MessageLimitError);
      expect(msgRepo.countByConversation).not.toHaveBeenCalled();
      expect(msgRepo.create).not.toHaveBeenCalled();
    });

    it("throws NotFoundError for wrong user on appendMessage", async () => {
      const newMsg: NewMessage = {
        conversationId: "conv_1",
        role: "user",
        content: "Hello",
        parts: [],
      };

      await expect(interactor.appendMessage(newMsg, "usr_other")).rejects.toThrow(NotFoundError);
    });
  });

  describe("list", () => {
    it("delegates to convRepo.listByUser", async () => {
      const summaries: ConversationSummary[] = [
        { id: "conv_1", title: "Chat 1", updatedAt: "2024-01-01", messageCount: 5 },
      ];
      (convRepo.listByUser as ReturnType<typeof vi.fn>).mockResolvedValue(summaries);

      const result = await interactor.list("usr_1");
      expect(result).toEqual(summaries);
      expect(convRepo.listByUser).toHaveBeenCalledWith("usr_1");
    });
  });

  describe("getActiveForUser", () => {
    it("returns conversation + messages when active exists", async () => {
      const conv = makeConversation({ id: "conv_active", userId: "usr_1" });
      (convRepo.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue(conv);
      (msgRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue([makeMessage()]);

      const result = await interactor.getActiveForUser("usr_1");
      expect(result).not.toBeNull();
      if (!result) {
        throw new Error("Expected active conversation result");
      }
      expect(result.conversation.id).toBe("conv_active");
      expect(result.messages.length).toBe(1);
    });

    it("returns null when no active conversation", async () => {
      (convRepo.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const result = await interactor.getActiveForUser("usr_1");
      expect(result).toBeNull();
    });
  });

  describe("archiveActive", () => {
    it("archives and returns the active conversation", async () => {
      const conv = makeConversation({ id: "conv_1", userId: "usr_1", messageCount: 5 });
      (convRepo.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue(conv);

      const result = await interactor.archiveActive("usr_1");
      expect(result).not.toBeNull();
      if (!result) {
        throw new Error("Expected archived conversation result");
      }
      expect(result.id).toBe("conv_1");
      expect(convRepo.archiveByUser).toHaveBeenCalledWith("usr_1");
    });

    it("returns null when no active conversation", async () => {
      (convRepo.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const result = await interactor.archiveActive("usr_1");
      expect(result).toBeNull();
      expect(convRepo.archiveByUser).not.toHaveBeenCalled();
    });
  });

  describe("recordToolUsed", () => {
    it("sets last_tool_used on conversation", async () => {
      await interactor.recordToolUsed("conv_1", "search_library", "AUTHENTICATED");
      expect(convRepo.setLastToolUsed).toHaveBeenCalledWith("conv_1", "search_library");
    });
  });

  describe("updateRoutingSnapshot", () => {
    it("persists routing state for the owning user", async () => {
      (convRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeConversation({ id: "conv_1", userId: "usr_1" }),
      );

      const snapshot = createConversationRoutingSnapshot({
        lane: "organization",
        confidence: 0.88,
        recommendedNextStep: "Offer discovery call",
        detectedNeedSummary: "Team needs workflow design support.",
        lastAnalyzedAt: "2026-03-18T12:00:00.000Z",
      });

      await interactor.updateRoutingSnapshot("conv_1", "usr_1", snapshot);

      expect(convRepo.updateRoutingSnapshot).toHaveBeenCalledWith("conv_1", snapshot);
      expect(convRepo.touch).toHaveBeenCalledWith("conv_1");
    });

    it("throws NotFoundError for wrong user", async () => {
      (convRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeConversation({ id: "conv_1", userId: "usr_1" }),
      );

      await expect(
        interactor.updateRoutingSnapshot("conv_1", "usr_other", createConversationRoutingSnapshot()),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("migrateAnonymousConversations", () => {
    it("transfers ownership and returns migrated ids", async () => {
      (convRepo.transferOwnership as ReturnType<typeof vi.fn>).mockResolvedValue(["conv_a", "conv_b"]);

      const migratedIds = await interactor.migrateAnonymousConversations("anon_123", "usr_1");
      expect(migratedIds).toEqual(["conv_a", "conv_b"]);
      expect(convRepo.transferOwnership).toHaveBeenCalledWith("anon_123", "usr_1");
    });

    it("returns an empty array when no conversations to migrate", async () => {
      (convRepo.transferOwnership as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const migratedIds = await interactor.migrateAnonymousConversations("anon_123", "usr_1");
      expect(migratedIds).toEqual([]);
    });
  });

  describe("event recording", () => {
    let eventRecorder: { record: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      eventRecorder = { record: vi.fn().mockResolvedValue(undefined) };
      const mocks = createMockRepos();
      convRepo = mocks.convRepo;
      msgRepo = mocks.msgRepo;
      interactor = new ConversationInteractor(convRepo, msgRepo, eventRecorder as never);
    });

    it("emits 'started' event on create via ensureActive", async () => {
      (convRepo.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      await interactor.ensureActive("usr_1");
      expect(eventRecorder.record).toHaveBeenCalledWith(
        expect.stringMatching(/^conv_/),
        "started",
        expect.objectContaining({ session_source: "authenticated" }),
      );
    });

    it("emits 'started' with anonymous_cookie session_source for anon users", async () => {
      (convRepo.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      await interactor.ensureActive("anon_abc123");
      expect(eventRecorder.record).toHaveBeenCalledWith(
        expect.stringMatching(/^conv_/),
        "started",
        expect.objectContaining({ session_source: "anonymous_cookie" }),
      );
    });

    it("emits 'archived' event with message_count and duration_hours", async () => {
      const conv = makeConversation({ id: "conv_1", userId: "usr_1", messageCount: 10 });
      (convRepo.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue(conv);

      await interactor.archiveActive("usr_1");
      expect(eventRecorder.record).toHaveBeenCalledWith(
        "conv_1",
        "archived",
        expect.objectContaining({ message_count: 10, duration_hours: expect.any(Number) }),
      );
    });

    it("emits 'tool_used' event on recordToolUsed", async () => {
      await interactor.recordToolUsed("conv_1", "calculator", "AUTHENTICATED");
      expect(eventRecorder.record).toHaveBeenCalledWith(
        "conv_1",
        "tool_used",
        { tool_name: "calculator", role: "AUTHENTICATED" },
      );
    });

    it("emits 'message_sent' for user appends when the repo does not support atomic append effects", async () => {
      (convRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeConversation({ id: "conv_1", userId: "usr_1", title: "" }),
      );

      await interactor.appendMessage(
        { conversationId: "conv_1", role: "user", content: "Hello", parts: [] },
        "usr_1",
      );

      expect(eventRecorder.record).toHaveBeenCalledWith(
        "conv_1",
        "message_sent",
        { role: "user", token_estimate: expect.any(Number) },
      );
    });

    it("skips eventRecorder message_sent when the repo handles atomic append effects", async () => {
      convRepo.recordUserMessageAppendedWithEvent = vi.fn().mockResolvedValue(undefined);
      (convRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeConversation({ id: "conv_1", userId: "usr_1", title: "" }),
      );

      await interactor.appendMessage(
        { conversationId: "conv_1", role: "user", content: "Hello", parts: [] },
        "usr_1",
      );

      expect(convRepo.recordUserMessageAppendedWithEvent).toHaveBeenCalled();
      expect(eventRecorder.record).not.toHaveBeenCalledWith(
        "conv_1",
        "message_sent",
        expect.anything(),
      );
    });

    it("emits 'converted' events only for migrated conversations", async () => {
      (convRepo.transferOwnership as ReturnType<typeof vi.fn>).mockResolvedValue(["conv_a"]);

      await interactor.migrateAnonymousConversations("anon_123", "usr_1");
      expect(eventRecorder.record).toHaveBeenCalledTimes(1);
      expect(eventRecorder.record).toHaveBeenCalledWith(
        "conv_a",
        "converted",
        { from: "anon_123", to: "usr_1" },
      );
    });

    it("emits lane_analyzed and lane_changed when routing lane changes", async () => {
      (convRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeConversation({
          id: "conv_1",
          userId: "usr_1",
          routingSnapshot: createConversationRoutingSnapshot({ lane: "uncertain" }),
        }),
      );

      await interactor.updateRoutingSnapshot(
        "conv_1",
        "usr_1",
        createConversationRoutingSnapshot({
          lane: "organization",
          confidence: 0.93,
          recommendedNextStep: "Schedule an intake call",
          detectedNeedSummary: "Cross-functional workflow redesign.",
          lastAnalyzedAt: "2026-03-18T13:00:00.000Z",
        }),
      );

      expect(eventRecorder.record).toHaveBeenNthCalledWith(
        1,
        "conv_1",
        "lane_analyzed",
        {
          lane: "organization",
          confidence: 0.93,
          recommended_next_step: "Schedule an intake call",
          detected_need_summary: "Cross-functional workflow redesign.",
          analyzed_at: "2026-03-18T13:00:00.000Z",
        },
      );
      expect(eventRecorder.record).toHaveBeenNthCalledWith(
        2,
        "conv_1",
        "lane_changed",
        {
          from_lane: "uncertain",
          to_lane: "organization",
          confidence: 0.93,
          analyzed_at: "2026-03-18T13:00:00.000Z",
        },
      );
    });

    it("emits lane_uncertain when analysis remains uncertain", async () => {
      (convRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeConversation({
          id: "conv_1",
          userId: "usr_1",
          routingSnapshot: createConversationRoutingSnapshot({ lane: "uncertain" }),
        }),
      );

      await interactor.updateRoutingSnapshot(
        "conv_1",
        "usr_1",
        createConversationRoutingSnapshot({
          lane: "uncertain",
          confidence: 0.41,
          detectedNeedSummary: "Need is still ambiguous.",
          lastAnalyzedAt: "2026-03-18T14:00:00.000Z",
        }),
      );

      expect(eventRecorder.record).toHaveBeenNthCalledWith(
        1,
        "conv_1",
        "lane_analyzed",
        {
          lane: "uncertain",
          confidence: 0.41,
          recommended_next_step: null,
          detected_need_summary: "Need is still ambiguous.",
          analyzed_at: "2026-03-18T14:00:00.000Z",
        },
      );
      expect(eventRecorder.record).toHaveBeenNthCalledWith(
        2,
        "conv_1",
        "lane_uncertain",
        {
          lane: "uncertain",
          confidence: 0.41,
          recommended_next_step: null,
          detected_need_summary: "Need is still ambiguous.",
          analyzed_at: "2026-03-18T14:00:00.000Z",
        },
      );
    });
  });
});
