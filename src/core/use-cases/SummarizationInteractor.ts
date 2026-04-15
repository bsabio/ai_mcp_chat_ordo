import type { MessageRepository } from "./MessageRepository";
import type { LlmSummarizer } from "./LlmSummarizer";
import type { ConversationEventRecorder } from "./ConversationEventRecorder";
import type { Message } from "../entities/conversation";

const SUMMARIZE_THRESHOLD = 40;
const SUMMARIZE_WINDOW = 20;
const META_SUMMARY_THRESHOLD = 5;
const activeSummaries = new Set<string>();

export class SummarizationInteractor {
  constructor(
    private readonly messageRepo: MessageRepository,
    private readonly llmSummarizer: LlmSummarizer,
    private readonly eventRecorder?: ConversationEventRecorder,
  ) {}

  async summarizeIfNeeded(conversationId: string): Promise<void> {
    if (activeSummaries.has(conversationId)) {
      return;
    }

    activeSummaries.add(conversationId);

    try {
      const messages = await this.messageRepo.listByConversation(conversationId);
      const messageCount = messages.length;

      // Turn-level summarization
      if (messageCount > SUMMARIZE_THRESHOLD) {
        const lastSummary = this.findLastSummary(messages);
        const messagesSinceLastSummary = lastSummary
          ? messages.filter((m) => m.createdAt > lastSummary.createdAt).length
          : messageCount;

        if (messagesSinceLastSummary > SUMMARIZE_WINDOW) {
          const messagesToKeep = messages.slice(-SUMMARIZE_WINDOW);
          const cutoffMessage = messagesToKeep[0];
          const messagesToSummarize = messages.filter(
            (m) => m.role !== "system" && m.createdAt < cutoffMessage.createdAt,
          );

          if (cutoffMessage && messagesToSummarize.length > 0) {
            const lastSummarizedMessage = messagesToSummarize[messagesToSummarize.length - 1];
            if (lastSummarizedMessage) {
              const summaryText = await this.llmSummarizer.summarize(messagesToSummarize);

              const tokenEstimate = Math.ceil(summaryText.length / 4);
              await this.messageRepo.create({
                conversationId,
                role: "system",
                content: summaryText,
                parts: [
                  { type: "summary", text: summaryText, coversUpToMessageId: lastSummarizedMessage.id },
                  {
                    type: "compaction_marker",
                    kind: "summary",
                    compactedCount: messagesToSummarize.length,
                    coversUpToMessageId: lastSummarizedMessage.id,
                  },
                ],
                tokenEstimate,
              });

              await this.eventRecorder?.record(conversationId, "summarized", {
                messages_covered: messagesToSummarize.length,
                summary_tokens: tokenEstimate,
              });
            }
          }
        }
      }

      // Always check if meta-compaction is needed
      await this.metaCompactIfNeeded(conversationId);
    } finally {
      activeSummaries.delete(conversationId);
    }
  }

  private findLastSummary(messages: Message[]): Message | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "system" && msg.parts.some((p) => p.type === "summary")) {
        return msg;
      }
    }
    return null;
  }

  private async metaCompactIfNeeded(conversationId: string): Promise<void> {
    const messages = await this.messageRepo.listByConversation(conversationId);

    // Find the most recent meta_summary — only count summaries AFTER it
    // to avoid re-triggering on summaries already compacted.
    let metaCutoff = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "system" && messages[i].parts.some((p) => p.type === "meta_summary")) {
        metaCutoff = i;
        break;
      }
    }

    const summaries = messages
      .slice(metaCutoff + 1)
      .filter((m) => m.role === "system" && m.parts.some((p) => p.type === "summary"));

    if (summaries.length < META_SUMMARY_THRESHOLD) return;

    // Keep the most recent summary intact; compact the rest
    const summariesToCompact = summaries.slice(0, -1);
    const lastSummary = summaries[summaries.length - 1];

    const metaSummaryText = await this.llmSummarizer.summarize(
      summariesToCompact.map((m) => ({
        ...m,
        content: m.parts.find((p) => p.type === "summary")?.text ?? m.content,
        role: "assistant" as const,
      })),
    );

    const tokenEstimate = Math.ceil(metaSummaryText.length / 4);
    await this.messageRepo.create({
      conversationId,
      role: "system",
      content: metaSummaryText,
      parts: [
        {
          type: "meta_summary",
          text: metaSummaryText,
          coversUpToSummaryId: lastSummary.id,
          summariesCompacted: summariesToCompact.length,
        },
        {
          type: "compaction_marker",
          kind: "meta_summary",
          compactedCount: summariesToCompact.length,
          coversUpToSummaryId: lastSummary.id,
        },
      ],
      tokenEstimate,
    });

    await this.eventRecorder?.record(conversationId, "meta_summarized", {
      summaries_compacted: summariesToCompact.length,
      meta_summary_tokens: tokenEstimate,
    });
  }
}
