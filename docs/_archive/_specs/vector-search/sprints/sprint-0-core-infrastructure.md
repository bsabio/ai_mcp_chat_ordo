# Sprint 0 — Core Infrastructure

> **Goal:** Build the foundation — ports, pure math, test doubles. No changes to
> the running application. Zero runtime impact.
> **Spec ref:** §3.7, §4.2, §5.3, §5.4, §6.1–6.4, §7.1, §12 (ports + pure math)
> **Prerequisite:** Tool Architecture Sprints 0–4 complete (213 tests passing)

---

## Task 0.1 — Core ports (6 interfaces)

**What:** Create the six foundational port interfaces in a new `src/core/search/ports/`
directory. These are type-only files — the build is the test.

| Item | Detail |
| --- | --- |
| **Create** | `src/core/search/ports/Chunker.ts` |
| **Create** | `src/core/search/ports/Embedder.ts` |
| **Create** | `src/core/search/ports/VectorStore.ts` |
| **Create** | `src/core/search/ports/BM25IndexStore.ts` |
| **Create** | `src/core/search/ports/SearchHandler.ts` |
| **Create** | `src/core/search/ports/QueryProcessingStep.ts` |
| **Spec** | §3.7, §4.2, §5.3, §6.2, §6.7, §7.1 |
| **Reqs** | VSEARCH-35, VSEARCH-47 |

### `Chunker.ts`

```typescript
/** Discriminated union for type-safe, source-specific chunk metadata (GB-1) */
interface BookChunkMetadata {
  sourceType: "book_chunk";
  bookSlug: string;
  chapterSlug: string;
  bookTitle: string;
  chapterTitle: string;
  chapterFirstSentence: string;   // for enriched prefix (GH-2)
  practitioners?: string[];
  checklistItems?: string[];
}

interface ConversationMetadata {
  sourceType: "conversation";
  conversationId: string;
  userId: string;
  role: "user" | "assistant";
  turnIndex: number;
}

type ChunkMetadata = BookChunkMetadata | ConversationMetadata;

interface Chunk {
  content: string;          // raw text (for display)
  embeddingInput: string;   // context-prefixed text (for embedding)
  level: "document" | "section" | "passage";
  heading: string | null;
  startOffset: number;
  endOffset: number;
  metadata: ChunkMetadata;
}

interface ChunkerOptions {
  maxChunkWords: number;    // default 400
  minChunkWords: number;    // default 50
}

interface Chunker {
  chunk(sourceId: string, content: string, metadata: ChunkMetadata, options?: ChunkerOptions): Chunk[];
}
```

### `Embedder.ts`

```typescript
interface Embedder {
  embed(text: string): Promise<Float32Array>;
  embedBatch(texts: string[]): Promise<Float32Array[]>;
  dimensions(): number;     // 384 for MiniLM
  isReady(): boolean;       // true when model loaded
}
```

### `VectorStore.ts`

```typescript
interface EmbeddingRecord {
  id: string;
  sourceType: string;
  sourceId: string;
  chunkIndex: number;
  chunkLevel: "document" | "section" | "passage";
  heading: string | null;
  content: string;
  embeddingInput: string;
  contentHash: string;
  modelVersion: string;
  embedding: Float32Array;
  metadata: ChunkMetadata;
}

interface VectorQuery {
  sourceType?: string;
  chunkLevel?: "document" | "section" | "passage";
  limit?: number;
}

interface VectorStore {
  upsert(records: EmbeddingRecord[]): void;
  delete(sourceId: string): void;
  getAll(query?: VectorQuery): EmbeddingRecord[];
  getBySourceId(sourceId: string): EmbeddingRecord[];
  getContentHash(sourceId: string): string | null;
  getModelVersion(sourceId: string): string | null;
  count(sourceType?: string): number;
}
```

### `BM25IndexStore.ts`

