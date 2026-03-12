# Sprint 1 — MCP Librarian Tools

> **Goal:** Add 6 librarian tools to the MCP embedding server. Admins
> can list, inspect, add, and remove books/chapters through the LLM chat
> interface or any MCP client.
> **Spec ref:** §5 (tool surface), §7 (extracted tool logic), §8 (security)
> **Prerequisite:** Sprint 0 complete (auto-discovery working, ~317 tests passing)

---

## Available Assets (from Sprint 0)

| Asset | Purpose | Sprint 1 Use |
|-------|---------|-------------|
| `docs/_corpus/` | Corpus root — auto-discovered by `FileSystemBookRepository` | All tools read/write here |
| `book.json` convention | Manifest per book | `librarian_add_book` creates these, `librarian_list` reads them |
| `FileSystemBookRepository.clearDiscoveryCache()` | Busts book discovery cache | Called after every mutation |
| `CachedBookRepository.clearCache()` | Busts all repository caches | Called after every mutation |
| `VectorStore.delete(sourceId)` | Removes embeddings for a source | `librarian_remove_book`, `librarian_remove_chapter` |
| `VectorStore.count(sourceType?)` | Counts stored embeddings | `librarian_list` checks indexing status |
| MCP embedding server (`mcp/embedding-server.ts`) | Existing 6-tool server | Corpus tools registered alongside |
| `mcp/embedding-tool.ts` pattern | Extracted testable tool functions | Corpus tools follow same pattern |
| Admin RBAC | `roles: ["ADMIN"]` on tool descriptors | Librarian tools are admin-only |

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
  directory: string;
  chapters: Array<{
    slug: string; title: string;
    indexed: boolean; contentLength: number;
  }>;
}>

