# Sprint 1 — MCP Librarian Tools (Core)

> **Goal:** Add 6 librarian tools to the MCP embedding server (manual mode
> only — no zip). Admins can list, inspect, add, and remove books/chapters
> through the LLM chat interface or any MCP client.
> **Spec ref:** §5 (tool surface), §7 (extracted tool logic), §8 (security)
> **Prerequisite:** Sprint 0 complete (auto-discovery working, 320 tests passing)
>
> **Scope note:** Zip import mode is deferred to Sprint 2. This sprint
> implements `librarian_add_book` with manual JSON args only.

---

## Available Assets (from Sprint 0)

| Asset | Purpose | Sprint 1 Use |
|-------|---------|-------------|
| `docs/_corpus/` | Corpus root — auto-discovered by `FileSystemBookRepository` | All tools read/write here |
| `book.json` convention | Manifest per book (dir = slug, with `sortOrder`) | `librarian_add_book` creates these, `librarian_list` reads them |
| `FileSystemBookRepository.clearDiscoveryCache()` | Busts book discovery cache | Called after every mutation |
| `CachedBookRepository.clearCache()` | Busts all 5 repository caches | Called after every mutation |
| `VALID_DOMAINS` set in `FileSystemBookRepository.ts` | Controlled vocabulary: `teaching`, `sales`, `customer-service`, `reference`, `internal` | Reuse for `librarian_add_book` domain validation |
| `VectorStore.delete(sourceId)` | Removes embeddings for a source | `librarian_remove_book`, `librarian_remove_chapter` |
| `VectorStore.getBySourceId(sourceId)` | Checks if embeddings exist | `librarian_list`, `librarian_get_book` check indexing status |
| MCP embedding server (`mcp/embedding-server.ts`) | Existing 6-tool server | Librarian tools registered alongside |
| `mcp/embedding-tool.ts` pattern | Extracted testable tool functions | Librarian tools follow same pattern |
| Admin RBAC | `roles: ["ADMIN"]` on tool descriptors | Librarian tools are admin-only `[LIBRARIAN-030]` |

---

## Task 1.1 — Create `mcp/librarian-tool.ts`

**What:** Extracted tool logic module following the established pattern. Each
function validates input, performs filesystem + vector store operations, and
returns a plain result object. The MCP server is a thin transport wrapper.

| Item | Detail |
|------|--------|
| **Create** | `mcp/librarian-tool.ts` |
| **Pattern** | Matches `mcp/embedding-tool.ts` — dependency injection via interface |

### `LibrarianToolDeps` interface

```typescript
import type { VectorStore } from "@/core/search/ports/VectorStore";

export interface LibrarianToolDeps {
  corpusDir: string;           // absolute path to docs/_corpus/
  vectorStore: VectorStore;    // for embedding cleanup on remove
  clearCaches: () => void;     // callback to clear repo + discovery caches
}
```

### Tool functions

```typescript
// --- librarian_list ---
export async function librarianList(deps: LibrarianToolDeps): Promise<{
  books: Array<{
    slug: string; title: string; number: string;
    domain: string[]; tags: string[];
    chapterCount: number; indexed: boolean;
  }>;
  totalBooks: number;
  totalChapters: number;
}>

// --- librarian_get_book ---
export async function librarianGetBook(
  deps: LibrarianToolDeps,
  args: { slug: string },
): Promise<{
  slug: string; title: string; number: string;
  domain: string[]; tags: string[];
  directory: string;
  chapters: Array<{
    slug: string; title: string;
    indexed: boolean; contentLength: number;
  }>;
}>

// --- librarian_add_book (manual only — zip is Sprint 2) ---
export async function librarianAddBook(
  deps: LibrarianToolDeps,
  args: {
    slug: string; title: string; number: string;
    sortOrder: number;
    domain: string[]; tags?: string[];
    chapters?: Array<{ slug: string; content: string }>;
  },
): Promise<{
  slug: string; title: string;
  directory: string; chaptersWritten: number;
  indexed: boolean; hint: string;
}>

// --- librarian_add_chapter ---
export async function librarianAddChapter(
  deps: LibrarianToolDeps,
  args: { book_slug: string; chapter_slug: string; content: string },
): Promise<{ book_slug: string; chapter_slug: string; written: boolean }>

// --- librarian_remove_book ---
export async function librarianRemoveBook(
  deps: LibrarianToolDeps,
  args: { slug: string },
): Promise<{
  slug: string; chaptersRemoved: number; embeddingsDeleted: number;
}>

// --- librarian_remove_chapter ---
export async function librarianRemoveChapter(
  deps: LibrarianToolDeps,
  args: { book_slug: string; chapter_slug: string },
): Promise<{ book_slug: string; chapter_slug: string; embeddingsDeleted: number }>
```

