# Librarian — System Spec

> **Status:** Draft v3.0
> **Date:** 2026-03-12
> **Scope:** Restructure book content into a `docs/_corpus/` directory with
>   JSON-manifest auto-discovery, then add "librarian" MCP tools for listing,
>   adding, and removing corpus content across three sprints: restructure (0),
>   core tools (1), and zip import (2).
> **Dependencies:** Vector Search Sprints 0–5 (complete), RBAC (complete)
> **Affects:** `FileSystemBookRepository`, `CachedBookRepository`,
>   `build-search-index.ts`, `mcp/embedding-server.ts`, admin tool surface
>
> **Metaphor:** The system uses a **Librarian / Publisher** boundary.
> The librarian (this spec) receives, catalogs, shelves, indexes, and retrieves
> finished content. The publisher (future) generates and produces content.
> Content flows one way: Publisher → Librarian → Search. The librarian never
> authors or edits — books are on the shelf or they're not.
>
> **Requirement IDs:** Each traceable requirement is tagged `LIBRARIAN-XX`.
> Sprint tasks reference these IDs for traceability.

---

## 1. Problem Statement

### 1.1 Hardcoded Book Registry

`FileSystemBookRepository` contains a 90-line, 10-entry `BOOKS` array that
maps slugs to filesystem paths. Adding or removing a book requires editing
TypeScript source code, recompiling, and redeploying. This violates
Open/Closed — the system should be open for extension (new books) without
modification (editing adapter code).

### 1.2 Mixed Content Directory

Book directories (`docs/*-book/`) live alongside project documentation
(`docs/_planning/`, `docs/_specs/`, `docs/_reference/`, `docs/operations/`).
There is no single, authoritative root that means "this is embeddable content."
Loose files at the `docs/` root (`autopsy-authoritative-2026-03-07.md`,
`honest-thoughts-2026-03-07.md`) add ambiguity.

### 1.3 No Admin Content Operations

Admins cannot manage corpus content through the existing tool interface.
Adding a book requires shell access to the server filesystem. There is no
programmatic way to list what's in the corpus, add a new book, upload chapter
content, or remove a book — all operations the admin role should own.

### 1.4 No Bulk Import Path

A future book-generation pipeline will produce complete books as zip archives
containing a `book.json` manifest and a `chapters/` directory. The system has
no mechanism to accept, validate, and unpack such archives into the corpus.

---

## 2. Design Goals

1. **Convention over configuration** — a `book.json` manifest inside any
   subdirectory of `_corpus/` is a book. No code changes to add content.
   `[LIBRARIAN-010]`
2. **Single embeddable root** — `docs/_corpus/` is the only directory the
   embedding pipeline reads. Everything outside it is project documentation.
3. **Directory name = slug** — the corpus subdirectory name must equal the
   book's `slug` field. No suffix, no translation. `_corpus/software-engineering/`
   for slug `software-engineering`. `[LIBRARIAN-090]`
4. **Admin-only operations** — librarian tools require `ADMIN` role,
   enforced per-invocation by existing RBAC middleware. `[LIBRARIAN-030]`
5. **Incremental by default** — existing SHA-256 change detection continues to
   work. Only changed content is re-embedded on rebuild.
6. **Zip-ready** — a future `librarian_add_book` zip mode (Sprint 2) accepts
   a zip archive containing `book.json` + `chapters/*.md`. The zip path
   prepares for the book-generation pipeline. `[LIBRARIAN-040]`
7. **No editing** — tools create and remove content. In-place editing of
   existing chapters is out of scope.

---

## 3. Corpus Directory Convention

### 3.1 Structure

```
docs/_corpus/
├── software-engineering/
│   ├── book.json
│   ├── chapters/
│   │   ├── ch00-the-people-behind-the-principles.md
│   │   ├── ch01-why-this-moment-matters.md
│   │   └── ...
│   ├── editorial/        ← ignored by embedding pipeline
│   └── prompts/          ← ignored by embedding pipeline
├── accessibility/
│   ├── book.json
│   └── chapters/
│       └── ...
└── ...any number of books...
```

