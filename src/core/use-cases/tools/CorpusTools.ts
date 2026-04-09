import type { ToolCommand } from "../ToolCommand";
import type { CorpusRepository } from "../CorpusRepository";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import type { SearchHandler } from "@/core/search/ports/SearchHandler";
import type { LibrarySearchResult } from "@/core/entities/library";
import { corpusConfig } from "@/lib/corpus-vocabulary";
import { buildCanonicalCorpusReference } from "@/lib/corpus-reference";
import { LibrarySearchInteractor } from "../LibrarySearchInteractor";
import { GetChapterInteractor } from "../GetChapterInteractor";
import { ChecklistInteractor } from "../ChecklistInteractor";
import { PractitionerInteractor } from "../PractitionerInteractor";
import { CorpusSummaryInteractor } from "../CorpusSummaryInteractor";

const MAX_PREFETCH_SECTION_CHARS = 4000;

type SearchCorpusResultItem = {
  document: string;
  documentId: string;
  section: string;
  sectionSlug: string;
  documentSlug: string;
  matchContext: string;
  relevance: "high" | "medium" | "low";
  book: string;
  bookNumber: string;
  chapter: string;
  chapterSlug: string;
  bookSlug: string;
  canonicalPath: string;
  resolverPath: string;
  matchPassage?: string;
  matchSection?: string | null;
  matchHighlight?: string;
  rrfScore?: number;
  vectorRank?: number | null;
  bm25Rank?: number | null;
  passageOffset?: { start: number; end: number };
};

type PrefetchedSectionPayload = {
  title: string;
  document: string;
  canonicalPath: string;
  resolverPath: string;
  content: string;
  contentTruncated: boolean;
};

type SearchCorpusPayload = {
  query: string;
  groundingState: "no_results" | "search_only" | "prefetched_section";
  followUp: "refine_query" | "call_get_section_before_detailed_claims" | "cite_canonical_paths";
  results: SearchCorpusResultItem[];
  prefetchedSection: PrefetchedSectionPayload | null;
};

function buildSearchCorpusResultItem(result: LibrarySearchResult): SearchCorpusResultItem {
  const documentId = result.bookNumber ?? result.documentId ?? "Unknown";
  const documentTitle = result.bookTitle ?? result.documentTitle ?? "Unknown document";
  const chapterTitle = result.chapterTitle ?? result.sectionTitle ?? "Unknown section";
  const documentSlug = result.bookSlug ?? result.documentSlug ?? "unknown-document";
  const sectionSlug = result.chapterSlug ?? result.sectionSlug ?? "unknown-section";
  const reference = buildCanonicalCorpusReference(documentSlug, sectionSlug);

  return {
    document: `${documentId}. ${documentTitle}`,
    documentId,
    section: chapterTitle,
    sectionSlug,
    documentSlug,
    matchContext: result.matchContext,
    relevance: result.relevance,
    book: `${documentId}. ${documentTitle}`,
    bookNumber: documentId,
    chapter: chapterTitle,
    chapterSlug: sectionSlug,
    bookSlug: documentSlug,
    canonicalPath: reference.canonicalPath,
    resolverPath: reference.resolverPath,
    ...(result.matchPassage !== undefined && {
      matchPassage: result.matchPassage,
      matchSection: result.matchSection,
      matchHighlight: result.matchHighlight,
      rrfScore: result.rrfScore,
      vectorRank: result.vectorRank,
      bm25Rank: result.bm25Rank,
      passageOffset: result.passageOffset,
    }),
  };
}

function shouldPrefetchTopSection(results: LibrarySearchResult[]): boolean {
  const top = results[0];
  const second = results[1];

  if (!top?.bookSlug || !top.chapterSlug) {
    return false;
  }

  if (top.relevance !== "high") {
    return false;
  }

  if (!second) {
    return true;
  }

  return second.relevance !== "high";
}

function truncateSectionContent(content: string): { content: string; contentTruncated: boolean } {
  if (content.length <= MAX_PREFETCH_SECTION_CHARS) {
    return { content, contentTruncated: false };
  }

  return {
    content: `${content.slice(0, MAX_PREFETCH_SECTION_CHARS)}\n\n[... truncated ...]`,
    contentTruncated: true,
  };
}

export class SearchCorpusCommand implements ToolCommand<{ query: string; max_results?: number }, unknown> {
  private readonly search: LibrarySearchInteractor;
  private readonly getSection: GetChapterInteractor;

  constructor(repo: CorpusRepository, searchHandler?: SearchHandler) {
    this.search = new LibrarySearchInteractor(repo, searchHandler);
    this.getSection = new GetChapterInteractor(repo);
  }

