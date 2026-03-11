/**
 * Book Content Library — Pure Facade over Core Use Cases.
 */

import type { Book } from "../core/entities/library";
import { getBookRepository } from "../adapters/RepositoryFactory";
import { LibrarySearchInteractor } from "../core/use-cases/LibrarySearchInteractor";
import { PractitionerInteractor } from "../core/use-cases/PractitionerInteractor";
import { ChecklistInteractor } from "../core/use-cases/ChecklistInteractor";
import { BookSummaryInteractor } from "../core/use-cases/BookSummaryInteractor";
import { GetChapterInteractor } from "../core/use-cases/GetChapterInteractor";
import { GetBookIndexInteractor, ChapterIndex } from "../core/use-cases/GetBookIndexInteractor";

import { ConsoleLogger } from "../adapters/ConsoleLogger";
import { ErrorHandler } from "../core/services/ErrorHandler";
import { LoggingDecorator } from "../core/common/LoggingDecorator";

// DIP: Dependencies are resolved via factories/providers
const logger = new ConsoleLogger();
const errorHandler = new ErrorHandler(logger);
const bookRepository = getBookRepository();

// Interactor Instances (Wrapped with Decorators)
const searchInteractor = new LoggingDecorator(
  new LibrarySearchInteractor(bookRepository), 
  "SearchBooks"
);
const practitionerInteractor = new LoggingDecorator(
  new PractitionerInteractor(bookRepository), 
  "GetPractitioners"
);
const checklistInteractor = new LoggingDecorator(
  new ChecklistInteractor(bookRepository), 
  "GetChecklists"
);
const summaryInteractor = new LoggingDecorator(
  new BookSummaryInteractor(bookRepository), 
  "GetBookSummaries"
);
const chapterInteractor = new LoggingDecorator(
  new GetChapterInteractor(bookRepository), 
  "GetChapterFull"
);
const indexInteractor = new LoggingDecorator(
  new GetBookIndexInteractor(bookRepository), 
  "GetBookIndex"
);

export type { ChapterIndex };

/**
 * Get all books (pure domain data, no file-system paths). (Facade Method)
 */
export async function getBooks(): Promise<Book[]> {
  try {
    return await bookRepository.getAllBooks();
  } catch (error) {
    errorHandler.handle(error, { method: "getBooks" });
    return [];
  }
}

export interface SearchResult {
  book: string;
  bookNumber: string;
  chapter: string;
  chapterSlug: string;
  bookSlug: string;
  matchContext: string;
  relevance: "high" | "medium" | "low";
}

let cachedIndex: ChapterIndex[] | null = null;

/**
 * Build or return cached index of all chapters. (Facade Method)
 */
export async function getBookIndex(): Promise<ChapterIndex[]> {
  try {
    if (cachedIndex) return cachedIndex;
    cachedIndex = await indexInteractor.execute(undefined);
    return cachedIndex;
  } catch (error) {
    errorHandler.handle(error, { method: "getBookIndex" });
    return [];
  }
}

/**
 * Full-text search across all chapters. (Facade Method)
 */
export async function searchBooks(
  query: string,
  maxResults = 10,
): Promise<SearchResult[]> {
  try {
    const results = await searchInteractor.execute({ query, maxResults });

    return results.map((r) => ({
      book: `${r.bookNumber}. ${r.bookTitle}`,
      bookNumber: r.bookNumber,
      chapter: r.chapterTitle,
      chapterSlug: r.chapterSlug,
      bookSlug: r.bookSlug,
      matchContext: r.matchContext,
      relevance: r.relevance,
    }));
  } catch (error) {
    errorHandler.handle(error, { method: "searchBooks", query });
    return [];
  }
}

/**
 * Get full chapter content. (Facade Method)
 */
export async function getChapterFull(
  bookSlug: string,
  chapterSlug: string,
): Promise<{ title: string; content: string; book: string } | null> {
  try {
    const result = await chapterInteractor.execute({ bookSlug, chapterSlug });
    if (!result) return null;
    return {
      title: result.title,
      content: result.content,
      book: result.bookTitle,
    };
  } catch (error) {
    errorHandler.handle(error, { method: "getChapterFull", bookSlug, chapterSlug });
    return null;
  }
}

/**
 * Get all checklists. (Facade Method)
 */
export async function getChecklists(
  bookSlug?: string,
): Promise<{ book: string; chapter: string; items: string[] }[]> {
  try {
    const results = await checklistInteractor.execute({ bookSlug });
    return results.map(r => ({
      book: r.bookTitle,
      chapter: r.chapterTitle,
      items: r.items
    }));
  } catch (error) {
    errorHandler.handle(error, { method: "getChecklists", bookSlug });
    return [];
  }
}

/**
 * Get all practitioners. (Facade Method)
 */
export async function getPractitioners(
  query?: string,
): Promise<{ name: string; books: string[]; chapters: string[] }[]> {
  try {
    const results = await practitionerInteractor.execute({ query });
    return results.map(r => ({
      name: r.name,
      books: r.books.map(b => `${b.number}. ${b.title}`),
      chapters: r.chapters.map(c => c.title)
    }));
  } catch (error) {
    errorHandler.handle(error, { method: "getPractitioners", query });
    return [];
  }
}

/**
 * Get summary of all books. (Facade Method)
 */
export async function getBookSummaries() {
  try {
    return await summaryInteractor.execute(undefined);
  } catch (error) {
    errorHandler.handle(error, { method: "getBookSummaries" });
    return [];
  }
}
