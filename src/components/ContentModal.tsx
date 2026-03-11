"use client";

import React, { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { getChapter } from "@/lib/book-actions"; // Need to create this action

interface ContentModalProps {
  bookSlug: string;
  chapterSlug: string;
  onClose: () => void;
}

export function ContentModal({
  bookSlug,
  chapterSlug,
  onClose,
}: ContentModalProps) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // In a real app, this would be a server action or API call
        const chapter = await getChapter(bookSlug, chapterSlug);
        setContent(chapter?.content || "Content not found.");
      } catch {
        setContent("Failed to load content.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [bookSlug, chapterSlug]);

  return (
    <Dialog.Root
      open={true}
      onOpenChange={(open: boolean) => !open && onClose()}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[calc(100vw-2rem)] max-w-3xl h-[85vh] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-[var(--background)] border-theme shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--surface)]/50">
            <Dialog.Title className="text-lg font-bold tracking-tight uppercase tracking-widest text-xs opacity-60">
              Library Reader
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="p-2 rounded-xl hover-surface transition-all active:scale-90"
                aria-label="Close reader"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-8 sm:p-12 scroll-smooth">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
                <div className="w-10 h-10 rounded-full border-4 border-[var(--border-color)] border-t-[var(--accent-color)] animate-spin" />
                <p className="text-sm font-bold uppercase tracking-widest opacity-40 animate-pulse">
                  Retrieving Chapter...
                </p>
              </div>
            ) : (
              <article className="prose prose-zinc dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-relaxed prose-p:text-[17px] prose-p:opacity-80">
                {/* Simple text render for now, could use a proper Markdown component */}
                <div className="whitespace-pre-wrap font-sans leading-relaxed">
                  {content}
                </div>
              </article>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
