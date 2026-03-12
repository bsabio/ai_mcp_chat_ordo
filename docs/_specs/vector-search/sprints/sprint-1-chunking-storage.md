# Sprint 1 — Chunking & Storage

> **Goal:** Build the markdown chunker AND the SQLite storage layer. After this
> sprint, chunks can be created from book content and persisted. No embeddings
> yet — that's Sprint 2.
> **Spec ref:** §3.2–3.8, §5.1–5.4, §6.2
> **Prerequisite:** Sprint 0 complete (ports, pure math, test doubles)

---

## Task 1.1 — MarkdownChunker (in Core, not Adapters — UB-1)

**What:** Implement the heading-aware recursive markdown splitter. This lives in
`src/core/search/` because it has zero external imports — pure string processing.

| Item | Detail |
| --- | --- |
| **Create** | `src/core/search/MarkdownChunker.ts` |
| **Create** | `tests/search/markdown-chunker.test.ts` |
| **Spec** | §3.2–3.6, UB-1 |
| **Reqs** | VSEARCH-12, VSEARCH-13, VSEARCH-15, VSEARCH-16, VSEARCH-41 |

### Key behaviors

```typescript
class MarkdownChunker implements Chunker {
  chunk(sourceId: string, content: string, metadata: ChunkMetadata, options?: ChunkerOptions): Chunk[] {
    // 1. Split on ## headings (H2) — primary boundaries
    // 2. If chunk > maxChunkWords, recurse on ### headings (H3)
    // 3. If still too large, recurse on paragraph breaks
    // 4. If still too large, recurse on single newlines (last resort)
    // 5. Never split inside: fenced code blocks, lists, blockquotes, tables
    // 6. Merge chunks below minChunkWords with previous chunk
    // 7. Produce three levels: document (1 per chapter), section (1 per ##), passage
  }
}
```

### Split priority

```text
1. ## headings (H2)
2. ### headings (H3)
3. Double newline (paragraph breaks)
4. Single newline (last resort)

Never split inside:
  - Fenced code blocks (``` ... ```)
  - Ordered/unordered lists
  - Blockquotes
  - Tables
```

### Tests (`tests/search/markdown-chunker.test.ts`)

| Test ID | Scenario |
| --- | --- |
| TEST-VS-08 | Markdown with ## headings → chunks split at heading boundaries |
| TEST-VS-09 | Code block spanning 20 lines is never split across chunks |
| TEST-VS-10 | Ordered list with 15 items stays as one chunk |
| TEST-VS-12 | 800-word section with no sub-headings → split on paragraph breaks |
| TEST-VS-13 | 30-word orphan paragraph → merged with previous chunk |
| TEST-VS-41 | `MarkdownChunker` has zero imports from `node_modules` |

### Verify

```bash
npx vitest run tests/search/markdown-chunker.test.ts   # 6 tests pass
grep -r "import.*from.*node_modules" src/core/search/MarkdownChunker.ts  # nothing
npm run build
```

---

## Task 1.2 — Embedding input transformation + contextual prefix (GB-2, GH-2)

**What:** Implement the `transformForEmbedding()` function and `buildPrefix()`
helper used by `MarkdownChunker` to construct `embeddingInput` for each chunk.

| Item | Detail |
| --- | --- |
| **Add to** | `src/core/search/MarkdownChunker.ts` (or separate util) |
| **Create** | `tests/search/transform-embedding.test.ts` |
| **Spec** | §3.3, §3.8 |
| **Reqs** | VSEARCH-14, VSEARCH-48, VSEARCH-51 |

### `buildPrefix()`

```typescript
function buildPrefix(
  bookTitle: string,
  chapterTitle: string,
  chapterFirstSentence: string,
  sectionHeading: string | null,
): string {
  const chapterContext = `${bookTitle}: ${chapterTitle}. ${chapterFirstSentence}`;
  return sectionHeading ? `${chapterContext} > ${sectionHeading}` : chapterContext;
}
```

### `transformForEmbedding()`

```typescript
function transformForEmbedding(rawText: string, prefix: string): string {
  const stripped = rawText
    .replace(/```[\s\S]*?```/g, '')       // remove fenced code blocks
    .replace(/^#{1,6}\s+/gm, '')          // remove heading markers
    .replace(/\*\*|__|[*_`]/g, '')        // remove bold/italic/code markers
    .replace(/^>\s?/gm, '')              // remove blockquote markers
    .replace(/^[-*+]\s/gm, '')           // remove list markers
    .replace(/\|/g, ' ')                 // remove table pipes
    .replace(/\s+/g, ' ')               // normalize whitespace
    .trim();
  return `${prefix} > ${stripped}`;
}
```

### Tests (`tests/search/transform-embedding.test.ts`)

| Test ID | Scenario |
| --- | --- |
| TEST-VS-11 | Chunk embeddingInput starts with `BookTitle: ChapterTitle. FirstSentence > SectionHeading > ...` |
| TEST-VS-52 | `transformForEmbedding()` strips markdown, removes code blocks, normalizes whitespace |
| TEST-VS-56 | Contextual prefix includes chapter first sentence, not just title |

### Verify

```bash
npx vitest run tests/search/transform-embedding.test.ts   # 3 tests pass
npm run build
```

---

## Task 1.3 — SQLite schema: `embeddings` + `bm25_stats` tables

**What:** Add the `embeddings` and `bm25_stats` tables to `ensureSchema()`.
Includes `model_version` column for stale-model detection (GH-4).

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/db/schema.ts` |
| **Spec** | §5.2 |
| **Reqs** | VSEARCH-17, VSEARCH-53 |

