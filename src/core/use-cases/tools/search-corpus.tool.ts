import { CAPABILITY_CATALOG } from "@/core/capability-catalog/catalog";
import { buildCatalogBoundToolDescriptor } from "@/core/capability-catalog/runtime-tool-projection";
import type { CorpusRepository } from "../CorpusRepository";
import type { SearchHandler } from "@/core/search/ports/SearchHandler";
import { SearchCorpusCommand } from "./CorpusTools";

export interface SearchCorpusInput {
  query: string;
  max_results?: number;
}

export function parseSearchCorpusInput(value: unknown): SearchCorpusInput {
  if (!value || typeof value !== "object") {
    throw new Error("search_corpus input must be an object.");
  }

  const record = value as Record<string, unknown>;
  const query = typeof record.query === "string" ? record.query.trim() : "";
  if (!query) {
    throw new Error("search_corpus requires a non-empty query.");
  }

  if (record.max_results === undefined) {
    return { query };
  }

  if (typeof record.max_results !== "number" || !Number.isFinite(record.max_results) || record.max_results <= 0) {
    throw new Error("search_corpus max_results must be a positive number.");
  }

  return {
    query,
    max_results: Math.floor(record.max_results),
  };
}

export function createSearchCorpusTool(repo: CorpusRepository, searchHandler?: SearchHandler) {
  const command = new SearchCorpusCommand(repo, searchHandler);

  return buildCatalogBoundToolDescriptor(CAPABILITY_CATALOG.search_corpus, {
    parse: parseSearchCorpusInput,
    execute: (input, context) => command.execute(input, context),
  });
}