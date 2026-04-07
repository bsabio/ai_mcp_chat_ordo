import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ResourceNotFoundError } from "@/core/entities/errors";
import { BookSidebar } from "@/components/BookSidebar";
import { MarkdownProse } from "@/components/MarkdownProse";
import { getDocuments, getSectionFull, getCorpusSummaries } from "@/lib/corpus-library";
import { getViewerRole, rethrowLibraryAccessDenied } from "@/lib/corpus-access";
import { buildLibraryChapterDisplay } from "@/lib/library-chapter-display";
import { buildChapterMetadata, buildChapterSeo } from "@/lib/seo/library-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ document: string; section: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const role = await getViewerRole();
  const [documents, summaries] = await Promise.all([
    getDocuments({ role }),
    getCorpusSummaries({ role }),
  ]);
  const book = documents.find((item) => item.slug === resolvedParams.document);
  const summary = summaries.find((item) => item.slug === resolvedParams.document);
  if (!book || !summary) return {};

  const chapterSlugs = summary.chapterSlugs ?? summary.sectionSlugs;
  const currentIndex = chapterSlugs.findIndex((slug) => slug === resolvedParams.section);
  if (currentIndex === -1) return {};

  try {
    const result = await getSectionFull(resolvedParams.document, resolvedParams.section, { role });
    if (!result) return {};
    const chapterDisplay = buildLibraryChapterDisplay({
      title: result.title,
      sequenceIndex: currentIndex,
      totalChapters: chapterSlugs.length,
    });

    return buildChapterMetadata({
      chapterTitle: chapterDisplay.fullTitle,
      bookTitle: book.title,
      bookSlug: book.slug,
      chapterSlug: resolvedParams.section,
      content: result.content,
      chapterNumber: chapterDisplay.chapterNumber,
      totalChapters: chapterSlugs.length,
    });
  } catch {
    return {};
  }
}

export async function generateStaticParams() {
  const summaries = await getCorpusSummaries({ publicOnly: true });
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
  const role = await getViewerRole();
  const [documents, summaries] = await Promise.all([
    getDocuments({ role }),
    getCorpusSummaries({ role }),
  ]);

  let result: Awaited<ReturnType<typeof getSectionFull>>;
  try {
    result = await getSectionFull(resolvedParams.document, resolvedParams.section, { role });
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      notFound();
    }
    rethrowLibraryAccessDenied(error, role);
  }

  if (!result) {
    notFound();
  }

  const book = documents.find((item) => item.slug === resolvedParams.document);
  const summary = summaries.find((item) => item.slug === resolvedParams.document);

  if (!book || !summary) {
    notFound();
  }

  const chapterSlugs = summary.chapterSlugs ?? summary.sectionSlugs;
  const chapterTitles = summary.chapters ?? summary.sections;
  const totalChapters = chapterSlugs.length;
  const currentIndex = chapterSlugs.findIndex((slug) => slug === resolvedParams.section);

  if (currentIndex === -1) {
    notFound();
  }

  const chapters = chapterSlugs.map((slug, index) => ({
    ...buildLibraryChapterDisplay({
      slug,
      title: index === currentIndex ? result.title : chapterTitles[index] ?? slug,
      sequenceIndex: index,
      totalChapters,
    }),
  }));

  const currentChapter = chapters[currentIndex];

  const previous = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const next = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  return (
    <div className="shell-page library-page-shell">
      <div className="library-frame">
        <main className="library-reading-main" data-library-reading-page="true">
          <article className="library-reading-panel">
            <header className="library-reading-header" data-library-reading-header="true">
              <div className="library-reading-header-copy">
                <p className="library-reading-bookline">
                  Book {book.number} · {book.title}
                </p>
                <h1 className="library-title" data-library-reading-title="true">{currentChapter.displayTitle}</h1>
              </div>
            </header>

            <div data-library-reading-body="true">
              <MarkdownProse content={result.content} className="library-prose library-reading-prose" />
            </div>

            <footer className="library-reading-footer">
              <div className="library-reading-nav" data-library-reading-nav="true">
                {previous ? (
                  <Link
                    href={`/library/${book.slug}/${previous.slug}`}
                    className="library-reading-nav-link"
                    data-library-reading-nav-link="previous"
                  >
                    <span className="library-reading-nav-label">Previous chapter</span>
                    <span className="library-reading-nav-title">{previous.displayTitle}</span>
                  </Link>
                ) : null}

                {next ? (
                  <Link
                    href={`/library/${book.slug}/${next.slug}`}
                    className="library-reading-nav-link"
                    data-library-reading-nav-link="next"
                  >
                    <span className="library-reading-nav-label">Next chapter</span>
                    <span className="library-reading-nav-title">{next.displayTitle}</span>
                  </Link>
                ) : null}
              </div>

              <Link
                href={`/?topic=${encodeURIComponent(currentChapter.fullTitle)}`}
                className="library-reading-ai-link tier-micro font-medium text-accent-interactive transition-colors hover:text-foreground"
              >
                Have questions about this chapter? Ask the AI.
              </Link>
            </footer>

            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(
                  buildChapterSeo({
                    chapterTitle: currentChapter.fullTitle,
                    bookTitle: book.title,
                    bookSlug: book.slug,
                    chapterSlug: resolvedParams.section,
                    content: result.content,
                    chapterNumber: currentChapter.chapterNumber,
                    totalChapters: chapters.length,
                  }).jsonLd,
                ),
              }}
            />
          </article>
        </main>

        <BookSidebar
          book={{ slug: book.slug, title: book.title, number: book.number }}
          chapters={chapters}
          currentChapterSlug={resolvedParams.section}
          className="library-sidebar-slot"
        />
      </div>
    </div>
  );
}