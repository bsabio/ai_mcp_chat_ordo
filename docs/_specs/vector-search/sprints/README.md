# Implementation Plan — Vector Search & Embedding Infrastructure

> **Status:** Ready for implementation
> **Source:** `docs/specs/tools/01-vector-search-engine.md` (v2.2)
> **Test runner:** Vitest — 213 tests across existing suites (baseline)
> **Convention:** Each task = one commit. Run `npm run build && npm test` between commits.

## Sprint Files

| Sprint | File | Tasks | Description |
| --- | --- | --- | --- |
| **0** | [sprint-0-core-infrastructure.md](sprint-0-core-infrastructure.md) | 4 | Ports, pure math, test doubles — no runtime changes |
| **1** | [sprint-1-chunking-storage.md](sprint-1-chunking-storage.md) | 4 | MarkdownChunker, SQLite schema, VectorStore + BM25IndexStore adapters |
| **2** | [sprint-2-embedding-pipeline.md](sprint-2-embedding-pipeline.md) | 5 | LocalEmbedder, ChangeDetector, EmbeddingPipeline, build script |
| **3** | [sprint-3-hybrid-search-engine.md](sprint-3-hybrid-search-engine.md) | 6 | HybridSearchEngine, query steps, SearchHandlerChain, wiring |
| **4** | [sprint-4-tool-integration.md](sprint-4-tool-integration.md) | 4 | SearchBooksCommand, ToolResultFormatter, composition root, E2E |
| **5** | [sprint-5-mcp-server.md](sprint-5-mcp-server.md) | 3 | MCP embedding server, 6 tools, integration tests |

## Dependency Graph

```text
Sprint 0 (core ports & pure math)
  └──→ Sprint 1 (chunking & storage)
         └──→ Sprint 2 (embedding pipeline & build script)
                └──→ Sprint 3 (hybrid search engine)
                       └──→ Sprint 4 (tool integration)
                              └──→ Sprint 5 (MCP server)
```

Each sprint is independently deployable. The search tool works at every stage,
degrading gracefully through the fallback chain:

```text
Sprint 5 → Full hybrid + MCP server
Sprint 4 → Full hybrid (BM25 + Vector + RRF) via search_books tool
Sprint 3 → Hybrid search works but not wired to tool
Sprint 2 → Embeddings exist but search unchanged
Sprint 1 → Storage ready, no embeddings yet
Sprint 0 → Pure math functions, no runtime impact
Current  → Keyword-only search (unchanged)
```

## Summary

| Sprint | Tasks | New Files | Modified Files | New Tests |
| --- | --- | --- | --- | --- |
| **0 — Core Infrastructure** | 4 | 14 | 0 | ~15 |
| **1 — Chunking & Storage** | 4 | 3 | 1 | ~12 |
| **2 — Embedding Pipeline** | 5 | 6 | 2 | ~10 |
| **3 — Hybrid Search Engine** | 6 | 9 | 1 | ~12 |
| **4 — Tool Integration** | 4 | 0 | 3 | ~6 |
| **5 — MCP Server** | 3 | 1 | 1 | ~5 |
| **Total** | **26** | **33** | **6 unique (8 touches)** | **~60** |

> **Note:** "New Files" counts production files only (no test files). Four
> production files (`MockEmbedder.ts`, `data/stopwords.ts`, `data/synonyms.ts`,
> `ResultFormatter.ts`) are not in the spec's §12 file plan but are logically
> required by §4.2, §7.5, §7.6, and §8 respectively. "Modified Files" total
> counts unique files; some files are modified in multiple sprints (package.json
> in Sprints 2 & 5, tool-composition-root.ts in Sprints 2 & 4).

## Requirement → Sprint Mapping

| Requirement Group | Sprint | Tasks |
| --- | --- | --- |
| VSEARCH-01 through VSEARCH-11 (Search Quality) | 3, 4 | 3.1–3.4, 4.1 |
| VSEARCH-12 through VSEARCH-16 (Chunking) | 1 | 1.1, 1.2 |
| VSEARCH-17 through VSEARCH-21 (Storage & Indexing) | 1, 2 | 1.3, 1.4, 2.4 |
| VSEARCH-22 through VSEARCH-25 (On-Demand & Multi-Source) | 2, 3, 4 | 2.2, 2.5, 3.3, 4.4 |
| VSEARCH-26 through VSEARCH-29 (Fallback & Resilience) | 3 | 3.4 |
| VSEARCH-30 through VSEARCH-34 (MCP Server) | 5 | 5.1, 5.2 |
| VSEARCH-35 through VSEARCH-40 (Architectural) | 0, 1, 3, 4 | 0.1, 0.3, 1.4, 3.3, 3.6, 4.1, 4.3 |
| VSEARCH-41 through VSEARCH-53 (Audit-Hardened v2.1) | 0–3 | across all sprints |

## New Dependency

| Package | Size | License | Purpose |
| --- | --- | --- | --- |
| `@huggingface/transformers` | ~25MB (ONNX model cached in `~/.cache/`) | Apache 2.0 | Local sentence embeddings — `all-MiniLM-L6-v2` |

No other new dependencies. BM25, RRF, dot similarity are all implemented from
scratch (each <50 lines).