> **LIBRARIAN-090:** The directory name **must** equal the `slug` field in
> `book.json`. If they disagree, discovery skips the directory and logs a
> warning. This eliminates the dual-identity problem of a separate directory
> name vs. slug.

### 3.2 `book.json` Schema

```json
{
  "slug": "software-engineering",
  "title": "Software Engineering",
  "number": "I",
  "sortOrder": 1,
  "domain": ["teaching", "reference"],
  "tags": ["software-engineering", "best-practices", "design-patterns"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | `string` | Yes | URL-safe identifier (lowercase kebab-case). Must equal the directory name. Must be unique across corpus. Used as `bookSlug` in source IDs (`{slug}/{chapterSlug}`). `[LIBRARIAN-080]` |
| `title` | `string` | Yes | Human-readable book title. Used in search results and metadata. |
| `number` | `string` | Yes | Display label (Roman numeral or digit). Decorative only — not used for sorting. |
| `sortOrder` | `number` | Yes | Numeric sort key. Books are ordered by `sortOrder` ascending. Avoids locale-dependent string comparison of Roman numerals. |
| `domain` | `string[]` | Yes | Controlled vocabulary for search scoping. Valid values: `teaching`, `sales`, `customer-service`, `reference`, `internal`. Must contain at least one entry. `[LIBRARIAN-020]` |
| `tags` | `string[]` | No | Freeform labels for finer-grained filtering. Must be lowercase kebab-case (`/^[a-z0-9][a-z0-9-]*[a-z0-9]$/`). No spaces. |

> **Design note (Option A):** Domain and tags are captured in manifests and
> stored alongside embeddings from Sprint 0. Search-time filtering by domain
> is deferred to a future sprint — the metadata is present so it never needs
> to be retrofitted.

### 3.3 Chapter Convention

- Lives in `{book-dir}/chapters/*.md`
- Filename becomes `chapterSlug` (minus `.md` extension)
- First `# Heading` in the file becomes the chapter title; if absent, the
  filename (minus extension) is used as the title `[LIBRARIAN-020]`
- Files are sorted alphabetically — `ch00`, `ch01`, etc.
- Only `.md` files in `chapters/` are read. All other files and directories
  inside the book folder are ignored.

### 3.4 Discovery Algorithm `[LIBRARIAN-010]`

```
for each subdirectory D of docs/_corpus/:
  if D/book.json exists and is valid JSON with slug, title, number, sortOrder, domain:
    if D.name !== book.json.slug:
      log warning "slug mismatch" — SKIP
    else:
      register book from D/book.json
      scan D/chapters/*.md for chapters
  else:
    skip D (log warning)
```

No hardcoded book list. No configuration file. Drop a folder, get a book.

### 3.5 Acceptance Rules `[LIBRARIAN-020]`

These rules are normative — implementations must enforce them:

| Rule | Behavior |
|------|----------|
| `book.json.slug` ≠ directory name | Skip directory, log warning `[LIBRARIAN-090]` |
| Chapter file has no `# Heading` | Use filename (minus `.md`) as title |
| `domain` contains invalid values | Reject manifest during discovery; skip book |
| Slug format | Lowercase kebab-case: `/^[a-z0-9][a-z0-9-]*[a-z0-9]$/`, max 100 chars `[LIBRARIAN-080]` |
| Tags format | Lowercase kebab-case, no spaces. Invalid tags silently filtered |
| Book with zero chapters | Valid — manifest exists, chapters added later via `librarian_add_chapter` |
| `librarian_add_chapter` on existing slug | **Overwrite** (idempotent — enables re-generation) |
| `librarian_add_book` on existing slug | **Reject** — never silently overwrite a book |

---

## 4. Repository Changes

### 4.1 `FileSystemBookRepository`

**Before:** Hardcoded `BOOKS: BookMeta[]` array, `chaptersDir` paths relative
to `docs/`.

**After:** `discoverBooks()` method that scans `docs/_corpus/` for directories
containing valid `book.json` files. Returns the same `BookMeta` shape. The
discovery result is cached in-memory for the process lifetime (same as current
behavior — books don't change during a running server).

```typescript
// Pseudocode
interface BookManifest {
  slug: string;
  title: string;
  number: string;
  sortOrder: number;
  domain: string[];
  tags?: string[];
}

async discoverBooks(): Promise<BookMeta[]> {
  const corpusDir = path.join(this.docsDir, "_corpus");
  const entries = await fs.readdir(corpusDir, { withFileTypes: true });
  const booksWithOrder: Array<{ meta: BookMeta; sortOrder: number }> = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(corpusDir, entry.name, "book.json");
    try {
      const raw = await fs.readFile(manifestPath, "utf-8");
      const manifest: BookManifest = JSON.parse(raw);
      // Validate required fields
      if (!manifest.slug || !manifest.title || !manifest.number) continue;
      if (typeof manifest.sortOrder !== "number") continue;
      if (!Array.isArray(manifest.domain) || manifest.domain.length === 0) continue;
      // LIBRARIAN-090: directory name must equal slug
      if (entry.name !== manifest.slug) {
        console.warn(`Slug mismatch: dir "${entry.name}" vs slug "${manifest.slug}" — skipping`);
        continue;
      }
      booksWithOrder.push({
        meta: {
          slug: manifest.slug,
          title: manifest.title,
          shortTitle: manifest.title,  // derive from title
          number: manifest.number,
          chaptersDir: `_corpus/${manifest.slug}/chapters`,
        },
        sortOrder: manifest.sortOrder,
      });
    } catch {
      // No book.json or invalid — skip
    }
  }
  return booksWithOrder
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ meta }) => meta);
}
```

The `chaptersDir` is now always `_corpus/{slug}/chapters` — derived from
the slug (which equals the directory name per `LIBRARIAN-090`). The rest of
`FileSystemBookRepository` (chapter reading, parsing, practitioner extraction,
checklist analysis) remains unchanged.

### 4.2 `CachedBookRepository`

**Change:** Add a `clearCache()` method that resets all maps and cached arrays.
Called by the librarian tools after adding or removing content, so the
next request picks up the new filesystem state.

```typescript
clearCache(): void {
  this.allBooksCache = null;
  this.allChaptersCache = null;
  this.bookCache.clear();
  this.chaptersByBookCache.clear();
  this.chapterCache.clear();
}
```

### 4.3 `RepositoryFactory`

No change to the factory itself. The MCP embedding server's `buildDeps()`
function constructs the repository graph directly — not via
`RepositoryFactory.getBookRepository()` — so it can capture references to
the concrete `CachedBookRepository` and `FileSystemBookRepository` instances.
This allows wrapping both `clearCache()` and `clearDiscoveryCache()` into
the single `clearCaches` callback injected into `LibrarianToolDeps`.

---

## 5. MCP Librarian Tools

### 5.1 Tool Surface

Six tools added to the existing embedding MCP server (`mcp/embedding-server.ts`).
All require `ADMIN` role (`LIBRARIAN-030`). Zip mode is added in Sprint 2.

| Tool | Description | Input | Sprint |
|------|-------------|-------|--------|
| `librarian_list` | List all books in the corpus with chapter counts | `{}` | 1 |
| `librarian_get_book` | Get details of a single book (chapters, sizes) | `{slug}` | 1 |
| `librarian_add_book` | Create a new book from JSON args | `{slug, title, number, sortOrder, domain, tags?, chapters?}` | 1 |
| `librarian_add_chapter` | Add a chapter to an existing book | `{book_slug, chapter_slug, content}` | 1 |
| `librarian_remove_book` | Remove a book and clean up its embeddings | `{slug}` | 1 |
| `librarian_remove_chapter` | Remove a single chapter and its embeddings | `{book_slug, chapter_slug}` | 1 |
| `librarian_add_book` (zip mode) | Create a new book from zip archive | `{zip_base64}` | 2 |

### 5.2 Tool Specifications

#### `librarian_list`

**Input:** `{}` (no arguments)
**Output:** Array of book summaries

```json
{
  "books": [
    {
      "slug": "software-engineering",
      "title": "Software Engineering",
      "number": "I",
      "domain": ["teaching", "reference"],
      "tags": ["software-engineering", "best-practices"],
      "chapterCount": 14,
      "indexed": true
    }
  ],
  "totalBooks": 10,
  "totalChapters": 104
}
```

**Behavior:** Scans `_corpus/`, reads each `book.json` directly from disk,
counts `chapters/*.md` files, checks if embeddings exist in the vector store
for this book's chapters. At current scale (~10 books, ~100 chapters),
per-chapter `getBySourceId()` is acceptable; a future optimization could use
`vectorStore.count(sourceType)` for a single aggregated check.

> **Design note (`LIBRARIAN-100`):** `librarian_list` and `librarian_get_book`
> read `domain`/`tags` directly from `book.json` on disk, bypassing the
> `BookRepository` interface (which does not yet surface these fields). This
> creates two truth paths — a known design smell. When domain-based search
> scoping is implemented, introduce a shared `CorpusCatalog` abstraction or
> enrich `BookMeta` to include `domain`/`tags`, consolidating both paths.

#### `librarian_get_book`

**Input:** `{slug: string}`
**Output:** Book details with chapter listing

```json
{
  "slug": "software-engineering",
  "title": "Software Engineering",
  "number": "I",
  "domain": ["teaching", "reference"],
  "tags": ["software-engineering", "best-practices"],
  "chapters": [
    {
      "slug": "ch00-the-people-behind-the-principles",
      "title": "Chapter 0 — The Thread",
      "indexed": true,
      "contentLength": 15234
    }
  ]
}
```

#### `librarian_add_book` (manual — Sprint 1)

**Input:**
```json
{
  "slug": "ai-ethics",
  "title": "AI Ethics",
  "number": "XI",
  "sortOrder": 11,
  "domain": ["teaching", "reference"],
  "tags": ["ai", "ethics"],
  "chapters": [
    {
      "slug": "ch00-introduction",
      "content": "# Chapter 0 — Introduction\n\n..."
    }
  ]
}
```

**Behavior:**
1. Validate slug format (`LIBRARIAN-080`) and uniqueness
2. Create `_corpus/{slug}/` directory `[LIBRARIAN-090]`
3. Write `book.json` (with slug, title, number, sortOrder, domain, tags)
4. Create `chapters/` directory
5. Write each chapter `.md` file
6. Clear caches `[LIBRARIAN-050]`
7. Return result (caller follows up with `rebuild_index` to embed)

**Output:**
```json
{
  "slug": "ai-ethics",
  "title": "AI Ethics",
  "directory": "_corpus/ai-ethics",
  "chaptersWritten": 10,
  "indexed": false,
  "hint": "Run rebuild_index to make this book searchable."
}
```

#### `librarian_add_book` (zip — Sprint 2)

**Input:**
```json
{
  "zip_base64": "<base64-encoded zip>"
}
```

See §5.3 for zip archive format and validation rules. Implemented in Sprint 2.

#### `librarian_add_chapter`

**Input:** `{book_slug: string, chapter_slug: string, content: string}`
**Behavior:**
1. Verify book exists in `_corpus/`
2. Validate chapter slug format `[LIBRARIAN-080]`
3. Write `_corpus/{slug}/chapters/{chapter_slug}.md`
4. If chapter already exists, **overwrite** (idempotent — see §3.5)
5. Clear caches `[LIBRARIAN-050]`
6. Return confirmation

#### `librarian_remove_book`

**Input:** `{slug: string}`
**Behavior:**
1. Find book directory in `_corpus/`
2. Delete all embeddings for this book's chapters (via `vectorStore.delete()`)
   `[LIBRARIAN-060]`
3. Remove the entire book directory from the filesystem
4. Clear caches `[LIBRARIAN-050]`
5. Return confirmation with deleted chapter/embedding counts

#### `librarian_remove_chapter`

**Input:** `{book_slug: string, chapter_slug: string}`
**Behavior:**
1. Verify book and chapter exist
2. Delete embeddings for `{book_slug}/{chapter_slug}` `[LIBRARIAN-060]`
3. Remove the `.md` file
4. Clear caches `[LIBRARIAN-050]`
5. Return confirmation

### 5.3 Zip Archive Specification (Sprint 2)

The zip format is designed to match what the future book-generation pipeline
will produce. The archive structure:

```
ai-ethics.zip
├── book.json
└── chapters/
    ├── ch00-introduction.md
    ├── ch01-foundations.md
    └── ...
```

**Validation rules (`LIBRARIAN-040`):**
- `book.json` must exist at the archive root
- `book.json` must contain valid `slug`, `title`, `number`, `sortOrder`, `domain`
- `chapters/` directory must contain at least one `.md` file
- Slug must not conflict with an existing book (never overwrite)
- Total uncompressed size must be under 50 MB (configurable)
- No path traversal (filenames must not contain `..` or start with `/`)
- Filenames must be valid UTF-8
- No duplicate chapter slugs after normalization
- No nested directories under `chapters/`

**Operational constraints:**
- **Never overwrite:** if slug already exists, reject the entire archive
- **Atomic extraction:** extract to a temp directory first, validate all
  contents, then move to `_corpus/{slug}/` only after full validation
- **Rollback on failure:** if any write fails after temp extraction, remove
  the temp directory — no partial state in `_corpus/`

---

## 6. Build Pipeline Changes

### 6.1 `build-search-index.ts`

No logic changes. The script calls `bookRepo.getAllBooks()` and
`bookRepo.getAllChapters()`, which now discover books from `_corpus/`
automatically. The SHA-256 change detection, BM25 index rebuild, and quality
validation all work unchanged.

### 6.2 Orphan Cleanup `[LIBRARIAN-060]`

When a book is removed from `_corpus/`, its chapters are no longer returned by
`getAllChapters()`. The next `pipeline.rebuildAll()` call will detect orphaned
embeddings (source IDs present in the vector store but not in the document
list) and delete them. This is existing behavior in `EmbeddingPipeline`.

For immediate cleanup (without waiting for the next build), the
`librarian_remove_book` tool explicitly calls `vectorStore.delete()` for each
chapter.

---

## 7. Extracted Tool Logic

Following the established pattern (`mcp/calculator-tool.ts`,
`mcp/embedding-tool.ts`), librarian tool logic lives in a separate module:

| File | Purpose |
|------|---------|
| `mcp/librarian-tool.ts` | Pure functions for librarian operations (dependency-injected) |
| `mcp/embedding-server.ts` | Registers librarian tools alongside existing embedding tools |

### 7.1 `LibrarianToolDeps`

```typescript
export interface LibrarianToolDeps {
  corpusDir: string;              // absolute path to docs/_corpus/
  vectorStore: VectorStore;       // for embedding cleanup on remove
  clearCaches: () => void;        // callback to bust CachedBookRepository + discovery cache
}
```

Librarian tools do NOT depend on the full `EmbeddingToolDeps`. They only need
filesystem access, the vector store (for cleanup), and a cache-clear callback.
The `clearCaches` callback wraps both `CachedBookRepository.clearCache()` and
`FileSystemBookRepository.clearDiscoveryCache()` — wired in the composition
root so tool functions stay decoupled from concrete repository types.

### 7.2 Cache Invariant `[LIBRARIAN-050]`

All librarian mutation operations (`add_book`, `add_chapter`, `remove_book`,
`remove_chapter`) call `clearCaches()` **after successful filesystem mutation
and before returning a success response**. If the mutation fails at any step,
no caches are cleared and an error is thrown — the system remains in its
pre-mutation state for caching purposes.

For long-lived processes (e.g., the MCP server), the cache-clear callback
targets the same in-memory instances that serve search and build requests.
This ensures consistency without requiring a process restart.

---

## 8. Security

### 8.1 RBAC `[LIBRARIAN-030]`

All librarian tools are registered with `roles: ["ADMIN"]`. The MCP embedding
server process may run with elevated privileges, but **authorization is
enforced per-invocation**: tool registration declares the `ADMIN` requirement
and the RBAC middleware checks the requesting user's role on each tool call.

### 8.2 Path Traversal Prevention `[LIBRARIAN-070]`

All filesystem operations validate that resolved paths fall within
`docs/_corpus/`. The `path.relative()` approach prevents sibling-prefix
attacks:

```typescript
function assertSafePath(corpusDir: string, ...segments: string[]): string {
  const resolved = path.resolve(corpusDir, ...segments);
  const rel = path.relative(path.resolve(corpusDir), resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Path traversal detected");
  }
  return resolved;
}
```

This applies to:
- Book directory names (from slug)
- Chapter filenames (from slug)
- Zip archive extraction paths (Sprint 2)

### 8.3 Zip Safety (Sprint 2)

- Maximum uncompressed size: 50 MB
- Maximum file count: 500
- No symbolic links
- No absolute paths
- No `..` path components
- Zip bomb detection: ratio of compressed-to-uncompressed size must be < 100:1
- Filenames must be valid UTF-8
- No nested directories under `chapters/`

---

## 9. Testing Strategy

### 9.1 Unit Tests

| Area | Tests | Sprint | Description |
|------|-------|--------|-------------|
| `discoverBooks()` | 8 | 0 | Valid manifest, missing manifest, invalid JSON, missing fields, missing domain, invalid domain values, slug≠dirname, empty corpus |
| Sort & validation | 1 | 0 | sortOrder sort |
| Chapter discovery | 1 | 0 | Chapters resolved from `_corpus/{slug}/chapters/` path |
| Cache clearing | 3 | 0 | Discovery re-scan after clear, CachedBookRepo cache (x2) |
| `librarian_list` | 2 | 1 | Lists books, handles empty corpus |
| `librarian_get_book` | 2 | 1 | Returns details, throws for missing |
| `librarian_add_book` (manual) | 7 | 1 | Creates book with/without chapters, rejects duplicate slug, validates fields, sortOrder, invalid domain, empty domain |
| `librarian_add_chapter` | 4 | 1 | Creates chapter, overwrites existing, rejects missing book, validates content |
| `librarian_remove_book` | 2 | 1 | Removes book + embeddings, rejects missing |
| `librarian_remove_chapter` | 2 | 1 | Removes chapter + embeddings, rejects missing |
| Path traversal & slug validation | 5 | 1 | `../`, dots, absolute paths, chapter traversal, single-char slug |
| Cache invariant | 2 | 1 | Cache cleared after add, cache cleared after remove |
| `librarian_add_book` (zip) | 4 | 2 | Valid zip, missing book.json, path traversal, oversize |
| Zip safety | 4 | 2 | Bomb detection, symlinks, UTF-8 filenames, nested dirs |
| Zip atomicity | 2 | 2 | Rollback on failure, temp extraction |
| Zip edge cases | 2 | 2 | Duplicate chapters, overwrite rejection |

**Sprint 0:** 13 tests | **Sprint 1:** ~26 tests | **Sprint 2:** ~12 tests
**Total:** ~358 tests (307 existing + 51 new)

### 9.2 Integration Tests

| Area | Tests | Sprint | Description |
|------|-------|--------|-------------|
| Auto-discovery → build pipeline | 2 | 0 | Build script discovers and embeds corpus books |
| Add book → rebuild → search | 1 | 1 | New book appears in search results after rebuild |
| Remove book → orphan cleanup | 1 | 1 | Removed book's embeddings are cleaned up |

**~4 integration tests.**

---

## 10. Sprint Plan

### Sprint 0 — Corpus Restructure & Auto-Discovery

**Goal:** Move book content to `docs/_corpus/`, add `book.json` manifests
(with `sortOrder`), replace hardcoded `BOOKS` array with filesystem
auto-discovery. Zero functional change — all existing tests pass, build
pipeline works, search works.

| Task | Description | Req |
|------|-------------|-----|
| 0.1 | Create `docs/_corpus/` and move all 10 book directories (rename to slug) | LIBRARIAN-090 |
| 0.2 | Create `book.json` for each book (with `sortOrder`, `domain`, `tags`) | LIBRARIAN-020 |
| 0.3 | Rewrite `FileSystemBookRepository` to use `discoverBooks()` with slug=dir validation | LIBRARIAN-010, 090 |
| 0.4 | Add `clearCache()` to `CachedBookRepository` | LIBRARIAN-050 |
| 0.5 | Update tests — verify auto-discovery, slug mismatch, sortOrder, cache clearing | |
| 0.6 | Run full test suite + build pipeline — zero regressions | |

**Deliverable:** 307 existing tests still pass + 13 new (320 total), build works against `_corpus/`.

### Sprint 1 — MCP Librarian Tools (Core)

**Goal:** Add 6 librarian tools to the MCP embedding server (manual mode
only — no zip). Admin can list, add, and remove books/chapters through the
LLM tool interface.

| Task | Description | Req |
|------|-------------|-----|
| 1.1 | Create `mcp/librarian-tool.ts` with extracted tool logic | |
| 1.2 | Register librarian tools in `mcp/embedding-server.ts` | LIBRARIAN-030 |
| 1.3 | Implement `librarian_list` and `librarian_get_book` | |
| 1.4 | Implement `librarian_add_book` (manual JSON mode) | LIBRARIAN-050, 070, 080, 090 |
| 1.5 | Implement `librarian_add_chapter` | LIBRARIAN-050, 070 |
| 1.6 | Implement `librarian_remove_book` and `librarian_remove_chapter` | LIBRARIAN-050, 060, 070 |
| 1.7 | Add path traversal prevention and slug validation | LIBRARIAN-070, 080 |
| 1.8 | Unit tests for all 6 tools (~26 tests) | |
| 1.9 | Full suite green, build clean | |

**Deliverable:** ~346 tests passing (320 + 26 new).

### Sprint 2 — Zip Import

**Goal:** Add zip archive import mode to `librarian_add_book`. Validates,
extracts atomically, and rolls back on failure.

| Task | Description | Req |
|------|-------------|-----|
| 2.1 | Install `adm-zip` dependency | |
| 2.2 | Implement `addBookFromZip()` with temp extraction + atomic move | LIBRARIAN-040 |
| 2.3 | Add zip validation (size, paths, symlinks, bomb detection) | LIBRARIAN-040, 070 |
| 2.4 | Add operational constraints (UTF-8, no nested dirs, no overwrites, rollback) | LIBRARIAN-040 |
| 2.5 | Register `zip_base64` parameter on `librarian_add_book` tool schema | |
| 2.6 | Unit tests for zip mode (~12 tests) | |
| 2.7 | Full suite green, build clean | |

**Deliverable:** ~358 tests passing (346 + 12 new).

---

## 11. Future Considerations

### 11.1 Book Generation Pipeline

A future system will generate complete books by combining LLM-generated content,
Wikipedia research, and reference book material. This pipeline will produce a
zip archive matching the format in §5.3. The `librarian_add_book` zip mode
(Sprint 2) is designed to be the ingestion endpoint for this pipeline.

### 11.2 Versioning

The current design overwrites content in place. A future enhancement could add
`version` to `book.json` and maintain a version history, enabling rollback. Not
in scope for this spec.

### 11.3 Web Admin UI

The librarian tools are exposed via MCP, which means they're accessible through
the admin chat interface (LLM calls the tools). A dedicated admin web UI for
corpus browsing (drag-and-drop zip upload, visual book listing) is a future
enhancement that would call the same underlying tool functions.

### 11.4 Corpus Catalog Abstraction `[LIBRARIAN-100]`

The current design has librarian tools reading `book.json` directly from disk
for `domain`/`tags`, while the search pipeline uses `BookRepository`. When
domain-based search filtering is needed, these paths should be unified —
either by enriching `BookMeta` or by introducing a `CorpusCatalog` abstraction
that both systems use.
