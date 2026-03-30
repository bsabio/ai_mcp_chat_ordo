import type { Message, NewMessage } from "../entities/conversation";

export interface MessageRepository {
  create(msg: NewMessage & { tokenEstimate?: number }): Promise<Message>;
  findById(id: string): Promise<Message | null>;
  listByConversation(conversationId: string): Promise<Message[]>;
  listRecentByConversation(conversationId: string, limit: number): Promise<Message[]>;
  countByConversation(conversationId: string): Promise<number>;
  update(id: string, update: { content: string; parts: NewMessage["parts"] }): Promise<Message>;
}
