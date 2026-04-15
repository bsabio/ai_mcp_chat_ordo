import { describe, it, expect, vi, beforeEach } from "vitest";
import { SummarizationInteractor } from "./SummarizationInteractor";
import type { MessageRepository } from "./MessageRepository";
import type { LlmSummarizer } from "./LlmSummarizer";
import type { Message } from "../entities/conversation";

function makeMessage(overrides: Partial<Message> = {}, index = 0): Message {
  return {
    id: `msg_${index}`,
    conversationId: "conv_1",
    role: "user",
    content: `Message ${index}`,
    parts: [{ type: "text", text: `Message ${index}` }],
    createdAt: new Date(2024, 0, 1, 0, index).toISOString(),
    tokenEstimate: 4,
    ...overrides,
  };
}

function makeMessages(count: number): Message[] {
  return Array.from({ length: count }, (_, i) =>
    makeMessage({ role: i % 2 === 0 ? "user" : "assistant" }, i),
  );
}

function createMocks() {
  const messageRepo: MessageRepository = {
    create: vi.fn().mockResolvedValue(makeMessage({}, 999)),
    findById: vi.fn().mockResolvedValue(null),
    listByConversation: vi.fn().mockResolvedValue([]),
    listRecentByConversation: vi.fn().mockResolvedValue([]),
    countByConversation: vi.fn().mockResolvedValue(0),
    update: vi.fn().mockResolvedValue(makeMessage({}, 999)),
  };
  const summarizer: LlmSummarizer = {
    summarize: vi.fn().mockResolvedValue("Summary of the conversation."),
  };
  const eventRecorder = {
    record: vi.fn().mockResolvedValue(undefined),
  };
  return { messageRepo, summarizer, eventRecorder };
}

function createDeferred<T>() {
  let resolveFn: ((value: T) => void) | undefined;
  const promise = new Promise<T>((res) => {
    resolveFn = res;
  });
  return {
    promise,
    resolve(value: T) {
      if (!resolveFn) {
        throw new Error("Deferred resolver was not initialized");
      }
      resolveFn(value);
    },
  };
}

describe("SummarizationInteractor", () => {
  let messageRepo: MessageRepository;
  let summarizer: LlmSummarizer;
  let eventRecorder: { record: ReturnType<typeof vi.fn> };
  let interactor: SummarizationInteractor;

  beforeEach(() => {
    const mocks = createMocks();
    messageRepo = mocks.messageRepo;
    summarizer = mocks.summarizer;
    eventRecorder = mocks.eventRecorder;
    interactor = new SummarizationInteractor(messageRepo, summarizer, eventRecorder as never);
  });

  it("does not summarize when message count is below threshold", async () => {
    (messageRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeMessages(30),
    );

    await interactor.summarizeIfNeeded("conv_1");
    expect(summarizer.summarize).not.toHaveBeenCalled();
    expect(messageRepo.create).not.toHaveBeenCalled();
  });

  it("summarizes when threshold and window conditions are met", async () => {
    (messageRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeMessages(45),
    );

    await interactor.summarizeIfNeeded("conv_1");
    expect(summarizer.summarize).toHaveBeenCalledTimes(1);
    // Should summarize messages before the last 20
    const summarizedMessages = (summarizer.summarize as ReturnType<typeof vi.fn>).mock.calls[0][0] as Message[];
    expect(summarizedMessages.length).toBe(25); // 45 - 20 window
  });

  it("stores summary as system message with summary part", async () => {
    (messageRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeMessages(45),
    );

    await interactor.summarizeIfNeeded("conv_1");
    expect(messageRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "conv_1",
        role: "system",
        content: "Summary of the conversation.",
        parts: expect.arrayContaining([
          expect.objectContaining({ type: "summary", coversUpToMessageId: "msg_24" }),
          expect.objectContaining({
            type: "compaction_marker",
            kind: "summary",
            compactedCount: 25,
            coversUpToMessageId: "msg_24",
          }),
        ]),
      }),
    );
  });

  it("emits summarized event with correct metadata", async () => {
    (messageRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeMessages(45),
    );

    await interactor.summarizeIfNeeded("conv_1");
    expect(eventRecorder.record).toHaveBeenCalledWith(
      "conv_1",
      "summarized",
      expect.objectContaining({
        messages_covered: 25,
        summary_tokens: expect.any(Number),
      }),
    );
  });

  it("does not re-summarize when within window of last summary", async () => {
    const messages = makeMessages(45);
    // Insert a summary message with timestamp at minute 30 — so only messages 31-44 (14) come after
    const summaryMsg = makeMessage(
      {
        id: "msg_summary",
        role: "system",
        content: "Previous summary",
        parts: [{ type: "summary", text: "Previous summary", coversUpToMessageId: "msg_29" }],
      },
      30,
    );
    // Place summary after first 31 messages; only 14 messages follow (below SUMMARIZE_WINDOW of 20)
    const withSummary = [...messages.slice(0, 31), summaryMsg, ...messages.slice(31, 45)];
    (messageRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue(withSummary);

    await interactor.summarizeIfNeeded("conv_1");
    expect(summarizer.summarize).not.toHaveBeenCalled();
  });

  it("suppresses overlapping summarize runs for the same conversation", async () => {
    const deferred = createDeferred<string>();
    (messageRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeMessages(45),
    );
    (summarizer.summarize as ReturnType<typeof vi.fn>).mockReturnValue(deferred.promise);

    const firstRun = interactor.summarizeIfNeeded("conv_1");
    const secondRun = interactor.summarizeIfNeeded("conv_1");

    await Promise.resolve();
    expect(summarizer.summarize).toHaveBeenCalledTimes(1);

    deferred.resolve("Summary of the conversation.");

    await Promise.all([firstRun, secondRun]);
    expect(messageRepo.create).toHaveBeenCalledTimes(1);
  });

  it("stores meta summaries with a replayable compaction marker", async () => {
    const summaryMessages = Array.from({ length: 5 }, (_, index) =>
      makeMessage(
        {
          id: `summary_${index}`,
          role: "system",
          content: `Summary ${index}`,
          parts: [{ type: "summary", text: `Summary ${index}`, coversUpToMessageId: `msg_${index * 2}` }],
        },
        50 + index,
      ),
    );
    (messageRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue([
      ...makeMessages(10),
      ...summaryMessages,
    ]);

    await interactor.summarizeIfNeeded("conv_1");

    expect(messageRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "conv_1",
        role: "system",
        parts: expect.arrayContaining([
          expect.objectContaining({
            type: "meta_summary",
            coversUpToSummaryId: "summary_4",
            summariesCompacted: 4,
          }),
          expect.objectContaining({
            type: "compaction_marker",
            kind: "meta_summary",
            compactedCount: 4,
            coversUpToSummaryId: "summary_4",
          }),
        ]),
      }),
    );
  });
});
