import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { localEmbedder } from "@/adapters/LocalEmbedder";
import { SQLiteVectorStore } from "@/adapters/SQLiteVectorStore";
import { getDb } from "@/lib/db";
import { createSearchMyConversationsTool } from "@/core/use-cases/tools/search-my-conversations.tool";

export function registerConversationTools(registry: ToolRegistry): void {
  const vectorStore = new SQLiteVectorStore(getDb());
  registry.register(createSearchMyConversationsTool(vectorStore, localEmbedder));
}
