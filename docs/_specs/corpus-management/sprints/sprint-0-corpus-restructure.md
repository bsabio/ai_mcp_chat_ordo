# Sprint 0 — Corpus Restructure & Auto-Discovery

> **Goal:** Move book content to `docs/_corpus/`, add `book.json` manifests,
> replace the hardcoded `BOOKS` array with filesystem auto-discovery. Zero
> functional change — all existing tests pass, build pipeline works, search
> works.
> **Spec ref:** §3 (directory convention), §4 (repository changes)
> **Prerequisite:** Vector Search Sprints 0–5 complete (307 tests passing)
>
> **Schema change from v1.0:** `book.json` now includes `domain` (required)
> and `tags` (optional) fields for future search scoping (spec §3.2).

---

## Available Assets

### Current State

| File | Role |
|------|------|
| `src/adapters/FileSystemBookRepository.ts` | Hardcoded `BOOKS` array (10 entries), reads `docs/{chaptersDir}/*.md` |
| `src/adapters/CachedBookRepository.ts` | In-memory cache decorator — no `clearCache()` method |
| `src/adapters/RepositoryFactory.ts` | Returns `CachedBookRepository(FileSystemBookRepository)` singleton |
| `scripts/build-search-index.ts` | Calls `bookRepo.getAllBooks()` + `getAllChapters()`, builds embeddings |
| `docs/*-book/chapters/*.md` | 10 book directories, ~104 chapters total |

### Target State

| File | Change |
|------|--------|
| `docs/_corpus/*-book/` | All 10 book directories moved here |
| `docs/_corpus/*-book/book.json` | New manifest file per book |
| `FileSystemBookRepository` | `discoverBooks()` replaces hardcoded `BOOKS` array |
| `CachedBookRepository` | New `clearCache()` method |
| Everything else | Unchanged |

---

## Task 0.1 — Move book directories to `docs/_corpus/`

**What:** Create `docs/_corpus/` and move all 10 `*-book/` directories into it.
Also move the two loose files at the docs root to `docs/_reference/`.

```bash
mkdir -p docs/_corpus
mv docs/accessibility-book docs/_corpus/
mv docs/content-strategy-book docs/_corpus/
mv docs/data-analytics-book docs/_corpus/
mv docs/design-book docs/_corpus/
mv docs/entrepreneurship-book docs/_corpus/
mv docs/marketing-branding-book docs/_corpus/
mv docs/product-management-book docs/_corpus/
mv docs/software-engineering-book docs/_corpus/
mv docs/ui-design-book docs/_corpus/
mv docs/ux-design-book docs/_corpus/

# Move loose files to _reference
mv docs/autopsy-authoritative-2026-03-07.md docs/_reference/
mv docs/honest-thoughts-2026-03-07.md docs/_reference/
```

### Verify

```bash
ls docs/_corpus/          # 10 directories
ls docs/                  # only _corpus, _planning, _reference, _specs, operations
```

---

## Task 0.2 — Create `book.json` manifests

**What:** Create a `book.json` in each book directory matching the schema from
spec §3.2. The data comes directly from the current hardcoded `BOOKS` array.

| Directory | `book.json` |
|-----------|-------------|
| `_corpus/software-engineering-book/` | `{"slug":"software-engineering","title":"Software Engineering","number":"I","domain":["teaching","reference"],"tags":["software-engineering","best-practices"]}` |
| `_corpus/design-book/` | `{"slug":"design-history","title":"Design History","number":"II","domain":["teaching","reference"],"tags":["design","history"]}` |
| `_corpus/ui-design-book/` | `{"slug":"ui-design","title":"UI Design","number":"III","domain":["teaching","reference"],"tags":["ui","design"]}` |
| `_corpus/ux-design-book/` | `{"slug":"ux-design","title":"UX Design","number":"IV","domain":["teaching","reference"],"tags":["ux","design"]}` |
| `_corpus/product-management-book/` | `{"slug":"product-management","title":"Product Management","number":"V","domain":["teaching","reference"],"tags":["product-management"]}` |
| `_corpus/accessibility-book/` | `{"slug":"accessibility","title":"Accessibility","number":"VI","domain":["teaching","reference"],"tags":["accessibility","a11y"]}` |
| `_corpus/entrepreneurship-book/` | `{"slug":"entrepreneurship","title":"Entrepreneurship","number":"VII","domain":["teaching","reference"],"tags":["entrepreneurship","business"]}` |
| `_corpus/marketing-branding-book/` | `{"slug":"marketing-branding","title":"Marketing & Branding","number":"VIII","domain":["teaching","sales"],"tags":["marketing","branding"]}` |
| `_corpus/content-strategy-book/` | `{"slug":"content-strategy","title":"Content Strategy","number":"IX","domain":["teaching","reference"],"tags":["content-strategy"]}` |
| `_corpus/data-analytics-book/` | `{"slug":"data-analytics","title":"Data & Analytics","number":"X","domain":["teaching","reference"],"tags":["data","analytics"]}` |

