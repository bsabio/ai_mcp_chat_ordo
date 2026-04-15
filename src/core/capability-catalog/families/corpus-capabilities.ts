import { getCorpusSearchDescription } from "@/lib/corpus-vocabulary";

import type { CapabilityDefinition } from "../capability-definition";
import { CATALOG_INPUT_SCHEMAS } from "../catalog-input-schemas";

export const CORPUS_CAPABILITIES = {
  search_corpus: {
    core: {
      name: "search_corpus",
      label: "Search Corpus",
      description: getCorpusSearchDescription(),
      category: "content",
      roles: "ALL",
    },
    schema: {
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query." },
          max_results: { type: "number", description: "Max results (1-15)." },
        },
        required: ["query"],
      },
      outputHint: "Returns scored search results with content excerpts",
    },
    executorBinding: {
      bundleId: "corpus",
      executorId: "search_corpus",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "search_corpus",
      mode: "parse",
    },
    runtime: {},
    presentation: {
      family: "search",
      cardKind: "search_result",
      executionMode: "inline",
    },
  },

  get_section: {
    core: {
      name: "get_section",
      label: "Get Section",
      description:
        "Retrieve structured full content, canonical metadata, and related sections for a specific corpus section.",
      category: "content",
      roles: "ALL",
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.get_section,
      outputHint: "Returns full section content with metadata and related sections",
    },
    runtime: {},
    executorBinding: {
      bundleId: "corpus",
      executorId: "get_section",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "get_section",
      mode: "parse",
    },
    presentation: {
      family: "search",
      cardKind: "search_result",
      executionMode: "inline",
    },
  },

  get_corpus_summary: {
    core: {
      name: "get_corpus_summary",
      label: "Get Corpus Summary",
      description:
        "Return a structured summary of the knowledge corpus including document count and top-level topics.",
      category: "content",
      roles: "ALL",
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.get_corpus_summary,
    },
    runtime: {},
    executorBinding: {
      bundleId: "corpus",
      executorId: "get_corpus_summary",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "get_corpus_summary",
      mode: "parse",
    },
    presentation: {
      family: "search",
      cardKind: "search_result",
      executionMode: "inline",
    },
  },

  get_checklist: {
    core: {
      name: "get_checklist",
      label: "Get Checklist",
      description: "Get chapter checklists.",
      category: "content",
      roles: "ALL",
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.get_checklist,
      outputHint: "Returns chapter checklist items",
    },
    runtime: {},
    executorBinding: {
      bundleId: "corpus",
      executorId: "get_checklist",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "get_checklist",
      mode: "parse",
    },
    presentation: {
      family: "system",
      cardKind: "fallback",
      executionMode: "inline",
    },
  },

  list_practitioners: {
    core: {
      name: "list_practitioners",
      label: "List Practitioners",
      description: "List key practitioners referenced in the series.",
      category: "content",
      roles: "ALL",
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.list_practitioners,
      outputHint: "Returns list of practitioners with name and description",
    },
    runtime: {},
    executorBinding: {
      bundleId: "corpus",
      executorId: "list_practitioners",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "list_practitioners",
      mode: "parse",
    },
    presentation: {
      family: "search",
      cardKind: "search_result",
      executionMode: "inline",
    },
  },
} as const satisfies Record<string, CapabilityDefinition>;