  async execute({ query, max_results = 5 }: { query: string; max_results?: number }, context?: ToolExecutionContext) {
    const results = await this.search.execute({
      query,
      maxResults: Math.min(max_results, 15),
      role: context?.role,
    });
    if (results.length === 0) {
      return {
        query,
        groundingState: "no_results",
        followUp: "refine_query",
        results: [],
        prefetchedSection: null,
      } satisfies SearchCorpusPayload;
    }

    const mappedResults = results.map(buildSearchCorpusResultItem);
    const canPrefetch = context?.role && context.role !== "ANONYMOUS" && shouldPrefetchTopSection(results);

    if (!canPrefetch) {
      return {
        query,
        groundingState: "search_only",
        followUp: "call_get_section_before_detailed_claims",
        results: mappedResults,
        prefetchedSection: null,
      } satisfies SearchCorpusPayload;
    }

    const top = results[0];
    const topBookSlug = top.bookSlug ?? top.documentSlug;
    const topChapterSlug = top.chapterSlug ?? top.sectionSlug;

    if (!topBookSlug || !topChapterSlug) {
      return {
        query,
        groundingState: "search_only",
        followUp: "call_get_section_before_detailed_claims",
        results: mappedResults,
        prefetchedSection: null,
      } satisfies SearchCorpusPayload;
    }

    try {
      const section = await this.getSection.execute({
        bookSlug: topBookSlug,
        chapterSlug: topChapterSlug,
        role: context?.role,
      });

      if (!section) {
        return {
          query,
          groundingState: "search_only",
          followUp: "call_get_section_before_detailed_claims",
          results: mappedResults,
          prefetchedSection: null,
        } satisfies SearchCorpusPayload;
      }

      const reference = buildCanonicalCorpusReference(topBookSlug, topChapterSlug);
      const { content, contentTruncated } = truncateSectionContent(section.content);
      return {
        query,
        groundingState: "prefetched_section",
        followUp: "cite_canonical_paths",
        results: mappedResults,
        prefetchedSection: {
          title: section.title,
          document: section.bookTitle,
          canonicalPath: reference.canonicalPath,
          resolverPath: reference.resolverPath,
          content,
          contentTruncated,
        },
      } satisfies SearchCorpusPayload;
    } catch {
      return {
        query,
        groundingState: "search_only",
        followUp: "call_get_section_before_detailed_claims",
        results: mappedResults,
        prefetchedSection: null,
      } satisfies SearchCorpusPayload;
    }
  }
}

export class GetSectionCommand implements ToolCommand<{ document_slug: string; section_slug: string }, string> {
  private readonly getSection: GetChapterInteractor;

  constructor(repo: CorpusRepository) {
    this.getSection = new GetChapterInteractor(repo);
  }

  async execute({ document_slug, section_slug }: { document_slug: string; section_slug: string }, context?: ToolExecutionContext) {
    const section = await this.getSection.execute({
      bookSlug: document_slug,
      chapterSlug: section_slug,
      role: context?.role,
    });
    if (!section) return `Section not found: ${document_slug}/${section_slug}.`;

    const content = section.content.length > 4000
      ? `${section.content.slice(0, 4000)}\n\n[... truncated ...]`
      : section.content;

    return `# ${section.bookTitle} - ${section.title}\n\n${content}`;
  }
}

export class GetChecklistCommand implements ToolCommand<{ book_slug?: string }, string> {
  private readonly checklists: ChecklistInteractor;

  constructor(repo: CorpusRepository) {
    this.checklists = new ChecklistInteractor(repo);
  }

  async execute({ book_slug }: { book_slug?: string }, context?: ToolExecutionContext) {
    const results = await this.checklists.execute({ bookSlug: book_slug, role: context?.role });
    if (results.length === 0) return "No checklists found.";

    return results
      .map((checklist) => `## ${checklist.bookTitle} — ${checklist.chapterTitle}\n${checklist.items.map((item) => `- ${item}`).join("\n")}`)
      .join("\n\n");
  }
}

export class ListPractitionersCommand implements ToolCommand<{ query?: string }, string> {
  private readonly practitioners: PractitionerInteractor;

  constructor(repo: CorpusRepository) {
    this.practitioners = new PractitionerInteractor(repo);
  }

  async execute({ query }: { query?: string }, context?: ToolExecutionContext) {
    const results = await this.practitioners.execute({ query, role: context?.role });
    if (results.length === 0) return "No practitioners found.";

    return results
      .slice(0, 30)
      .map((practitioner) => `**${practitioner.name}** — appears in ${practitioner.books.map((book) => `${book.number}. ${book.title}`).join(", ")} (${practitioner.chapters.map((chapter) => chapter.title).join("; ")})`)
      .join("\n");
  }
}

export class GetCorpusSummaryCommand implements ToolCommand<Record<string, never>, string> {
  private readonly summaries: CorpusSummaryInteractor;

  constructor(repo: CorpusRepository) {
    this.summaries = new CorpusSummaryInteractor(repo);
  }

  async execute(_input: Record<string, never>, context?: ToolExecutionContext) {
    const results = await this.summaries.execute({ role: context?.role });
    return results.map((summary) => {
      const sections = summary.chapters ?? summary.sections;
      const sectionSlugs = summary.chapterSlugs ?? summary.sectionSlugs;
      const sectionList = sections.map((title, index) => {
        const slug = sectionSlugs?.[index];
        return slug ? `- ${title} (slug: \`${slug}\`)` : `- ${title}`;
      }).join("\n");
      const sectionCount = summary.chapterCount ?? summary.sectionCount;
      return `### ${corpusConfig.documentLabel} ${summary.number}: ${summary.title} (document_slug: \`${summary.slug}\`)\n${sectionCount} ${corpusConfig.sectionLabelPlural}:\n${sectionList}`;
    }).join("\n\n");
  }
}