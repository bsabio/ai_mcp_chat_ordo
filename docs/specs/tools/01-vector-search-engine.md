# Tool Spec 01 — Vector Search Engine

> **Status:** Draft
> **Priority:** Critical — highest-impact single improvement
> **Scope:** Replace naive keyword scoring with hybrid vector + keyword search
> **Dependencies:** None (new capability, backward-compatible)
> **Affects:** `search_books` tool, `LibrarySearchInteractor`, `Chapter` entity

---

## 1. Problem Statement

The current `search_books` implementation uses a hand-rolled keyword scoring
algorithm that splits queries into tokens and scans all 104 chapters linearly.
It has fundamental limitations that make the search experience unreliable:

- **No semantic understanding:** "user experience" will not find chapters about
  "UX" or "usability" unless those exact strings appear. "Good design principles"
  won't find content about "design heuristics" or "usability guidelines."
- **No stemming:** "designing" does not match "design." "accessibility" does not
  match "accessible."
- **No fuzzy matching:** Typos like "accessiblity" return zero results.
- **No synonym awareness:** Domain terms have many synonyms — "SDLC," "software
  development lifecycle," and "development process" should all match.
- **Naive scoring:** A chapter that mentions "design" once in content (+1) scores
  lower than a chapter with "design" in its title (+5), even if the first chapter
  is a 5000-word deep dive on design methodology.
- **No passage-level retrieval:** Results point to chapters, not to the specific
  passage that answers the query. Match context is a dumb 300-char substring.
- **10 books × 10-14 chapters = 104 documents.** This is small enough that a
  brute-force vector search over precomputed embeddings is fast (<5ms) with
  zero infrastructure.

### Impact

Search is the primary discovery tool. Every improvement to search quality
directly improves the LLM's ability to find and cite relevant content. Users
asking "what does the book say about responsive design?" should get the exact
passage, not a keyword miss.

---

## 2. Target Architecture

### 2.1 Embedding Strategy

**Model:** `all-MiniLM-L6-v2` via `@huggingface/transformers` (formerly
`@xenova/transformers`). Runs in Node.js via ONNX Runtime — no API keys, no
external services, no per-query cost.

| Property | Value |
| --- | --- |
| Model | `Xenova/all-MiniLM-L6-v2` |
| Embedding dimension | 384 |
| Model size | ~23MB (ONNX quantized) |
| Token limit | 256 tokens (~200 words) |
| License | Apache 2.0 |

**Why this model:** Best quality-to-size ratio for passage retrieval at this
scale. Outperforms larger models when documents are short passages. Runs in
~10ms per embedding on commodity hardware.

### 2.2 Chunking Strategy

Chapters range from ~2000 to ~8000 words. A single embedding per chapter loses
specificity. The strategy:

#### Chunk levels

| Level | Granularity | Purpose |
| --- | --- | --- |
| **Chapter embedding** | 1 per chapter | Broad topic matching ("which chapter covers X?") |
| **Section embedding** | 1 per `##` heading section | Mid-level matching ("which section discusses Y?") |
| **Passage embedding** | 1 per ~400-word sliding window (200-word overlap) | Fine-grained passage retrieval |

#### Chunking algorithm

```text
For each chapter:
  1. Split by ## headings → sections
  2. For each section:
     a. If section ≤ 400 words → one passage chunk
     b. If section > 400 words → sliding window (400 words, 200 overlap)
  3. Create chapter-level embedding from: title + first 200 words + headings
  4. Create section-level embedding from: heading + full section text (truncated to 256 tokens)
  5. Create passage-level embeddings from each chunk
```

#### Estimated chunk counts

| Content | Chapters | Avg sections/ch | Avg passages/ch | Total embeddings |
| --- | --- | --- | --- | --- |
| 104 chapters | 104 | ~5 | ~12 | ~1800 |

At 384 dimensions × 4 bytes × 1800 embeddings = **~2.7 MB** for the full index.
Trivially fits in memory.

### 2.3 Index Format

Embeddings are precomputed at **build time** and stored as a JSON file:

```typescript
// .data/search-index.json
interface SearchIndex {
  version: number;
  model: string;
  generatedAt: string;
  chapters: ChapterIndex[];
}

interface ChapterIndex {
  bookSlug: string;
  chapterSlug: string;
  chapterTitle: string;
  bookTitle: string;
  bookNumber: string;
  embedding: number[];            // 384-dim, chapter-level
  sections: SectionIndex[];
}

interface SectionIndex {
  heading: string;
  startOffset: number;            // char offset in chapter content
  endOffset: number;
  embedding: number[];            // 384-dim
  passages: PassageIndex[];
}

interface PassageIndex {
  text: string;                   // the actual passage text (~400 words)
  startOffset: number;
  endOffset: number;
  embedding: number[];            // 384-dim
}
```

### 2.4 Search Algorithm — Hybrid Scoring

At query time:

