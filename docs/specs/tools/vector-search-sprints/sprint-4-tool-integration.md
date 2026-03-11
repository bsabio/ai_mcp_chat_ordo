# Sprint 4 — Tool Integration

> **Goal:** Wire the hybrid search engine into the existing `search_books` chat
> tool. After this sprint, users get passage-level semantic search results in
> the chat UI. The existing API contract is preserved — enhanced fields are additive.
> **Spec ref:** §8, §10.2, §12 (modified files)
> **Prerequisite:** Sprint 3 complete (hybrid search engine + handler chain)

---

## Task 4.1 — Update SearchBooksCommand result format

**What:** Modify `SearchBooksCommand` to return `HybridSearchResult` fields
(`matchPassage`, `matchSection`, `matchHighlight`, `rrfScore`, `vectorRank`,
`bm25Rank`, `relevance`, `passageOffset`) alongside existing fields.

| Item | Detail |
| --- | --- |
| **Modify** | `src/core/use-cases/tools/BookTools.ts` |
| **Spec** | §8, Phase 5.20 |
| **Reqs** | VSEARCH-38 |

### Changes

The `SearchBooksCommand.execute()` now receives results from
`LibrarySearchInteractor.searchBooks()` which may return `HybridSearchResult[]`
when the search handler is wired. Map these to the tool output format:

```typescript
// Existing fields preserved (backward compatible):
{
  book, bookNumber, chapter, chapterSlug, bookSlug, matchContext, relevance
}
// New fields (additive — VSEARCH-38):
{
  matchPassage,     // 200-400 word passage
  matchSection,     // heading of matching section
  matchHighlight,   // passage with **bold** query terms
  rrfScore,         // numeric RRF fusion score
  vectorRank,       // rank in vector results (null if not in top 50)
  bm25Rank,         // rank in BM25 results (null if not in top 50)
  passageOffset,    // { start, end } char offsets in source chapter
}
```

### Verify

```bash
npm run build && npm test   # existing search tests still pass
```

---

## Task 4.2 — Update ToolResultFormatter for new fields

**What:** Update `RoleAwareSearchFormatter` to format the new result fields
for the LLM context window. Passage text is included for AUTHENTICATED+ roles;
ANONYMOUS gets limited preview.

| Item | Detail |
| --- | --- |
| **Modify** | `src/core/tool-registry/ToolResultFormatter.ts` |
| **Spec** | §12 modified files |

### Changes

```typescript
// Format new fields for LLM context:
// - Include matchPassage (full passage text)
// - Include matchSection heading
// - Include matchHighlight (bold query terms)
// - Include rrfScore with 4 decimal places
// - Include relevance label
// ANONYMOUS: limited to matchSection + relevance only (no full passage)
```

### Verify

```bash
npm run build && npm test
```

---

## Task 4.3 — Wire everything in composition root

**What:** Wire the full search stack in `tool-composition-root.ts` using
`EmbeddingPipelineFactory` (GoF-2) and `SearchHandlerChain` (GoF-1).

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/chat/tool-composition-root.ts` |
| **Spec** | §10.2, Phase 5.22 |
| **Reqs** | VSEARCH-35, VSEARCH-36, VSEARCH-45 |

### Wiring

```typescript
// Adapters
const embedder = new LocalEmbedder();
const vectorStore = new SQLiteVectorStore(getDb());
const bm25IndexStore = new SQLiteBM25IndexStore(getDb());

// Core
const bm25Scorer = new BM25Scorer();
const vectorProcessor = new QueryProcessor([new LowercaseStep(), new StopwordStep(STOPWORDS)]);
const bm25Processor = new QueryProcessor([new LowercaseStep(), new StopwordStep(STOPWORDS), new SynonymStep(SYNONYMS)]);

const engine = new HybridSearchEngine(
  embedder, vectorStore, bm25Scorer, bm25IndexStore,
  vectorProcessor, bm25Processor,
  { vectorTopN: 50, bm25TopN: 50, rrfK: 60, maxResults: 10 }
);

// Fallback chain (GoF-1)
const searchHandler = new HybridSearchHandler(engine)
  .setNext(new BM25SearchHandler(bm25Scorer, bm25IndexStore))
  .setNext(new LegacyKeywordHandler(bookRepository))
  .setNext(new EmptyResultHandler());

// Inject into LibrarySearchInteractor
const interactor = new LibrarySearchInteractor(bookRepository, searchHandler);
```

### Verify

```bash
npm run build && npm test   # all tests green
```

---

## Task 4.4 — End-to-end integration test

**What:** Full E2E test: chat message → `search_books` tool → hybrid search →
formatted results with passage context.

| Item | Detail |
| --- | --- |
| **Create** | `tests/search/e2e-search.test.ts` |
| **Spec** | Phase 5.23 |

### Tests (`tests/search/e2e-search.test.ts`)

| Test ID | Scenario |
| --- | --- |
| — | Chat query "user experience heuristics" → search_books → results with matchPassage |
| — | Results include passage text through full E2E chain (cf. TEST-VS-14) |
| TEST-VS-38 | Embeddings with source_type "book_chunk" separate from "conversation" |
| TEST-VS-39 | Search with sourceType filter returns only matching type |
| TEST-VS-40 | Search without filter returns results across all source types |

### Verify

```bash
npx vitest run tests/search/e2e-search.test.ts   # 5 tests pass
npm run build && npm test                         # all tests green
```

---

## Sprint 4 — Completion Checklist

- [ ] `SearchBooksCommand` returns enhanced `HybridSearchResult` fields (additive)
- [ ] `ToolResultFormatter` formats passage + section + highlight fields
- [ ] Composition root wires full stack: embedder → engine → chain → interactor
- [ ] E2E test: chat → search_books → hybrid results with passage context
- [ ] Existing `search_books` API contract unchanged (VSEARCH-38)
- [ ] Existing search tests unmodified and passing (VSEARCH-39)
- [ ] ~6 new tests passing
- [ ] `npm run build && npm test` — all tests green
