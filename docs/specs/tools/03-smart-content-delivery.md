# Tool Spec 03 — Smart Content Delivery

> **Status:** Draft
> **Priority:** High — fixes the #1 data quality issue (chapter truncation)
> **Scope:** Chapter pagination, heading-aware chunking, interactive checklists,
>   enriched book summaries
> **Dependencies:** Spec 01 (vector search index provides section boundaries)
> **Affects:** `get_chapter`, `get_checklist`, `get_book_summary` tools

---

## 1. Problem Statement

### 1.1 Chapter Truncation (Critical)

`GetChapterCommand` returns the first 4000 characters then hard-truncates with
`[... truncated ...]`. Most chapters are 5000–10000+ characters. **Over 60% of
content is lost.** The LLM cannot cite, summarize, or reference material beyond
the truncation point. This is the single biggest quality gap in content delivery.

### 1.2 Checklist Limitations

`GetChecklistCommand` returns raw markdown bullet lists. No filtering by chapter,
no interactive state, no progress tracking. Checklists are read-only snapshots.

### 1.3 Book Summary Flatness

`GetBookSummaryCommand` returns chapter titles but no descriptions. The LLM must
guess which chapter to fetch, often picking the wrong one. A one-sentence
summary per chapter would give the LLM enough signal to make smart choices.

---

## 2. Chapter Pagination — `get_chapter` Overhaul

### 2.1 Heading-Aware Chunking

Instead of character-based truncation, split chapters by `## headings` into
logical sections. Each section is a self-contained unit the LLM can request.

```typescript
interface ChapterResponse {
  bookTitle: string;
  chapterTitle: string;
  bookSlug: string;
  chapterSlug: string;
  totalSections: number;
  returnedSections: SectionContent[];
  hasMore: boolean;
  nextSection?: number;            // index of next unreturned section
  chapterSummary: string;          // extractive summary (~150 words)
}

interface SectionContent {
  index: number;
  heading: string;
  content: string;
  wordCount: number;
}
```

### 2.2 Retrieval Modes

The enhanced `get_chapter` supports three modes:

| Mode | Input | Behavior |
| --- | --- | --- |
| **Full** (default) | `{ book_slug, chapter_slug }` | Returns summary + first N sections that fit in ~4000 chars |
| **Section** | `{ book_slug, chapter_slug, section: 3 }` | Returns specific section by index |
| **Range** | `{ book_slug, chapter_slug, from_section: 2, to_section: 5 }` | Returns a range of sections |

### 2.3 Enhanced Schema

```typescript
{
  name: "get_chapter",
  input_schema: {
    type: "object",
    properties: {
      book_slug: { type: "string" },
      chapter_slug: { type: "string" },
      section: {
        type: "number",
        description: "Specific section index to retrieve (0-based). Omit for overview."
      },
      from_section: {
        type: "number",
        description: "Start of section range (inclusive, 0-based)"
      },
      to_section: {
        type: "number",
        description: "End of section range (inclusive, 0-based)"
      },
    },
    required: ["book_slug", "chapter_slug"],
  },
}
```

### 2.4 Summary Generation

Each chapter gets an **extractive summary** — the first sentence of each
`## section` concatenated into a ~150-word overview. This is computed at build
time (alongside the vector index) and stored in the search index.

```text
Chapter: "Usability Heuristics"
Summary: "This chapter introduces Jakob Nielsen's 10 usability heuristics as
a framework for evaluating user interfaces. Visibility of system status ensures
users always know what's happening. Match between system and real world means
using familiar language. User control and freedom provides emergency exits..."
```

The LLM receives the summary + table of sections (with headings and word counts)
on the first call, giving it a complete map of the chapter before deciding which
sections to read in full.

### 2.5 Continuation Pattern

The LLM naturally loops on tool calls. The pattern becomes:

```text
1. LLM calls get_chapter(book_slug, chapter_slug)  → gets summary + sections 0-2
2. LLM reads, then calls get_chapter(..., section: 3) → gets section 3
3. LLM reads, then calls get_chapter(..., section: 4) → gets section 4
4. LLM has enough context to answer the user's question
```

