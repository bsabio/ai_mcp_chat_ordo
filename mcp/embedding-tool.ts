import { createHash } from "crypto";
import type { Embedder } from "@/core/search/ports/Embedder";
import type { VectorStore, VectorQuery } from "@/core/search/ports/VectorStore";
import type { BM25IndexStore } from "@/core/search/ports/BM25IndexStore";
import type { SearchHandler } from "@/core/search/ports/SearchHandler";
import type { EmbeddingPipelineFactory } from "@/core/search/EmbeddingPipelineFactory";
import type { DocumentChunkMetadata } from "@/core/search/ports/Chunker";
import type { CorpusRepository } from "@/core/use-cases/CorpusRepository";
import { corpusConfig } from "@/lib/corpus-config";

export interface EmbeddingToolDeps {
  embedder: Embedder;
  vectorStore: VectorStore;
  bm25IndexStore: BM25IndexStore;
  searchHandler: SearchHandler;
  pipelineFactory: EmbeddingPipelineFactory;
  corpusRepo: CorpusRepository;
}

// --- embed_text (VSEARCH-30) ---
export async function embedText(
  deps: EmbeddingToolDeps,
  args: { text: string },
) {
  if (!args.text || typeof args.text !== "string") {
    throw new Error("embed_text requires a non-empty 'text' string.");
  }
  const embedding = await deps.embedder.embed(args.text);
  return {
    dimensions: deps.embedder.dimensions(),
    embeddingPreview: Array.from(embedding.slice(0, 5)),
  };
}

// --- embed_document (VSEARCH-31) ---
export async function embedDocument(
  deps: EmbeddingToolDeps,
  args: { source_type: string; source_id: string; content: string },
) {
  if (!args.source_type || !args.source_id || !args.content) {
    throw new Error(
      "embed_document requires source_type, source_id, and content.",
    );
  }
  const pipeline = deps.pipelineFactory.createForSource(
    args.source_type,
  );
  const [bookSlug, chapterSlug] = args.source_id.split("/");
  const firstSentence = args.content.split(/[.!?]\s/)[0]?.slice(0, 200) ?? "";
  const metadata: DocumentChunkMetadata = {
    sourceType: args.source_type,
    documentSlug: bookSlug ?? args.source_id,
    sectionSlug: chapterSlug ?? "",
    documentTitle: bookSlug ?? "",
    documentId: bookSlug ?? args.source_id,
    sectionTitle: chapterSlug ?? "",
    sectionFirstSentence: firstSentence,
    bookSlug: bookSlug ?? args.source_id,
    chapterSlug: chapterSlug ?? "",
    bookTitle: bookSlug ?? "",
    bookNumber: bookSlug ?? args.source_id,
    chapterTitle: chapterSlug ?? "",
    chapterFirstSentence:
      args.content.split(/[.!?]\s/)[0]?.slice(0, 200) ?? "",
  };
  const contentHash = createHash("sha256")
    .update(args.content)
    .digest("hex");
  const result = await pipeline.indexDocument({
    sourceType: args.source_type,
    sourceId: args.source_id,
    content: args.content,
    contentHash,
    metadata,
  });
  return result;
}

// --- search_similar (VSEARCH-32) ---
export async function searchSimilar(
  deps: EmbeddingToolDeps,
  args: { query: string; source_type?: string; limit?: number },
) {
  if (!args.query || typeof args.query !== "string") {
    throw new Error("search_similar requires a non-empty 'query' string.");
  }
  const filters: VectorQuery = {};
  if (args.source_type) filters.sourceType = args.source_type;
  if (args.limit) filters.limit = args.limit;
  const results = await deps.searchHandler.search(args.query, filters);
  return results;
}

// --- rebuild_index (VSEARCH-33) ---
export async function rebuildIndex(
  deps: EmbeddingToolDeps,
  args: { source_type: string; force?: boolean },
) {
  if (!args.source_type) {
    throw new Error("rebuild_index requires a source_type.");
  }
  if (args.source_type !== corpusConfig.sourceType && args.source_type !== corpusConfig.legacySourceType) {
    throw new Error(
      `Unsupported source_type: ${args.source_type}. Only "${corpusConfig.sourceType}" is supported.`,
    );
  }

  const pipeline = deps.pipelineFactory.createForSource(corpusConfig.sourceType);
  const [documents, sections] = await Promise.all([
    deps.corpusRepo.getAllDocuments(),
    deps.corpusRepo.getAllSections(),
  ]);
  const documentTitleMap = new Map(documents.map((document) => [document.slug, document.title]));
  const documentIdMap = new Map(documents.map((document) => [document.slug, document.id]));

  if (args.force) {
    for (const section of sections) {
      deps.vectorStore.delete(`${section.documentSlug}/${section.sectionSlug}`);
    }
  }

  const indexedDocuments = sections.map((section) => ({
    sourceId: `${section.documentSlug}/${section.sectionSlug}`,
    content: section.content,
    contentHash: createHash("sha256").update(section.content).digest("hex"),
    metadata: {
      sourceType: corpusConfig.sourceType,
      documentSlug: section.documentSlug,
      sectionSlug: section.sectionSlug,
      documentTitle: documentTitleMap.get(section.documentSlug) ?? section.documentSlug,
      documentId: documentIdMap.get(section.documentSlug) ?? section.documentSlug,
      sectionTitle: section.title,
      sectionFirstSentence:
        section.content.split(/[.!?]\s/)[0]?.slice(0, 200) ?? "",
      bookSlug: section.documentSlug,
      chapterSlug: section.sectionSlug,
      bookTitle: documentTitleMap.get(section.documentSlug) ?? section.documentSlug,
      bookNumber: documentIdMap.get(section.documentSlug) ?? section.documentSlug,
      chapterTitle: section.title,
      chapterFirstSentence: section.content.split(/[.!?]\s/)[0]?.slice(0, 200) ?? "",
    } satisfies DocumentChunkMetadata,
  }));

  const result = await pipeline.rebuildAll(corpusConfig.sourceType, indexedDocuments);
  return result;
}

// --- get_index_stats (VSEARCH-34) ---
export function getIndexStats(
  deps: EmbeddingToolDeps,
  args: { source_type?: string },
) {
  const sourceType = args.source_type ?? corpusConfig.sourceType;
  const embeddingCount = deps.vectorStore.count(sourceType);
  const bm25Index = deps.bm25IndexStore.getIndex(sourceType);
  return {
    sourceType,
    embeddingCount,
    bm25DocCount: bm25Index?.docCount ?? 0,
    bm25AvgDocLength: bm25Index?.avgDocLength ?? 0,
    bm25Stale: deps.bm25IndexStore.isStale(sourceType),
    embedderReady: deps.embedder.isReady(),
    dimensions: deps.embedder.dimensions(),
  };
}

// --- delete_embeddings (spec §11.2 tool, no VSEARCH req ID) ---
export function deleteEmbeddings(
  deps: EmbeddingToolDeps,
  args: { source_id: string },
) {
  if (!args.source_id || typeof args.source_id !== "string") {
    throw new Error(
      "delete_embeddings requires a non-empty 'source_id' string.",
    );
  }
  const before = deps.vectorStore.count();
  deps.vectorStore.delete(args.source_id);
  const after = deps.vectorStore.count();
  return { deleted: before - after, source_id: args.source_id };
}
