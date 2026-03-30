import type { UseCase } from "../common/UseCase";
import { canAccessAudience } from "@/lib/access/content-access";
import type { RoleName } from "../entities/user";
import type { CorpusRepository } from "./CorpusRepository";
import type { LibrarySearchResult } from "../entities/library";
import type { SearchHandler } from "../search/ports/SearchHandler";

export interface SearchRequest {
  query: string;
  maxResults?: number;
  role?: RoleName;
}

export class LibrarySearchInteractor implements UseCase<SearchRequest, LibrarySearchResult[]> {
  private readonly corpusRepository: CorpusRepository;

  constructor(
    repo: CorpusRepository,
    private searchHandler?: SearchHandler,
  ) {
    this.corpusRepository = repo;
  }

  async execute(request: SearchRequest): Promise<LibrarySearchResult[]> {
    const { query, maxResults = 10, role } = request;

    const documents = await this.corpusRepository.getAllDocuments();
    const sections = await this.corpusRepository.getAllSections();

    const documentMap = new Map(documents.map((document) => [document.slug, document]));
    const visibleSections = role
      ? sections.filter((section) => canAccessAudience(section.audience, role))
      : sections;
    const visibleSectionKeys = new Set(
      visibleSections.map((section) => `${section.documentSlug}/${section.sectionSlug}`),
    );

    if (this.searchHandler) {
      const hybridResults = await this.searchHandler.search(query);
      const filteredResults = hybridResults.filter((result) => {
        if (!role) return true;
        const documentSlug = result.bookSlug ?? result.documentSlug;
        const sectionSlug = result.chapterSlug ?? result.sectionSlug;

        if (documentSlug && sectionSlug) {
          return visibleSectionKeys.has(`${documentSlug}/${sectionSlug}`);
        }

        if (!documentSlug) return false;

        const document = documentMap.get(documentSlug);
        return !!document && canAccessAudience(document.audience, role);
      });

      return filteredResults.slice(0, maxResults).map((hr) => ({
        documentTitle: hr.documentTitle,
        documentId: hr.documentId,
        documentSlug: hr.documentSlug,
        sectionTitle: hr.sectionTitle,
        sectionSlug: hr.sectionSlug,
        bookTitle: hr.bookTitle ?? hr.documentTitle,
        bookNumber: hr.bookNumber ?? hr.documentId,
        bookSlug: hr.bookSlug ?? hr.documentSlug,
        chapterTitle: hr.chapterTitle ?? hr.sectionTitle,
        chapterSlug: hr.chapterSlug ?? hr.sectionSlug,
        matchContext: hr.matchPassage,
        relevance: hr.relevance,
        score: hr.rrfScore,
        matchPassage: hr.matchPassage,
        matchSection: hr.matchSection,
        matchHighlight: hr.matchHighlight,
        rrfScore: hr.rrfScore,
        vectorRank: hr.vectorRank,
        bm25Rank: hr.bm25Rank,
        passageOffset: hr.passageOffset,
      }));
    }

    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 2);

    if (queryTerms.length === 0 && queryLower.length <= 2) {
      return [];
    }

    const results: LibrarySearchResult[] = [];

    for (const section of visibleSections) {
      const document = documentMap.get(section.documentSlug);
      if (!document) continue;

      const { score, matchContext } = section.calculateSearchScore(
        queryLower,
        queryTerms,
      );

      if (score > 0) {
        results.push({
          documentTitle: document.title,
          documentId: document.number,
          documentSlug: document.slug,
          sectionTitle: section.title,
          sectionSlug: section.sectionSlug,
          bookTitle: document.title,
          bookNumber: document.number,
          bookSlug: document.slug,
          chapterTitle: section.title,
          chapterSlug: section.sectionSlug,
          matchContext,
          relevance: score >= 8 ? "high" : score >= 4 ? "medium" : "low",
          score,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
  }
}
