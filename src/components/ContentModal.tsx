"use client";

import React, { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { getSectionContentAction } from "@/lib/corpus-actions";

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
        const section = await getSectionContentAction(bookSlug, chapterSlug);
        setContent(section?.content || "Content not found.");
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
        <Dialog.Overlay className="glass-overlay fixed inset-0 z-100 animate-in fade-in duration-300" />
        <Dialog.Content className="fixed inset-0 z-101 flex items-start justify-center p-(--space-3) pt-[max(var(--space-3),var(--safe-area-inset-top))] pb-[max(var(--space-3),var(--safe-area-inset-bottom))] sm:p-(--space-6) sm:pt-[max(var(--space-6),var(--safe-area-inset-top))] sm:pb-[max(var(--space-6),var(--safe-area-inset-bottom))] outline-none">
          <div className="glass-surface flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border-theme shadow-[0_32px_90px_color-mix(in_srgb,var(--shadow-base)_20%,transparent)] animate-in zoom-in-95 duration-300">
            <div className="flex min-h-16 items-center justify-between border-b border-border bg-surface/80 px-(--space-inset-panel) py-(--space-inset-default) sm:px-(--space-frame-compact)">
              <Dialog.Title className="font-semibold uppercase opacity-60">
                Library Reader
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  className="focus-ring min-h-11 min-w-11 rounded-theme p-(--space-2) transition-all hover-surface active:scale-90"
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

            <div className="flex-1 overflow-y-auto p-(--space-6) scroll-smooth sm:p-(--space-8) md:p-(--space-12)">
              {loading ? (
                <div className="flex h-full flex-col items-center justify-center gap-(--space-4) py-(--space-16)">
                  <div className="h-10 w-10 rounded-full border-4 border-border border-t-accent animate-spin" />
                  <p className="text-sm font-bold uppercase tracking-widest opacity-40 animate-pulse">
                    Retrieving Chapter...
                  </p>
                </div>
              ) : (
                <article className="prose prose-zinc dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-relaxed prose-p:text-[17px] prose-p:opacity-80">
                  <div className="whitespace-pre-wrap font-sans leading-relaxed">
                    {content}
                  </div>
                </article>
              )}
          </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
