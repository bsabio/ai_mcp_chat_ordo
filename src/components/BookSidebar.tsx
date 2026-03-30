"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface BookSidebarProps {
  book: {
    slug: string;
    title: string;
    number: string;
  };
  chapters: {
    slug: string;
    title: string;
  }[];
  currentChapterSlug?: string;
}

export function BookSidebar({ book, chapters, currentChapterSlug }: BookSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside 
      className={`library-sidebar-surface relative flex h-full flex-col transition-all duration-500 ease-in-out ${
        isCollapsed ? "w-16" : "w-full max-w-[18rem]"
      }`}
    >
      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 z-50 flex h-7 w-7 items-center justify-center rounded-full bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface)_96%,var(--background))_0%,color-mix(in_oklab,var(--surface-muted)_80%,transparent)_100%)] text-foreground/50 shadow-[0_8px_16px_-12px_color-mix(in_srgb,var(--shadow-base)_16%,transparent)] transition-all hover:text-foreground focus-ring"
        aria-label="Toggle sidebar"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-500 ${isCollapsed ? "rotate-180" : ""}`}
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <div className={`flex flex-1 flex-col gap-(--space-8) overflow-x-hidden overflow-y-auto p-(--container-padding) ${isCollapsed ? "items-center px-(--space-0)" : ""}`}>
        {/* Header Section */}
        <div className={`flex flex-col gap-(--space-4) ${isCollapsed ? "hidden" : "animate-in fade-in duration-500"}`}>
          <Link
            href="/library"
            className="tier-micro flex items-center gap-(--space-2) font-semibold uppercase tracking-[0.14em] text-foreground/42 transition-opacity hover:text-foreground/72"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Library
          </Link>
          <div className="flex flex-col gap-(--space-1)">
            <span className="tier-micro font-semibold uppercase tracking-[0.14em] text-accent/72">
              Book {book.number}
            </span>
            <h2 className="theme-display text-[1.05rem] font-medium leading-tight tracking-[-0.04em] text-foreground">
              {book.title}
            </h2>
          </div>
        </div>

        {/* Chapters Nav */}
        <nav className={`flex flex-col gap-(--space-rail-item-gap) ${isCollapsed ? "px-(--space-2)" : ""}`}>
          {chapters.map((chapter) => (
            <Link
              key={chapter.slug}
              href={`/library/${book.slug}/${chapter.slug}`}
              className={`group flex items-center gap-(--space-3) rounded-(--space-4) px-(--space-3) py-(--space-rail-item-block) transition-all duration-200 ${
                currentChapterSlug === chapter.slug
                  ? "bg-[color-mix(in_oklab,var(--accent-interactive)_8%,var(--surface))] text-foreground shadow-[0_8px_16px_-14px_color-mix(in_srgb,var(--shadow-base)_10%,transparent)]"
                  : "text-foreground/58 hover:bg-[color-mix(in_oklab,var(--surface-muted)_50%,transparent)] hover:text-foreground"
              }`}
              title={isCollapsed ? chapter.title : undefined}
            >
              <div className={`h-(--space-2) w-(--space-2) shrink-0 rounded-full transition-all ${
                currentChapterSlug === chapter.slug ? "scale-125 bg-accent-interactive" : "bg-border group-hover:bg-accent-interactive/80"
              }`} />
              {!isCollapsed && (
                <span className="truncate text-[0.83rem] font-medium animate-in slide-in-from-left-2 duration-300">
                  {chapter.title}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Footer Section */}
        <div className={`mt-auto flex flex-col gap-(--space-6) pt-(--space-6) ${isCollapsed ? "items-center px-(--space-0)" : ""}`} style={{ borderTop: '1px solid color-mix(in oklab, var(--foreground) 6%, transparent)' }}>
          <div className={isCollapsed ? "scale-75 origin-center" : ""}>
            <ThemeSwitcher />
          </div>
          {!isCollapsed && (
            <Link
              href="/"
              className="tier-micro animate-in font-semibold uppercase tracking-[0.14em] text-accent-interactive transition-opacity duration-500 hover:opacity-80 fade-in"
            >
              ← Back to Chat
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
