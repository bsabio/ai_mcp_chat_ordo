import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { FileSystemCorpusRepository } from "@/adapters/FileSystemCorpusRepository";

/**
 * Sprint 0 — Auto-discovery tests for FileSystemCorpusRepository.
 * Uses temp directories with test fixtures — no dependency on real corpus data.
 */

let tmpDir: string;

function corpusDir() {
  return path.join(tmpDir, "_corpus");
}

async function writeManifest(
  slug: string,
  overrides: Record<string, unknown> = {},
) {
  const bookDir = path.join(corpusDir(), slug);
  await fs.mkdir(path.join(bookDir, "chapters"), { recursive: true });
  const manifest = {
    slug,
    title: `Book ${slug}`,
    number: "I",
    sortOrder: 1,
    domain: ["teaching"],
    ...overrides,
  };
  await fs.writeFile(
    path.join(bookDir, "book.json"),
    JSON.stringify(manifest),
  );
  return bookDir;
}

async function writeChapter(bookSlug: string, chapterSlug: string, content: string) {
  const chapterPath = path.join(
    corpusDir(),
    bookSlug,
    "chapters",
    `${chapterSlug}.md`,
  );
  await fs.writeFile(chapterPath, content);
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "librarian-test-"));
  await fs.mkdir(corpusDir(), { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("FileSystemCorpusRepository — auto-discovery", () => {
  it("discovers books with valid book.json", async () => {
    await writeManifest("alpha", { sortOrder: 2, title: "Alpha Book" });
    await writeManifest("beta", { sortOrder: 1, title: "Beta Book" });

    const repo = new FileSystemCorpusRepository(tmpDir);
    const books = await repo.getAllDocuments();

    expect(books).toHaveLength(2);
    // sorted by sortOrder, not alphabetical
    expect(books[0].slug).toBe("beta");
    expect(books[1].slug).toBe("alpha");
  });

  it("skips directories without book.json", async () => {
    await writeManifest("valid-book", { sortOrder: 1 });
    // Create a directory without book.json
    await fs.mkdir(path.join(corpusDir(), "no-manifest", "chapters"), {
      recursive: true,
    });

    const repo = new FileSystemCorpusRepository(tmpDir);
    const books = await repo.getAllDocuments();

    expect(books).toHaveLength(1);
    expect(books[0].slug).toBe("valid-book");
  });

  it("skips directories with invalid JSON", async () => {
    await writeManifest("valid-book", { sortOrder: 1 });
    const badDir = path.join(corpusDir(), "bad-json");
    await fs.mkdir(path.join(badDir, "chapters"), { recursive: true });
    await fs.writeFile(path.join(badDir, "book.json"), "{invalid json");

    const repo = new FileSystemCorpusRepository(tmpDir);
    const books = await repo.getAllDocuments();

    expect(books).toHaveLength(1);
  });

  it("skips book.json missing required fields", async () => {
    // slug only — missing title, number
    const badDir = path.join(corpusDir(), "missing-fields");
    await fs.mkdir(path.join(badDir, "chapters"), { recursive: true });
    await fs.writeFile(
      path.join(badDir, "book.json"),
      JSON.stringify({ slug: "missing-fields" }),
    );

    const repo = new FileSystemCorpusRepository(tmpDir);
    const books = await repo.getAllDocuments();

    expect(books).toHaveLength(0);
  });

  it("skips book.json with missing domain", async () => {
    const badDir = path.join(corpusDir(), "no-domain");
    await fs.mkdir(path.join(badDir, "chapters"), { recursive: true });
    await fs.writeFile(
      path.join(badDir, "book.json"),
      JSON.stringify({
        slug: "no-domain",
        title: "No Domain",
        number: "I",
        sortOrder: 1,
      }),
    );

    const repo = new FileSystemCorpusRepository(tmpDir);
    const books = await repo.getAllDocuments();

    expect(books).toHaveLength(0);
  });

  it("skips book.json with invalid domain values", async () => {
    const badDir = path.join(corpusDir(), "bad-domain");
    await fs.mkdir(path.join(badDir, "chapters"), { recursive: true });
    await fs.writeFile(
      path.join(badDir, "book.json"),
      JSON.stringify({
        slug: "bad-domain",
        title: "Bad Domain",
        number: "I",
        sortOrder: 1,
        domain: ["teaching", "invalid-value"],
      }),
    );

    const repo = new FileSystemCorpusRepository(tmpDir);
    const books = await repo.getAllDocuments();

    expect(books).toHaveLength(0);
  });

  it("skips when slug ≠ directory name [LIBRARIAN-090]", async () => {
    // Directory is "wrong-dir" but slug says "correct-slug"
    const badDir = path.join(corpusDir(), "wrong-dir");
    await fs.mkdir(path.join(badDir, "chapters"), { recursive: true });
    await fs.writeFile(
      path.join(badDir, "book.json"),
      JSON.stringify({
        slug: "correct-slug",
        title: "Mismatched",
        number: "I",
        sortOrder: 1,
        domain: ["teaching"],
      }),
    );

    const repo = new FileSystemCorpusRepository(tmpDir);
    const books = await repo.getAllDocuments();

    expect(books).toHaveLength(0);
  });

  it("returns empty for missing _corpus directory", async () => {
    // Point at a dir that exists but has no _corpus subdirectory
    const emptyDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "librarian-empty-"),
    );
    try {
      const repo = new FileSystemCorpusRepository(emptyDir);
      const books = await repo.getAllDocuments();
      expect(books).toHaveLength(0);
    } finally {
      await fs.rm(emptyDir, { recursive: true, force: true });
    }
  });

  it("sorts books by sortOrder ascending", async () => {
    await writeManifest("third", { sortOrder: 3, title: "Third" });
    await writeManifest("first", { sortOrder: 1, title: "First" });
    await writeManifest("second", { sortOrder: 2, title: "Second" });

    const repo = new FileSystemCorpusRepository(tmpDir);
    const books = await repo.getAllDocuments();

    expect(books.map((b) => b.slug)).toEqual(["first", "second", "third"]);
  });

  it("discovers chapters from _corpus/{slug}/chapters/ path", async () => {
    await writeManifest("test-book", { sortOrder: 1, title: "Test Book" });
    await writeChapter(
      "test-book",
      "ch00-intro",
      "# Introduction\n\nHello world.",
    );
    await writeChapter(
      "test-book",
      "ch01-basics",
      "# The Basics\n\nFundamentals.",
    );

    const repo = new FileSystemCorpusRepository(tmpDir);
    const chapters = await repo.getSectionsByDocument("test-book");

    expect(chapters).toHaveLength(2);
    expect(chapters[0].chapterSlug).toBe("ch00-intro");
    expect(chapters[0].title).toBe("Introduction");
    expect(chapters[1].chapterSlug).toBe("ch01-basics");
    expect(chapters[1].title).toBe("The Basics");
  });

  it("clearDiscoveryCache forces re-scan", async () => {
    await writeManifest("original", { sortOrder: 1 });

    const repo = new FileSystemCorpusRepository(tmpDir);

    // First scan — 1 book
    let books = await repo.getAllDocuments();
    expect(books).toHaveLength(1);

    // Add another book on disk
    await writeManifest("added-later", { sortOrder: 2 });

    // Still cached — still 1 book
    books = await repo.getAllDocuments();
    expect(books).toHaveLength(1);

    // Clear cache, re-discover — now 2 books
    repo.clearDiscoveryCache();
    books = await repo.getAllDocuments();
    expect(books).toHaveLength(2);
  });
});