// --- librarian_add_book (manual + zip) ---
export async function librarianAddBook(
  deps: LibrarianToolDeps,
  args: {
    slug?: string; title?: string; number?: string;
    domain?: string[]; tags?: string[];
    chapters?: Array<{ slug: string; content: string }>;
    zip_base64?: string;
  },
): Promise<{
  slug: string; title: string;
  directory: string; chaptersWritten: number;
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
// Validates that a resolved path is inside corpusDir — prevents path traversal
function assertSafePath(corpusDir: string, ...segments: string[]): string {
  const resolved = path.resolve(corpusDir, ...segments);
  if (!resolved.startsWith(path.resolve(corpusDir) + path.sep) &&
      resolved !== path.resolve(corpusDir)) {
    throw new Error("Path traversal detected — path escapes corpus directory.");
  }
  return resolved;
}

// Validates slug format — alphanumeric, hyphens, no dots or slashes
function assertValidSlug(slug: string): void {
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || slug.length > 100) {
    throw new Error(`Invalid slug: "${slug}". Must be lowercase alphanumeric with hyphens.`);
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
   callback
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
  description: "Add a new book to the corpus. Provide slug/title/number/domain/chapters, or a base64-encoded zip archive containing book.json and chapters/.",
  inputSchema: {
    type: "object" as const,
    properties: {
      slug: { type: "string", description: "Book slug (lowercase, hyphens)." },
      title: { type: "string", description: "Book title." },
      number: { type: "string", description: "Display number (e.g. 'XI')." },
      domain: {
        type: "array",
        description: "Content domains (e.g. ['teaching', 'reference']).",
        items: { type: "string" },
      },
      tags: {
        type: "array",
        description: "Optional freeform tags.",
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
      zip_base64: { type: "string", description: "Base64-encoded zip archive containing book.json and chapters/." },
    },
    additionalProperties: false,
  },
},
{
  name: "librarian_add_chapter",
  description: "Add a chapter to an existing book in the corpus.",
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
   - Check `vectorStore.count(sourceType)` or check if any embeddings exist
     for `{slug}/*` pattern
3. Return sorted inventory

### `librarianGetBook` implementation

1. Find the book directory by matching `book.json` slug
2. Read all `chapters/*.md` filenames
3. For each chapter, extract title from first `# ` heading
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

### Implementation

```typescript
export async function librarianAddBook(deps, args) {
  // 1. Determine source: zip or manual
  if (args.zip_base64) return addBookFromZip(deps, args.zip_base64);

  // 2. Validate required fields
  if (!args.slug || !args.title || !args.number) {
    throw new Error("librarian_add_book requires slug, title, number, and domain.");
  }
  assertValidSlug(args.slug);

  // 3. Check slug uniqueness
  const bookDir = assertSafePath(deps.corpusDir, `${args.slug}-book`);
  if (await pathExists(bookDir)) {
    throw new Error(`Book directory already exists: ${args.slug}-book`);
  }

  // 4. Create directory structure
  const chaptersDir = path.join(bookDir, "chapters");
  await fs.mkdir(chaptersDir, { recursive: true });

  // 5. Write book.json
  const manifest = {
    slug: args.slug, title: args.title, number: args.number,
    domain: args.domain, ...(args.tags ? { tags: args.tags } : {}),
  };
  await fs.writeFile(
    path.join(bookDir, "book.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );

  // 6. Write chapters (if provided)
  let chaptersWritten = 0;
  if (args.chapters) {
    for (const ch of args.chapters) {
      assertValidSlug(ch.slug);
      const chapterPath = assertSafePath(chaptersDir, `${ch.slug}.md`);
      await fs.writeFile(chapterPath, ch.content);
      chaptersWritten++;
    }
  }

  // 7. Clear caches
  deps.clearCaches();

  return {
    slug: args.slug,
    title: args.title,
    directory: `_corpus/${args.slug}-book`,
    chaptersWritten,
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

1. Find the book directory by scanning `_corpus/` for a `book.json` with
   matching slug
2. Validate `chapter_slug` format
3. Write `_corpus/{book-dir}/chapters/{chapter_slug}.md`
4. Clear caches
5. Return confirmation

### Edge cases

- Book doesn't exist → throw error
- Chapter already exists → overwrite (idempotent — this enables re-generation)
- Empty content → throw error

### Verify

```bash
npx vitest run tests/corpus/librarian-tools.test.ts
```

---

## Task 1.6 — Implement `librarian_remove_book` and `librarian_remove_chapter`

**What:** Delete book/chapter content and clean up associated embeddings.

### `librarianRemoveBook` implementation

1. Find book directory by slug
2. List all chapters to get source IDs (`{slug}/{chapterSlug}`)
3. For each chapter, call `vectorStore.delete(sourceId)`
4. Remove the entire book directory recursively (`fs.rm(dir, { recursive: true })`)
5. Clear caches
6. Return counts

### `librarianRemoveChapter` implementation

1. Find book directory and chapter file
2. Call `vectorStore.delete("{bookSlug}/{chapterSlug}")`
3. Remove the `.md` file
4. Clear caches
5. Return confirmation

### Safety

- `assertSafePath()` validates all paths before deletion
- Only deletes within `_corpus/` — never escapes

### Verify

```bash
npx vitest run tests/corpus/librarian-tools.test.ts
```

---

## Task 1.7 — Implement `librarian_add_book` (zip mode)

**What:** Accept a base64-encoded zip archive containing `book.json` and
`chapters/*.md`, validate it, and extract to `_corpus/`.

### Implementation

```typescript
async function addBookFromZip(
  deps: LibrarianToolDeps,
  zipBase64: string,
): Promise<{ slug: string; title: string; directory: string; chaptersWritten: number }> {
  // 1. Decode base64 to Buffer
  const zipBuffer = Buffer.from(zipBase64, "base64");

  // 2. Size check (50 MB max uncompressed)
  // Use Node.js built-in zlib or a zip library

  // 3. Extract and validate structure
  //    - Must contain book.json at root
  //    - Must contain chapters/ directory with *.md files
  //    - No path traversal (no "..", no absolute paths)
  //    - No symlinks

  // 4. Parse book.json, validate fields
  // 5. Check slug uniqueness
  // 6. Write to _corpus/{slug}-book/
  // 7. Clear caches
  // 8. Return result
}
```

### Zip library

Use Node.js built-in `zlib` for decompression, or the lightweight `adm-zip`
package if zip file handling is needed. Since the project already has `tsx` and
no strict dependency policy against small utilities, `adm-zip` is acceptable.
Alternatively, implement manual zip parsing with the built-in `Uint8Array` APIs.

**Decision for implementation:** Use `adm-zip` (install as dev dependency) for
reliable zip handling. It's a pure-JS implementation with no native bindings.

```bash
npm install adm-zip
npm install -D @types/adm-zip
```

### Zip validation (spec §8.3)

```typescript
function validateZipSafety(entries: AdmZip.IZipEntry[]): void {
  let totalSize = 0;
  for (const entry of entries) {
    // Path traversal check
    if (entry.entryName.includes("..")) throw new Error("Path traversal in zip");
    if (path.isAbsolute(entry.entryName)) throw new Error("Absolute path in zip");

    // Size check
    totalSize += entry.header.size;
    if (totalSize > 50 * 1024 * 1024) throw new Error("Zip exceeds 50 MB limit");

    // Symlink check
    if (entry.isDirectory && entry.header.attr === 0xA1ED) {
      throw new Error("Symlinks not allowed in zip");
    }
  }

  // Zip bomb detection
  const compressedSize = entries.reduce((s, e) => s + e.header.compressedSize, 0);
  if (compressedSize > 0 && totalSize / compressedSize > 100) {
    throw new Error("Suspicious compression ratio — possible zip bomb");
  }
}
```

### Verify

```bash
npx tsc --noEmit
npx vitest run tests/corpus/librarian-tools.test.ts
```

---

## Task 1.8 — Path traversal and zip safety tests

**What:** Dedicated security tests for filesystem and zip operations.

| Test | Description |
|------|-------------|
| rejects slug with path traversal | `slug: "../etc"` → error |
| rejects slug with dots | `slug: "my.book"` → error |
| rejects absolute path in slug | `slug: "/tmp/evil"` → error |
| rejects chapter slug with traversal | `chapter_slug: "../../passwd"` → error |
| rejects zip with path traversal entry | Zip containing `../../../etc/passwd` → error |
| rejects zip exceeding size limit | Zip with > 50 MB uncompressed → error |
| rejects zip missing book.json | Zip with only chapters/ → error |
| rejects zip with suspicious compression ratio | Zip bomb → error |

**~8 security tests.**

### Verify

```bash
npx vitest run tests/corpus/librarian-security.test.ts
```

---

## Task 1.9 — Full unit test suite for librarian tools

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
| adds book with chapters (manual) | `librarian_add_book` | Creates dir, book.json, chapter files |
| adds book without chapters (manual) | `librarian_add_book` | Creates dir + book.json only |
| rejects duplicate slug | `librarian_add_book` | Existing slug → error |
| rejects missing fields | `librarian_add_book` | No title → error |
| adds book from zip | `librarian_add_book` | Valid zip → extracted correctly |
| rejects invalid zip | `librarian_add_book` | Zip missing book.json → error |
| adds chapter to existing book | `librarian_add_chapter` | File written, cache cleared |
| rejects chapter for missing book | `librarian_add_chapter` | Unknown book → error |
| rejects empty content | `librarian_add_chapter` | Empty string → error |
| removes book and embeddings | `librarian_remove_book` | Dir deleted, embeddings deleted, cache cleared |
| rejects removing missing book | `librarian_remove_book` | Unknown slug → error |
| removes chapter and embeddings | `librarian_remove_chapter` | File deleted, embeddings deleted |
| rejects removing missing chapter | `librarian_remove_chapter` | Unknown chapter → error |
| clears caches after add | cache | `clearCaches` called after `librarian_add_book` |
| clears caches after remove | cache | `clearCaches` called after `librarian_remove_book` |

**~19 functional tests + ~8 security tests from Task 1.8 = ~27 total.**

### Verify

```bash
npx vitest run tests/corpus/
npm test                        # full suite: ~317 + ~27 = ~344 tests
npm run build                   # clean
```

---

## Task 1.10 — Full verification

**What:** Run the complete validation suite.

```bash
npx tsc --noEmit              # type-check
npm run lint                  # lint clean
npm test                      # all ~344 tests pass
npm run build                 # build discovers corpus, embeds, BM25 indexes
```

### Expected test counts

| Suite | Tests |
|-------|-------|
| Existing (Sprints 0–5 vector search) | 307 |
| Sprint 0 (discovery + cache) | ~10 |
| Sprint 1 (corpus tools) | ~27 |
| **Total** | **~344** |

---

## Sprint 1 — Completion Checklist

- [ ] `mcp/librarian-tool.ts` — 6 tool functions with `LibrarianToolDeps`
- [ ] `mcp/embedding-server.ts` — 12 total tools (6 embedding + 6 librarian)
- [ ] `librarian_list` — returns book inventory with indexing status
- [ ] `librarian_get_book` — returns book details with chapter listing
- [ ] `librarian_add_book` (manual) — creates book dir + book.json + chapters
- [ ] `librarian_add_book` (zip) — validates and extracts zip archive
- [ ] `librarian_add_chapter` — adds chapter to existing book
- [ ] `librarian_remove_book` — removes book dir + cleans embeddings
- [ ] `librarian_remove_chapter` — removes chapter file + cleans embeddings
- [ ] Path traversal prevention on all filesystem operations
- [ ] Zip safety: size limit, no traversal, no symlinks, bomb detection
- [ ] Cache clearing after every mutation
- [ ] ~27 unit tests for librarian tools
- [ ] All ~344 tests pass
- [ ] `npm run build` clean

---

## QA Deviations
