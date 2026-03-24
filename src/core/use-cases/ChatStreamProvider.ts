import type { StreamEvent } from "../entities/chat-stream";
import type { TaskOriginHandoff } from "@/lib/chat/task-origin-handoff";

/**
 * Core Interface for AI Streaming
 * 
 * Defines the contract for external AI providers.
 * Adheres to the Adapter pattern (GoF).
 */
export interface ChatStream {
  events(): AsyncIterableIterator<StreamEvent>;
  cancel(): void;
}

export interface FetchChatStreamOptions {
  conversationId?: string;
  attachments?: Array<{
    assetId: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }>;
  taskOriginHandoff?: TaskOriginHandoff;
}

export interface ChatStreamProvider {
  fetchStream(
    messages: { role: string; content: string }[],
    options?: FetchChatStreamOptions,
  ): Promise<ChatStream>;
}