```text
1. Embed the query using the same model (~10ms)
2. Compute cosine similarity against ALL passage embeddings (~2ms for 1800 vectors)
3. Also compute keyword score using existing algorithm (unchanged)
4. Combine scores:
     hybrid_score = (α × vector_score) + (β × normalized_keyword_score)
     where α = 0.6, β = 0.4 (tunable)
5. Deduplicate: if multiple passages from the same chapter score high,
   keep the best passage but roll up to chapter level
6. Return top N results with passage-level match context
```

#### Score normalization

- Vector score: cosine similarity is already 0–1
- Keyword score: normalize to 0–1 by dividing by max possible score
  (all terms match everywhere = ~30 for a 3-term query)

#### Fallback

If the embedding model fails to load (missing ONNX, CI environment, etc.),
fall back to the existing keyword-only search. The system must never break.

### 2.5 Query Processing

Before embedding, process the query:

| Step | Example |
| --- | --- |
| Original | "What are the best UX design heuristics?" |
| Lowercased | "what are the best ux design heuristics?" |
| Stopwords removed | "best ux design heuristics" |
| Synonym expansion | "best ux design heuristics usability user experience" |
| Embedded | 384-dim vector |

**Synonym map** (domain-specific, hand-curated):

```typescript
const SYNONYMS: Record<string, string[]> = {
  "ux": ["user experience", "usability"],
  "ui": ["user interface", "interface design"],
  "a11y": ["accessibility", "accessible"],
  "sdlc": ["software development lifecycle", "development process"],
  "api": ["application programming interface"],
  "ci/cd": ["continuous integration", "continuous deployment", "devops"],
  "seo": ["search engine optimization"],
  "responsive": ["responsive design", "mobile-first", "adaptive"],
  "agile": ["scrum", "sprint", "kanban"],
  "oop": ["object-oriented programming", "object oriented"],
  // ... ~30-50 entries for domain terms
};
```

Synonym expansion is applied to the **keyword** branch only (not embedding,
since the embedding model handles semantic similarity natively).

### 2.6 Result Format (Enhanced)

```typescript
interface EnhancedSearchResult {
  // Existing fields
  bookTitle: string;
  bookNumber: string;
  bookSlug: string;
  chapterTitle: string;
  chapterSlug: string;
  relevance: "high" | "medium" | "low";

  // New fields
  score: number;                    // hybrid score (0–1)
  vectorScore: number;              // cosine similarity (0–1)
  keywordScore: number;             // normalized keyword score (0–1)
  matchPassage: string;             // the actual passage that matched (~400 words)
  matchSection: string;             // heading of the section containing the match
  matchHighlight: string;           // passage with query terms in **bold**
  passageOffset: {                  // for deep linking
    start: number;
    end: number;
  };
}
```

---

## 3. Build-Time Embedding Pipeline

### 3.1 Script: `scripts/build-search-index.ts`

```text
1. Load the embedding model (first run downloads ~23MB, cached after)
2. Load all chapters via FileSystemBookRepository
3. For each chapter:
   a. Chunk into sections and passages
   b. Compute embeddings for chapter, sections, passages
   c. Store in SearchIndex structure
4. Write to .data/search-index.json
5. Print stats: X chapters, Y sections, Z passages, total size
```

**Runtime:** ~30-60 seconds for 104 chapters (one-time build step).

### 3.2 Integration with Build

Add to `package.json`:

```json
{
  "scripts": {
    "build:search-index": "tsx scripts/build-search-index.ts",
    "prebuild": "npm run build:search-index"
  }
}
```

The index rebuilds automatically before `next build`. During development, run
manually: `npm run build:search-index`.

### 3.3 Git and Deployment

- `.data/search-index.json` should be **gitignored** (generated artifact)
- In CI/CD, the build step generates it fresh
- The file is ~3MB (JSON with embeddings) — acceptable for deployment bundle

---

## 4. Runtime Architecture

### 4.1 New Files

| File | Layer | Purpose |
| --- | --- | --- |
| `src/core/search/SearchIndex.ts` | Core | Types for `SearchIndex`, `ChapterIndex`, `SectionIndex`, `PassageIndex` |
| `src/core/search/VectorSearchEngine.ts` | Core | Cosine similarity, hybrid scoring, result ranking |
| `src/core/search/QueryProcessor.ts` | Core | Stopword removal, synonym expansion |
| `src/core/search/cosineSimilarity.ts` | Core | Pure function: dot product / (norm × norm) |
| `src/adapters/SearchIndexRepository.ts` | Adapter | Loads `.data/search-index.json`, caches in memory |
| `src/adapters/EmbeddingService.ts` | Adapter | Wraps `@huggingface/transformers` for query embedding |
| `scripts/build-search-index.ts` | Script | Build-time embedding pipeline |

### 4.2 Modified Files

| File | Change |
| --- | --- |
| `src/core/use-cases/LibrarySearchInteractor.ts` | Accept optional `VectorSearchEngine`; if present, use hybrid search |
| `src/core/use-cases/tools/BookTools.ts` | `SearchBooksCommand` returns enhanced results |
| `src/lib/chat/tool-composition-root.ts` | Wire `EmbeddingService` + `SearchIndexRepository` into search interactor |
| `src/core/tool-registry/ToolResultFormatter.ts` | Update `RoleAwareSearchFormatter` for new result fields |