Each `book.json` is a formatted JSON file:

```json
{
  "slug": "software-engineering",
  "title": "Software Engineering",
  "number": "I",
  "domain": ["teaching", "reference"],
  "tags": ["software-engineering", "best-practices"]
}
```

- `domain` is **required** (at least one entry). Valid values: `teaching`,
  `sales`, `customer-service`, `reference`, `internal`.
- `tags` is **optional**. Freeform strings for finer filtering.

### Verify

```bash
for d in docs/_corpus/*-book; do
  echo "$(basename $d): $(cat $d/book.json | head -1)"
done
```

---

## Task 0.3 — Rewrite `FileSystemBookRepository` for auto-discovery

**What:** Replace the hardcoded `BOOKS` array with a `discoverBooks()` method
that scans `docs/_corpus/` for directories containing valid `book.json` files.

### Changes to `FileSystemBookRepository`

1. **Remove** the entire `BOOKS: BookMeta[]` constant (lines 22–93)
2. **Add** `BookManifest` interface (matches `book.json` schema)
3. **Add** `discoverBooks()` async method:
   - Reads `{docsDir}/_corpus/` directory entries
   - For each directory, tries to read and parse `book.json`
   - Validates `slug`, `title`, `number` are present and non-empty strings
   - Returns `BookMeta[]` with `chaptersDir` set to `_corpus/{dirname}/chapters`
   - Sorts by `number` field
4. **Add** `discoveredBooks` cache field (populated once, reused for lifetime)
5. **Update** `getAllBooks()` to call `discoverBooks()` instead of reading
   from the static array
6. **Update** `getBook()`, `getChaptersByBook()`, `getChapter()` to use
   discovered books

### Key implementation details

```typescript
export const DEFAULT_DOCS_DIR = "docs";
const CORPUS_DIR = "_corpus";

interface BookManifest {
  slug: string;
  title: string;
  number: string;
  domain: string[];
  tags?: string[];
}

export class FileSystemBookRepository implements BookRepository {
  private discoveredBooks: BookMeta[] | null = null;

  constructor(
    private readonly docsDir: string = path.join(process.cwd(), DEFAULT_DOCS_DIR),
  ) {}

  private async discoverBooks(): Promise<BookMeta[]> {
    if (this.discoveredBooks) return this.discoveredBooks;

    const corpusDir = path.join(this.docsDir, CORPUS_DIR);
    let entries: Dirent[];
    try {
      entries = await fs.readdir(corpusDir, { withFileTypes: true });
    } catch {
      return [];
    }

    const books: BookMeta[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const raw = await fs.readFile(
          path.join(corpusDir, entry.name, "book.json"),
          "utf-8",
        );
        const manifest: BookManifest = JSON.parse(raw);
        if (!manifest.slug || !manifest.title || !manifest.number) continue;
        if (typeof manifest.slug !== "string") continue;
        if (typeof manifest.title !== "string") continue;
        if (typeof manifest.number !== "string") continue;
        if (!Array.isArray(manifest.domain) || manifest.domain.length === 0) continue;
        books.push({
          slug: manifest.slug,
          title: manifest.title,
          shortTitle: manifest.title,
          number: manifest.number,
          chaptersDir: path.join(CORPUS_DIR, entry.name, "chapters"),
        });
      } catch {
        // No book.json or invalid JSON — skip this directory
      }
    }

    this.discoveredBooks = books.sort((a, b) =>
      a.number.localeCompare(b.number),
    );
    return this.discoveredBooks;
  }

  // clearDiscoveryCache() — called by corpus tools after mutations
  clearDiscoveryCache(): void {
    this.discoveredBooks = null;
  }

  async getAllBooks(): Promise<Book[]> {
    const books = await this.discoverBooks();
    return books.map((b) => ({
      slug: b.slug,
      title: b.title,
      number: b.number,
    }));
  }

  // getBook, getChaptersByBook, getChapter — same logic,
  // but use await this.discoverBooks() instead of BOOKS constant
}
```

