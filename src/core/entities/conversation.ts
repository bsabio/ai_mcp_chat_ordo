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
  referralId?: string | null;
  referralSource: string | null;
  deletedAt?: string | null;
  deletedByUserId?: string | null;
  deleteReason?: "user_removed" | "admin_removed" | "privacy_request" | "retention_policy" | null;
  purgeAfter?: string | null;
  restoredAt?: string | null;
  importedAt?: string | null;
  importSourceConversationId?: string | null;
  importedFromExportedAt?: string | null;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
  status?: "active" | "archived";
  deletedAt?: string | null;
  purgeAfter?: string | null;
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
