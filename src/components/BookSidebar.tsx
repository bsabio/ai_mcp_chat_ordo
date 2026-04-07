import Link from "next/link";
import type { LibraryChapterDisplay } from "@/lib/library-chapter-display";
import { SidebarThemeSwitcher } from "./SidebarThemeSwitcher";

interface BookSidebarProps {
  book: {
    slug: string;
    title: string;
    number: string;
  };
  chapters: LibraryChapterDisplay[];
  currentChapterSlug?: string;
  className?: string;
}

export function BookSidebar({ book, chapters, currentChapterSlug, className }: BookSidebarProps) {
  const chapterCountLabel = chapters.length === 1 ? "1 chapter" : `${chapters.length} chapters`;

  return (
    <aside className={`${className ?? ""} library-sidebar-shell`.trim()} data-library-sidebar="true">
      <div className="library-sidebar-surface" data-library-sidebar-surface="true">
        <div className="library-sidebar-header" data-library-sidebar-header="true">
          <div className="library-sidebar-context-row">
            <span className="library-sidebar-context-label">Contents</span>
            <Link href="/library" className="library-sidebar-secondary-link">
              All books
            </Link>
          </div>

          <div className="library-sidebar-book-meta">
            <span className="library-sidebar-book-kicker">
              Book {book.number}
            </span>
            <h2 className="library-sidebar-book-title">
              {book.title}
            </h2>
            <p className="library-sidebar-book-count" data-library-sidebar-count="true">{chapterCountLabel}</p>
          </div>
        </div>

        <nav className="library-sidebar-nav" data-library-sidebar-nav="true" aria-label={`Chapters in ${book.title}`}>
          {chapters.map((chapter) => {
            const isCurrent = currentChapterSlug === chapter.slug;

            return (
              <Link
                key={chapter.slug}
                href={`/library/${book.slug}/${chapter.slug}`}
                className="library-sidebar-link"
                data-current={isCurrent ? "true" : "false"}
                data-library-sidebar-link="true"
                aria-current={isCurrent ? "page" : undefined}
              >
                <span className="library-sidebar-link-index">{chapter.railLabel}</span>
                <span className="library-sidebar-link-title">{chapter.displayTitle}</span>
              </Link>
            );
          })}
        </nav>

        <div className="library-sidebar-footer" data-library-sidebar-footer="true">
          <div className="library-sidebar-theme-slot" data-library-sidebar-theme="true">
            <SidebarThemeSwitcher />
          </div>
          <Link href="/" className="library-sidebar-secondary-link">
            Back to chat
          </Link>
        </div>
      </div>
    </aside>
  );
}