This is self-directed — the LLM decides how deep to read based on the user's
query. No wasted tokens loading irrelevant sections.

---

## 3. Interactive Checklists — `get_checklist` Overhaul

### 3.1 Structured Return Format

Replace markdown strings with typed arrays:

```typescript
interface ChecklistResponse {
  book: string;
  bookSlug: string;
  chapter: string;
  chapterSlug: string;
  items: ChecklistItem[];
  completedCount: number;        // for authenticated users
  totalCount: number;
}

interface ChecklistItem {
  id: string;                    // stable hash of book+chapter+item text
  text: string;
  completed: boolean;            // always false for ANONYMOUS
}
```

### 3.2 Enhanced Schema with Filtering

```typescript
{
  name: "get_checklist",
  input_schema: {
    type: "object",
    properties: {
      book_slug: { type: "string", description: "Filter to a specific book" },
      chapter_slug: { type: "string", description: "Filter to a specific chapter" },
      query: { type: "string", description: "Search within checklist items" },
      show_completed: { type: "boolean", description: "Include completed items (default true)" },
    },
  },
}
```

### 3.3 Progress Tracking (Authenticated Users)

For `AUTHENTICATED+` users, checklist progress is persisted in SQLite:

```sql
CREATE TABLE IF NOT EXISTS checklist_progress (
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,          -- hash of book+chapter+item
  completed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, item_id)
);
```

### 3.4 New Tool: `toggle_checklist_item`

```typescript
{
  name: "toggle_checklist_item",
  description: "Mark a checklist item as complete or incomplete.",
  input_schema: {
    type: "object",
    properties: {
      item_id: { type: "string", description: "The checklist item ID" },
      completed: { type: "boolean", description: "true to mark complete, false to unmark" },
    },
    required: ["item_id", "completed"],
  },
  roles: ["AUTHENTICATED", "STAFF", "ADMIN"],
  category: "content",
}
```

---

## 4. Enriched Book Summaries — `get_book_summary` Enhancement

### 4.1 Per-Chapter Descriptions

Each chapter gets a one-sentence description (first sentence of content, or
first sentence of the extractive summary):

```typescript
interface BookSummaryResponse {
  number: string;
  title: string;
  slug: string;
  description: string;             // book-level summary (~50 words)
  chapterCount: number;
  chapters: ChapterSummary[];
}

interface ChapterSummary {
  index: number;
  title: string;
  slug: string;
  description: string;             // one-sentence summary
  wordCount: number;
  sectionCount: number;
  hasPractitioners: boolean;
  hasChecklist: boolean;
}
```

### 4.2 Optional Book Filter

```typescript
{
  name: "get_book_summary",
  input_schema: {
    type: "object",
    properties: {
      book_slug: {
        type: "string",
        description: "Get details for a specific book. Omit for full catalog overview."
      },
    },
  },
}
```

When `book_slug` is provided, return detailed data for just that book (saves
tokens). When omitted, return the catalog overview with condensed chapter lists.

---

## 5. File Plan

### New Files

| File | Layer | Purpose |
| --- | --- | --- |
| `src/core/content/ChapterChunker.ts` | Core | Splits chapters by headings into sections |
| `src/core/content/ExtractiveSum.ts` | Core | First-sentence-per-section summary generator |
| `src/core/use-cases/tools/toggle-checklist.tool.ts` | Core | New tool descriptor |
| `src/adapters/ChecklistProgressRepository.ts` | Adapter | SQLite persistence for checklist state |

### Modified Files

| File | Change |
| --- | --- |
| `src/core/use-cases/tools/BookTools.ts` | `GetChapterCommand` → section-aware; `GetChecklistCommand` → structured; `GetBookSummaryCommand` → enriched |
| `src/core/use-cases/GetChapterInteractor.ts` | Accept section index/range parameters |
| `src/core/use-cases/ChecklistInteractor.ts` | Accept chapter_slug, query filters; merge with progress data |
| `src/core/use-cases/BookSummaryInteractor.ts` | Generate per-chapter descriptions |
| `src/lib/chat/tool-composition-root.ts` | Register `toggle_checklist_item`, wire progress repo |
| `src/core/tool-registry/ToolResultFormatter.ts` | Strip slugs from checklist/summary for ANONYMOUS |

