import { getConversationInteractor } from "./conversation-root";
import { getEmbeddingPipelineFactory } from "./tool-composition-root";
import type { ConversationMetadata } from "@/core/search/ports/Chunker";
import { getDb } from "@/lib/db";
import { getVectorStore } from "@/adapters/RepositoryFactory";
import crypto from "crypto";

type ConvertedConversationRow = {
  id: string;
  user_id: string;
  converted_from: string | null;
};

export function getConversationSourceId(userId: string, conversationId: string): string {
  return `${userId}/${conversationId}`;
}

/**
 * Embeds all turns of a conversation for search indexing.
 * Called asynchronously after archiving (authenticated users only).
 */
export async function embedConversation(
  conversationId: string,
  userId: string,
): Promise<void> {
  const interactor = getConversationInteractor();
  const result = await interactor.get(conversationId, userId);
  const { conversation, messages } = result;
  const ownerId = conversation.userId;

  // Serialize conversation as text
  const lines = messages.map((m) => {
    if (m.role === "system" && m.parts.some((p) => p.type === "summary")) {
      return `Summary: ${m.content}`;
    }
    const label = m.role === "user" ? "User" : m.role === "assistant" ? "Assistant" : null;
    if (!label) return null;
    return `${label}: ${m.content}`;
  }).filter(Boolean);

  const content = lines.join("\n");
  if (!content.trim()) return;

  const contentHash = crypto.createHash("sha256").update(content).digest("hex");
  const sourceId = getConversationSourceId(ownerId, conversationId);

  const metadata: ConversationMetadata = {
    sourceType: "conversation",
    conversationId,
    userId: ownerId,
    role: "user",
    turnIndex: 0,
  };

  const pipeline = getEmbeddingPipelineFactory().createForSource("conversation");
  await pipeline.indexDocument({
    sourceType: "conversation",
    sourceId,
    content,
    contentHash,
    metadata,
  });
}

export async function repairConversationOwnershipIndex(
  conversationId: string,
  currentUserId: string,
  previousUserId: string,
): Promise<void> {
  const vectorStore = getVectorStore();
  vectorStore.delete(getConversationSourceId(previousUserId, conversationId));
  await embedConversation(conversationId, currentUserId);
}

export async function repairConvertedConversationOwnershipIndexes(): Promise<{
  repaired: number;
}> {
  // getDb() approved: raw SQL query — see data-access-canary.test.ts (Sprint 9)
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, user_id, converted_from
       FROM conversations
       WHERE converted_from IS NOT NULL`,
    )
    .all() as ConvertedConversationRow[];

  let repaired = 0;

  for (const row of rows) {
    if (!row.converted_from) {
      continue;
    }

    await repairConversationOwnershipIndex(
      row.id,
      row.user_id,
      row.converted_from,
    );
    repaired += 1;
  }

  return { repaired };
}
