import fs from "fs/promises";
import path from "path";
import type { BookRepository } from "../core/use-cases/BookRepository";
import type { Book } from "../core/entities/library";
import { Chapter } from "../core/entities/library";
import { ResourceNotFoundError } from "../core/entities/errors";

export const DEFAULT_DOCS_DIR = "docs";

import { ExtractPractitioners } from "../core/use-cases/ExtractPractitioners";
import { AnalyzeChapterChecklist } from "../core/use-cases/AnalyzeChapterChecklist";

interface BookMeta {
  slug: string;
  title: string;
  shortTitle: string;
  number: string;
  chaptersDir: string;
}

const BOOKS: BookMeta[] = [
  {
    slug: "software-engineering",
    title: "Software Engineering",
    shortTitle: "Software Eng",
    number: "I",
    chaptersDir: "software-engineering-book/chapters",
  },
  {
    slug: "design-history",
    title: "Design History",
    shortTitle: "Design History",
    number: "II",
    chaptersDir: "design-book/chapters",
  },
  {
    slug: "ui-design",
    title: "UI Design",
    shortTitle: "UI Design",
    number: "III",
    chaptersDir: "ui-design-book/chapters",
  },
  {
    slug: "ux-design",
    title: "UX Design",
    shortTitle: "UX Design",
    number: "IV",
    chaptersDir: "ux-design-book/chapters",
  },
  {
    slug: "product-management",
    title: "Product Management",
    shortTitle: "Product Mgmt",
    number: "V",
    chaptersDir: "product-management-book/chapters",
  },
  {
    slug: "accessibility",
    title: "Accessibility",
    shortTitle: "Accessibility",
    number: "VI",
    chaptersDir: "accessibility-book/chapters",
  },
  {
    slug: "entrepreneurship",
    title: "Entrepreneurship",
    shortTitle: "Entrepreneurship",
    number: "VII",
    chaptersDir: "entrepreneurship-book/chapters",
  },
  {
    slug: "marketing-branding",
    title: "Marketing & Branding",
    shortTitle: "Marketing",
    number: "VIII",
    chaptersDir: "marketing-branding-book/chapters",
  },
  {
    slug: "content-strategy",
    title: "Content Strategy",
    shortTitle: "Content Strategy",
    number: "IX",
    chaptersDir: "content-strategy-book/chapters",
  },
  {
    slug: "data-analytics",
    title: "Data & Analytics",
    shortTitle: "Data & Analytics",
    number: "X",
    chaptersDir: "data-analytics-book/chapters",
  },
];

export class FileSystemBookRepository implements BookRepository {
  private readonly practitionerExtractor = new ExtractPractitioners();
  private readonly checklistAnalyzer = new AnalyzeChapterChecklist();

  constructor(
    private readonly docsDir: string = path.join(
      process.cwd(),
      DEFAULT_DOCS_DIR,
    ),
  ) {}

  async getAllBooks(): Promise<Book[]> {
    return BOOKS.map((b) => ({
      slug: b.slug,
      title: b.title,
      number: b.number,
    }));
  }

  async getBook(slug: string): Promise<Book | null> {
    const book = BOOKS.find((b) => b.slug === slug);
    if (!book) return null;
    return {
      slug: book.slug,
      title: book.title,
      number: book.number,
    };
  }

  async getChaptersByBook(bookSlug: string): Promise<Chapter[]> {
    const bookMeta = BOOKS.find((b) => b.slug === bookSlug);
    if (!bookMeta) throw new ResourceNotFoundError(`Book not found: ${bookSlug}`);

    const chaptersDir = path.join(this.docsDir, bookMeta.chaptersDir);

    try {
      const files = await fs.readdir(chaptersDir);
      const markdownFiles = files.filter((f) => f.endsWith(".md")).sort();

      const chapters: Chapter[] = [];
      for (const filename of markdownFiles) {
        const slug = filename.replace(/\.md$/, "");
        const content = await fs.readFile(
          path.join(chaptersDir, filename),
          "utf-8",
        );
        chapters.push(this.parseChapter(bookMeta.slug, slug, content));
      }
      return chapters;
    } catch {
      throw new ResourceNotFoundError(`Failed to read chapters for book: ${bookSlug}`);
    }
  }

  async getAllChapters(): Promise<Chapter[]> {
    const books = await this.getAllBooks();
    const allChapters: Chapter[] = [];
    for (const book of books) {
      const chapters = await this.getChaptersByBook(book.slug);
      allChapters.push(...chapters);
    }
    return allChapters;
  }

  async getChapter(
    bookSlug: string,
    chapterSlug: string,
  ): Promise<Chapter> {
    const bookMeta = BOOKS.find((b) => b.slug === bookSlug);
    if (!bookMeta) {
      throw new ResourceNotFoundError(`Book not found: ${bookSlug}`);
    }

    const filepath = path.join(
      this.docsDir,
      bookMeta.chaptersDir,
      `${chapterSlug}.md`,
    );
    try {
      const content = await fs.readFile(filepath, "utf-8");
      return this.parseChapter(bookSlug, chapterSlug, content);
    } catch {
      throw new ResourceNotFoundError(`Chapter not found: ${chapterSlug}`);
    }
  }

  private parseChapter(
    bookSlug: string,
    chapterSlug: string,
    content: string,
  ): Chapter {
    const titleMatch = content.match(/^#\s+(.*)/m);
    const title = titleMatch ? titleMatch[1].trim() : chapterSlug;

    const practitioners = this.practitionerExtractor.execute(content);
    const checklistItems = this.checklistAnalyzer.execute(content);

    const headings = [...content.matchAll(/^##\s+(.*)/gm)].map((m) =>
      m[1].trim(),
    );

    return new Chapter(
      bookSlug,
      chapterSlug,
      title,
      content,
      practitioners,
      checklistItems,
      headings,
    );
  }
}
