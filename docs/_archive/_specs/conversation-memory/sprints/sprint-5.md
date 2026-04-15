# Sprint 5 — Kernel Generalization

**Goal:** Decouple all domain-specific naming, configuration, and content
references from the reusable application core. After this sprint, spinning
up the system for a new domain (legal, healthcare, education) requires
only: (1) new corpus content, (2) prompt changes via MCP tools, (3)
optional domain-specific MCP tool servers. Zero changes to `src/core/`.

## Pre-existing infrastructure (from Sprints 0–4)

The following are already in place and define the full rename surface area.

- **Entity layer** — `src/core/entities/library.ts` exports `Book`
  (slug/title/number), `Chapter` (class with `bookSlug`, `chapterSlug`,
  `content`, `practitioners[]`, `checklistItems[]`, `headings[]`, plus
  `calculateSearchScore()` and `extractContext()`),
  `LibrarySearchResult` (bookTitle, bookSlug, chapterTitle, chapterSlug,
  plus hybrid fields: matchPassage, rrfScore, etc.), `Practitioner`
  (name, books[], chapters[]), `Checklist` (bookTitle, chapterTitle,
  items[]).
- **Repository port** — `src/core/use-cases/BookRepository.ts` exports
  `BookQuery` (getAllBooks, getBook), `ChapterQuery` (getChaptersByBook,
  getAllChapters, getChapter), `BookRepository` (composite of both).
- **Interactor** — `src/core/use-cases/BookSummaryInteractor.ts` exports
  `BookSummary` (number, title, slug, chapterCount, chapters[],
  chapterSlugs[]) and `BookSummaryInteractor.execute()`.
- **Search metadata** — `src/core/search/ports/Chunker.ts` has
  `BookChunkMetadata` (`sourceType: "book_chunk"`, bookSlug,
  chapterSlug, bookTitle, chapterTitle, chapterFirstSentence, optional
  practitioners/checklistItems). Part of discriminated union
  `ChunkMetadata = BookChunkMetadata | ConversationMetadata`.
- **`"book_chunk"` references** — 46+ occurrences across 14 files:
  `Chunker.ts` (1), `MarkdownChunker.ts` (1),
  `HybridSearchEngine.ts` (1, hardcoded default L58),
  `SearchHandlerChain.ts` (3), `EmbeddingPipelineFactory.ts` (1),
  `tool-composition-root.ts` (1), `build-search-index.ts` (5),
  `mcp/embedding-server.ts` (2), `mcp/embedding-tool.ts` (7),
  plus ~12 each in `in-memory-stores.test.ts`, `sqlite-stores.test.ts`,
  ~20 in `embedding-pipeline.test.ts`, 1 in `markdown-chunker.test.ts`.
- **Adapters** — `src/adapters/FileSystemCorpusRepository.ts`
  (canonical corpus repository, reads markdown from `DEFAULT_DOCS_DIR`),
  `CachedCorpusRepository.ts` (decorator with cache),
  `RepositoryFactory.ts` (`getCorpusRepository()` singleton).
- **Lib facades** — `src/lib/corpus-library.ts` (instantiates all
  interactors via `getCorpusRepository()`), `src/lib/book-actions.ts`
  (server action delegates to the canonical corpus facade),
  `src/lib/chat/tool-composition-root.ts` (`createToolRegistry(corpusRepo)`
  creates all corpus tools + search handler with the configured source type).
- **Tool files** — `src/core/use-cases/tools/` contains the canonical
  corpus files: `CorpusTools.ts` (hub), `search-corpus.tool.ts`
  (`search_corpus`), `get-corpus-summary.tool.ts`
  (`get_corpus_summary`), `get-section.tool.ts` (`get_section`, params
  document_slug/section_slug), `get-checklist.tool.ts`
  (`get_checklist`), `list-practitioners.tool.ts`
  (`list_practitioners`). `BookTools.ts` remains as a compatibility
  re-export only.
- **System prompt references** — `src/lib/chat/policy.ts` and
  `src/lib/db/schema.ts` both contain hardcoded tool name strings
  (`search_books`, `get_chapter`, `get_checklist`, `list_practitioners`,
  `get_book_summary`).
- **MCP librarian tools** — `mcp/librarian-tool.ts` exports
  `LibrarianToolDeps` + 6 functions: `librarianList`,
  `librarianGetBook`, `librarianAddBook`, `librarianAddChapter`,
  `librarianRemoveBook`, `librarianRemoveChapter`. Registered in
  `mcp/embedding-server.ts` as `librarian_list`, `librarian_get`,
  `librarian_add_book`, `librarian_add_chapter`, `librarian_remove_book`,
  `librarian_remove_chapter`.
- **Route files** — `src/app/books/page.tsx` (`/books` listing),
  `src/app/books/[book]/page.tsx` (detail),
  `src/app/books/[book]/layout.tsx`,
  `src/app/books/[book]/[chapter]/page.tsx` (chapter view),
  `src/app/book/[chapter]/page.tsx` (legacy single-chapter route).