### What does NOT change

- `parseChapter()` — same heading extraction, practitioner extraction, checklist
  analysis
- `getChaptersByBook()` internals — still reads `{docsDir}/{chaptersDir}/*.md`
- `getAllChapters()` — still iterates all books
- `Chapter` entity — unchanged
- `Book` interface — unchanged

### Verify

```bash
npx tsc --noEmit     # type-checks
npm test             # all 307 tests pass
npm run build        # build pipeline discovers _corpus/ and works
```

---

## Task 0.4 — Add `clearCache()` to `CachedBookRepository`

**What:** Add a method to reset all cached data, so corpus management tools
can force re-discovery after adding or removing content.

### Changes to `CachedBookRepository`

Add one method:

```typescript
clearCache(): void {
  this.allBooksCache = null;
  this.allChaptersCache = null;
  this.bookCache.clear();
  this.chaptersByBookCache.clear();
  this.chapterCache.clear();
}
```

This is not on the `BookRepository` interface (it's a cache concern, not a
domain concern). Callers who need it will reference `CachedBookRepository`
directly.

### Verify

```bash
npx tsc --noEmit
```

---

## Task 0.5 — Tests for auto-discovery and cache clearing

**What:** New tests verifying auto-discovery works correctly and caching
behavior is correct.

### Test file: `tests/corpus/book-discovery.test.ts`

Uses a temp directory with test fixtures — no dependency on real corpus data.

| Test | Description |
|------|-------------|
| discovers books with valid book.json | Create 2 dirs with book.json + chapters, verify `getAllBooks()` returns both |
| skips directories without book.json | Create 1 valid dir, 1 missing book.json → only 1 book returned |
| skips directories with invalid JSON | Create dir with `book.json` containing `{invalid` → skipped, no crash |
| skips book.json missing required fields | `book.json` with only `slug`, no `title` → skipped |
| skips book.json with missing domain | `book.json` with slug/title/number but no `domain` → skipped |
| returns empty for missing _corpus dir | Point docsDir at nonexistent path → returns `[]` |
| sorts books by number | Create 3 books with numbers III, I, II → returned sorted I, II, III |
| chapters discovered from _corpus path | Create book in `_corpus/test-book/chapters/ch00.md` → `getChaptersByBook()` returns it |
| preserves domain and tags in discovery | `book.json` with `domain` + `tags` → values accessible on discovered book |
| clearDiscoveryCache forces re-scan | Discover once, add new book.json, clear cache, discover again → new book appears |

### Test file: `tests/corpus/cached-repo-clear.test.ts`

| Test | Description |
|------|-------------|
| clearCache resets all caches | Populate cache, call `clearCache()`, verify next call hits inner repo |
| clearCache after book added | Inner repo returns new data after clear |

**~10 new tests total.**

### Verify

```bash
npx vitest run tests/corpus/
npm test                        # full suite: 307 + 10 = ~317 tests
npm run build                   # build pipeline works against _corpus/
```

---

## Task 0.6 — Full verification

**What:** Run the complete validation suite to confirm zero regressions.

```bash
npx tsc --noEmit              # type-check
npm run lint                  # lint clean
npm test                      # all ~317 tests pass
npm run build                 # build discovers _corpus/, embeds all 104 chapters
npm run dev                   # site runs, search works
```

### Expected results

- All existing 307 tests pass unchanged (the `BookRepository` interface didn't
  change, so all domain/search/MCP tests still work)
- 10 new discovery/cache tests pass
- Build pipeline output matches current behavior (same books, same chapters)
- Search returns same results as before

---

## Sprint 0 — Completion Checklist

- [ ] `docs/_corpus/` created with all 10 book directories
- [ ] `book.json` exists in each book directory (with `domain` and `tags`)
- [ ] Loose docs root files moved to `_reference/`
- [ ] `FileSystemBookRepository` uses `discoverBooks()` — no hardcoded `BOOKS`
- [ ] `CachedBookRepository` has `clearCache()` method
- [ ] `FileSystemBookRepository` has `clearDiscoveryCache()` method
- [ ] ~10 new tests for auto-discovery and cache clearing
- [ ] All ~317 tests pass
- [ ] `npm run build` works against `_corpus/`
- [ ] `npm run dev` + search works as before