### Schema additions

```sql
CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_level TEXT NOT NULL,
  heading TEXT,
  content TEXT NOT NULL,
  embedding_input TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  model_version TEXT NOT NULL,
  embedding BLOB NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_emb_source_type ON embeddings(source_type);
CREATE INDEX IF NOT EXISTS idx_emb_source_id ON embeddings(source_id);
CREATE INDEX IF NOT EXISTS idx_emb_level ON embeddings(chunk_level);
CREATE INDEX IF NOT EXISTS idx_emb_hash ON embeddings(source_id, content_hash);
CREATE INDEX IF NOT EXISTS idx_emb_model ON embeddings(model_version);

CREATE TABLE IF NOT EXISTS bm25_stats (
  source_type TEXT PRIMARY KEY,
  stats_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Verify

```bash
npm run build
npm test   # existing tests still pass — schema is additive
```

---

## Task 1.4 — SQLiteVectorStore + SQLiteBM25IndexStore adapters

**What:** Implement the production SQLite-backed adapters for both storage ports.
Includes BLOB serialization (Float32Array ↔ Buffer) and L2 normalization round-trip.

| Item | Detail |
| --- | --- |
| **Create** | `src/adapters/SQLiteVectorStore.ts` |
| **Create** | `src/adapters/SQLiteBM25IndexStore.ts` |
| **Create** | `tests/search/sqlite-stores.test.ts` |
| **Spec** | §5.3, §5.4, §6.2 |
| **Reqs** | VSEARCH-17, VSEARCH-40, VSEARCH-43 |

### BLOB serialization helpers

```typescript
function serializeEmbedding(embedding: Float32Array): Buffer {
  return Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength);
}

function deserializeEmbedding(buffer: Buffer): Float32Array {
  return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
}
```

### `SQLiteVectorStore`

```typescript
class SQLiteVectorStore implements VectorStore {
  constructor(private db: Database) {}

  upsert(records: EmbeddingRecord[]): void { /* INSERT OR REPLACE */ }
  delete(sourceId: string): void { /* DELETE WHERE source_id = ? */ }
  getAll(query?: VectorQuery): EmbeddingRecord[] { /* SELECT with filters */ }
  getBySourceId(sourceId: string): EmbeddingRecord[] { /* SELECT WHERE source_id */ }
  getContentHash(sourceId: string): string | null { /* SELECT DISTINCT content_hash */ }
  getModelVersion(sourceId: string): string | null { /* SELECT DISTINCT model_version */ }
  count(sourceType?: string): number { /* SELECT COUNT(*) */ }
}
```

### `SQLiteBM25IndexStore`

```typescript
class SQLiteBM25IndexStore implements BM25IndexStore {
  constructor(private db: Database) {}

  getIndex(sourceType: string): BM25Index | null { /* SELECT, deserialize JSON */ }
  saveIndex(sourceType: string, index: BM25Index): void { /* INSERT OR REPLACE */ }
  isStale(sourceType: string): boolean { /* check updated_at vs embeddings updated_at */ }
}
```

### Tests (`tests/search/sqlite-stores.test.ts`)

| Test ID | Scenario |
| --- | --- |
| TEST-VS-18 | Float32Array → Buffer → Float32Array round-trip preserves all values |
| TEST-VS-19 | SQLiteVectorStore.upsert() stores and retrieves embedding records |
| TEST-VS-20 | SQLiteVectorStore.delete() removes all chunks for a source_id |
| TEST-VS-21 | SQLiteVectorStore.getContentHash() returns stored hash |

### Verify

```bash
npx vitest run tests/search/sqlite-stores.test.ts   # 4 tests pass
npm run build && npm test                            # all existing tests green
```

---

## Sprint 1 — Completion Checklist

- [ ] `MarkdownChunker` in `src/core/search/` — zero external imports (UB-1)
- [ ] `transformForEmbedding()` and `buildPrefix()` — enriched contextual prefix (GH-2)
- [ ] `embeddings` + `bm25_stats` tables with `model_version` column (GH-4)
- [ ] `SQLiteVectorStore` + `SQLiteBM25IndexStore` — production adapters
- [ ] BLOB serialization round-trip verified
- [ ] ~12 new tests passing
- [ ] `npm run build && npm test` — all tests green
- [ ] No changes to existing search behavior