- **Test baseline** — ~430 tests across 71 files (Sprints 0–4). Build
  and lint are clean. Key test files with book_chunk/book references:
  `cached-book-repository.test.ts`, `in-memory-stores.test.ts` (~12),
  `sqlite-stores.test.ts` (~12), `embedding-pipeline.test.ts` (~20),
  `markdown-chunker.test.ts`, `core-policy.test.ts`,
  `tool-result-formatter.test.ts`, `tool-registry.integration.test.ts`,
  `tool-integration.test.ts`.
- **corpus-config** — Does NOT exist yet. Task 5.8 creates it.
- **Spec cross-refs** — §17.2 (Future: cross-source search) uses
  `document_chunk` and generic `HybridSearchResult` metadata, aligning
  with Sprint 5 rename targets.

## 5.1 Core Entity Renaming

| Current | New | Files Affected |
| ------- | --- | -------------- |
| `Book` | `Document` | `src/core/entities/library.ts` → `src/core/entities/corpus.ts` |
| `Chapter` | `Section` | `src/core/entities/library.ts` → `src/core/entities/corpus.ts` |
| `Checklist` | _(remove or generalize to `Supplement`)_ | `src/core/entities/library.ts` |
| `Practitioner` | _(remove or generalize to `Contributor`)_ | `src/core/entities/library.ts` |
| `BookChunkMetadata` | `DocumentChunkMetadata` | `src/core/search/ports/Chunker.ts` |
| `BookRepository` | `CorpusRepository` | `src/core/use-cases/BookRepository.ts` → `CorpusRepository.ts` |
| `BookQuery` | `CorpusQuery` | same file |
| `ChapterQuery` | `SectionQuery` | same file |
| `BookSummaryInteractor` | `CorpusSummaryInteractor` | `src/core/use-cases/BookSummaryInteractor.ts` |
| `LibrarySearchResult` | `CorpusSearchResult` | `src/core/entities/library.ts` |

All adapters (`src/adapters/`, `src/lib/`) update their imports to match.
Tests update accordingly. No behavioral changes — pure rename refactor.

## 5.2 Search Infrastructure Generalization

| Change | Details |
| ------ | ------- |
| Remove `"book_chunk"` default in `HybridSearchEngine` | Require explicit `sourceType` on every `VectorQuery`; no fallback |
| Create `SourceTypeRegistry` | A simple config object mapping source types to display names and metadata schemas: `{ "document_chunk": { label: "Document", metadataShape: ... } }` |
| Generalize `HybridSearchResult` metadata | Replace `bookTitle`, `bookNumber`, `bookSlug` with generic `documentTitle`, `documentId`, `documentSlug` |
| Update `MarkdownChunker` | Remove hardcoded `sourceType === "book_chunk"` check; use registry |
| Update `SearchHandlerChain` | Remove hardcoded `"book_chunk"` index lookups; use configured source type |

## 5.3 Tool Description Externalization

| Change | Details |
| ------ | ------- |
| Create `corpus-config.ts` or `corpus-config.json` | Externalize: corpus name, document count, section count, corpus description, source type string |
| Auto-generate tool descriptions | Canonical `search-corpus.tool.ts`; description reads from config: `"Search across all ${config.documentCount} documents (${config.sectionCount} sections)"` |
| Auto-generate corpus summary descriptor | Canonical `get-corpus-summary.tool.ts`; summary comes from config, not hardcoded |
| Rename tool identifiers | `search_books` → `search_corpus`, `get_book_summary` → `get_corpus_summary`, `get_chapter` → `get_section` |
| Update `BASE_PROMPT` seed | Sprint 3's seed migration already has the prompt in the DB; update the fallback constant to use config-derived text |

## 5.4 Adapter + Route Renaming

| Current | New |
| ------- | --- |
| `src/adapters/FileSystemBookRepository.ts` | `FileSystemCorpusRepository.ts` |
| `src/adapters/CachedBookRepository.ts` | `CachedCorpusRepository.ts` |
| `src/adapters/RepositoryFactory.ts` | Update `getBookRepository()` → `getCorpusRepository()` |
| `src/lib/book-library.ts` | `src/lib/corpus-library.ts` |
| `src/lib/book-actions.ts` | `src/lib/corpus-actions.ts` |
| `src/lib/chat/tool-composition-root.ts` | Update imports + replace `"book_chunk"` with config source type |
| `src/app/books/page.tsx` | `src/app/corpus/page.tsx` (or keep `books/` as a domain-specific route redirecting to generic) |
| `src/app/book/[chapter]/page.tsx` | Legacy route — add redirect to new path |
| `mcp/embedding-tool.ts` references to `BookChunkMetadata` | Use `DocumentChunkMetadata` |

## 5.5 MCP Librarian Tool Generalization

