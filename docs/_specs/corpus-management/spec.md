# Corpus Management — System Spec

> **Status:** Draft v2.0
> **Date:** 2026-03-12
> **Scope:** Restructure book content into a `docs/_corpus/` directory with
>   JSON-manifest auto-discovery (including `domain`/`tags` metadata for future
>   search scoping), then add "librarian" MCP tools for listing, adding, and
>   removing corpus content — including zip-file upload for bulk import.
> **Dependencies:** Vector Search Sprints 0–5 (complete), RBAC (complete)
> **Affects:** `FileSystemBookRepository`, `CachedBookRepository`,
>   `build-search-index.ts`, `mcp/embedding-server.ts`, admin tool surface
>
> **Metaphor:** The system uses a **Librarian / Publisher** boundary.
> The librarian (this spec) receives, catalogs, shelves, indexes, and retrieves
> finished content. The publisher (future) generates and produces content.
> Content flows one way: Publisher → Librarian → Search. The librarian never
> authors or edits — books are on the shelf or they're not.

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
2. **Single embeddable root** — `docs/_corpus/` is the only directory the
   embedding pipeline reads. Everything outside it is project documentation.
3. **Admin-only operations** — corpus mutation tools require `ADMIN` role,
   enforced by existing RBAC middleware.
4. **Incremental by default** — existing SHA-256 change detection continues to
   work. Only changed content is re-embedded on rebuild.
5. **Zip-ready** — the `librarian_add_book` tool accepts either individual
   arguments (slug, title, number, chapter content) or a zip archive containing
   `book.json` + `chapters/*.md`. The zip path prepares for the future
   book-generation pipeline without implementing it now.
6. **No editing** — tools create and remove content. In-place editing of
   existing chapters is out of scope.

---

## 3. Corpus Directory Convention

### 3.1 Structure

```
docs/_corpus/
├── software-engineering-book/
│   ├── book.json
│   ├── chapters/
│   │   ├── ch00-the-people-behind-the-principles.md
│   │   ├── ch01-why-this-moment-matters.md
│   │   └── ...
│   ├── editorial/        ← ignored by embedding pipeline
│   └── prompts/          ← ignored by embedding pipeline
├── accessibility-book/
│   ├── book.json
│   └── chapters/
│       └── ...
└── ...any number of books...
```

### 3.2 `book.json` Schema

