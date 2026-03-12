# Sprint 2 — Zip Import

> **Goal:** Add zip archive import mode to `librarian_add_book`. Validates,
> extracts atomically, and rolls back on failure. This enables the future
> book-generation pipeline to produce zip archives that the librarian can
> ingest directly.
> **Spec ref:** §5.3 (zip spec), §8.3 (zip safety), §2 goal 6
> **Prerequisite:** Sprint 1 complete (6 librarian tools working, 346 tests passing)
>
> **Feedback-driven:** This sprint was split from Sprint 1 to reduce risk
> and isolate the zip concern (its own library dependency, rollback semantics,
> and additional validation rules).

---

## Available Assets (from Sprint 1)

| Asset | Purpose | Sprint 2 Use |
|-------|---------|-------------|
| `mcp/librarian-tool.ts` | Extracted tool logic with `librarianAddBook()` | Extend with zip dispatch |
| `mcp/embedding-server.ts` | 12-tool MCP server | Add `zip_base64` param to `librarian_add_book` schema |
| `assertSafePath()` | Path traversal prevention | Reused for zip entry validation |
| `assertValidSlug()` | Slug format validation | Reused for zip-extracted slugs |
| `LibrarianToolDeps` | Dependency injection interface | Unchanged |
| `docs/_corpus/` | Corpus root (dir = slug) | Zip extracts to `_corpus/{slug}/` |

---

## Task 2.1 — Install `adm-zip` dependency

**What:** Add the `adm-zip` package for reliable zip file handling.

```bash
npm install adm-zip
npm install -D @types/adm-zip
```

`adm-zip` is a pure-JS implementation with no native bindings. Acceptable
for server-side use in a Node.js MCP process.

### Verify

```bash
npx tsc --noEmit
```

---

## Task 2.2 — Implement `addBookFromZip()`

**What:** Internal function dispatched by `librarianAddBook()` when
`zip_base64` is provided. Extracts to a temp directory, validates fully,
then moves atomically to `_corpus/`.

### Implementation

```typescript
import AdmZip from "adm-zip";

async function addBookFromZip(
  deps: LibrarianToolDeps,
  zipBase64: string,
): Promise<{
  slug: string; title: string;
  directory: string; chaptersWritten: number;
  indexed: boolean; hint: string;
}> {
  // 1. Decode base64 to Buffer
  const zipBuffer = Buffer.from(zipBase64, "base64");
  const zip = new AdmZip(zipBuffer);

  // 2. Validate zip safety (Task 2.3)
  const entries = zip.getEntries();
  validateZipSafety(entries);

  // 3. Find and parse book.json
  const bookJsonEntry = entries.find((e) => e.entryName === "book.json");
  if (!bookJsonEntry) {
    throw new Error("Zip archive must contain book.json at the root.");
  }
  const manifest = JSON.parse(bookJsonEntry.getData().toString("utf-8"));
  if (!manifest.slug || !manifest.title || !manifest.number) {
    throw new Error("book.json must contain slug, title, and number.");
  }
  if (typeof manifest.sortOrder !== "number") {
    throw new Error("book.json must contain a numeric sortOrder.");
  }
  if (!Array.isArray(manifest.domain) || manifest.domain.length === 0) {
    throw new Error("book.json must contain a non-empty domain array.");
  }
  for (const d of manifest.domain) {
    if (!VALID_DOMAINS.has(d)) {
      throw new Error(
        `Invalid domain value in zip book.json: "${d}". Valid: ${[...VALID_DOMAINS].join(", ")}`,
      );
    }
  }
  assertValidSlug(manifest.slug);

  // 4. Check slug uniqueness — never overwrite
  const targetDir = assertSafePath(deps.corpusDir, manifest.slug);
  if (await pathExists(targetDir)) {
    throw new Error(`Book already exists: ${manifest.slug}`);
  }

  // 5. Extract to temp directory first (atomic)
  const tmpDir = path.join(deps.corpusDir, `.tmp-${manifest.slug}-${Date.now()}`);
  try {
    await fs.mkdir(tmpDir, { recursive: true });
    const chaptersDir = path.join(tmpDir, "chapters");
    await fs.mkdir(chaptersDir, { recursive: true });

    // Write book.json
    await fs.writeFile(
      path.join(tmpDir, "book.json"),
      JSON.stringify(manifest, null, 2) + "\n",
    );

    // Write chapters
    let chaptersWritten = 0;
    const seenSlugs = new Set<string>();
    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const match = entry.entryName.match(/^chapters\/(.+)\.md$/);
      if (!match) continue;

      const chapterSlug = match[1];

      // Validate chapter slug
      assertValidSlug(chapterSlug);

      // Reject duplicate chapter slugs
      if (seenSlugs.has(chapterSlug)) {
        throw new Error(`Duplicate chapter slug in zip: "${chapterSlug}"`);
      }
      seenSlugs.add(chapterSlug);

      // Validate no nested directories under chapters/
      if (entry.entryName.split("/").length > 2) {
        throw new Error(`Nested directories under chapters/ not allowed: "${entry.entryName}"`);
      }

      const chapterPath = assertSafePath(chaptersDir, `${chapterSlug}.md`);
      await fs.writeFile(chapterPath, entry.getData().toString("utf-8"));
      chaptersWritten++;
    }

    if (chaptersWritten === 0) {
      throw new Error("Zip archive must contain at least one chapter in chapters/.");
    }

    // 6. Atomic move: temp → final location
    await fs.rename(tmpDir, targetDir);

    // 7. Clear caches
    deps.clearCaches();

    return {
      slug: manifest.slug,
      title: manifest.title,
      directory: `_corpus/${manifest.slug}`,
      chaptersWritten,
      indexed: false,
      hint: "Run rebuild_index to make this book searchable.",
    };
  } catch (err) {
    // Rollback: remove temp directory on any failure
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup
    }
    throw err;
  }
}
```

