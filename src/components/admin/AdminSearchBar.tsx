"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as NextNavigation from "next/navigation";
import type { AdminSearchResult } from "@/lib/admin/search/admin-search";
import { SHELL_ROUTES } from "@/lib/shell/shell-navigation";

// Admin nav commands for '/' command mode — only routes with showInCommands and admin hrefs
const ADMIN_NAV_COMMANDS = SHELL_ROUTES.filter(
  (r) => r.showInCommands && r.href.startsWith("/admin"),
);

export function AdminSearchBar({
  searchAction = async () => [],
}: {
  searchAction?: (formData: FormData) => Promise<AdminSearchResult[]>;
}) {
  const router = NextNavigation.useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // '/' command mode: when query starts with '/'
  const isCommandMode = query.startsWith("/");
  const commandFilter = isCommandMode ? query.slice(1).toLowerCase() : "";
  const commandResults = isCommandMode
    ? ADMIN_NAV_COMMANDS.filter(
        (r) =>
          commandFilter === "" ||
          r.label.toLowerCase().includes(commandFilter) ||
          r.href.toLowerCase().includes(commandFilter),
      )
    : [];

  const runSearch = useCallback(
    async (q: string) => {
      if (q.startsWith("/")) return; // command mode — no entity search
      if (q.trim().length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const fd = new FormData();
        fd.set("query", q);
        const res = await searchAction(fd);
        setResults(res);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    },
    [searchAction],
  );

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (value.startsWith("/")) {
        setOpen(true);
        clearTimeout(debounceRef.current);
        return;
      }
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => runSearch(value), 300);
    },
    [runSearch],
  );

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setMobileExpanded(true);
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setOpen(false);
        setMobileExpanded(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Click outside
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setMobileExpanded(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const BADGE_COLORS: Record<string, string> = {
    user: "bg-blue-100 text-blue-800",
    lead: "bg-green-100 text-green-800",
    consultation: "bg-yellow-100 text-yellow-800",
    deal: "bg-purple-100 text-purple-800",
    training: "bg-orange-100 text-orange-800",
    conversation: "bg-indigo-100 text-indigo-800",
    job: "bg-red-100 text-red-800",
    prompt: "bg-pink-100 text-pink-800",
    journal: "bg-teal-100 text-teal-800",
  };

  const commandPlaceholder = "Type a command… /users /leads /conversations";
  const entityPlaceholder = "Search users, leads, conversations, and more...";

  return (
    <div ref={containerRef} className="relative flex-1" data-admin-search="true">
      {/* Desktop: always visible. Mobile: icon toggle */}
      <button
        type="button"
        className="sm:hidden rounded-full border border-foreground/12 p-2"
        aria-label="Open search"
        onClick={() => {
          setMobileExpanded(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        <svg className="h-5 w-5 text-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>

      <div className={`${mobileExpanded ? "flex" : "hidden"} sm:flex items-center`}>
        <div className="relative flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={isCommandMode ? commandPlaceholder : entityPlaceholder}
            aria-label={isCommandMode ? "Navigate to admin section" : "Search admin entities"}
            className="w-full rounded-full border border-foreground/12 bg-foreground/2 py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-foreground/40 focus:border-foreground/25 focus:outline-none focus:ring-1 focus:ring-foreground/10"
          />
          {!isCommandMode && (
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-foreground/12 px-1.5 py-0.5 text-[10px] font-medium text-foreground/40 sm:inline-block">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown results */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-2xl border border-foreground/12 bg-background shadow-lg">
          {/* Command mode */}
          {isCommandMode && (
            <ul role="listbox">
              {commandResults.length === 0 ? (
                <li className="p-4 text-center text-sm text-foreground/50">No commands match &ldquo;{query}&rdquo;</li>
              ) : (
                commandResults.map((cmd) => (
                  <li key={cmd.id} role="option" aria-selected="false">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-foreground/4 focus:bg-foreground/4 focus:outline-none"
                      onClick={() => {
                        setOpen(false);
                        setQuery("");
                        router.push(cmd.href);
                      }}
                    >
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block truncate font-medium text-foreground">{cmd.label}</span>
                        {cmd.description && (
                          <span className="block truncate text-xs text-foreground/50">{cmd.description}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-foreground/40" aria-hidden="true">→</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}

          {/* Entity search mode */}
          {!isCommandMode && (
            <>
              {loading && (
                <div className="space-y-2 p-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 animate-pulse rounded-xl bg-foreground/5" />
                  ))}
                </div>
              )}
              {!loading && results.length === 0 && (
                <p className="p-4 text-center text-sm text-foreground/50">
                  No results found for &ldquo;{query}&rdquo;
                </p>
              )}
              {!loading && results.length > 0 && (
                <ul role="listbox">
                  {results.map((result) => (
                    <li key={`${result.entityType}-${result.id}`}>
                      <a
                        href={result.href}
                        className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-foreground/4 focus:bg-foreground/4 focus:outline-none"
                        onClick={() => setOpen(false)}
                      >
                        <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${BADGE_COLORS[result.entityType] ?? "bg-gray-100 text-gray-800"}`}>
                          {result.entityType}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-foreground">{result.title}</span>
                          <span className="block truncate text-xs text-foreground/50">{result.subtitle}</span>
                        </span>
                        <span className="shrink-0 text-xs text-foreground/40">
                          {result.updatedAt ? formatRelativeDate(result.updatedAt) : ""}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}