### Security helpers (internal)

```typescript
// LIBRARIAN-070: path.relative() approach prevents sibling-prefix attacks
function assertSafePath(corpusDir: string, ...segments: string[]): string {
  const resolved = path.resolve(corpusDir, ...segments);
  const rel = path.relative(path.resolve(corpusDir), resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Path traversal detected — path escapes corpus directory.");
  }
  return resolved;
}

// LIBRARIAN-080: validates slug format — lowercase kebab-case
function assertValidSlug(slug: string): void {
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || slug.length > 100) {
    throw new Error(`Invalid slug: "${slug}". Must be lowercase alphanumeric with hyphens, max 100 chars.`);
  }
}
```

### Verify

```bash
npx tsc --noEmit
```

---

## Task 1.2 — Register librarian tools in `mcp/embedding-server.ts`

**What:** Add the 6 librarian tools to the existing MCP embedding server's
`ListToolsRequestSchema` and `CallToolRequestSchema` handlers.

### Changes to `mcp/embedding-server.ts`

1. **Import** librarian tool functions from `./librarian-tool`
2. **Build `LibrarianToolDeps`** in `buildDeps()` — derive `corpusDir` from
   `process.cwd() + "/docs/_corpus"`, reuse `vectorStore`, add `clearCaches`
   callback.

   **Wiring note:** `getBookRepository()` returns the `BookRepository`
   interface, which doesn't expose `clearCache()` or `clearDiscoveryCache()`.
   `buildDeps()` must construct the repo graph directly (not via
   `RepositoryFactory`) to capture concrete `CachedBookRepository` and
   `FileSystemBookRepository` references. The `clearCaches` callback wraps
   both `cached.clearCache()` and `fsRepo.clearDiscoveryCache()`.

   ```typescript
   const fsRepo = new FileSystemBookRepository();
   const cached = new CachedBookRepository(fsRepo);
   const librarianDeps: LibrarianToolDeps = {
     corpusDir: path.resolve(process.cwd(), "docs/_corpus"),
     vectorStore,
     clearCaches: () => {
       cached.clearCache();
       fsRepo.clearDiscoveryCache();
     },
   };
   ```
3. **Add 6 tools** to the `ListToolsRequestSchema` response
4. **Add 6 cases** to the `CallToolRequestSchema` switch

### Tool schemas (ListToolsRequestSchema additions)

```typescript
{
  name: "librarian_list",
  description: "List all books in the corpus with chapter counts and indexing status.",
  inputSchema: {
    type: "object" as const,
    properties: {},
    additionalProperties: false,
  },
},
{
  name: "librarian_get_book",
  description: "Get details of a corpus book including its chapters.",
  inputSchema: {
    type: "object" as const,
    properties: {
      slug: { type: "string", description: "Book slug." },
    },
    required: ["slug"],
    additionalProperties: false,
  },
},
{
  name: "librarian_add_book",
  description: "Add a new book to the corpus. Provide slug, title, number, sortOrder, domain, and optionally chapters.",
  inputSchema: {
    type: "object" as const,
    properties: {
      slug: { type: "string", description: "Book slug (lowercase kebab-case). Becomes the directory name." },
      title: { type: "string", description: "Book title." },
      number: { type: "string", description: "Display number (e.g. 'XI'). Decorative only." },
      sortOrder: { type: "number", description: "Numeric sort order." },
      domain: {
        type: "array",
        description: "Content domains (e.g. ['teaching', 'reference']).",
        items: { type: "string" },
      },
      tags: {
        type: "array",
        description: "Optional freeform tags (lowercase kebab-case).",
        items: { type: "string" },
      },
      chapters: {
        type: "array",
        description: "Array of {slug, content} chapter objects.",
        items: {
          type: "object",
          properties: {
            slug: { type: "string" },
            content: { type: "string" },
          },
          required: ["slug", "content"],
        },
      },
    },
    required: ["slug", "title", "number", "sortOrder", "domain"],
    additionalProperties: false,
  },
},
{
  name: "librarian_add_chapter",
  description: "Add a chapter to an existing book in the corpus. Overwrites if the chapter already exists.",
  inputSchema: {
    type: "object" as const,
    properties: {
      book_slug: { type: "string", description: "Slug of the target book." },
      chapter_slug: { type: "string", description: "Chapter slug (becomes filename)." },
      content: { type: "string", description: "Chapter markdown content." },
    },
    required: ["book_slug", "chapter_slug", "content"],
    additionalProperties: false,
  },
},
{
  name: "librarian_remove_book",
  description: "Remove a book and all its embeddings from the corpus.",
  inputSchema: {
    type: "object" as const,
    properties: {
      slug: { type: "string", description: "Book slug to remove." },
    },
    required: ["slug"],
    additionalProperties: false,
  },
},
{
  name: "librarian_remove_chapter",
  description: "Remove a single chapter and its embeddings from a book.",
  inputSchema: {
    type: "object" as const,
    properties: {
      book_slug: { type: "string", description: "Book slug." },
      chapter_slug: { type: "string", description: "Chapter slug to remove." },
    },
    required: ["book_slug", "chapter_slug"],
    additionalProperties: false,
  },
},
```

