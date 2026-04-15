#!/usr/bin/env tsx
import { getDb } from "../src/lib/db";
import { getCorpusRepository } from "../src/adapters/RepositoryFactory";
import { localEmbedder } from "../src/adapters/LocalEmbedder";
import { SQLiteVectorStore } from "../src/adapters/SQLiteVectorStore";
import { SQLiteBM25IndexStore } from "../src/adapters/SQLiteBM25IndexStore";
import { EmbeddingPipelineFactory } from "../src/core/search/EmbeddingPipelineFactory";
import { validateEmbeddingQuality } from "../src/core/search/EmbeddingValidator";
import { buildCorpusIndexContentHash } from "../src/core/search/corpus-indexing";
import type { BM25Index } from "../src/core/search/ports/BM25IndexStore";
import type { DocumentChunkMetadata } from "../src/core/search/ports/Chunker";
import { corpusConfig } from "../src/lib/corpus-vocabulary";

const MODEL_VERSION = "all-MiniLM-L6-v2@1.0";
const force = process.argv.includes("--force");

/** Simple whitespace tokenizer for BM25 — lowercase, strip punctuation, split on whitespace */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

async function main() {
  const startTime = Date.now();

  // Initialize infrastructure
  const db = getDb();
  const embedder = localEmbedder;
  const vectorStore = new SQLiteVectorStore(db);
  const bm25Store = new SQLiteBM25IndexStore(db);
  const factory = new EmbeddingPipelineFactory(
    embedder,
    vectorStore,
    MODEL_VERSION,
  );
  const pipeline = factory.createForSource(corpusConfig.sourceType);

  // Load all documents (for title lookup) and sections
  const corpusRepo = getCorpusRepository();
  const [documentsIndex, sections] = await Promise.all([
    corpusRepo.getAllDocuments(),
    corpusRepo.getAllSections(),
  ]);
  const documentTitleMap = new Map(documentsIndex.map((document) => [document.slug, document.title]));
  const documentIdMap = new Map(documentsIndex.map((document) => [document.slug, document.id]));

  console.log(`Loading ${sections.length} sections from ${documentsIndex.length} documents...`);

  // If --force, delete all embeddings first
  if (force) {
    console.log("Force rebuild: clearing all embeddings...");
    for (const section of sections) {
      vectorStore.delete(`${section.documentSlug}/${section.sectionSlug}`);
    }
  }

  // Build documents array for rebuildAll
  const documents = sections.map((section) => {
    const metadata = {
      sourceType: corpusConfig.sourceType,
      documentSlug: section.documentSlug,
      sectionSlug: section.sectionSlug,
      documentTitle: documentTitleMap.get(section.documentSlug) ?? section.documentSlug,
      documentId: documentIdMap.get(section.documentSlug) ?? section.documentSlug,
      sectionTitle: section.title,
      sectionFirstSentence: section.content.split(/[.!?]\s/)[0]?.slice(0, 200) ?? "",
      bookSlug: section.documentSlug,
      chapterSlug: section.sectionSlug,
      bookTitle: documentTitleMap.get(section.documentSlug) ?? section.documentSlug,
      bookNumber: documentIdMap.get(section.documentSlug) ?? section.documentSlug,
      chapterTitle: section.title,
      chapterFirstSentence: section.content.split(/[.!?]\s/)[0]?.slice(0, 200) ?? "",
    } satisfies DocumentChunkMetadata;

    return {
      sourceId: `${section.documentSlug}/${section.sectionSlug}`,
      content: section.content,
      contentHash: buildCorpusIndexContentHash(section.content, metadata),
      metadata,
    };
  });

  // Run incremental rebuild
  const result = await pipeline.rebuildAll(corpusConfig.sourceType, documents);

  console.log(`\nEmbedding Results:`);
  console.log(`  Sections: ${sections.length} (${result.created} new, ${result.updated} updated, ${result.unchanged} unchanged)`);
  console.log(`  Chunks:   ${result.totalChunks} total`);
  console.log(`  Orphans:  ${result.orphansDeleted} deleted`);
  console.log(`  Model:    ${MODEL_VERSION}`);

  // Rebuild BM25 index from all stored embeddings
  const allRecords = vectorStore.getAll({ sourceType: corpusConfig.sourceType });
  const docLengths = new Map<string, number>();
  const termDocFrequencies = new Map<string, number>();
  let totalLength = 0;

  for (const record of allRecords) {
    const tokens = tokenize(record.content);
    docLengths.set(record.id, tokens.length);
    totalLength += tokens.length;

    const uniqueTerms = new Set(tokens);
    for (const term of uniqueTerms) {
      termDocFrequencies.set(term, (termDocFrequencies.get(term) ?? 0) + 1);
    }
  }

  const bm25Index: BM25Index = {
    avgDocLength: allRecords.length > 0 ? totalLength / allRecords.length : 0,
    docCount: allRecords.length,
    docLengths,
    termDocFrequencies,
  };
  bm25Store.saveIndex(corpusConfig.sourceType, bm25Index);
  console.log(`  BM25:     ${bm25Index.docCount} docs, ${bm25Index.termDocFrequencies.size} terms`);

  // Validate embedding quality
  console.log(`\nValidating embedding quality...`);
  const validation = await validateEmbeddingQuality(embedder);
  for (const detail of validation.details) {
    console.log(`  ${detail}`);
  }
  console.log(`  Quality:  ${validation.passed}/${validation.passed + validation.failed} pairs passed`);

  if (validation.failed > 0) {
    console.error("\nWARNING: Embedding quality validation had failures!");
    process.exitCode = 1;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nCompleted in ${elapsed}s`);
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exitCode = 1;
});
