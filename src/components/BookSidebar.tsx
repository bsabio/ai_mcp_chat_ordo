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
      className={`relative transition-all duration-500 ease-in-out border-r border-[var(--border-color)] bg-[var(--surface)] flex flex-col h-screen sticky top-0 ${
        isCollapsed ? "w-16" : "w-72"
      }`}
    >
      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-10 w-6 h-6 bg-[var(--surface)] border-theme rounded-full flex items-center justify-center z-50 hover:bg-[var(--accent-color)] hover:text-[var(--accent-foreground)] transition-colors shadow-sm"
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

      <div className={`flex-1 overflow-y-auto overflow-x-hidden flex flex-col p-6 gap-8 ${isCollapsed ? "items-center px-0" : ""}`}>
        {/* Header Section */}
        <div className={`flex flex-col gap-4 ${isCollapsed ? "hidden" : "animate-in fade-in duration-500"}`}>
          <Link
            href="/books"
            className="text-label tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity flex items-center gap-2"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Library
          </Link>
          <div className="flex flex-col gap-1">
            <span className="text-label text-[var(--accent-color)] opacity-80">
              Book {book.number}
            </span>
            <h2 className="text-sm font-bold tracking-tight leading-tight">
              {book.title}
            </h2>
          </div>
        </div>

        {/* Chapters Nav */}
        <nav className={`flex flex-col gap-1.5 ${isCollapsed ? "px-2" : ""}`}>
          {chapters.map((chapter) => (
            <Link
              key={chapter.slug}
              href={`/books/${book.slug}/${chapter.slug}`}
              className={`group flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all duration-200 ${
                currentChapterSlug === chapter.slug
                  ? "accent-fill shadow-md"
                  : "hover-surface opacity-70 hover:opacity-100"
              }`}
              title={isCollapsed ? chapter.title : undefined}
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all ${
                currentChapterSlug === chapter.slug ? "bg-white scale-125" : "bg-[var(--border-color)] group-hover:bg-[var(--accent-color)]"
              }`} />
              {!isCollapsed && (
                <span className="text-xs font-medium truncate animate-in slide-in-from-left-2 duration-300">
                  {chapter.title}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Footer Section */}
        <div className={`mt-auto flex flex-col gap-6 pt-6 border-t border-[var(--border-color)] ${isCollapsed ? "items-center px-0" : ""}`}>
          <div className={isCollapsed ? "scale-75 origin-center" : ""}>
            <ThemeSwitcher />
          </div>
          {!isCollapsed && (
            <Link
              href="/"
              className="text-label tracking-[0.2em] text-[var(--accent-color)] hover:opacity-80 transition-opacity animate-in fade-in duration-500"
            >
              ← Back to Chat
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
