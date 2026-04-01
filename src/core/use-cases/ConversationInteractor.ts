import type { ConversationRepository } from "./ConversationRepository";
import type { MessageRepository } from "./MessageRepository";
import type { ConversationEventRecorder } from "./ConversationEventRecorder";
import type { Conversation, ConversationSummary, Message, NewMessage } from "../entities/conversation";
import {
  createConversationRoutingSnapshot,
  type ConversationRoutingSnapshot,
} from "../entities/conversation-routing";

const MAX_MESSAGES_PER_CONVERSATION = 200;
const AUTO_TITLE_MAX_LENGTH = 80;
const STREAM_CONTEXT_RECENT_MESSAGE_LIMIT = 50;

interface AtomicLimitedMessageRepository extends MessageRepository {
  createWithinConversationLimit(
    msg: NewMessage & { tokenEstimate?: number },
    maxMessages: number,
  ): Promise<Message | null>;
}

interface AtomicUserAppendConversationRepository extends ConversationRepository {
  recordUserMessageAppendedWithEvent(
    id: string,
    timestamp: string,
    metadata: { role: "user"; token_estimate: number },
  ): Promise<void>;
}

function hasSummaryBoundary(messages: Message[]): boolean {
  return messages.some(
    (message) =>
      message.role === "system" &&
      message.parts.some((part) => part.type === "summary" || part.type === "meta_summary"),
  );
}

function supportsAtomicLimitedCreate(
  messageRepo: MessageRepository,
): messageRepo is AtomicLimitedMessageRepository {
  return typeof (messageRepo as Partial<AtomicLimitedMessageRepository>).createWithinConversationLimit === "function";
}

function supportsAtomicUserAppendEffects(
  conversationRepo: ConversationRepository,
): conversationRepo is AtomicUserAppendConversationRepository {
  return typeof (conversationRepo as Partial<AtomicUserAppendConversationRepository>).recordUserMessageAppendedWithEvent === "function";
}

