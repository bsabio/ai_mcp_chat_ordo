import type { ToolCommand } from "../ToolCommand";
import type { CorpusRepository } from "../CorpusRepository";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import type { SearchHandler } from "@/core/search/ports/SearchHandler";
import type { LibrarySearchResult } from "@/core/entities/library";
import { ContentAccessDeniedError } from "@/core/entities/errors";
import type { RoleName } from "@/core/entities/user";
import type { SearchChunkMetadata } from "@/core/search/ports/Chunker";
import { canAccessAudience } from "@/lib/access/content-access";
import { corpusConfig } from "@/lib/corpus-vocabulary";
import { resolveCanonicalCorpusReference } from "@/lib/corpus-reference";
import { stripLeadingMarkdownTitle } from "@/lib/markdown/strip-leading-markdown-title";
import { LibrarySearchInteractor } from "../LibrarySearchInteractor";
import { CorpusIndexInteractor, type CorpusIndexEntry } from "../CorpusIndexInteractor";
import { ChecklistInteractor } from "../ChecklistInteractor";
import { PractitionerInteractor } from "../PractitionerInteractor";
import { CorpusSummaryInteractor } from "../CorpusSummaryInteractor";

const MAX_PREFETCH_SECTION_CHARS = 4000;
const MIN_RELATED_SECTION_COUNT = 2;
const MAX_RELATED_SECTION_COUNT = 3;
const RELATED_SECTION_STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "before",
  "between",
  "chapter",
  "could",
  "does",
  "from",
  "into",
  "just",
  "more",
  "most",
  "other",
  "over",
  "that",
  "their",
  "there",
  "these",
  "this",
  "through",
  "under",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
]);

export type CorpusLinkPayload = {
  title: string;
  document: string;
  documentId: string;
  documentSlug: string | null;
  sectionSlug: string | null;
  canonicalPath: string | null;
  resolverPath: string | null;
  fallbackSearchPath: string | null;
  fallbackSearchQuery: string | null;
};

type SearchCorpusResultItem = {
  document: string;
  documentId: string;
  section: string;
  sectionSlug: string;
  documentSlug: string;
  matchContext: string;
  relevance: "high" | "medium" | "low";
  normalizedScore?: number;
  book: string;
  bookNumber: string;
  chapter: string;
  chapterSlug: string;
  bookSlug: string;
  canonicalPath: string | null;
  resolverPath: string | null;
  fallbackSearchPath: string | null;
  fallbackSearchQuery: string | null;
  matchPassage?: string;
  matchSection?: string | null;
  matchHighlight?: string;
  rrfScore?: number;
  vectorRank?: number | null;
  bm25Rank?: number | null;
  passageOffset?: { start: number; end: number };
  chunkMetadata?: SearchChunkMetadata | null;
};

export type GetSectionPayload = {
  found: boolean;
  requestedDocumentSlug: string;
  requestedSectionSlug: string;
  title: string | null;
  document: string | null;
  documentId: string | null;
  documentSlug: string | null;
  sectionSlug: string | null;
  canonicalPath: string | null;
  resolverPath: string | null;
  fallbackSearchPath: string | null;
  fallbackSearchQuery: string | null;
  content: string | null;
  contentTruncated: boolean;
  resolvedFromAlias: boolean;
  navigation: {
    previous: CorpusLinkPayload | null;
    next: CorpusLinkPayload | null;
  };
  relatedSections: CorpusLinkPayload[];
};

export type SearchCorpusPayload = {
  query: string;
  groundingState: "no_results" | "search_only" | "prefetched_section";
  followUp: "refine_query" | "call_get_section_before_detailed_claims" | "cite_canonical_paths";
  retrievalQuality: "strong" | "partial" | "none";
  results: SearchCorpusResultItem[];
  prefetchedSection: GetSectionPayload | null;
};

function formatDocumentLabel(documentId: string, documentTitle: string): string {
  return `${documentId}. ${documentTitle}`.trim();
}