---

## 6. Requirement IDs

### Chapter Delivery

| ID | Requirement |
| --- | --- |
| CONTENT-CH-1 | Default get_chapter returns summary + first N sections (~4000 chars total) |
| CONTENT-CH-2 | Section mode returns a single section by index |
| CONTENT-CH-3 | Range mode returns sections from_section to to_section |
| CONTENT-CH-4 | Response includes `hasMore` flag and `nextSection` index |
| CONTENT-CH-5 | Chapter summary is extractive (~150 words, first sentence per heading) |
| CONTENT-CH-6 | Section headings and word counts are always included in response |
| CONTENT-CH-7 | Invalid section index returns clear error, not empty content |

### Checklists

| ID | Requirement |
| --- | --- |
| CONTENT-CL-1 | get_checklist returns structured array, not markdown string |
| CONTENT-CL-2 | Filter by chapter_slug works |
| CONTENT-CL-3 | Filter by query matches within checklist item text |
| CONTENT-CL-4 | AUTHENTICATED users see `completed` status per item |
| CONTENT-CL-5 | toggle_checklist_item persists completion state in SQLite |
| CONTENT-CL-6 | Each item has a stable `id` (deterministic hash of content identifier) |
| CONTENT-CL-7 | ANONYMOUS users see `completed: false` for all items |

### Book Summaries

| ID | Requirement |
| --- | --- |
| CONTENT-BS-1 | Each chapter in the summary has a one-sentence description |
| CONTENT-BS-2 | Optional book_slug filter returns detailed single-book data |
| CONTENT-BS-3 | Catalog view (no filter) returns condensed data (title + description only) |
| CONTENT-BS-4 | Response includes wordCount, sectionCount, hasPractitioners, hasChecklist flags |

---

## 7. Test Scenarios

```text
TEST-CH-01: get_chapter default → summary + first sections, hasMore=true for long chapters
TEST-CH-02: get_chapter(section: 0) → returns first section only
TEST-CH-03: get_chapter(section: 999) → returns error "section index out of range"
TEST-CH-04: get_chapter(from: 1, to: 3) → returns 3 sections
TEST-CH-05: Chapter summary is ≤200 words and contains text from each heading section
TEST-CH-06: Short chapter (≤4000 chars) → hasMore=false, all content returned

TEST-CL-01: get_checklist({book_slug: "ux-design"}) → only UX Design checklists
TEST-CL-02: get_checklist({chapter_slug: "usability-heuristics"}) → single chapter
TEST-CL-03: get_checklist({query: "responsive"}) → items containing "responsive"
TEST-CL-04: toggle_checklist_item → persists, subsequent get_checklist shows completed
TEST-CL-05: ANONYMOUS get_checklist → all items have completed: false
TEST-CL-06: toggle_checklist_item as ANONYMOUS → ToolAccessDeniedError

TEST-BS-01: get_book_summary() → 10 books, each with chapter list + descriptions
TEST-BS-02: get_book_summary({book_slug: "ux-design"}) → detailed single-book response
TEST-BS-03: Each chapter description is non-empty and ≤100 words
TEST-BS-04: Response includes wordCount and sectionCount per chapter
```

---

## 8. Migration Strategy

The chapter response format change is the most impactful. Strategy:

1. **Phase 1:** Build `ChapterChunker` and `ExtractiveSum` as pure core
   functions. Unit test with mock chapter content.
2. **Phase 2:** Update `GetChapterCommand` to use heading-aware chunking.
   The default mode returns the same approximate amount of content (4000 chars)
   but organized by sections instead of raw truncation. Backward compatible.
3. **Phase 3:** Add section/range parameters. Existing callers that don't
   pass these get the default behavior.
4. **Phase 4:** Checklist structured returns + progress tracking.
5. **Phase 5:** Book summary enrichment.

Each phase is independently deployable.
