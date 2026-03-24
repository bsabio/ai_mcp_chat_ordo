import type { MessagePart } from "./message-parts";
import type { ConversationRoutingSnapshot } from "./conversation-routing";

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  // Sprint 0 metadata (CONVO-070)
  convertedFrom: string | null;
  messageCount: number;
  firstMessageAt: string | null;
  lastToolUsed: string | null;
  sessionSource: string;
  promptVersion: number | null;
  routingSnapshot: ConversationRoutingSnapshot;
  referralSource: string | null;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  parts: MessagePart[];
  createdAt: string;
  tokenEstimate: number;
}

export interface NewMessage {
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  parts: MessagePart[];
}
