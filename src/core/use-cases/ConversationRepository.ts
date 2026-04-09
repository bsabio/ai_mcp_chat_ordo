import type { Conversation, ConversationSummary } from "../entities/conversation";
import type { ConversationRoutingSnapshot } from "../entities/conversation-routing";
import type { RoleName } from "../entities/user";

export type ConversationListScope = "active" | "archived" | "deleted" | "all";

export type ConversationDeleteReason =
  | "user_removed"
  | "admin_removed"
  | "privacy_request"
  | "retention_policy";

export interface ConversationRepository {
  create(conv: {
    id: string;
    userId: string;
    title: string;
    status?: "active" | "archived";
    sessionSource?: string;
    referralId?: string;
    referralSource?: string;
    importedAt?: string | null;
    importSourceConversationId?: string | null;
    importedFromExportedAt?: string | null;
  }): Promise<Conversation>;
  listByUser(
    userId: string,
    options?: { scope?: ConversationListScope; limit?: number },
  ): Promise<ConversationSummary[]>;
  findById(id: string): Promise<Conversation | null>;
  findActiveByUser(userId: string): Promise<Conversation | null>;
  archiveByUser(userId: string): Promise<void>;
  archiveById(id: string): Promise<void>;
  softDelete(
    id: string,
    actor: { userId: string; role: RoleName; reason: ConversationDeleteReason },
    policy: { purgeAfter: string },
  ): Promise<void>;
  restoreDeleted(id: string, actorUserId: string): Promise<void>;
  purge(
    id: string,
    actor: { userId: string; role: RoleName | "SYSTEM"; reason: ConversationDeleteReason },
  ): Promise<void>;
  delete(id: string): Promise<void>;
  updateTitle(id: string, title: string): Promise<void>;
  touch(id: string): Promise<void>;
  incrementMessageCount(id: string): Promise<void>;
  setFirstMessageAt(id: string, timestamp: string): Promise<void>;
  recordMessageAppended(id: string, timestamp: string): Promise<void>;
  setLastToolUsed(id: string, toolName: string): Promise<void>;
  setConvertedFrom(id: string, anonUserId: string): Promise<void>;
  setReferralSource(id: string, referralSource: string): Promise<void>;
  updateRoutingSnapshot(id: string, snapshot: ConversationRoutingSnapshot): Promise<void>;
  transferOwnership(fromUserId: string, toUserId: string): Promise<string[]>;
}