function extractChapterSequence(slug: string): number | null {
  const match = slug.match(/^ch(\d{1,3})-/i);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function tokenizeRelatedText(values: string[]): Set<string> {
  return new Set(
    values
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((value) => value.trim())
      .filter((value) => value.length >= 4 && !RELATED_SECTION_STOP_WORDS.has(value)),
  );
}

function buildCorpusLinkPayload(
  entry: {
    documentTitle: string;
    documentId: string;
    documentSlug: string;
    sectionTitle: string;
    sectionSlug: string;
  },
  index: CorpusIndexEntry[],
): CorpusLinkPayload {
  const reference = resolveCanonicalCorpusReference(index, entry.documentSlug, entry.sectionSlug);

  return {
    title: entry.sectionTitle,
    document: formatDocumentLabel(entry.documentId, entry.documentTitle),
    documentId: entry.documentId,
    documentSlug: reference.documentSlug ?? entry.documentSlug,
    sectionSlug: reference.sectionSlug ?? entry.sectionSlug,
    canonicalPath: reference.canonicalPath,
    resolverPath: reference.resolverPath,
    fallbackSearchPath: reference.fallbackSearchPath,
    fallbackSearchQuery: reference.fallbackSearchQuery,
  };
}

function scoreRelatedSection(
  currentTokens: Set<string>,
  currentDocumentSlug: string,
  candidate: CorpusIndexEntry,
): number {
  const candidateTokens = tokenizeRelatedText([
    candidate.sectionTitle,
    candidate.contentPreview,
    ...candidate.headings,
    ...candidate.supplements,
  ]);

  let overlap = 0;
  for (const token of currentTokens) {
    if (candidateTokens.has(token)) {
      overlap += 1;
    }
  }

  if (overlap === 0) {
    return 0;
  }

  return overlap + (candidate.documentSlug !== currentDocumentSlug ? 2 : 0.5);
}

function buildRelatedSections(
  index: CorpusIndexEntry[],
  currentEntry: CorpusIndexEntry,
): CorpusLinkPayload[] {
  const currentTokens = tokenizeRelatedText([
    currentEntry.sectionTitle,
    currentEntry.contentPreview,
    ...currentEntry.headings,
    ...currentEntry.supplements,
  ]);

  const ranked = index
    .filter(
      (candidate) =>
        !(candidate.documentSlug === currentEntry.documentSlug && candidate.sectionSlug === currentEntry.sectionSlug),
    )
    .map((candidate) => ({
      candidate,
      score: scoreRelatedSection(currentTokens, currentEntry.documentSlug, candidate),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.candidate.documentSlug.localeCompare(right.candidate.documentSlug));

  const selected = ranked.slice(0, MAX_RELATED_SECTION_COUNT).map(({ candidate }) => buildCorpusLinkPayload({
    documentTitle: candidate.documentTitle,
    documentId: candidate.documentId,
    documentSlug: candidate.documentSlug,
    sectionTitle: candidate.sectionTitle,
    sectionSlug: candidate.sectionSlug,
  }, index));

  if (selected.length >= MIN_RELATED_SECTION_COUNT) {
    return selected;
  }

  const currentChapterSequence = extractChapterSequence(currentEntry.sectionSlug);
  const sameDocumentFallback = index
    .filter(
      (candidate) =>
        candidate.documentSlug === currentEntry.documentSlug
        && candidate.sectionSlug !== currentEntry.sectionSlug
        && !selected.some((entry) => entry.documentSlug === candidate.documentSlug && entry.sectionSlug === candidate.sectionSlug),
    )
    .sort((left, right) => {
      const leftSequence = extractChapterSequence(left.sectionSlug);
      const rightSequence = extractChapterSequence(right.sectionSlug);

      if (currentChapterSequence == null || leftSequence == null || rightSequence == null) {
        return left.sectionSlug.localeCompare(right.sectionSlug);
      }

      return Math.abs(leftSequence - currentChapterSequence) - Math.abs(rightSequence - currentChapterSequence);
    })
    .slice(0, MAX_RELATED_SECTION_COUNT - selected.length)
    .map((candidate) => buildCorpusLinkPayload({
      documentTitle: candidate.documentTitle,
      documentId: candidate.documentId,
      documentSlug: candidate.documentSlug,
      sectionTitle: candidate.sectionTitle,
      sectionSlug: candidate.sectionSlug,
    }, index));

  return [...selected, ...sameDocumentFallback].slice(0, MAX_RELATED_SECTION_COUNT);
}

function createMissingSectionPayload(
  requestedDocumentSlug: string,
  requestedSectionSlug: string,
  fallbackSearchPath: string | null,
  fallbackSearchQuery: string | null,
): GetSectionPayload {
  return {
    found: false,
    requestedDocumentSlug,
    requestedSectionSlug,
    title: null,
    document: null,
    documentId: null,
    documentSlug: null,
    sectionSlug: null,
    canonicalPath: null,
    resolverPath: null,
    fallbackSearchPath,
    fallbackSearchQuery,
    content: null,
    contentTruncated: false,
    resolvedFromAlias: false,
    navigation: {
      previous: null,
      next: null,
    },
    relatedSections: [],
  };
}

async function loadStructuredSectionPayload(
  repo: CorpusRepository,
  index: CorpusIndexEntry[],
  input: { documentSlug: string; sectionSlug: string; role?: RoleName },
): Promise<GetSectionPayload> {
  const reference = resolveCanonicalCorpusReference(index, input.documentSlug, input.sectionSlug);

  if (!reference.resolved || !reference.documentSlug || !reference.sectionSlug) {
    return createMissingSectionPayload(
      input.documentSlug,
      input.sectionSlug,
      reference.fallbackSearchPath,
      reference.fallbackSearchQuery,
    );
  }

  let section;
  try {
    section = await repo.getSection(reference.documentSlug, reference.sectionSlug);
  } catch (error) {
    void error;
    return createMissingSectionPayload(
      input.documentSlug,
      input.sectionSlug,
      reference.fallbackSearchPath,
      reference.fallbackSearchQuery,
    );
  }

  if (input.role && !canAccessAudience(section.audience, input.role)) {
    throw new ContentAccessDeniedError(
      `Access denied for section ${reference.documentSlug}/${reference.sectionSlug}`,
      section.audience,
    );
  }

  const [documents, sectionsByDocument] = await Promise.all([
    repo.getAllDocuments(),
    repo.getSectionsByDocument(reference.documentSlug),
  ]);
  const document = documents.find((candidate) => candidate.slug === reference.documentSlug);
  const accessibleSections = sectionsByDocument.filter(
    (candidate) => !input.role || canAccessAudience(candidate.audience, input.role),
  );
  const currentIndex = accessibleSections.findIndex(
    (candidate) => candidate.sectionSlug === reference.sectionSlug,
  );
  const previousSection = currentIndex > 0 ? accessibleSections[currentIndex - 1] : null;
  const nextSection = currentIndex >= 0 && currentIndex < accessibleSections.length - 1
    ? accessibleSections[currentIndex + 1]
    : null;
  const currentIndexEntry = index.find(
    (candidate) => candidate.documentSlug === reference.documentSlug && candidate.sectionSlug === reference.sectionSlug,
  );

  const documentId = document?.number ?? currentIndexEntry?.documentId ?? "";
  const documentTitle = document?.title ?? currentIndexEntry?.documentTitle ?? reference.documentSlug;
  const content = stripLeadingMarkdownTitle(section.title, section.content);
  const truncatedContent = truncateSectionContent(content);

  const navigation = {
    previous: previousSection
      ? buildCorpusLinkPayload({
        documentTitle,
        documentId,
        documentSlug: reference.documentSlug,
        sectionTitle: previousSection.title,
        sectionSlug: previousSection.sectionSlug,
      }, index)
      : null,
    next: nextSection
      ? buildCorpusLinkPayload({
        documentTitle,
        documentId,
        documentSlug: reference.documentSlug,
        sectionTitle: nextSection.title,
        sectionSlug: nextSection.sectionSlug,
      }, index)
      : null,
  };

  return {
    found: true,
    requestedDocumentSlug: input.documentSlug,
    requestedSectionSlug: input.sectionSlug,
    title: section.title,
    document: formatDocumentLabel(documentId, documentTitle),
    documentId,
    documentSlug: reference.documentSlug,
    sectionSlug: reference.sectionSlug,
    canonicalPath: reference.canonicalPath,
    resolverPath: reference.resolverPath,
    fallbackSearchPath: null,
    fallbackSearchQuery: null,
    content: truncatedContent.content,
    contentTruncated: truncatedContent.contentTruncated,
    resolvedFromAlias: reference.resolvedFromAlias,
    navigation,
    relatedSections: currentIndexEntry ? buildRelatedSections(index, currentIndexEntry) : [],
  };
}

function buildSearchCorpusResultItem(
  result: LibrarySearchResult,
  index: CorpusIndexEntry[],
): SearchCorpusResultItem {
  const documentId = result.bookNumber ?? result.documentId ?? "Unknown";
  const documentTitle = result.bookTitle ?? result.documentTitle ?? "Unknown document";
  const chapterTitle = result.chapterTitle ?? result.sectionTitle ?? "Unknown section";
  const rawDocumentSlug = result.bookSlug ?? result.documentSlug ?? "unknown-document";
  const rawSectionSlug = result.chapterSlug ?? result.sectionSlug ?? "unknown-section";
  const reference = resolveCanonicalCorpusReference(index, rawDocumentSlug, rawSectionSlug);
  const documentSlug = reference.documentSlug ?? rawDocumentSlug;
  const sectionSlug = reference.sectionSlug ?? rawSectionSlug;

  return {
    document: formatDocumentLabel(documentId, documentTitle),
    documentId,
    section: chapterTitle,
    sectionSlug,
    documentSlug,
    matchContext: result.matchContext,
    relevance: result.relevance,
    normalizedScore: result.score,
    book: formatDocumentLabel(documentId, documentTitle),
    bookNumber: documentId,
    chapter: chapterTitle,
    chapterSlug: sectionSlug,
    bookSlug: documentSlug,
    canonicalPath: reference.canonicalPath,
    resolverPath: reference.resolverPath,
    fallbackSearchPath: reference.fallbackSearchPath,
    fallbackSearchQuery: reference.fallbackSearchQuery,
    ...(result.matchPassage !== undefined && {
      matchPassage: result.matchPassage,
      matchSection: result.matchSection,
      matchHighlight: result.matchHighlight,
      rrfScore: result.rrfScore,
      vectorRank: result.vectorRank,
      bm25Rank: result.bm25Rank,
      passageOffset: result.passageOffset,
      chunkMetadata: result.chunkMetadata ?? null,
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

  if (second.relevance !== "high") {
    return true;
  }

  if (typeof top.score !== "number" || typeof second.score !== "number") {
    return false;
  }

  if (top.score > 1 || second.score > 1) {
    return top.score - second.score >= 5;
  }

  return top.score - second.score >= 0.15;
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
  private readonly index: CorpusIndexInteractor;
  private readonly repo: CorpusRepository;

  constructor(repo: CorpusRepository, searchHandler?: SearchHandler) {
    this.repo = repo;
    this.search = new LibrarySearchInteractor(repo, searchHandler);
    this.index = new CorpusIndexInteractor(repo);
  }

  async execute({ query, max_results = 5 }: { query: string; max_results?: number }, context?: ToolExecutionContext) {
    const results = await this.search.execute({
      query,
      maxResults: Math.min(max_results, 15),
      role: context?.role,
    });
    const index = await this.index.execute(context?.role ? { role: context.role } : undefined);

    if (results.length === 0) {
      return {
        query,
        groundingState: "no_results",
        followUp: "refine_query",
        retrievalQuality: "none",
        results: [],
        prefetchedSection: null,
      } satisfies SearchCorpusPayload;
    }

    const mappedResults = results.map((result) => buildSearchCorpusResultItem(result, index));
    const canPrefetch = context?.role && context.role !== "ANONYMOUS" && shouldPrefetchTopSection(results);

    if (!canPrefetch) {
      return {
        query,
        groundingState: "search_only",
        followUp: "call_get_section_before_detailed_claims",
        retrievalQuality: results[0]?.relevance === "high" ? "strong" : "partial",
        results: mappedResults,
        prefetchedSection: null,
      } satisfies SearchCorpusPayload;
    }

    const top = mappedResults[0];
    const topBookSlug = top?.documentSlug;
    const topChapterSlug = top?.sectionSlug;

    if (!topBookSlug || !topChapterSlug) {
      return {
        query,
        groundingState: "search_only",
        followUp: "call_get_section_before_detailed_claims",
        retrievalQuality: results[0]?.relevance === "high" ? "strong" : "partial",
        results: mappedResults,
        prefetchedSection: null,
      } satisfies SearchCorpusPayload;
    }

    const prefetchedSection = await loadStructuredSectionPayload(this.repo, index, {
      documentSlug: topBookSlug,
      sectionSlug: topChapterSlug,
      role: context?.role,
    });

    if (!prefetchedSection.found) {
      return {
        query,
        groundingState: "search_only",
        followUp: "call_get_section_before_detailed_claims",
        retrievalQuality: results[0]?.relevance === "high" ? "strong" : "partial",
        results: mappedResults,
        prefetchedSection: null,
      } satisfies SearchCorpusPayload;
    }

    return {
      query,
      groundingState: "prefetched_section",
      followUp: "cite_canonical_paths",
      retrievalQuality: results[0]?.relevance === "high" ? "strong" : "partial",
      results: mappedResults,
      prefetchedSection,
    } satisfies SearchCorpusPayload;
  }
}

export class GetSectionCommand implements ToolCommand<{ document_slug: string; section_slug: string }, GetSectionPayload> {
  private readonly repo: CorpusRepository;
  private readonly index: CorpusIndexInteractor;

  constructor(repo: CorpusRepository) {
    this.repo = repo;
    this.index = new CorpusIndexInteractor(repo);
  }

  async execute({ document_slug, section_slug }: { document_slug: string; section_slug: string }, context?: ToolExecutionContext) {
    const index = await this.index.execute(context?.role ? { role: context.role } : undefined);
    return loadStructuredSectionPayload(this.repo, index, {
      documentSlug: document_slug,
      sectionSlug: section_slug,
      role: context?.role,
    });
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