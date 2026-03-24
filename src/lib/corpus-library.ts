/**
 * Corpus Content Library — Pure Facade over Core Use Cases.
 */

import type { Document } from "../core/entities/corpus";
import { getCorpusRepository } from "../adapters/RepositoryFactory";
import { LibrarySearchInteractor } from "../core/use-cases/LibrarySearchInteractor";
import { PractitionerInteractor } from "../core/use-cases/PractitionerInteractor";
import { ChecklistInteractor } from "../core/use-cases/ChecklistInteractor";
import { CorpusSummaryInteractor } from "../core/use-cases/CorpusSummaryInteractor";
import type { CorpusIndexEntry } from "../core/use-cases/CorpusIndexInteractor";
import { CorpusIndexInteractor } from "../core/use-cases/CorpusIndexInteractor";
import { GetChapterInteractor } from "../core/use-cases/GetChapterInteractor";

import { ConsoleLogger } from "../adapters/ConsoleLogger";
import { ErrorHandler } from "../core/services/ErrorHandler";
import { LoggingDecorator } from "../core/common/LoggingDecorator";

const logger = new ConsoleLogger();
const errorHandler = new ErrorHandler(logger);
const corpusRepository = getCorpusRepository();

const searchInteractor = new LoggingDecorator(
  new LibrarySearchInteractor(corpusRepository),
  "SearchCorpus"
);
const practitionerInteractor = new LoggingDecorator(
  new PractitionerInteractor(corpusRepository),
  "GetContributors"
);
const checklistInteractor = new LoggingDecorator(
  new ChecklistInteractor(corpusRepository),
  "GetSupplements"
);
const summaryInteractor = new LoggingDecorator(
  new CorpusSummaryInteractor(corpusRepository),
  "GetCorpusSummaries"
);
const sectionInteractor = new LoggingDecorator(
  new GetChapterInteractor(corpusRepository),
  "GetSectionFull"
);
const indexInteractor = new LoggingDecorator(
  new CorpusIndexInteractor(corpusRepository),
  "GetCorpusIndex"
);

// ── Error-handling wrapper (TD-B F4) ──

function withErrorFallback<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  fallback: TReturn,
  method: string,
): (...args: TArgs) => Promise<TReturn> {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      errorHandler.handle(error, { method });
      return fallback;
    }
  };
}

export type { CorpusIndexEntry as ChapterIndex };

export const getDocuments = withErrorFallback(
  () => corpusRepository.getAllDocuments(),
  [] as Document[],
  "getDocuments",
);

export interface SearchResult {
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
}

let cachedIndex: CorpusIndexEntry[] | null = null;

export const getCorpusIndex = withErrorFallback(
  async () => {
    if (cachedIndex) return cachedIndex;
    cachedIndex = await indexInteractor.execute(undefined);
    return cachedIndex;
  },
  [] as CorpusIndexEntry[],
  "getCorpusIndex",
);

export const searchCorpus = withErrorFallback(
  async (query: string, maxResults: number = 10) => {
    const results = await searchInteractor.execute({ query, maxResults });

    return results.map((result) => ({
      document: `${result.documentId ?? result.bookNumber ?? ""}. ${result.documentTitle ?? result.bookTitle ?? ""}`.trim(),
      documentId: result.documentId ?? result.bookNumber ?? "",
      section: result.sectionTitle ?? result.chapterTitle ?? "",
      sectionSlug: result.sectionSlug ?? result.chapterSlug ?? "",
      documentSlug: result.documentSlug ?? result.bookSlug ?? "",
      matchContext: result.matchContext,
      relevance: result.relevance,
      book: `${result.bookNumber ?? result.documentId ?? ""}. ${result.bookTitle ?? result.documentTitle ?? ""}`.trim(),
      bookNumber: result.bookNumber ?? result.documentId ?? "",
      chapter: result.chapterTitle ?? result.sectionTitle ?? "",
      chapterSlug: result.chapterSlug ?? result.sectionSlug ?? "",
      bookSlug: result.bookSlug ?? result.documentSlug ?? "",
    }));
  },
  [] as SearchResult[],
  "searchCorpus",
);

export const getSectionFull = withErrorFallback(
  async (documentSlug: string, sectionSlug: string) => {
    const result = await sectionInteractor.execute({ bookSlug: documentSlug, chapterSlug: sectionSlug });
    if (!result) return null;
    return {
      title: result.title,
      content: result.content,
      document: result.bookTitle,
      book: result.bookTitle,
    };
  },
  null as { title: string; content: string; document: string; book: string } | null,
  "getSectionFull",
);

export const getChecklists = withErrorFallback(
  async (documentSlug?: string) => {
    const results = await checklistInteractor.execute({ bookSlug: documentSlug });
    return results.map((result) => ({
      document: result.bookTitle,
      section: result.chapterTitle,
      items: result.items,
      book: result.bookTitle,
      chapter: result.chapterTitle,
    }));
  },
  [] as { document: string; section: string; items: string[]; book: string; chapter: string }[],
  "getChecklists",
);

export const getPractitioners = withErrorFallback(
  async (query?: string) => {
    const results = await practitionerInteractor.execute({ query });
    return results.map((result) => ({
      name: result.name,
      documents: result.books.map((book) => `${book.number}. ${book.title}`),
      sections: result.chapters.map((chapter) => chapter.title),
      books: result.books.map((book) => `${book.number}. ${book.title}`),
      chapters: result.chapters.map((chapter) => chapter.title),
    }));
  },
  [] as { name: string; documents: string[]; sections: string[]; books: string[]; chapters: string[] }[],
  "getPractitioners",
);

export const getCorpusSummaries = withErrorFallback(
  () => summaryInteractor.execute(undefined),
  [] as Awaited<ReturnType<typeof summaryInteractor.execute>>,
  "getCorpusSummaries",
);