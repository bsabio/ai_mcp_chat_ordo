import type { ToolExecutionContext } from "./ToolExecutionContext";

type SearchResultRecord = Record<string, unknown>;

function formatAnonymousSearchResult(result: SearchResultRecord) {
  return {
    document: result.document ?? result.book,
    documentId: result.documentId ?? result.bookNumber,
    section: result.section ?? result.chapterTitle ?? result.chapter,
    sectionSlug: result.sectionSlug ?? result.chapterSlug ?? null,
    documentSlug: result.documentSlug ?? result.bookSlug ?? null,
    relevance: result.relevance,
    normalizedScore: result.normalizedScore,
    matchSection: result.matchSection ?? null,
    canonicalPath: result.canonicalPath ?? null,
    resolverPath: result.resolverPath ?? null,
    fallbackSearchPath: result.fallbackSearchPath ?? null,
    fallbackSearchQuery: result.fallbackSearchQuery ?? null,
    chunkMetadata: result.chunkMetadata ?? null,
    book: result.book,
    bookNumber: result.bookNumber,
    chapter: result.chapterTitle ?? result.chapter,
  };
}

export interface ToolResultFormatter {
  format(toolName: string, result: unknown, context: ToolExecutionContext): unknown;
}

export class RoleAwareSearchFormatter implements ToolResultFormatter {
  format(toolName: string, result: unknown, context: ToolExecutionContext): unknown {
    if (toolName !== "search_corpus") return result;
    if (context.role !== "ANONYMOUS") return result;
    if (Array.isArray(result)) {
      return result.map((entry: SearchResultRecord) => formatAnonymousSearchResult(entry));
    }
    if (typeof result === "object" && result !== null && Array.isArray((result as { results?: unknown }).results)) {
      const payload = result as {
        query?: unknown;
        groundingState?: unknown;
        followUp?: unknown;
        retrievalQuality?: unknown;
        results: SearchResultRecord[];
      };

      return {
        query: typeof payload.query === "string" ? payload.query : "",
        groundingState: payload.results.length > 0 ? "search_only" : payload.groundingState,
        followUp: typeof payload.followUp === "string" ? payload.followUp : "refine_query",
        retrievalQuality: typeof payload.retrievalQuality === "string" ? payload.retrievalQuality : "none",
        prefetchedSection: null,
        results: payload.results.map((entry) => formatAnonymousSearchResult(entry)),
      };
    }
    return result;
  }
}