### Verify

```bash
npx tsc --noEmit
```

---

## Task 1.3 — Implement `librarian_list` and `librarian_get_book`

**What:** Read-only tools that scan `_corpus/` and return structured data.

### `librarianList` implementation

1. Read `_corpus/` directory entries
2. For each directory with a valid `book.json`:
   - Count `chapters/*.md` files
   - Check if any embeddings exist for `{slug}/*` chapters
3. Return sorted inventory

### `librarianGetBook` implementation

1. Find the book directory by matching slug (dir = slug per `LIBRARIAN-090`)
2. Read all `chapters/*.md` filenames
3. For each chapter, extract title from first `# ` heading (fall back to
   filename if absent)
4. Check embedding status per chapter via `vectorStore.getBySourceId()`
5. Return book details with chapter listing

### Implementation notes

To check indexing status, use `vectorStore.getBySourceId("{slug}/{chapter}")` —
if it returns any records, the chapter is indexed. This avoids needing to
track indexing state separately.

### Verify

```bash
npx vitest run tests/corpus/librarian-tools.test.ts   # targeted tests
```

---

## Task 1.4 — Implement `librarian_add_book` (manual JSON mode)

**What:** Create a new book directory with `book.json` and chapters.
Zip mode is deferred to Sprint 2.

### Implementation

```typescript
export async function librarianAddBook(
  deps: LibrarianToolDeps,
  args: {
    slug: string; title: string; number: string;
    sortOrder: number;
    domain: string[]; tags?: string[];
    chapters?: Array<{ slug: string; content: string }>;
  },
) {
  // 1. Validate required fields
  if (!args.slug || !args.title || !args.number) {
    throw new Error("librarian_add_book requires slug, title, number, sortOrder, and domain.");
  }
  if (typeof args.sortOrder !== "number") {
    throw new Error("sortOrder must be a number.");
  }
  assertValidSlug(args.slug);

  // 1b. Validate domain against controlled vocabulary
  //     Same values as VALID_DOMAINS in FileSystemBookRepository:
  //     teaching, sales, customer-service, reference, internal
  if (!Array.isArray(args.domain) || args.domain.length === 0) {
    throw new Error("domain must be a non-empty array.");
  }
  const VALID_DOMAINS = new Set(["teaching", "sales", "customer-service", "reference", "internal"]);
  for (const d of args.domain) {
    if (!VALID_DOMAINS.has(d)) {
      throw new Error(`Invalid domain value: "${d}". Valid: ${[...VALID_DOMAINS].join(", ")}`);
    }
  }

  // 2. LIBRARIAN-090: directory = slug
  const bookDir = assertSafePath(deps.corpusDir, args.slug);
  if (await pathExists(bookDir)) {
    throw new Error(`Book already exists: ${args.slug}`);
  }

  // 3. Create directory structure
  const chaptersDir = path.join(bookDir, "chapters");
  await fs.mkdir(chaptersDir, { recursive: true });

  // 4. Write book.json
  const manifest = {
    slug: args.slug,
    title: args.title,
    number: args.number,
    sortOrder: args.sortOrder,
    domain: args.domain,
    ...(args.tags ? { tags: args.tags } : {}),
  };
  await fs.writeFile(
    path.join(bookDir, "book.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );

  // 5. Write chapters (if provided)
  let chaptersWritten = 0;
  if (args.chapters) {
    for (const ch of args.chapters) {
      assertValidSlug(ch.slug);
      const chapterPath = assertSafePath(chaptersDir, `${ch.slug}.md`);
      await fs.writeFile(chapterPath, ch.content);
      chaptersWritten++;
    }
  }

  // 6. LIBRARIAN-050: clear caches after successful mutation
  deps.clearCaches();

  return {
    slug: args.slug,
    title: args.title,
    directory: `_corpus/${args.slug}`,
    chaptersWritten,
    indexed: false,
    hint: "Run rebuild_index to make this book searchable.",
  };
}
```

