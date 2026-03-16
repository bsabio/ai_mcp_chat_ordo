import type { ToolCommand } from "../ToolCommand";
import type { CorpusCompatibleRepository } from "../CorpusRepository";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import type { SearchHandler } from "@/core/search/ports/SearchHandler";
import { corpusConfig } from "@/lib/corpus-config";
import { LibrarySearchInteractor } from "../LibrarySearchInteractor";
import { GetChapterInteractor } from "../GetChapterInteractor";
import { ChecklistInteractor } from "../ChecklistInteractor";
import { PractitionerInteractor } from "../PractitionerInteractor";
import { CorpusSummaryInteractor } from "../CorpusSummaryInteractor";

export class SearchCorpusCommand implements ToolCommand<{ query: string; max_results?: number }, unknown> {
  private readonly search: LibrarySearchInteractor;

  constructor(repo: CorpusCompatibleRepository, searchHandler?: SearchHandler) {
    this.search = new LibrarySearchInteractor(repo, searchHandler);
  }

  async execute({ query, max_results = 5 }: { query: string; max_results?: number }, _context?: ToolExecutionContext) {
    const results = await this.search.execute({ query, maxResults: Math.min(max_results, 15) });
    if (results.length === 0) return `No results found for "${query}".`;

    return results.map((result) => ({
      document: `${result.bookNumber}. ${result.bookTitle}`,
      documentId: result.bookNumber,
      section: result.chapterTitle,
      sectionSlug: result.chapterSlug,
      documentSlug: result.bookSlug,
      matchContext: result.matchContext,
      relevance: result.relevance,
      book: `${result.bookNumber}. ${result.bookTitle}`,
      bookNumber: result.bookNumber,
      chapter: result.chapterTitle,
      chapterSlug: result.chapterSlug,
      bookSlug: result.bookSlug,
      ...(result.matchPassage !== undefined && {
        matchPassage: result.matchPassage,
        matchSection: result.matchSection,
        matchHighlight: result.matchHighlight,
        rrfScore: result.rrfScore,
        vectorRank: result.vectorRank,
        bm25Rank: result.bm25Rank,
        passageOffset: result.passageOffset,
      }),
    }));
  }
}

export class GetSectionCommand implements ToolCommand<{ document_slug: string; section_slug: string }, string> {
  private readonly getSection: GetChapterInteractor;

  constructor(repo: CorpusCompatibleRepository) {
    this.getSection = new GetChapterInteractor(repo);
  }

  async execute({ document_slug, section_slug }: { document_slug: string; section_slug: string }, _context?: ToolExecutionContext) {
    const section = await this.getSection.execute({ bookSlug: document_slug, chapterSlug: section_slug });
    if (!section) return `Section not found: ${document_slug}/${section_slug}.`;

    const content = section.content.length > 4000
      ? `${section.content.slice(0, 4000)}\n\n[... truncated ...]`
      : section.content;

    return `# ${section.bookTitle} - ${section.title}\n\n${content}`;
  }
}

export class GetChecklistCommand implements ToolCommand<{ book_slug?: string }, string> {
  private readonly checklists: ChecklistInteractor;

  constructor(repo: CorpusCompatibleRepository) {
    this.checklists = new ChecklistInteractor(repo);
  }

  async execute({ book_slug }: { book_slug?: string }, _context?: ToolExecutionContext) {
    const results = await this.checklists.execute({ bookSlug: book_slug });
    if (results.length === 0) return "No checklists found.";

    return results
      .map((checklist) => `## ${checklist.bookTitle} — ${checklist.chapterTitle}\n${checklist.items.map((item) => `- ${item}`).join("\n")}`)
      .join("\n\n");
  }
}

export class ListPractitionersCommand implements ToolCommand<{ query?: string }, string> {
  private readonly practitioners: PractitionerInteractor;

  constructor(repo: CorpusCompatibleRepository) {
    this.practitioners = new PractitionerInteractor(repo);
  }

  async execute({ query }: { query?: string }, _context?: ToolExecutionContext) {
    const results = await this.practitioners.execute({ query });
    if (results.length === 0) return "No practitioners found.";

    return results
      .slice(0, 30)
      .map((practitioner) => `**${practitioner.name}** — appears in ${practitioner.books.map((book) => `${book.number}. ${book.title}`).join(", ")} (${practitioner.chapters.map((chapter) => chapter.title).join("; ")})`)
      .join("\n");
  }
}

export class GetCorpusSummaryCommand implements ToolCommand<Record<string, never>, string> {
  private readonly summaries: CorpusSummaryInteractor;

  constructor(repo: CorpusCompatibleRepository) {
    this.summaries = new CorpusSummaryInteractor(repo);
  }

  async execute(_input: Record<string, never>, _context?: ToolExecutionContext) {
    const results = await this.summaries.execute();
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

export class SearchBooksCommand extends SearchCorpusCommand {}

export class GetChapterCommand implements ToolCommand<{ book_slug: string; chapter_slug: string }, string> {
  private readonly getSection: GetSectionCommand;

  constructor(repo: CorpusCompatibleRepository) {
    this.getSection = new GetSectionCommand(repo);
  }

  async execute({ book_slug, chapter_slug }: { book_slug: string; chapter_slug: string }, context?: ToolExecutionContext) {
    return this.getSection.execute(
      { document_slug: book_slug, section_slug: chapter_slug },
      context,
    );
  }
}

export class GetBookSummaryCommand extends GetCorpusSummaryCommand {}