| Current Tool | New Tool | Change |
| ----------- | -------- | ------ |
| `librarian_list` | `corpus_list` | Returns documents instead of books |
| `librarian_get` | `corpus_get` | Returns document details instead of book details |
| `librarian_add_book` | `corpus_add_document` | Ingests a document, not specifically a book |
| `librarian_add_chapter` | `corpus_add_section` | Ingests a section, not specifically a chapter |
| `librarian_remove_book` | `corpus_remove_document` | Removes a document |
| `librarian_remove_chapter` | `corpus_remove_section` | Removes a section |

The runtime implementation is complete. The MCP server file
`mcp/embedding-server.ts` now registers the canonical generic tool names,
uses corpus-first handlers internally, and keeps legacy aliases only as
compatibility shims.

## 5.6 Sprint Tasks

| Task | Description | Req |
| ---- | ----------- | --- |
| 5.1 | Create `src/core/entities/corpus.ts` with generic entity interfaces (`Document`, `Section`, `Supplement`, `Contributor`, `CorpusSearchResult`) | CONVO-090 |
| 5.2 | Rename `BookRepository` port → `CorpusRepository` with `CorpusQuery` / `SectionQuery` | CONVO-090 |
| 5.3 | Rename `BookSummaryInteractor` → `CorpusSummaryInteractor` (update `BookSummary` → `CorpusSummary`) | CONVO-090 |
| 5.4 | Rename `BookChunkMetadata` → `DocumentChunkMetadata` in `src/core/search/ports/Chunker.ts`; update `ChunkMetadata` union | CONVO-090 |
| 5.5 | Replace the hardcoded `"book_chunk"` default with config-driven canonical `"document_chunk"` behavior while preserving compatibility fallbacks | CONVO-090 |
| 5.6 | Generalize `HybridSearchResult` metadata fields (`bookTitle` → `documentTitle`, `bookSlug` → `documentSlug`, etc.) | CONVO-090 |
| 5.7 | Update `MarkdownChunker` (1 ref) and `SearchHandlerChain` (3 refs) to use generic source type from config | CONVO-090 |
| 5.8 | Create `corpus-config.ts` with externalized corpus metadata (name, counts, description, source type) | CONVO-090 |
| 5.9 | Rename tool files and identifiers: `search_books` → `search_corpus`, `get_book_summary` → `get_corpus_summary`, `get_chapter` → `get_section` | CONVO-090 |
| 5.10 | Auto-generate tool descriptions from corpus config; add `CorpusTools.ts` as the canonical command hub and keep `BookTools.ts` as a compatibility re-export | CONVO-090 |
| 5.11 | Add canonical adapters `FileSystemCorpusRepository` / `CachedCorpusRepository` and `RepositoryFactory.getCorpusRepository()` while preserving legacy names as wrappers | CONVO-090 |
| 5.12 | Add canonical `corpus-library.ts` and `corpus-actions.ts`; keep legacy book facades as compatibility wrappers and switch `tool-composition-root.ts` to corpus-first wiring | CONVO-090 |
| 5.13 | Rename MCP librarian tools (6): `librarian_list` → `corpus_list`, `librarian_get` → `corpus_get`, `librarian_add_book` → `corpus_add_document`, `librarian_add_chapter` → `corpus_add_section`, `librarian_remove_book` → `corpus_remove_document`, `librarian_remove_chapter` → `corpus_remove_section`; keep legacy dispatch aliases temporarily | CONVO-090 |
| 5.14 | Update `mcp/embedding-tool.ts` (7 refs) and `mcp/embedding-server.ts` (2 refs) to use `DocumentChunkMetadata` and generic source type | CONVO-090 |
| 5.15 | Update `BASE_PROMPT` fallback constant and system prompt seeds in `src/lib/db/schema.ts` to use corpus config; update tool name strings in `policy.ts` | CONVO-090 |
| 5.16 | Add canonical `src/app/corpus/` routes and convert old `src/app/books/` + `src/app/book/` paths into redirects | CONVO-090 |
| 5.17 | Update `scripts/build-search-index.ts` (5 refs) to use generic source type from config | CONVO-090 |
| 5.18 | Update all tests to use new names (~60+ refs across 10 test files — pure rename, no logic changes) | CONVO-090 |
| 5.19 | Update `README.md` tool inventory table | CONVO-090 |
| 5.20 | Full suite green, build clean | |

**Deliverable: ~430 existing tests (renamed, not new) + build clean.
The `src/core/` layer is fully domain-agnostic. Re-deploying for a new
domain requires only: new corpus files, prompt edits via MCP, and
optionally new domain-specific MCP tool servers.**

## 5.7 Implementation Status

Sprint 5 is implemented and verified.

- Canonical public tool surface: `search_corpus`, `get_section`, `get_corpus_summary`
- Canonical MCP admin surface: `corpus_list`, `corpus_get`, `corpus_add_document`, `corpus_add_section`, `corpus_remove_document`, `corpus_remove_section`
- Canonical source type: `document_chunk`
- Canonical routes: `/corpus`, `/corpus/[document]`, `/corpus/[document]/[section]`
- Compatibility preserved for legacy book/chapter naming in wrappers, aliases, and redirect routes

Verification completed against the implementation:

- `npm run typecheck`
- `npm run build`
- `npm run quality`
