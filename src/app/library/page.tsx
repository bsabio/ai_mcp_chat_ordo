import type { Metadata } from "next";
import Link from "next/link";

import { getDocuments, getCorpusSummaries } from "@/lib/corpus-library";
import { getViewerRole } from "@/lib/corpus-access";
import { buildLibraryIndexMetadata, buildLibraryIndexSeo } from "@/lib/seo/library-metadata";
import { getInstanceIdentity } from "@/lib/config/instance";

export async function generateMetadata(): Promise<Metadata> {
  const role = await getViewerRole();
  const [documents, summaries] = await Promise.all([
    getDocuments({ role }),
    getCorpusSummaries({ role }),
  ]);
  const totalChapters = documents.reduce((sum, doc) => {
    const s = summaries.find((item) => item.slug === doc.slug);
    return sum + (s?.chapterCount ?? s?.sectionCount ?? 0);
  }, 0);
  return buildLibraryIndexMetadata(documents.length, totalChapters);
}

export default async function LibraryIndexPage() {
  const role = await getViewerRole();
  const [documents, summaries] = await Promise.all([
    getDocuments({ role }),
    getCorpusSummaries({ role }),
  ]);

  const books = documents
    .map((document) => {
      const summary = summaries.find((item) => item.slug === document.slug);
      return {
        ...document,
        chapterCount: summary?.chapterCount ?? summary?.sectionCount ?? 0,
      };
    })
    .sort((left, right) => left.number.localeCompare(right.number, undefined, { numeric: true }));

  const totalChapters = books.reduce((sum, book) => sum + book.chapterCount, 0);
  const identity = getInstanceIdentity();
  const { jsonLd } = buildLibraryIndexSeo(books.length, totalChapters);

  return (
    <div className="shell-page library-page-shell">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-(--space-section-default) px-(--container-padding) py-(--space-section-default) sm:gap-(--space-10) sm:py-(--space-16)">
        <header className="flex flex-col gap-(--space-4) sm:gap-(--space-6)" data-library-route-header="true">
          <span className="library-kicker">{identity.name} Library</span>
          <h1 className="library-title max-w-4xl">Books, chapters, and reusable reference material.</h1>
          <p className="library-dek">
            The library is organized as books with chapter-level routes so readers can move through the collection deliberately instead of landing in isolated markdown pages.
          </p>
          <div className="library-meta-row">
            <span className="library-meta-pill">{books.length} books</span>
            <span className="library-meta-pill">{totalChapters} chapters</span>
          </div>
        </header>

        <section className="grid gap-(--space-4) sm:grid-cols-2 sm:gap-(--space-section-tight) xl:grid-cols-3">
          {books.map((book) => (
            <Link
              key={book.slug}
              href={`/library/${book.slug}`}
              className="group flex min-h-44 flex-col justify-between rounded-[1.4rem] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface)_99%,white)_0%,color-mix(in_oklab,var(--surface)_94%,var(--background))_100%)] p-(--space-4) shadow-[0_16px_32px_-28px_color-mix(in_srgb,var(--shadow-base)_10%,transparent),inset_0_1px_0_color-mix(in_srgb,var(--highlight-base)_60%,transparent)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-28px_color-mix(in_srgb,var(--shadow-base)_14%,transparent),inset_0_1px_0_color-mix(in_srgb,var(--highlight-base)_70%,transparent)] sm:min-h-52 sm:rounded-2xl sm:p-(--space-6)"
              data-library-book-card="true"
            >
              <div className="flex flex-col gap-(--space-stack-default)">
                <span className="library-kicker">Book {book.number}</span>
                <h2 className="theme-display text-[1.18rem] font-medium leading-tight tracking-[-0.04em] text-foreground sm:text-[1.4rem]">
                  {book.title}
                </h2>
              </div>

              <div className="mt-(--space-4) flex items-center justify-between sm:mt-(--space-6)">
                <span className="tier-micro text-foreground/48">{book.chapterCount} chapters</span>
                <span className="tier-micro font-semibold uppercase tracking-[0.12em] text-accent-interactive transition-colors group-hover:text-foreground">
                  Open book →
                </span>
              </div>
            </Link>
          ))}
        </section>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />
      </div>
    </div>
  );
}