### Dispatch from `librarianAddBook`

Update the existing `librarianAddBook` to dispatch to zip mode:

```typescript
export async function librarianAddBook(deps, args) {
  if ("zip_base64" in args && args.zip_base64) {
    return addBookFromZip(deps, args.zip_base64);
  }
  // ... existing manual mode logic
}
```

### Verify

```bash
npx tsc --noEmit
npx vitest run tests/corpus/librarian-zip.test.ts
```

---

## Task 2.3 — Zip validation

**What:** Safety validation for zip archives before extraction. `[LIBRARIAN-040, LIBRARIAN-070]`

### Implementation

```typescript
const MAX_UNCOMPRESSED_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_FILE_COUNT = 500;
const MAX_COMPRESSION_RATIO = 100;

function validateZipSafety(entries: AdmZip.IZipEntry[]): void {
  if (entries.length > MAX_FILE_COUNT) {
    throw new Error(`Zip exceeds maximum file count (${MAX_FILE_COUNT}).`);
  }

  let totalUncompressed = 0;
  let totalCompressed = 0;

  for (const entry of entries) {
    // Path traversal check
    if (entry.entryName.includes("..")) {
      throw new Error(`Path traversal in zip entry: "${entry.entryName}"`);
    }
    if (path.isAbsolute(entry.entryName)) {
      throw new Error(`Absolute path in zip entry: "${entry.entryName}"`);
    }

    // UTF-8 filename validation
    try {
      decodeURIComponent(encodeURIComponent(entry.entryName));
    } catch {
      throw new Error(`Non-UTF-8 filename in zip: "${entry.entryName}"`);
    }

    // Size tracking
    totalUncompressed += entry.header.size;
    totalCompressed += entry.header.compressedSize;

    if (totalUncompressed > MAX_UNCOMPRESSED_SIZE) {
      throw new Error(`Zip exceeds ${MAX_UNCOMPRESSED_SIZE / 1024 / 1024} MB uncompressed limit.`);
    }

    // Symlink check (Unix external attributes)
    const externalAttr = entry.header.attr >>> 16;
    if ((externalAttr & 0o170000) === 0o120000) {
      throw new Error(`Symlinks not allowed in zip: "${entry.entryName}"`);
    }
  }

  // Zip bomb detection
  if (totalCompressed > 0 && totalUncompressed / totalCompressed > MAX_COMPRESSION_RATIO) {
    throw new Error("Suspicious compression ratio — possible zip bomb.");
  }
}
```

### Verify

```bash
npx vitest run tests/corpus/librarian-zip.test.ts
```

---

## Task 2.4 — Operational constraints

**What:** Tighten extraction rules beyond basic safety. These rules ensure
clean, predictable corpus content.