### Verify

```bash
npx vitest run tests/corpus/librarian-tools.test.ts
```

---

## Task 1.5 — Implement `librarian_add_chapter`

**What:** Add a single chapter to an existing book.

### Implementation

1. Find the book directory: `_corpus/{book_slug}/` (dir = slug)
2. Validate `chapter_slug` format (`LIBRARIAN-080`)
3. Write `_corpus/{book_slug}/chapters/{chapter_slug}.md`
4. Clear caches (`LIBRARIAN-050`)
5. Return confirmation

### Edge cases

- Book doesn't exist → throw error
- Chapter already exists → **overwrite** (idempotent — enables re-generation,
  per §3.5 acceptance rules)
- Empty content → throw error

### Verify

```bash
npx vitest run tests/corpus/librarian-tools.test.ts
```

---

## Task 1.6 — Implement `librarian_remove_book` and `librarian_remove_chapter`

**What:** Delete book/chapter content and clean up associated embeddings.

### `librarianRemoveBook` implementation

1. Find book directory: `_corpus/{slug}/` (dir = slug)
2. List all chapters to get source IDs (`{slug}/{chapterSlug}`)
3. For each chapter, call `vectorStore.delete(sourceId)` (`LIBRARIAN-060`)
4. Remove the entire book directory recursively (`fs.rm(dir, { recursive: true })`)
5. Clear caches (`LIBRARIAN-050`)
6. Return counts

### `librarianRemoveChapter` implementation

1. Find book directory and chapter file
2. Call `vectorStore.delete("{bookSlug}/{chapterSlug}")` (`LIBRARIAN-060`)
3. Remove the `.md` file
4. Clear caches (`LIBRARIAN-050`)
5. Return confirmation

### Safety

- `assertSafePath()` validates all paths before deletion (`LIBRARIAN-070`)
- Only deletes within `_corpus/` — never escapes

### Verify

```bash
npx vitest run tests/corpus/librarian-tools.test.ts
```

---

## Task 1.7 — Path traversal prevention and slug validation tests

**What:** Dedicated security tests for filesystem operations.