```typescript
interface BM25Index {
  avgDocLength: number;
  docCount: number;
  docLengths: Map<string, number>;
  termDocFrequencies: Map<string, number>;
}

interface BM25IndexStore {
  getIndex(sourceType: string): BM25Index | null;
  saveIndex(sourceType: string, index: BM25Index): void;
  isStale(sourceType: string): boolean;
}
```

### `SearchHandler.ts`

```typescript
interface SearchHandler {
  canHandle(): boolean;
  search(query: string, filters?: VectorQuery): Promise<HybridSearchResult[]>;
  setNext(handler: SearchHandler): SearchHandler;
}
```

### `QueryProcessingStep.ts`

```typescript
interface QueryProcessingStep {
  process(tokens: string[]): string[];
  readonly name: string;
}
```

### Verify

```bash
grep -r "import.*from.*adapters\|import.*from.*lib" src/core/search/  # returns nothing
npm run build   # passes
```

---

## Task 0.2 — Shared types (`types.ts`)

**What:** Create the shared type file for `HybridSearchResult` and re-export
all port types.

| Item | Detail |
| --- | --- |
| **Create** | `src/core/search/types.ts` |
| **Spec** | §8 |

### `types.ts`

```typescript
interface HybridSearchResult {
  bookTitle: string;
  bookNumber: string;
  bookSlug: string;
  chapterTitle: string;
  chapterSlug: string;
  rrfScore: number;
  vectorRank: number | null;
  bm25Rank: number | null;
  relevance: "high" | "medium" | "low";
  matchPassage: string;
  matchSection: string | null;
  matchHighlight: string;
  passageOffset: { start: number; end: number };
}
```

### Verify

```bash
npm run build   # passes
```

---

## Task 0.3 — Pure math functions

**What:** Implement the four pure math modules. Each is stateless, zero
dependencies, fully unit-testable.

| Item | Detail |
| --- | --- |
| **Create** | `src/core/search/dotSimilarity.ts` |
| **Create** | `src/core/search/l2Normalize.ts` |
| **Create** | `src/core/search/BM25Scorer.ts` |
| **Create** | `src/core/search/ReciprocalRankFusion.ts` |
| **Create** | `tests/search/pure-math.test.ts` |
| **Spec** | §5.4, §6.1, §6.3, §6.4 |
| **Reqs** | VSEARCH-37, VSEARCH-52 |

### `dotSimilarity.ts`

```typescript
function dotSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}
```

### `l2Normalize.ts`

```typescript
function l2Normalize(vec: Float32Array): Float32Array {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  const result = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) result[i] = vec[i] / norm;
  return result;
}
```

### `BM25Scorer.ts`

```typescript
class BM25Scorer {
  constructor(private k1: number = 1.2, private b: number = 0.75) {}

  score(queryTerms: string[], docTokens: string[], docLength: number, index: BM25Index): number {
    // Okapi BM25 implementation per §6.1 formula
  }

  private idf(term: string, index: BM25Index): number {
    const n = index.termDocFrequencies.get(term) ?? 0;
    return Math.log((index.docCount - n + 0.5) / (n + 0.5) + 1);
  }
}
```

### `ReciprocalRankFusion.ts`

```typescript
function reciprocalRankFusion(
  rankings: Map<string, number>[],   // array of (chunkId → rank) maps
  k: number = 60,
): Map<string, number> {
  // RRF(d) = Σ 1/(k + rank_i(d))
}
```

### Tests (`tests/search/pure-math.test.ts`)

| Test ID | Scenario |
| --- | --- |
| TEST-VS-29 | RRF([rank 1 in A, rank 3 in B, k=60]) = 1/61 + 1/63 = 0.0323 |
| TEST-VS-30 | dotSimilarity([1,0,0], [1,0,0]) = 1.0 |
| TEST-VS-31 | dotSimilarity([1,0,0], [0,1,0]) = 0.0 |
| TEST-VS-32 | BM25 with k1=1.2, b=0.75 matches reference output |
| TEST-VS-57 | l2Normalize([3,4,0,...]) → [0.6, 0.8, 0,...] |
| TEST-VS-58 | dotSimilarity of two identical L2-normalized vectors = 1.0 |

