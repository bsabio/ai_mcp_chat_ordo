import { getBookSummaries } from "@/lib/book-library";
import { BOOKS } from "@/core/entities/library";
import Link from "next/link";

export const metadata = {
  title: "The Product Development Library",
  description:
    "A 10-book series on professional product development in the AI era.",
};

export default async function BooksIndex() {
  const summaries = await getBookSummaries();
  const booksWithChapters = BOOKS.map((book) => {
    const summary = summaries.find((s) => s.slug === book.slug);
    return { ...book, chapterCount: summary?.chapterCount || 0 };
  });

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <header className="mb-16 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            The Product Development Library
          </h1>
          <p className="text-lg opacity-70 max-w-2xl mx-auto">
            Ten books covering the full product development lifecycle — from
            engineering through design, UX, product management, accessibility,
            and beyond.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {booksWithChapters.map((book) => (
            <Link
              key={book.slug}
              href={`/books/${book.slug}`}
              className="group block rounded-xl border-theme p-6 transition-all duration-200 hover:border-[var(--accent-color)]/50 hover:shadow-lg hover:shadow-[var(--accent-color)]/5 hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-4">
                <span className="shrink-0 text-xs font-bold uppercase tracking-wider opacity-40 pt-1">
                  {book.number}
                </span>
                <div>
                  <h2 className="text-lg font-semibold group-hover:text-accent-theme transition-colors">
                    {book.title}
                  </h2>
                  <p className="text-sm opacity-60 mt-1">
                    {book.chapterCount} chapters
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link
            href="/"
            className="text-xs uppercase tracking-wider font-bold text-accent-theme hover:opacity-80 transition-opacity"
          >
            ← Back to Chat
          </Link>
        </div>
      </div>
    </div>
  );
}
