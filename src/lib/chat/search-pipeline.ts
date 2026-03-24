import { LocalEmbedder } from "@/adapters/LocalEmbedder";
import { SQLiteVectorStore } from "@/adapters/SQLiteVectorStore";
import { SQLiteBM25IndexStore } from "@/adapters/SQLiteBM25IndexStore";
import { BM25Scorer } from "@/core/search/BM25Scorer";
import { QueryProcessor } from "@/core/search/QueryProcessor";
import { LowercaseStep } from "@/core/search/query-steps/LowercaseStep";
import { StopwordStep } from "@/core/search/query-steps/StopwordStep";
import { SynonymStep } from "@/core/search/query-steps/SynonymStep";
import { HybridSearchEngine } from "@/core/search/HybridSearchEngine";
import {
  HybridSearchHandler,
  BM25SearchHandler,
  LegacyKeywordHandler,
  EmptyResultHandler,
} from "@/core/search/SearchHandlerChain";
import type { SearchHandler } from "@/core/search/ports/SearchHandler";
import { STOPWORDS } from "@/core/search/data/stopwords";
import { SYNONYMS } from "@/core/search/data/synonyms";
import { getDb } from "@/lib/db";
import { getCorpusRepository } from "@/adapters/RepositoryFactory";
import { corpusConfig } from "@/lib/corpus-vocabulary";

export function getSearchHandler(): SearchHandler {
  const embedder = new LocalEmbedder();
  const db = getDb();
  const vectorStore = new SQLiteVectorStore(db);
  const bm25IndexStore = new SQLiteBM25IndexStore(db);
  const bm25Scorer = new BM25Scorer();

  const vectorProcessor = new QueryProcessor([
    new LowercaseStep(),
    new StopwordStep(STOPWORDS),
  ]);
  const bm25Processor = new QueryProcessor([
    new LowercaseStep(),
    new StopwordStep(STOPWORDS),
    new SynonymStep(SYNONYMS),
  ]);

  const engine = new HybridSearchEngine(
    embedder, vectorStore, bm25Scorer, bm25IndexStore,
    vectorProcessor, bm25Processor,
    { vectorTopN: 50, bm25TopN: 50, rrfK: 60, maxResults: 10 },
  );

  const hybrid = new HybridSearchHandler(engine, embedder, bm25IndexStore, corpusConfig.sourceType);
  const bm25 = new BM25SearchHandler(bm25Scorer, bm25IndexStore, vectorStore, bm25Processor, corpusConfig.sourceType);
  const legacy = new LegacyKeywordHandler(getCorpusRepository());
  const empty = new EmptyResultHandler();

  hybrid.setNext(bm25);
  bm25.setNext(legacy);
  legacy.setNext(empty);

  return hybrid;
}
