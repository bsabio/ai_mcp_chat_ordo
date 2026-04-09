import type { Conversation } from "@/core/entities/conversation";
import { getConversationDataMapper } from "@/adapters/RepositoryFactory";

export const ANONYMOUS_CONVERSATION_TTL_DAYS = 30;
export const ANONYMOUS_CONVERSATION_HISTORY_CAP = 10;
const SYSTEM_RETENTION_ACTOR = {
  userId: "system_retention_worker",
  role: "SYSTEM" as const,
  reason: "retention_policy" as const,
};

interface ConversationRetentionRepository {
  listPurgeEligible(beforeIso: string, limit?: number): Promise<Conversation[]>;
  listAnonymousConversations(limit?: number): Promise<Conversation[]>;
  purge(
    id: string,
    actor: { userId: string; role: "SYSTEM"; reason: "retention_policy" },
  ): Promise<void>;
}

export interface ConversationRetentionSweepOptions {
  now?: Date;
  purgeBatchSize?: number;
  anonymousHistoryCap?: number;
  anonymousTtlDays?: number;
}

export interface ConversationRetentionSweepReport {
  runAt: string;
  purgedDeletedConversationIds: string[];
  purgedAnonymousConversationIds: string[];
  totalPurged: number;
}

function shouldPurgeAnonymousConversation(
  conversation: Conversation,
  index: number,
  cutoffTime: number,
  historyCap: number,
): boolean {
  const updatedAt = Date.parse(conversation.updatedAt);
  if (!Number.isNaN(updatedAt) && updatedAt < cutoffTime) {
    return true;
  }

  return index >= historyCap;
}

export async function runConversationRetentionSweep(
  repository: ConversationRetentionRepository,
  options: ConversationRetentionSweepOptions = {},
): Promise<ConversationRetentionSweepReport> {
  const now = options.now ?? new Date();
  const purgeBatchSize = options.purgeBatchSize ?? 100;
  const anonymousHistoryCap = options.anonymousHistoryCap ?? ANONYMOUS_CONVERSATION_HISTORY_CAP;
  const anonymousTtlDays = options.anonymousTtlDays ?? ANONYMOUS_CONVERSATION_TTL_DAYS;
  const cutoffTime = now.getTime() - anonymousTtlDays * 24 * 60 * 60 * 1000;

  const purgedDeletedConversationIds: string[] = [];
  const purgedAnonymousConversationIds: string[] = [];
  const alreadyPurged = new Set<string>();

  const purgeEligible = await repository.listPurgeEligible(now.toISOString(), purgeBatchSize);
  for (const conversation of purgeEligible) {
    await repository.purge(conversation.id, SYSTEM_RETENTION_ACTOR);
    alreadyPurged.add(conversation.id);
    purgedDeletedConversationIds.push(conversation.id);
  }

  const anonymousConversations = await repository.listAnonymousConversations();
  const anonymousGroups = new Map<string, Conversation[]>();
  for (const conversation of anonymousConversations) {
    const group = anonymousGroups.get(conversation.userId) ?? [];
    group.push(conversation);
    anonymousGroups.set(conversation.userId, group);
  }

  for (const conversations of anonymousGroups.values()) {
    conversations.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
    for (const [index, conversation] of conversations.entries()) {
      if (alreadyPurged.has(conversation.id)) {
        continue;
      }

      if (!shouldPurgeAnonymousConversation(conversation, index, cutoffTime, anonymousHistoryCap)) {
        continue;
      }

      await repository.purge(conversation.id, SYSTEM_RETENTION_ACTOR);
      alreadyPurged.add(conversation.id);
      purgedAnonymousConversationIds.push(conversation.id);
    }
  }

  return {
    runAt: now.toISOString(),
    purgedDeletedConversationIds,
    purgedAnonymousConversationIds,
    totalPurged: purgedDeletedConversationIds.length + purgedAnonymousConversationIds.length,
  };
}

export async function runDefaultConversationRetentionSweep(
  options: ConversationRetentionSweepOptions = {},
): Promise<ConversationRetentionSweepReport> {
  const repository = getConversationDataMapper();
  return runConversationRetentionSweep(repository, options);
}