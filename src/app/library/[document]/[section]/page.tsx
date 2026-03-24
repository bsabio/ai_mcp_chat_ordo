import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ResourceNotFoundError } from "@/core/entities/errors";
import { BookSidebar } from "@/components/BookSidebar";
import { getDocuments, getSectionFull, getCorpusSummaries } from "@/lib/corpus-library";
import { buildChapterMetadata, buildChapterSeo } from "@/lib/seo/library-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ document: string; section: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const [documents, summaries] = await Promise.all([getDocuments(), getCorpusSummaries()]);
  const book = documents.find((item) => item.slug === resolvedParams.document);
  const summary = summaries.find((item) => item.slug === resolvedParams.document);
  if (!book || !summary) return {};

  const chapterSlugs = summary.chapterSlugs ?? summary.sectionSlugs;
  const currentIndex = chapterSlugs.findIndex((slug) => slug === resolvedParams.section);
  if (currentIndex === -1) return {};

  try {
    const result = await getSectionFull(resolvedParams.document, resolvedParams.section);
    if (!result) return {};
    return buildChapterMetadata({
      chapterTitle: result.title,
      bookTitle: book.title,
      bookSlug: book.slug,
      chapterSlug: resolvedParams.section,
      content: result.content,
      chapterNumber: currentIndex + 1,
      totalChapters: chapterSlugs.length,
    });
  } catch {
    return {};
  }
}

export async function generateStaticParams() {
  const summaries = await getCorpusSummaries();
  const params: { document: string; section: string }[] = [];

  for (const summary of summaries) {
    for (const sectionSlug of summary.sectionSlugs) {
      params.push({ document: summary.slug, section: sectionSlug });
    }
  }

  return params;
}

export default async function LibrarySectionPage({
  params,
}: {
  params: Promise<{ document: string; section: string }>;
}) {
  const resolvedParams = await params;
  const [documents, summaries] = await Promise.all([getDocuments(), getCorpusSummaries()]);

  const book = documents.find((item) => item.slug === resolvedParams.document);
  const summary = summaries.find((item) => item.slug === resolvedParams.document);

  if (!book || !summary) {
    notFound();
  }

  const chapterSlugs = summary.chapterSlugs ?? summary.sectionSlugs;
  const chapterTitles = summary.chapters ?? summary.sections;
  const currentIndex = chapterSlugs.findIndex((slug) => slug === resolvedParams.section);

  if (currentIndex === -1) {
    notFound();
  }

  let result: Awaited<ReturnType<typeof getSectionFull>>;
  try {
    result = await getSectionFull(resolvedParams.document, resolvedParams.section);
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      notFound();
    }
    throw error;
  }

  if (!result) {
    notFound();
  }

  const chapters = chapterSlugs.map((slug, index) => ({
    slug,
    title: chapterTitles[index] ?? slug,
  }));

  const previous = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const next = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  return (
    <div className="library-page-shell min-h-screen text-foreground">
      <div className="library-frame">
        <BookSidebar
          book={{ slug: book.slug, title: book.title, number: book.number }}
          chapters={chapters}
          currentChapterSlug={resolvedParams.section}
        />

        <main className="min-w-0">
          <article className="library-reading-panel">
            <header className="mb-8 flex flex-col gap-5 pb-7" style={{ borderBottom: '1px solid color-mix(in oklab, var(--foreground) 8%, transparent)' }}>
              <span className="library-kicker">Library chapter</span>
              <div className="flex flex-col gap-3">
                <p className="tier-micro font-semibold uppercase tracking-[0.14em] text-foreground/42">
                  Book {book.number} · {book.title}
                </p>
                <h1 className="library-title max-w-4xl">{result.title}</h1>
                <p className="library-dek">
                  Chapter {currentIndex + 1} of {chapters.length} in the {book.title} book sequence.
                </p>
              </div>
              <div className="library-meta-row">
                <span className="library-meta-pill">{book.title}</span>
                <span className="library-meta-pill">Chapter {currentIndex + 1}</span>
                <span className="library-meta-pill">{chapters.length} total chapters</span>
              </div>
            </header>

            <div className="library-prose">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ node: _node, ...props }) => <h1 {...props} />,
                  h2: ({ node: _node, ...props }) => <h2 {...props} />,
                  h3: ({ node: _node, ...props }) => <h3 {...props} />,
                  p: ({ node: _node, ...props }) => <p {...props} />,
                  a: ({ node: _node, ...props }) => <a {...props} />,
                  ul: ({ node: _node, ...props }) => <ul {...props} />,
                  ol: ({ node: _node, ...props }) => <ol {...props} />,
                  li: ({ node: _node, ...props }) => <li {...props} />,
                  blockquote: ({ node: _node, ...props }) => <blockquote {...props} />,
                  img: ({ node: _node, alt, ...props }) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={alt || ""} {...props} />
                  ),
                  pre: ({ node: _node, ...props }) => (
                    <pre className="code-chrome" {...props} />
                  ),
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  code: ({ node: _node, inline, ...props }: any) =>
                    inline ? <code {...props} /> : <code className="font-mono" {...props} />,
                  table: ({ node: _node, ...props }) => (
                    <div className="overflow-x-auto">
                      <table {...props} />
                    </div>
                  ),
                  th: ({ node: _node, ...props }) => <th {...props} />,
                  td: ({ node: _node, ...props }) => <td {...props} />,
                }}
              >
                {result.content}
              </ReactMarkdown>
            </div>

            <footer className="mt-10 flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between" style={{ borderTop: '1px solid color-mix(in oklab, var(--foreground) 8%, transparent)' }}>
              <div className="flex flex-wrap gap-3">
                {previous ? (
                  <Link
                    href={`/library/${book.slug}/${previous.slug}`}
                    className="rounded-full bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface)_98%,var(--background))_0%,color-mix(in_oklab,var(--surface-muted)_72%,transparent)_100%)] px-4 py-2 text-sm font-medium text-foreground/72 shadow-[0_8px_16px_-14px_color-mix(in_srgb,var(--shadow-base)_8%,transparent)] transition-all hover:-translate-y-px hover:text-foreground hover:shadow-[0_12px_20px_-14px_color-mix(in_srgb,var(--shadow-base)_12%,transparent)]"
                  >
                    ← {previous.title}
                  </Link>
                ) : null}

                {next ? (
                  <Link
                    href={`/library/${book.slug}/${next.slug}`}
                    className="rounded-full bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface)_98%,var(--background))_0%,color-mix(in_oklab,var(--surface-muted)_72%,transparent)_100%)] px-4 py-2 text-sm font-medium text-foreground/72 shadow-[0_8px_16px_-14px_color-mix(in_srgb,var(--shadow-base)_8%,transparent)] transition-all hover:-translate-y-px hover:text-foreground hover:shadow-[0_12px_20px_-14px_color-mix(in_srgb,var(--shadow-base)_12%,transparent)]"
                  >
                    {next.title} →
                  </Link>
                ) : null}
              </div>

              <Link
                href={`/?topic=${encodeURIComponent(result.title)}`}
                className="tier-micro font-medium text-accent transition-colors hover:text-foreground"
              >
                Have questions about this topic? Ask the AI.
              </Link>
            </footer>

            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(
                  buildChapterSeo({
                    chapterTitle: result.title,
                    bookTitle: book.title,
                    bookSlug: book.slug,
                    chapterSlug: resolvedParams.section,
                    content: result.content,
                    chapterNumber: currentIndex + 1,
                    totalChapters: chapters.length,
                  }).jsonLd,
                ),
              }}
            />
          </article>
        </main>
      </div>
    </div>
  );
}