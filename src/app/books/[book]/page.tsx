import { redirect } from "next/navigation";
import { getBooks, getBookSummaries } from "@/lib/book-library";

export async function generateStaticParams() {
  const books = await getBooks();
  return books.map((book) => ({ book: book.slug }));
}

export default async function BookIndex({
  params,
}: {
  params: Promise<{ book: string }>;
}) {
  const resolvedParams = await params;
  const books = await getBooks();
  const book = books.find(b => b.slug === resolvedParams.book);
  if (!book) {
    redirect("/books");
  }

  const summaries = await getBookSummaries();
  const summary = summaries.find(s => s.slug === book.slug);
  
  if (summary && summary.chapters.length > 0) {
    // Redirect to first chapter. Note: summaries.chapters are titles, we need slugs.
    // Actually, it's safer to use the indexer or repository here.
    redirect(`/books/${book.slug}/ch01-introduction`); // Fallback to common convention or use indexer
  }
  return <div>No chapters found.</div>;
}