```json
{
  "slug": "software-engineering",
  "title": "Software Engineering",
  "number": "I",
  "domain": ["teaching", "reference"],
  "tags": ["software-engineering", "best-practices", "design-patterns"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | `string` | Yes | URL-safe identifier. Must be unique across corpus. Used as the `bookSlug` in source IDs (`{slug}/{chapterSlug}`). |
| `title` | `string` | Yes | Human-readable book title. Used in search results and metadata. |
| `number` | `string` | Yes | Display ordering (Roman numeral or digit). Used in `Book.number`. |
| `domain` | `string[]` | Yes | Controlled vocabulary for search scoping. Valid values: `teaching`, `sales`, `customer-service`, `reference`, `internal`. A book may belong to multiple domains. |
| `tags` | `string[]` | No | Freeform labels for finer-grained filtering. Used for metadata enrichment; not enforced by schema. |

> **Design note (Option A):** Domain and tags are captured in manifests and
> stored alongside embeddings from Sprint 0. Search-time filtering by domain
> is deferred to a future sprint — the metadata is present so it never needs
> to be retrofitted.

### 3.3 Chapter Convention

- Lives in `{book-dir}/chapters/*.md`
- Filename becomes `chapterSlug` (minus `.md` extension)
- First `# Heading` in the file becomes the chapter title
- Files are sorted alphabetically — `ch00`, `ch01`, etc.
- Only `.md` files in `chapters/` are read. All other files and directories
  inside the book folder are ignored.

### 3.4 Discovery Algorithm

```
for each subdirectory D of docs/_corpus/:
  if D/book.json exists and is valid JSON with slug, title, number:
    register book from D/book.json
    scan D/chapters/*.md for chapters
  else:
    skip D (log warning)
```

No hardcoded book list. No configuration file. Drop a folder, get a book.

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
  domain: string[];
  tags?: string[];
}

async discoverBooks(): Promise<BookMeta[]> {
  const corpusDir = path.join(this.docsDir, "_corpus");
  const entries = await fs.readdir(corpusDir, { withFileTypes: true });
  const books: BookMeta[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(corpusDir, entry.name, "book.json");
    try {
      const raw = await fs.readFile(manifestPath, "utf-8");
      const manifest: BookManifest = JSON.parse(raw);
      // Validate required fields
      if (!manifest.slug || !manifest.title || !manifest.number) continue;
      if (!Array.isArray(manifest.domain) || manifest.domain.length === 0) continue;
      books.push({
        slug: manifest.slug,
        title: manifest.title,
        shortTitle: manifest.title,  // derive from title
        number: manifest.number,
        chaptersDir: `_corpus/${entry.name}/chapters`,
      });
    } catch {
      // No book.json or invalid — skip
    }
  }
  return books.sort((a, b) => a.number.localeCompare(b.number));
}
```

The `chaptersDir` is now always `_corpus/{dirname}/chapters` — derived from
the directory name, not hardcoded. The rest of `FileSystemBookRepository`
(chapter reading, parsing, practitioner extraction, checklist analysis)
remains unchanged.

### 4.2 `CachedBookRepository`

**Change:** Add a `clearCache()` method that resets all maps and cached arrays.
Called by the corpus management tools after adding or removing content, so the
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

No change to the factory itself, but the singleton `CachedBookRepository`
instance must be accessible to the corpus management tools so they can call
`clearCache()` after mutations.

---

## 5. MCP Corpus Management Tools

### 5.1 Tool Surface

Six tools added to the existing embedding MCP server (`mcp/embedding-server.ts`).
All require `ADMIN` role (enforced at the MCP server level since MCP servers
run as admin processes).

| Tool | Description | Input | Sprint |
|------|-------------|-------|--------|
| `librarian_list` | List all books in the corpus with chapter counts | `{}` | 1 |
| `librarian_get_book` | Get details of a single book (chapters, sizes) | `{slug}` | 1 |
| `librarian_add_book` | Create a new book from JSON args or zip archive | `{slug, title, number, domain, tags?, chapters?}` OR `{zip_base64}` | 1 |
| `librarian_add_chapter` | Add a chapter to an existing book | `{book_slug, chapter_slug, content}` | 1 |
| `librarian_remove_book` | Remove a book and clean up its embeddings | `{slug}` | 1 |
| `librarian_remove_chapter` | Remove a single chapter and its embeddings | `{book_slug, chapter_slug}` | 1 |

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

**Behavior:** Scans `_corpus/`, reads each `book.json`, counts `chapters/*.md`
files, checks if embeddings exist in the vector store for this book's chapters.

#### `librarian_get_book`

**Input:** `{slug: string}`
**Output:** Book details with chapter listing

```json
{
  "slug": "software-engineering",
  "title": "Software Engineering",
  "number": "I",
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

#### `librarian_add_book`

**Input (manual):**
```json
{
  "slug": "ai-ethics",
  "title": "AI Ethics",
  "number": "XI",
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

**Input (zip):**
```json
{
  "zip_base64": "<base64-encoded zip>"
}
```

The zip file must contain:
- `book.json` at the root of the archive (with `slug`, `title`, `number`)
- `chapters/*.md` — one or more markdown files

**Behavior:**
1. Validate slug uniqueness (no existing book with same slug)
2. Create `_corpus/{slug}-book/` directory
3. Write `book.json`
4. Create `chapters/` directory
5. Write each chapter `.md` file
6. Clear repository cache
7. Optionally trigger embedding (caller can follow up with `rebuild_index`)

**Output:**
```json
{
  "slug": "ai-ethics",
  "title": "AI Ethics",
  "directory": "_corpus/ai-ethics-book",
  "chaptersWritten": 10
}
```

#### `librarian_add_chapter`

**Input:** `{book_slug: string, chapter_slug: string, content: string}`
**Behavior:**
1. Verify book exists in `_corpus/`
2. Write `_corpus/{book-dir}/chapters/{chapter_slug}.md`
3. Clear repository cache
4. Return confirmation

#### `librarian_remove_book`

**Input:** `{slug: string}`
**Behavior:**
1. Find book directory in `_corpus/`
2. Delete all embeddings for this book's chapters (via `vectorStore.delete()`)
3. Remove the entire book directory from the filesystem
4. Clear repository cache
5. Return confirmation with deleted chapter/embedding counts

#### `librarian_remove_chapter`

**Input:** `{book_slug: string, chapter_slug: string}`
**Behavior:**
1. Verify book and chapter exist
2. Delete embeddings for `{book_slug}/{chapter_slug}`
3. Remove the `.md` file
4. Clear repository cache
5. Return confirmation

### 5.3 Zip Archive Specification

The zip format is designed to match what the future book-generation pipeline
will produce. The archive structure:

```
ai-ethics-book.zip
├── book.json
└── chapters/
    ├── ch00-introduction.md
    ├── ch01-foundations.md
    └── ...
```

**Validation rules:**
- `book.json` must exist at the archive root
- `book.json` must contain valid `slug`, `title`, `number` fields
- `chapters/` directory must contain at least one `.md` file
- Slug must not conflict with an existing book
- Total uncompressed size must be under 50 MB (configurable)
- No path traversal (filenames must not contain `..` or start with `/`)

---

## 6. Build Pipeline Changes

### 6.1 `build-search-index.ts`

No logic changes. The script calls `bookRepo.getAllBooks()` and
`bookRepo.getAllChapters()`, which now discover books from `_corpus/`
automatically. The SHA-256 change detection, BM25 index rebuild, and quality
validation all work unchanged.

### 6.2 Orphan Cleanup

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
  clearRepoCache: () => void;     // callback to bust CachedBookRepository
}
```

Librarian tools do NOT depend on the full `EmbeddingToolDeps`. They only need
filesystem access, the vector store (for cleanup), and a cache-clear callback.

---

## 8. Security

### 8.1 RBAC

All corpus tools are registered with `roles: ["ADMIN"]`. The MCP embedding
server runs as a privileged process (admin-level), so RBAC is enforced at the
tool registration level, not at the transport level.

### 8.2 Path Traversal Prevention

All filesystem operations validate that resolved paths fall within
`docs/_corpus/`. Specifically:

```typescript
const resolved = path.resolve(corpusDir, userInput);
if (!resolved.startsWith(path.resolve(corpusDir))) {
  throw new Error("Path traversal detected");
}
```

This applies to:
- Book directory names (from slug or zip entries)
- Chapter filenames (from slug or zip entries)
- Zip archive extraction paths

### 8.3 Zip Safety

- Maximum uncompressed size: 50 MB
- Maximum file count: 500
- No symbolic links
- No absolute paths
- No `..` path components
- Zip bomb detection: ratio of compressed-to-uncompressed size must be < 100:1

---

## 9. Testing Strategy

### 9.1 Unit Tests

| Area | Tests | Description |
|------|-------|-------------|
| `discoverBooks()` | 4 | Valid manifest, missing manifest, invalid JSON, empty corpus |
| `librarian_list` | 2 | Lists books, handles empty corpus |
| `librarian_add_book` (manual) | 3 | Creates book, rejects duplicate slug, validates fields |
| `librarian_add_book` (zip) | 4 | Valid zip, missing book.json, path traversal rejection, oversize |
| `librarian_add_chapter` | 3 | Creates chapter, rejects missing book, validates content |
| `librarian_remove_book` | 3 | Removes book + embeddings, clears cache, rejects missing |
| `librarian_remove_chapter` | 3 | Removes chapter + embeddings, clears cache, rejects missing |
| Path traversal | 3 | `../`, absolute paths, encoded sequences |
| Cache invalidation | 2 | Cache cleared after add, cache cleared after remove |

**~27 unit tests** using temp directories and in-memory stores.

### 9.2 Integration Tests

| Area | Tests | Description |
|------|-------|-------------|
| Auto-discovery → build pipeline | 2 | Build script discovers and embeds corpus books |
| Add book → rebuild → search | 1 | New book appears in search results after rebuild |
| Remove book → orphan cleanup | 1 | Removed book's embeddings are cleaned up |

**~4 integration tests.**

---

## 10. Sprint Plan

### Sprint 0 — Corpus Restructure & Auto-Discovery

**Goal:** Move book content to `docs/_corpus/`, add `book.json` manifests,
replace hardcoded `BOOKS` array with filesystem auto-discovery. Zero functional
change — all existing tests pass, build pipeline works, search works.

| Task | Description |
|------|-------------|
| 0.1 | Create `docs/_corpus/` and move all 10 `*-book/` directories into it |
| 0.2 | Create `book.json` for each book |
| 0.3 | Rewrite `FileSystemBookRepository` to use `discoverBooks()` |
| 0.4 | Add `clearCache()` to `CachedBookRepository` |
| 0.5 | Update tests — verify auto-discovery, cache clearing |
| 0.6 | Run full test suite + build pipeline — zero regressions |

**Deliverable:** ~307 existing tests still pass, build works against `_corpus/`.

### Sprint 1 — MCP Corpus Tools

**Goal:** Add 6 corpus management tools to the MCP embedding server. Admin
can list, add, and remove books/chapters through the LLM tool interface.

| Task | Description |
|------|-------------|
| 1.1 | Create `mcp/librarian-tool.ts` with extracted tool logic |
| 1.2 | Register librarian tools in `mcp/embedding-server.ts` |
| 1.3 | Implement `librarian_list` and `librarian_get_book` |
| 1.4 | Implement `librarian_add_book` (manual JSON mode) |
| 1.5 | Implement `librarian_add_chapter` |
| 1.6 | Implement `librarian_remove_book` and `librarian_remove_chapter` |
| 1.7 | Implement `librarian_add_book` (zip mode) |
| 1.8 | Add path traversal and zip safety validation |
| 1.9 | Unit tests for all 6 tools (~27 tests) |
| 1.10 | Full suite green, build clean |

**Deliverable:** ~334 tests passing (307 + 27 new).

---

## 11. Future Considerations

### 11.1 Book Generation Pipeline

A future system will generate complete books by combining LLM-generated content,
Wikipedia research, and reference book material. This pipeline will produce a
zip archive matching the format in §5.3. The `librarian_add_book` zip mode is
designed to be the ingestion endpoint for this pipeline.

### 11.2 Versioning

The current design overwrites content in place. A future enhancement could add
`version` to `book.json` and maintain a version history, enabling rollback. Not
in scope for this spec.

### 11.3 Web Admin UI

The corpus tools are exposed via MCP, which means they're accessible through
the admin chat interface (LLM calls the tools). A dedicated admin web UI for
corpus management (drag-and-drop zip upload, visual book listing) is a future
enhancement that would call the same underlying tool functions.