### 4.3 Dependency Direction

```text
Core (no infra imports):
  SearchIndex types
  VectorSearchEngine (operates on number[] arrays — no model dependency)
  QueryProcessor (pure string processing)
  cosineSimilarity (pure math)

Adapters (implements ports):
  SearchIndexRepository → loads JSON file
  EmbeddingService → wraps @huggingface/transformers

Composition Root:
  Wires adapters into core use cases
```

The core search engine never imports infrastructure. It receives embeddings
(number arrays) from the adapter layer.

---

## 5. Requirement IDs

### Functional

| ID | Requirement |
| --- | --- |
| VSEARCH-1 | Semantic queries return relevant results even without keyword overlap |
| VSEARCH-2 | "UX" finds chapters about "user experience" and "usability" |
| VSEARCH-3 | Hybrid score combines vector similarity (60%) and keyword match (40%) |
| VSEARCH-4 | Results include passage-level match context (~400 words) |
| VSEARCH-5 | Results include the section heading where the match occurred |
| VSEARCH-6 | Match highlights wrap query terms in bold markers |
| VSEARCH-7 | Search completes in <50ms for any query (cached index) |
| VSEARCH-8 | Synonym expansion improves keyword branch for domain abbreviations |
| VSEARCH-9 | Stopwords are removed before keyword scoring |
| VSEARCH-10 | Fallback to keyword-only search if embedding model unavailable |

### Build

| ID | Requirement |
| --- | --- |
| VSEARCH-BUILD-1 | `build-search-index.ts` generates `.data/search-index.json` |
| VSEARCH-BUILD-2 | Index contains chapter, section, and passage-level embeddings |
| VSEARCH-BUILD-3 | Each passage is ~400 words with 200-word overlap |
| VSEARCH-BUILD-4 | Index file is <5MB |
| VSEARCH-BUILD-5 | Build completes in <120 seconds |

### Architectural

| ID | Requirement |
| --- | --- |
| VSEARCH-ARCH-1 | `src/core/search/` has zero imports from `src/adapters/` or `src/lib/` |
| VSEARCH-ARCH-2 | `VectorSearchEngine` depends only on `number[]` arrays, not model APIs |
| VSEARCH-ARCH-3 | Existing `search_books` API contract unchanged — enhanced results are additive |
| VSEARCH-ARCH-4 | All existing search tests continue to pass |

---

## 6. Test Scenarios

```text
TEST-VS-01: Semantic query "user experience" returns UX Design book chapters (vector match)
TEST-VS-02: Keyword query "accessibility" still returns high-quality results (keyword branch works)
TEST-VS-03: Hybrid score for "responsive design" ranks vector+keyword matches above keyword-only
TEST-VS-04: Synonym expansion: "a11y" finds accessibility chapters
TEST-VS-05: Typo resilience: "accessiblity" still finds results via vector similarity
TEST-VS-06: Result includes matchPassage with ~400 words (not 200-char snippet)
TEST-VS-07: Result includes matchSection heading
TEST-VS-08: matchHighlight contains **bold** markers around query terms
TEST-VS-09: Fallback: when index is missing, keyword search returns same results as before
TEST-VS-10: Performance: 100 sequential searches complete in <5 seconds total
TEST-VS-11: Build script generates valid index with expected chunk counts
TEST-VS-12: cosineSimilarity([1,0,0], [1,0,0]) = 1.0, orthogonal vectors = 0.0
```

---

## 7. Migration Strategy

1. **Phase 1:** Build the embedding pipeline and index format. Verify the index
   generates correctly. No runtime changes yet.
2. **Phase 2:** Implement `VectorSearchEngine` with pure cosine similarity.
   Write unit tests using hardcoded embedding arrays.
3. **Phase 3:** Implement `EmbeddingService` adapter for query-time embedding.
   Wire into `LibrarySearchInteractor` as optional enhancer.
4. **Phase 4:** Update `SearchBooksCommand` result format. Update formatter.
5. **Phase 5:** Performance testing and score weight tuning (α/β).

Each phase is independently deployable. The search tool works at every stage —
degrading gracefully from "vector + keyword" to "keyword only" to "nothing found."

---

## 8. Open Questions

1. **Should we embed the full passage text or a processed version?** Full text
   preserves context. Processed (headings removed, normalized whitespace) may
   produce more focused embeddings.
2. **Should synonym expansion apply to the embedding query too?** The model
   probably handles "UX" → "user experience" already, but appending synonyms
   to the query text before embedding could help.
3. **Quantization:** Should we store embeddings as Float32 (3MB) or quantize to
   Int8 (~750KB)? At 1800 vectors, the size difference is negligible, so
   Float32 is simpler.
4. **Should we expose vector score to the LLM?** Showing `vectorScore: 0.87`
   might help the LLM assess confidence, or it might be noise.