| Test | Description |
|------|-------------|
| rejects slug with path traversal | `slug: "../etc"` → error |
| rejects slug with dots | `slug: "my.book"` → error |
| rejects absolute path in slug | `slug: "/tmp/evil"` → error |
| rejects chapter slug with traversal | `chapter_slug: "../../passwd"` → error |
| rejects single-char slug | `slug: "a"` → error (doesn't match kebab pattern) |

**~5 security tests.** `[LIBRARIAN-070, LIBRARIAN-080]`

### Verify

```bash
npx vitest run tests/corpus/librarian-security.test.ts
```

---

## Task 1.8 — Full unit test suite for librarian tools

**What:** Complete test coverage for all 6 tool functions.

### Test file: `tests/corpus/librarian-tools.test.ts`

Uses a temp directory created per test (via `beforeEach`/`afterEach`) with
an `InMemoryVectorStore` — no real DB.

| Test | Tool | Description |
|------|------|-------------|
| lists empty corpus | `librarian_list` | Empty `_corpus/` → `{ books: [], totalBooks: 0 }` |
| lists books with chapter counts | `librarian_list` | 2 books → correct counts and indexing status |
| gets book details with chapters | `librarian_get_book` | Returns chapters with titles and contentLength |
| throws for missing book | `librarian_get_book` | Unknown slug → error |
| adds book with chapters (manual) | `librarian_add_book` | Creates dir (= slug), book.json (with sortOrder), chapter files |
| adds book without chapters (manual) | `librarian_add_book` | Creates dir + book.json only |
| rejects duplicate slug | `librarian_add_book` | Existing slug → error |
| rejects missing fields | `librarian_add_book` | No title → error |
| validates sortOrder is number | `librarian_add_book` | String sortOrder → error |
| rejects invalid domain values | `librarian_add_book` | `domain: ["bogus"]` → error |
| rejects empty domain array | `librarian_add_book` | `domain: []` → error |
| adds chapter to existing book | `librarian_add_chapter` | File written, cache cleared |
| overwrites existing chapter | `librarian_add_chapter` | Existing chapter → overwritten (idempotent) |
| rejects chapter for missing book | `librarian_add_chapter` | Unknown book → error |
| rejects empty content | `librarian_add_chapter` | Empty string → error |
| removes book and embeddings | `librarian_remove_book` | Dir deleted, embeddings deleted, cache cleared |
| rejects removing missing book | `librarian_remove_book` | Unknown slug → error |
| removes chapter and embeddings | `librarian_remove_chapter` | File deleted, embeddings deleted |
| rejects removing missing chapter | `librarian_remove_chapter` | Unknown chapter → error |
| clears caches after add | cache | `clearCaches` called after `librarian_add_book` |
| clears caches after remove | cache | `clearCaches` called after `librarian_remove_book` |

**~21 functional tests + ~5 security tests from Task 1.7 = ~26 total.**

### Verify

```bash
npx vitest run tests/corpus/
npm test                        # full suite: 320 + ~26 = ~346 tests
npm run build                   # clean
```

---

## Task 1.9 — Full verification

**What:** Run the complete validation suite.

```bash
npx tsc --noEmit              # type-check
npm run lint                  # lint clean
npm test                      # all ~346 tests pass
npm run build                 # build discovers corpus, embeds, BM25 indexes
```

### Expected test counts

| Suite | Tests |
|-------|-------|
| Existing (Sprints 0–5 vector search) | 307 |
| Sprint 0 (discovery + cache + domain validation) | 13 |
| Sprint 1 (librarian tools + security) | ~26 |
| **Total** | **~346** |

---

## Sprint 1 — Completion Checklist

- [x] `mcp/librarian-tool.ts` — 6 tool functions with `LibrarianToolDeps`
- [x] `mcp/embedding-server.ts` — 12 total tools (6 embedding + 6 librarian)
- [x] `librarian_list` — returns book inventory with indexing status
- [x] `librarian_get_book` — returns book details with chapter listing
- [x] `librarian_add_book` (manual) — creates `_corpus/{slug}/` + book.json (with sortOrder) + chapters
- [x] `librarian_add_chapter` — adds/overwrites chapter to existing book
- [x] `librarian_remove_book` — removes book dir + cleans embeddings
- [x] `librarian_remove_chapter` — removes chapter file + cleans embeddings
- [x] Path traversal prevention via `path.relative()` on all filesystem ops
- [x] Slug validation: lowercase kebab-case, max 100 chars
- [x] Cache clearing after every successful mutation (`LIBRARIAN-050`)
- [x] ~26 unit tests for librarian tools (21 functional + 5 security)
- [x] All ~346 tests pass
- [x] `npm run build` clean

---

## QA Deviations from Sprint 0

Changes discovered during Sprint 0 implementation and QA that affect this sprint:

| Finding | Impact on Sprint 1 |
|---------|--------------------|
| Sprint 0 produced 13 tests (not 12) — domain validation test added during QA | Test baseline is 320, not 319 |
| `VALID_DOMAINS` controlled vocabulary enforced at discovery time in `FileSystemBookRepository` | `librarian_add_book` must validate domain values at write time too — reject before writing `book.json` |
| `getBookRepository()` returns `BookRepository` interface — no access to `clearCache()` or `clearDiscoveryCache()` | `buildDeps()` must construct repo graph directly (not via `RepositoryFactory`) to capture concrete types |
| `CommandPalette.tsx` routes fixed (pre-existing bug) | No Sprint 1 impact — already committed |
| README.md paths updated to `docs/_corpus/{slug}/` | No Sprint 1 impact — already committed |
| Stray heredoc artifact `product-man{` cleaned up | No Sprint 1 impact — already committed |