export class ConversationInteractor {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly messageRepo: MessageRepository,
    private readonly eventRecorder?: ConversationEventRecorder,
  ) {}

  async ensureActive(
    userId: string,
    options?: { sessionSource?: string; referralId?: string; referralSource?: string },
  ): Promise<Conversation> {
    const existing = await this.conversationRepo.findActiveByUser(userId);
    if (existing) return existing;

    return this.create(userId, "", options);
  }

  private async create(
    userId: string,
    title: string = "",
    options?: { sessionSource?: string; referralId?: string; referralSource?: string },
  ): Promise<Conversation> {
    // Archive any existing active conversation before creating a new one
    await this.conversationRepo.archiveByUser(userId);

    const id = `conv_${crypto.randomUUID()}`;
    const sessionSource = options?.sessionSource ?? (userId.startsWith("anon_") ? "anonymous_cookie" : "authenticated");
    const referralId = options?.referralId;
    const referralSource = options?.referralSource;
    const conversation = await this.conversationRepo.create({
      id,
      userId,
      title,
      status: "active",
      sessionSource,
      referralId,
      referralSource,
    });

    await this.eventRecorder?.record(id, "started", { session_source: sessionSource });

    return conversation;
  }

  async get(conversationId: string, userId: string): Promise<{ conversation: Conversation; messages: Message[] }> {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new NotFoundError("Conversation not found");
    }
    const messages = await this.messageRepo.listByConversation(conversationId);
    return { conversation, messages };
  }

  async getForStreamingContext(
    conversationId: string,
    userId: string,
  ): Promise<{ conversation: Conversation; messages: Message[]; usedFullHistory: boolean }> {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new NotFoundError("Conversation not found");
    }

    if (conversation.messageCount <= STREAM_CONTEXT_RECENT_MESSAGE_LIMIT) {
      const messages = await this.messageRepo.listByConversation(conversationId);
      return { conversation, messages, usedFullHistory: true };
    }

    const recentMessages = await this.messageRepo.listRecentByConversation(
      conversationId,
      STREAM_CONTEXT_RECENT_MESSAGE_LIMIT,
    );

    if (hasSummaryBoundary(recentMessages)) {
      return { conversation, messages: recentMessages, usedFullHistory: false };
    }

    const messages = await this.messageRepo.listByConversation(conversationId);
    return { conversation, messages, usedFullHistory: true };
  }

  async getActiveForUser(userId: string): Promise<{ conversation: Conversation; messages: Message[] } | null> {
    const conversation = await this.conversationRepo.findActiveByUser(userId);
    if (!conversation) return null;
    const messages = await this.messageRepo.listByConversation(conversation.id);
    return { conversation, messages };
  }

  async list(userId: string): Promise<ConversationSummary[]> {
    return this.conversationRepo.listByUser(userId);
  }

  async delete(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new NotFoundError("Conversation not found");
    }
    await this.conversationRepo.delete(conversationId);
  }

  async archiveActive(userId: string): Promise<Conversation | null> {
    const active = await this.conversationRepo.findActiveByUser(userId);
    if (!active) return null;

    await this.conversationRepo.archiveByUser(userId);

    const durationMs = new Date().getTime() - new Date(active.createdAt).getTime();
    const durationHours = Math.round((durationMs / 3_600_000) * 10) / 10;

    await this.eventRecorder?.record(active.id, "archived", {
      message_count: active.messageCount,
      duration_hours: durationHours,
    });

    return active;
  }

  async appendMessage(msg: NewMessage, userId: string): Promise<Message> {
    const conversation = await this.conversationRepo.findById(msg.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new NotFoundError("Conversation not found");
    }

    const tokenEstimate = Math.ceil(msg.content.length / 4);
    const message = supportsAtomicLimitedCreate(this.messageRepo)
      ? await this.messageRepo.createWithinConversationLimit(
          { ...msg, tokenEstimate },
          MAX_MESSAGES_PER_CONVERSATION,
        )
      : await this.createMessageWithFallbackLimitCheck(msg, tokenEstimate);

    if (!message) {
      throw new MessageLimitError(`Conversation has reached the ${MAX_MESSAGES_PER_CONVERSATION}-message limit`);
    }

    // Auto-title from first user message
    if (msg.role === "user" && !conversation.title) {
      const title = msg.content.slice(0, AUTO_TITLE_MAX_LENGTH);
      await this.conversationRepo.updateTitle(msg.conversationId, title);
    }

    if (msg.role === "user" && supportsAtomicUserAppendEffects(this.conversationRepo)) {
      await this.conversationRepo.recordUserMessageAppendedWithEvent(
        msg.conversationId,
        message.createdAt,
        { role: "user", token_estimate: tokenEstimate },
      );
    } else {
      // Update denormalized metadata in one repository operation.
      await this.conversationRepo.recordMessageAppended(msg.conversationId, message.createdAt);

      if (msg.role === "user") {
        await this.eventRecorder?.record(msg.conversationId, "message_sent", {
          role: "user",
          token_estimate: tokenEstimate,
        });
      }
    }

    return message;
  }

  private async createMessageWithFallbackLimitCheck(
    msg: NewMessage,
    tokenEstimate: number,
  ): Promise<Message | null> {
    const count = await this.messageRepo.countByConversation(msg.conversationId);
    if (count >= MAX_MESSAGES_PER_CONVERSATION) {
      return null;
    }

    return this.messageRepo.create({ ...msg, tokenEstimate });
  }

  async recordToolUsed(conversationId: string, toolName: string, role: string): Promise<void> {
    await this.conversationRepo.setLastToolUsed(conversationId, toolName);
    await this.eventRecorder?.record(conversationId, "tool_used", {
      tool_name: toolName,
      role,
    });
  }

  async updateRoutingSnapshot(
    conversationId: string,
    userId: string,
    snapshot: ConversationRoutingSnapshot,
  ): Promise<void> {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new NotFoundError("Conversation not found");
    }

    const normalizedSnapshot = createConversationRoutingSnapshot(snapshot);
    const previousLane = conversation.routingSnapshot.lane;

    await this.conversationRepo.updateRoutingSnapshot(conversationId, normalizedSnapshot);
    await this.conversationRepo.touch(conversationId);

    const eventMetadata = {
      lane: normalizedSnapshot.lane,
      confidence: normalizedSnapshot.confidence,
      recommended_next_step: normalizedSnapshot.recommendedNextStep,
      detected_need_summary: normalizedSnapshot.detectedNeedSummary,
      analyzed_at: normalizedSnapshot.lastAnalyzedAt,
    };

    await this.eventRecorder?.record(conversationId, "lane_analyzed", eventMetadata);

    if (previousLane !== normalizedSnapshot.lane) {
      await this.eventRecorder?.record(conversationId, "lane_changed", {
        from_lane: previousLane,
        to_lane: normalizedSnapshot.lane,
        confidence: normalizedSnapshot.confidence,
        analyzed_at: normalizedSnapshot.lastAnalyzedAt,
      });
    }

    if (normalizedSnapshot.lane === "uncertain") {
      await this.eventRecorder?.record(conversationId, "lane_uncertain", eventMetadata);
    }
  }

  async migrateAnonymousConversations(
    anonUserId: string,
    newUserId: string,
  ): Promise<string[]> {
    // Archive any existing active conversation for the authenticated user
    // so the transferred anonymous conversation becomes the active one.
    await this.conversationRepo.archiveByUser(newUserId);

    const migratedIds = await this.conversationRepo.transferOwnership(anonUserId, newUserId);

    for (const convId of migratedIds) {
      await this.eventRecorder?.record(convId, "converted", {
        from: anonUserId,
        to: newUserId,
      });
    }

    return migratedIds;
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class MessageLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MessageLimitError";
  }
}