| Constraint | Implementation |
|------------|---------------|
| **UTF-8 filenames** | Validated in `validateZipSafety()` — reject non-UTF-8 |
| **No duplicate chapters** | Track seen chapter slugs during extraction — reject on collision |
| **No nested dirs under chapters/** | Check path depth of chapter entries — reject if > 2 segments |
| **Never overwrite** | Check `pathExists(targetDir)` before any write — reject if book exists |
| **Atomic extraction** | Extract to `.tmp-{slug}-{timestamp}/` first, `fs.rename()` to final |
| **Rollback on failure** | Wrap extraction in try/catch — remove temp dir on any error |

All constraints are implemented in Task 2.2. This task is a verification
checkpoint.

### Verify

```bash
npx vitest run tests/corpus/librarian-zip.test.ts
```

---

## Task 2.5 — Register `zip_base64` parameter

**What:** Add the `zip_base64` property to the `librarian_add_book` tool
schema in `mcp/embedding-server.ts`.

### Changes

Add to the existing `librarian_add_book` inputSchema properties:

```typescript
zip_base64: {
  type: "string",
  description: "Base64-encoded zip archive containing book.json and chapters/. If provided, all other fields are ignored.",
},
```

Update the tool description:

```typescript
description: "Add a new book to the corpus. Provide slug/title/number/sortOrder/domain/chapters, OR a base64-encoded zip archive containing book.json and chapters/.",
```

Remove `required` constraint (since zip mode doesn't need the other fields):

```typescript
// required: ["slug", "title", "number", "sortOrder", "domain"],
// becomes no required fields — validation happens in the tool function
```

### Verify

```bash
npx tsc --noEmit
```

---

## Task 2.6 — Unit tests for zip mode

**What:** Complete test coverage for zip import functionality.

### Test file: `tests/corpus/librarian-zip.test.ts`

Helper: create test zip buffers programmatically using `adm-zip` in tests.

| Test | Description |
|------|-------------|
| adds book from valid zip | Zip with book.json + 2 chapters → extracted correctly to `_corpus/{slug}/` |
| rejects zip missing book.json | Zip with only chapters/ → error |
| rejects zip with invalid book.json | `book.json` missing required fields or invalid domain values → error |
| rejects zip with slug conflict | Zip slug matches existing book → error (never overwrite) |
| rejects zip with path traversal | Entry `../../../etc/passwd` → error |
| rejects zip exceeding size limit | Zip with > 50 MB uncompressed → error |
| rejects zip with suspicious ratio | High compression ratio → error |
| rejects zip with symlink | Entry with symlink attr → error |
| rejects zip with non-UTF-8 filename | Invalid encoding → error |
| rejects zip with duplicate chapters | Two entries normalizing to same slug → error |
| rejects zip with nested chapter dirs | `chapters/sub/ch00.md` → error |
| rolls back on write failure | Simulate failure mid-extraction → temp dir cleaned up |

**~12 zip-specific tests.**

### Verify

```bash
npx vitest run tests/corpus/librarian-zip.test.ts
npx vitest run tests/corpus/
npm test                        # full suite: 346 + ~12 = ~358 tests
npm run build                   # clean
```

---

## Task 2.7 — Full verification

**What:** Run the complete validation suite.

```bash
npx tsc --noEmit              # type-check
npm run lint                  # lint clean
npm test                      # all ~358 tests pass
npm run build                 # build discovers corpus, embeds, BM25 indexes
```

### Expected test counts

| Suite | Tests |
|-------|-------|
| Existing (Sprints 0–5 vector search) | 307 |
| Sprint 0 (discovery + cache + domain validation) | 13 |
| Sprint 1 (librarian tools + security) | 26 |
| Sprint 2 (zip import) | ~12 |
| **Total** | **~358** |

---

## Sprint 2 — Completion Checklist

- [ ] `adm-zip` installed as dependency
- [ ] `addBookFromZip()` implemented with temp extraction + atomic move
- [ ] Zip validation: size limit, file count, path traversal, symlinks, bomb detection
- [ ] UTF-8 filename validation
- [ ] Duplicate chapter slug rejection
- [ ] Nested directory rejection under `chapters/`
- [ ] Never-overwrite enforcement (slug conflict → reject)
- [ ] Atomic extraction to temp dir → rename
- [ ] Rollback on any failure (temp dir cleaned up)
- [ ] `zip_base64` parameter registered on `librarian_add_book` tool schema
- [ ] ~12 unit tests for zip mode
- [ ] All ~358 tests pass
- [ ] `npm run build` clean

---

## QA Deviations from Sprint 1

Changes discovered during Sprint 1 implementation and QA that affect this sprint:

| Finding | Impact on Sprint 2 |
|---------|--------------------|
| Sprint 0 produced 13 tests (not 12) — domain validation test added during QA | Test baseline updated: Sprint 0 = 13 |
| Sprint 1 produced 26 tests (not 24) — 21 functional + 5 security = 26 | Test baseline updated: Sprint 1 = 26, total pre-Sprint-2 = 346 |
| `VALID_DOMAINS` is module-level (not exported) in `mcp/librarian-tool.ts` | `addBookFromZip()` lives in the same file — can reference `VALID_DOMAINS` directly |
| Domain values validated at write time in `librarianAddBook` manual mode | `addBookFromZip()` must also validate domain values — added domain validation step |
| `AllDeps` interface pattern established in `embedding-server.ts` | Zip mode adds no new deps — `LibrarianToolDeps` is sufficient |
| `librarian_add_book` schema has `required: ["slug", "title", "number", "sortOrder", "domain"]` | Task 2.5 must relax `required` since zip mode uses only `zip_base64` |
