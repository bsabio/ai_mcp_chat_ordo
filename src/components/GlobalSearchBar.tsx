"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { User as SessionUser } from "@/core/entities/user";
import {
  resolveCommandRoutes,
  type ShellRouteDefinition,
} from "@/lib/shell/shell-navigation";
import type {
  GlobalSearchAction,
  GlobalSearchResult,
} from "@/lib/search/global-search";

interface GlobalSearchBarProps {
  user: SessionUser;
  searchAction?: GlobalSearchAction;
}

function getResultBadgeLabel(result: GlobalSearchResult): string {
  switch (result.kind) {
    case "route":
      return "page";
    case "document":
      return "document";
    case "section":
      return "section";
    case "admin-entity":
      return result.entityType ?? "admin";
  }
}

function filterCommandRoutes(routes: ShellRouteDefinition[], rawFilter: string): ShellRouteDefinition[] {
  const filter = rawFilter.trim().toLowerCase();
  if (!filter) {
    return routes;
  }

  return routes.filter(
    (route) =>
      route.label.toLowerCase().includes(filter)
      || route.href.toLowerCase().includes(filter)
      || route.description?.toLowerCase().includes(filter),
  );
}

export function GlobalSearchBar({
  user,
  searchAction = async () => [],
}: GlobalSearchBarProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const commandRoutes = resolveCommandRoutes(user);
  const isCommandMode = query.startsWith("/");
  const commandResults = filterCommandRoutes(commandRoutes, query.slice(1));
  const commandExamples = commandRoutes
    .slice(0, 3)
    .map((route) => route.href.replace(/^\//, ""))
    .join(" /");

  const runSearch = useCallback(
    async (nextQuery: string) => {
      if (nextQuery.startsWith("/")) {
        return;
      }
      if (nextQuery.trim().length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }

      setLoading(true);
      try {
        const formData = new FormData();
        formData.set("query", nextQuery);
        const nextResults = await searchAction(formData);
        setResults(nextResults);
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
      debounceRef.current = setTimeout(() => {
        void runSearch(value);
      }, 300);
    },
    [runSearch],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setMobileExpanded(true);
        inputRef.current?.focus();
      }
      if (event.key === "Escape") {
        setOpen(false);
        setMobileExpanded(false);
        inputRef.current?.blur();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setMobileExpanded(false);
      }
    }

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const entityPlaceholder = "Search pages and accessible content...";
  const commandPlaceholder = commandExamples
    ? `Type a command… /${commandExamples}`
    : "Type a command…";

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1" data-global-search="true">
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

      <div className={`${mobileExpanded ? "flex" : "hidden"} min-w-0 items-center sm:flex`}>
        <div className="relative min-w-0 flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => handleChange(event.target.value)}
            placeholder={isCommandMode ? commandPlaceholder : entityPlaceholder}
            aria-label={isCommandMode ? "Navigate to available pages" : "Search pages and accessible content"}
            className="w-full rounded-full border border-foreground/12 bg-foreground/2 py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-foreground/40 focus:border-foreground/25 focus:outline-none focus:ring-1 focus:ring-foreground/10"
          />
          {!isCommandMode ? (
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-foreground/12 px-1.5 py-0.5 text-[10px] font-medium text-foreground/40 sm:inline-block">
              ⌘K
            </kbd>
          ) : null}
        </div>
      </div>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-2xl border border-foreground/12 bg-background shadow-lg">
          {isCommandMode ? (
            <ul role="listbox">
              {commandResults.length === 0 ? (
                <li className="p-4 text-center text-sm text-foreground/50">No commands match &ldquo;{query}&rdquo;</li>
              ) : (
                commandResults.map((route) => (
                  <li key={route.id} role="option" aria-selected="false">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-foreground/4 focus:bg-foreground/4 focus:outline-none"
                      onClick={() => {
                        setOpen(false);
                        setQuery("");
                        router.push(route.href);
                      }}
                    >
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block truncate font-medium text-foreground">{route.label}</span>
                        <span className="block truncate text-xs text-foreground/50">{route.description ?? route.href}</span>
                      </span>
                      <span className="shrink-0 text-xs text-foreground/40" aria-hidden="true">→</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : (
            <>
              {loading ? (
                <div className="space-y-2 p-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-10 animate-pulse rounded-xl bg-foreground/5" />
                  ))}
                </div>
              ) : null}
              {!loading && results.length === 0 ? (
                <p className="p-4 text-center text-sm text-foreground/50">No results found for &ldquo;{query}&rdquo;</p>
              ) : null}
              {!loading && results.length > 0 ? (
                <ul role="listbox">
                  {results.map((result) => (
                    <li key={result.id} role="option" aria-selected="false">
                      <button
                        type="button"
                        className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-foreground/4 focus:bg-foreground/4 focus:outline-none"
                        onClick={() => {
                          setOpen(false);
                          setQuery("");
                          router.push(result.href);
                        }}
                      >
                        <span className="inline-flex shrink-0 items-center rounded-full bg-foreground/6 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/70">
                          {getResultBadgeLabel(result)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-foreground">{result.title}</span>
                          <span className="block truncate text-xs text-foreground/50">{result.subtitle}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}