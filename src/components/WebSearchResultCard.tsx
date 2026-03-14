"use client";

import { useReducer, useEffect, useRef, useCallback } from "react";
import { ToolCard } from "./ToolCard";

/* ---------- types ---------- */

interface Citation {
  url: string;
  title: string;
  start_index: number;
  end_index: number;
}

interface WebSearchResult {
  answer: string;
  citations: Citation[];
  sources: string[];
  model: string;
}

interface WebSearchError {
  error: string;
  code?: number;
}

type SearchResult = WebSearchResult | WebSearchError;

function isError(r: SearchResult): r is WebSearchError {
  return "error" in r;
}

/* ---------- state machine ---------- */

type Stage =
  | "connecting"
  | "searching"
  | "reading-sources"
  | "composing"
  | "done"
  | "error";

const STAGE_LABELS: Record<Stage, string> = {
  connecting: "Connecting to search engine...",
  searching: "Searching the web...",
  "reading-sources": "Reading sources...",
  composing: "Composing answer with citations...",
  done: "Search complete",
  error: "Search failed",
};

interface State {
  stage: Stage;
  result: WebSearchResult | null;
  error: string | null;
  startedAt: number | null;
  elapsedMs: number;
}

type Action =
  | { type: "START" }
  | { type: "STAGE"; stage: Stage }
  | { type: "TICK"; now: number }
  | { type: "SUCCESS"; result: WebSearchResult }
  | { type: "ERROR"; message: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "START":
      return { ...state, stage: "connecting", startedAt: Date.now(), elapsedMs: 0 };
    case "STAGE":
      return { ...state, stage: action.stage };
    case "TICK":
      return { ...state, elapsedMs: state.startedAt ? action.now - state.startedAt : 0 };
    case "SUCCESS":
      return { ...state, stage: "done", result: action.result };
    case "ERROR":
      return { ...state, stage: "error", error: action.message };
  }
}

const INITIAL: State = {
  stage: "connecting",
  result: null,
  error: null,
  startedAt: null,
  elapsedMs: 0,
};

/* ---------- markdown builder ---------- */

function buildMarkdown(query: string, result: WebSearchResult): string {
  const lines: string[] = [];
  lines.push(`# Web Search Results`);
  lines.push("");
  lines.push(`**Query:** ${query}`);
  lines.push(`**Model:** ${result.model}`);
  lines.push(`**Date:** ${new Date().toISOString().split("T")[0]}`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Answer");
  lines.push("");
  lines.push(result.answer);
  lines.push("");

  if (result.citations.length > 0) {
    lines.push("## Citations");
    lines.push("");
    for (const c of result.citations) {
      lines.push(`- [${c.title || c.url}](${c.url})`);
    }
    lines.push("");
  }

  if (result.sources.length > 0) {
    lines.push("## Sources");
    lines.push("");
    for (const url of result.sources) {
      lines.push(`- ${url}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------- component ---------- */

interface Props {
  query: string;
  allowed_domains?: string[];
  model?: string;
}

export function WebSearchResultCard({ query, allowed_domains, model }: Props) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const initiated = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runSearch = useCallback(async () => {
    dispatch({ type: "START" });

    // Simulate stage progression based on elapsed time
    const stageTimers = [
      setTimeout(() => dispatch({ type: "STAGE", stage: "searching" }), 2000),
      setTimeout(() => dispatch({ type: "STAGE", stage: "reading-sources" }), 15000),
      setTimeout(() => dispatch({ type: "STAGE", stage: "composing" }), 35000),
    ];

    try {
      const res = await fetch("/api/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, allowed_domains, model }),
      });

      const data: SearchResult = await res.json();

      stageTimers.forEach(clearTimeout);

      if (!res.ok || isError(data)) {
        dispatch({
          type: "ERROR",
          message: isError(data) ? data.error : `HTTP ${res.status}`,
        });
        return;
      }

      dispatch({ type: "SUCCESS", result: data });
    } catch (err) {
      stageTimers.forEach(clearTimeout);
      dispatch({
        type: "ERROR",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, [query, allowed_domains, model]);

  // Auto-run on mount
  useEffect(() => {
    if (initiated.current) return;
    initiated.current = true;
    runSearch();
  }, [runSearch]);

  // Elapsed-time ticker
  useEffect(() => {
    if (state.stage === "done" || state.stage === "error") {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => {
      dispatch({ type: "TICK", now: Date.now() });
    }, 200);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [state.stage]);

  const isLoading = state.stage !== "done" && state.stage !== "error";
  const elapsed = (state.elapsedMs / 1000).toFixed(1);

  const handleDownload = () => {
    if (!state.result) return;
    const md = buildMarkdown(query, state.result);
    const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
    downloadMarkdown(`web-search-${slug}.md`, md);
  };

  return (
    <div className="my-2 max-w-2xl w-full">
      <ToolCard
        title="Web Search"
        icon={<span>🔍</span>}
        subtitle={
          isLoading
            ? `${STAGE_LABELS[state.stage]} (${elapsed}s)`
            : state.stage === "error"
              ? state.error
              : `${state.result?.sources.length ?? 0} sources · ${state.result?.citations.length ?? 0} citations`
        }
        status={isLoading ? "loading" : state.stage === "error" ? "error" : "success"}
        expandable={!!state.result}
        thumbnailMode={!!state.result}
        onDownload={state.result ? handleDownload : undefined}
        downloadTooltip="Download as Markdown"
      >
        {/* Loading state */}
        {isLoading && (
          <div className="p-4 flex flex-col gap-2">
            <p className="text-xs opacity-60">
              Searching for: <span className="font-medium opacity-80">{query}</span>
            </p>
            {allowed_domains && allowed_domains.length > 0 && (
              <p className="text-[10px] opacity-50">
                Restricted to: {allowed_domains.join(", ")}
              </p>
            )}
            {/* Progress bar */}
            <div className="h-1 rounded-full bg-[var(--surface-muted)] overflow-hidden mt-1">
              <div
                className="h-full bg-[var(--accent-color)] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(95, (state.elapsedMs / 65000) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Error state */}
        {state.stage === "error" && (
          <div className="p-4">
            <p className="text-sm text-red-500">{state.error}</p>
          </div>
        )}

        {/* Success state */}
        {state.result && (
          <div className="p-4 flex flex-col gap-3">
            {/* Answer */}
            <div className="text-sm leading-relaxed whitespace-pre-wrap text-[var(--foreground)]">
              {state.result.answer}
            </div>

            {/* Citations */}
            {state.result.citations.length > 0 && (
              <div className="flex flex-col gap-1 mt-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-50">
                  Citations
                </span>
                <ul className="flex flex-col gap-1">
                  {state.result.citations.map((c, i) => (
                    <li key={i} className="text-xs">
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-accent hover:underline"
                      >
                        {c.title || c.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sources */}
            {state.result.sources.length > 0 && (
              <div className="flex flex-col gap-1 mt-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-50">
                  All Sources
                </span>
                <ul className="flex flex-wrap gap-1.5">
                  {state.result.sources.map((url, i) => {
                    let domain: string;
                    try {
                      domain = new URL(url).hostname.replace("www.", "");
                    } catch {
                      domain = url;
                    }
                    return (
                      <li key={i}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-[var(--surface-muted)] border border-[var(--border-color)] hover:border-[var(--accent-color)] transition-colors"
                        >
                          {domain}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </ToolCard>
    </div>
  );
}
