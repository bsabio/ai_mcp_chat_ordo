"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState, useMemo } from "react";
import { useTheme } from "./ThemeProvider";
import { useRouter } from "next/navigation";

import { Command } from "@/core/commands/Command";
import { NavigationCommand } from "@/core/commands/NavigationCommands";
import { ThemeCommand } from "@/core/commands/ThemeCommands";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { setTheme } = useTheme();
  const router = useRouter();

  // Listen for Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Defined dynamic command items using the Command Pattern
  const commands = useMemo<Command[]>(() => {
    const navigate = (path: string) => router.push(path);
    return [
      // Navigation
      new NavigationCommand("nav-home", "Home", "Navigation", navigate, "/"),
      new NavigationCommand("nav-books", "Library / Books", "Navigation", navigate, "/books"),
      new NavigationCommand("nav-dashboard", "Business Dashboard", "Navigation", navigate, "/dashboard"),

      // Themes
      new ThemeCommand("theme-bauhaus", "Set Theme: Bauhaus", "Themes", setTheme, "bauhaus"),
      new ThemeCommand("theme-swiss", "Set Theme: Swiss Grid", "Themes", setTheme, "swiss"),
      new ThemeCommand("theme-postmodern", "Set Theme: Postmodern", "Themes", setTheme, "postmodern"),
      new ThemeCommand("theme-skeuomorphic", "Set Theme: Skeuomorphic", "Themes", setTheme, "skeuomorphic"),
      new ThemeCommand("theme-fluid", "Set Theme: Modern Fluid", "Themes", setTheme, "fluid"),

      // Books (Shortcuts to main categories)
      new NavigationCommand("book-ux", "Book: UX Design", "Books", navigate, "/books/ux-design-book"),
      new NavigationCommand("book-ui", "Book: UI Design", "Books", navigate, "/books/ui-design-book"),
      new NavigationCommand("book-se", "Book: Software Engineering", "Books", navigate, "/books/software-engineering-book"),
      new NavigationCommand("book-pm", "Book: Product Management", "Books", navigate, "/books/product-management-book"),
      new NavigationCommand("book-marketing", "Book: Marketing & Branding", "Books", navigate, "/books/marketing-branding-book"),
      new NavigationCommand("book-data", "Book: Data Analytics", "Books", navigate, "/books/data-analytics-book"),
      new NavigationCommand("book-content", "Book: Content Strategy", "Books", navigate, "/books/content-strategy-book"),
      new NavigationCommand("book-access", "Book: Accessibility", "Books", navigate, "/books/accessibility-book"),
      new NavigationCommand("book-entre", "Book: Entrepreneurship", "Books", navigate, "/books/entrepreneurship-book"),
      new NavigationCommand("book-design", "Book: Design Systems", "Books", navigate, "/books/design-book"),
    ];
  }, [router, setTheme]);

  // Filtering logic
  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      cmd.category.toLowerCase().includes(query.toLowerCase()),
  );

  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(
        (prev) =>
          (prev - 1 + filteredCommands.length) % filteredCommands.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filteredCommands[activeIndex];
      if (cmd) {
        cmd.execute();
        setOpen(false);
        setQuery("");
      }
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] animate-in fade-in duration-200" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-[70%] w-full max-w-[640px] bg-[var(--surface)] border-theme rounded-2xl shadow-2xl z-[101] overflow-hidden animate-in zoom-in-95 fade-in slide-in-from-top-4 duration-200"
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-center border-b border-[var(--border-color)] px-4 py-3 gap-3">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-40"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              autoFocus
              placeholder="Search chapters, themes, or tools..."
              className="flex-1 bg-transparent border-none outline-none text-[15px] placeholder:opacity-40 h-10"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
            />
            <kbd className="hidden sm:flex h-6 items-center gap-1 rounded border-theme bg-[var(--surface-muted)] px-2 font-mono text-[10px] font-medium opacity-60">
              ESC
            </kbd>
          </div>

          <div className="max-h-[380px] overflow-y-auto p-2 flex flex-col gap-0.5">
            {filteredCommands.length > 0 ? (
              filteredCommands.map((cmd, index) => (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.execute();
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-left transition-all duration-75 ${
                    index === activeIndex
                      ? "accent-fill"
                      : "hover-surface"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{cmd.title}</span>
                    <span
                      className={`text-label opacity-60 ${index === activeIndex ? "text-current" : ""}`}
                    >
                      {cmd.category}
                    </span>
                  </div>
                  {index === activeIndex && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  )}
                </button>
              ))
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm opacity-50">
                  No results found for &ldquo;{query}&rdquo;
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border-color)] px-4 py-3 bg-[var(--surface-muted)]">
            <div className="flex items-center gap-4 text-label font-semibold opacity-40">
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded border border-current">
                  ↑↓
                </kbd>{" "}
                Navigate
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded border border-current">
                  Enter
                </kbd>{" "}
                Select
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
