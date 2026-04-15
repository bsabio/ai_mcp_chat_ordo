import type { SearchHandler } from "./ports/SearchHandler";
import type { HybridSearchResult, VectorQuery, VectorStore } from "./types";
import type { Embedder } from "./ports/Embedder";
import type { BM25IndexStore } from "./ports/BM25IndexStore";
import type { CorpusQuery, SectionQuery } from "../use-cases/CorpusRepository";
import type { HybridSearchEngine } from "./HybridSearchEngine";
import type { BM25Scorer } from "./BM25Scorer";
import type { QueryProcessor } from "./QueryProcessor";
import { toSearchChunkMetadata } from "./chunk-metadata";

abstract class BaseSearchHandler implements SearchHandler {
  private nextHandler: SearchHandler | null = null;

  setNext(handler: SearchHandler): SearchHandler {
    this.nextHandler = handler;
    return handler;
  }

  abstract canHandle(): boolean;
  abstract search(query: string, filters?: VectorQuery): Promise<HybridSearchResult[]>;

  protected async passToNext(query: string, filters?: VectorQuery): Promise<HybridSearchResult[]> {
    if (this.nextHandler) {
      if (this.nextHandler.canHandle()) {
        return this.nextHandler.search(query, filters);
      }
      // Walk the chain manually if current next can't handle
      if (this.nextHandler instanceof BaseSearchHandler) {
        return this.nextHandler.passToNext(query, filters);
      }
    }
    return [];
  }
}

export class HybridSearchHandler extends BaseSearchHandler {
  constructor(
    private readonly engine: HybridSearchEngine,
    private readonly embedder: Embedder,
    private readonly bm25IndexStore: BM25IndexStore,
    private readonly sourceType: string = "document_chunk",
  ) {
    super();
  }

  canHandle(): boolean {
    return this.embedder.isReady() && this.bm25IndexStore.getIndex(this.sourceType) !== null;
  }

  async search(query: string, filters?: VectorQuery): Promise<HybridSearchResult[]> {
    if (!this.canHandle()) return this.passToNext(query, filters);
    return this.engine.search(query, { ...filters, sourceType: filters?.sourceType ?? this.sourceType });
  }
}

export class BM25SearchHandler extends BaseSearchHandler {
  constructor(
    private readonly bm25Scorer: BM25Scorer,
    private readonly bm25IndexStore: BM25IndexStore,
    private readonly vectorStore: VectorStore,
    private readonly bm25QueryProcessor: QueryProcessor,
    private readonly sourceType: string = "document_chunk",
  ) {
    super();
  }

  canHandle(): boolean {
    return this.bm25IndexStore.getIndex(this.sourceType) !== null;
  }

  async search(query: string, filters?: VectorQuery): Promise<HybridSearchResult[]> {
    if (!this.canHandle()) return this.passToNext(query, filters);

    const bm25Index = this.bm25IndexStore.getIndex(filters?.sourceType ?? this.sourceType);
    if (!bm25Index) return this.passToNext(query, filters);

    const queryTerms = this.bm25QueryProcessor.process(query);
    const records = this.vectorStore.getAll({ ...filters, chunkLevel: "passage" });

    const scored = records.map((r) => {
      const docTokens = r.content.toLowerCase().split(/\s+/).filter(Boolean);
      return {
        record: r,
        score: this.bm25Scorer.score(queryTerms, docTokens, docTokens.length, bm25Index),
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.filter((s) => s.score > 0).slice(0, 10);

    return top.map((item, rank) => {
      const meta = item.record.metadata as {
        documentTitle?: string;
        documentId?: string;
        documentSlug?: string;
        sectionTitle?: string;
        sectionSlug?: string;
        bookTitle?: string;
        bookNumber?: string;
        bookSlug?: string;
        chapterTitle?: string;
        chapterSlug?: string;
      };
      const documentTitle = meta.documentTitle ?? meta.bookTitle ?? "";
      const documentId = meta.documentId ?? meta.bookNumber ?? "";
      const documentSlug = meta.documentSlug ?? meta.bookSlug ?? "";
      const sectionTitle = meta.sectionTitle ?? meta.chapterTitle ?? "";
      const sectionSlug = meta.sectionSlug ?? meta.chapterSlug ?? "";
      return {
        documentTitle,
        documentId,
        documentSlug,
        sectionTitle,
        sectionSlug,
        rrfScore: item.score,
        vectorRank: null,
        bm25Rank: rank + 1,
        relevance: (rank < 3 ? "high" : rank < 7 ? "medium" : "low") as "high" | "medium" | "low",
        matchPassage: item.record.content,
        matchSection: item.record.heading,
        matchHighlight: item.record.content,
        passageOffset: { start: 0, end: item.record.content.length },
        chunkMetadata: toSearchChunkMetadata(item.record.metadata),
        bookTitle: documentTitle,
        bookNumber: documentId,
        bookSlug: documentSlug,
        chapterTitle: sectionTitle,
        chapterSlug: sectionSlug,
      };
    });
  }
}

export class LegacyKeywordHandler extends BaseSearchHandler {
  constructor(private readonly corpusRepository: CorpusQuery & SectionQuery) {
    super();
  }

  canHandle(): boolean {
    return true;
  }

  async search(query: string): Promise<HybridSearchResult[]> {
    const documents = await this.corpusRepository.getAllDocuments();
    const sections = await this.corpusRepository.getAllSections();
    const results: HybridSearchResult[] = [];

    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 2);

    if (queryTerms.length === 0 && queryLower.length <= 2) return [];

    for (const section of sections) {
      const document = documents.find((item) => item.slug === section.documentSlug);
      if (!document) continue;

      const { score, matchContext } = section.calculateSearchScore(queryLower, queryTerms);
      if (score > 0) {
        results.push({
          documentTitle: document.title,
          documentId: document.id,
          documentSlug: document.slug,
          sectionTitle: section.title,
          sectionSlug: section.sectionSlug,
          rrfScore: score,
          vectorRank: null,
          bm25Rank: null,
          relevance: score >= 8 ? "high" : score >= 4 ? "medium" : "low",
          matchPassage: matchContext,
          matchSection: null,
          matchHighlight: matchContext,
          passageOffset: { start: 0, end: 0 },
          chunkMetadata: null,
          bookTitle: document.title,
          bookNumber: document.id,
          bookSlug: document.slug,
          chapterTitle: section.title,
          chapterSlug: section.sectionSlug,
        });
      }
    }

    return results.sort((a, b) => b.rrfScore - a.rrfScore).slice(0, 10);
  }
}

export class EmptyResultHandler extends BaseSearchHandler {
  canHandle(): boolean {
    return true;
  }

  async search(): Promise<HybridSearchResult[]> {
    return [];
  }
}