### Verify

```bash
npx vitest run tests/search/pure-math.test.ts   # 6 tests pass
npm run build                                     # passes
```

---

## Task 0.4 — In-memory test doubles

**What:** Implement `InMemoryVectorStore`, `InMemoryBM25IndexStore`, and
`MockEmbedder` for use in all subsequent unit tests. The `MockEmbedder` returns
deterministic fake vectors so that tests in Sprints 2–4 don't require the ONNX
model download.

| Item | Detail |
| --- | --- |
| **Create** | `src/adapters/InMemoryVectorStore.ts` |
| **Create** | `src/adapters/InMemoryBM25IndexStore.ts` |
| **Create** | `src/adapters/MockEmbedder.ts` |
| **Create** | `tests/search/in-memory-stores.test.ts` |
| **Spec** | §4.2, §5.3, §6.2 |

### `InMemoryVectorStore`

```typescript
class InMemoryVectorStore implements VectorStore {
  private records = new Map<string, EmbeddingRecord>();

  upsert(records: EmbeddingRecord[]): void { /* Map.set each */ }
  delete(sourceId: string): void { /* filter by sourceId */ }
  getAll(query?: VectorQuery): EmbeddingRecord[] { /* filter by query */ }
  getBySourceId(sourceId: string): EmbeddingRecord[] { /* filter */ }
  getContentHash(sourceId: string): string | null { /* first match */ }
  getModelVersion(sourceId: string): string | null { /* first match */ }
  count(sourceType?: string): number { /* filtered count */ }
}
```

### `InMemoryBM25IndexStore`

```typescript
class InMemoryBM25IndexStore implements BM25IndexStore {
  private indices = new Map<string, BM25Index>();

  getIndex(sourceType: string): BM25Index | null { /* Map.get */ }
  saveIndex(sourceType: string, index: BM25Index): void { /* Map.set */ }
  isStale(sourceType: string): boolean { return !this.indices.has(sourceType); }
}
```

### `MockEmbedder` (§4.2 — deterministic test double)

```typescript
class MockEmbedder implements Embedder {
  private ready = false;

  async embed(text: string): Promise<Float32Array> {
    this.ready = true;
    // Return deterministic vector derived from text hash (384 dims)
    const vec = new Float32Array(384);
    for (let i = 0; i < 384; i++) vec[i] = ((text.charCodeAt(i % text.length) + i) % 100) / 100;
    return l2Normalize(vec);
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    return Promise.all(texts.map(t => this.embed(t)));
  }

  dimensions(): number { return 384; }

  isReady(): boolean { return this.ready; }
}
```

### Tests (`tests/search/in-memory-stores.test.ts`)

| Test ID | Scenario |
| --- | --- |
| — | Float32Array → EmbeddingRecord → retrieve → Float32Array round-trip (InMemory) |
| TEST-VS-44 | BM25IndexStore.saveIndex() persists, getIndex() retrieves |
| TEST-VS-51 | BookChunkMetadata round-trip preserves all fields |

### Verify

```bash
npx vitest run tests/search/in-memory-stores.test.ts   # 3 tests pass
npm run build && npm test                               # all existing tests still pass
```

---

## Sprint 0 — Completion Checklist

- [ ] 6 port interfaces in `src/core/search/ports/` — zero infra imports
- [ ] Shared types in `src/core/search/types.ts`
- [ ] 4 pure math modules — stateless, zero dependencies
- [ ] 3 test doubles: `InMemoryVectorStore`, `InMemoryBM25IndexStore`, `MockEmbedder`
- [ ] ~15 new tests passing
- [ ] `npm run build && npm test` — all 213+ tests green
- [ ] No changes to existing runtime behavior
