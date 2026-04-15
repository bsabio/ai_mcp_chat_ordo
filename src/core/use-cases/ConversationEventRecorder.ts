export interface ConversationEventData {
  id: string;
  conversationId: string;
  eventType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ConversationEventRepository {
  record(event: {
    conversationId: string;
    eventType: string;
    metadata: Record<string, unknown>;
  }): Promise<void>;

  listByConversation(conversationId: string): Promise<ConversationEventData[]>;
}

export class ConversationEventRecorder {
  constructor(private readonly repo: ConversationEventRepository) {}

  async record(
    conversationId: string,
    eventType: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.repo.record({ conversationId, eventType, metadata });
  }
}
