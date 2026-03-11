import { getBooks, getBookSummaries } from "@/lib/book-library";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { BookSidebar } from "@/components/BookSidebar";

export async function generateStaticParams() {
  const books = await getBooks();
  return books.map((book) => ({ book: book.slug }));
}

export default async function BookLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ book: string }>;
}) {
  const resolvedParams = await params;
  const books = await getBooks();
  const book = books.find(b => b.slug === resolvedParams.book);
  if (!book) {
    notFound();
  }

  const summaries = await getBookSummaries();
  const summary = summaries.find(s => s.slug === book.slug);
  const chapters = summary ? summary.chapterSlugs.map((slug, i) => ({
    slug,
    title: summary.chapters[i]
  })) : [];

  return (
    <div className="flex min-h-screen bg-[var(--background)] font-sans text-[var(--foreground)] transition-colors duration-300">
      <div className="hidden md:flex">
        <BookSidebar 
          book={{
            slug: book.slug,
            title: book.title,
            number: book.number
          }}
          chapters={chapters}
        />
      </div>

      <main className="flex-1 overflow-x-hidden p-6 lg:p-12 pb-24">
        <div className="md:hidden flex justify-between items-center mb-8 pb-4 border-b border-[var(--border-color)]">
          <div className="flex gap-4 items-center">
            <Link
              href="/books"
              className="text-label tracking-[0.2em] text-[var(--accent-color)]"
            >
              ← Books
            </Link>
            <span className="text-label opacity-40 truncate max-w-[150px]">
              {book.number}. {book.title}
            </span>
          </div>
          <div className="scale-75 origin-right">
            <ThemeSwitcher />
          </div>
        </div>

        <div className="mx-auto max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          {children}
        </div>
      </main>
    </div>
  );
}
