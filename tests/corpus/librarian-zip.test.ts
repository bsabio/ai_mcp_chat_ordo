// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import AdmZip from "adm-zip";
import type { LibrarianToolDeps } from "@/lib/capabilities/shared/librarian-tool";
import { librarianAddBook } from "@/lib/capabilities/shared/librarian-tool";
import type { VectorStore } from "@/core/search/ports/VectorStore";

/**
 * Sprint 2 — Zip import tests for librarian_add_book.
 */

let tmpDir: string;
let corpusDir: string;
let deps: LibrarianToolDeps;

function createMockVectorStore(): VectorStore {
  return {
    upsert: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => []),
    getBySourceId: vi.fn(() => []),
    getContentHash: vi.fn(() => null),
    getModelVersion: vi.fn(() => null),
    count: vi.fn(() => 0),
  } as unknown as VectorStore;
}

/** Create a valid test zip buffer with book.json and chapters. */
function createTestZip(
  manifest: Record<string, unknown>,
  chapters: Array<{ slug: string; content: string }> = [],
): string {
  const zip = new AdmZip();
  zip.addFile("book.json", Buffer.from(JSON.stringify(manifest)));
  for (const ch of chapters) {
    zip.addFile(`chapters/${ch.slug}.md`, Buffer.from(ch.content));
  }
  return zip.toBuffer().toString("base64");
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "librarian-zip-"));
  corpusDir = path.join(tmpDir, "_corpus");
  await fs.mkdir(corpusDir, { recursive: true });
  deps = {
    corpusDir,
    vectorStore: createMockVectorStore(),
    clearCaches: vi.fn(),
  };
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("librarian_add_book (zip mode)", () => {
  it("adds book from valid zip", async () => {
    const zipBase64 = createTestZip(
      {
        slug: "zip-book",
        title: "Zip Book",
        number: "I",
        sortOrder: 1,
        domain: ["teaching"],
        tags: ["test"],
      },
      [
        { slug: "ch00-intro", content: "# Intro\nContent here" },
        { slug: "ch01-body", content: "# Body\nMore content" },
      ],
    );

    const result = await librarianAddBook(deps, { zip_base64: zipBase64 });

    expect(result.slug).toBe("zip-book");
    expect(result.chaptersWritten).toBe(2);
    expect(result.indexed).toBe(false);
    expect(result.directory).toBe("_corpus/zip-book");

    // Verify filesystem
    const manifest = JSON.parse(
      await fs.readFile(
        path.join(corpusDir, "zip-book", "book.json"),
        "utf-8",
      ),
    );
    expect(manifest.slug).toBe("zip-book");
    expect(manifest.sortOrder).toBe(1);
    expect(manifest.domain).toEqual(["teaching"]);

    const ch = await fs.readFile(
      path.join(corpusDir, "zip-book", "chapters", "ch00-intro.md"),
      "utf-8",
    );
    expect(ch).toBe("# Intro\nContent here");

    expect(deps.clearCaches).toHaveBeenCalled();
  });

  it("rejects zip missing book.json", async () => {
    const zip = new AdmZip();
    zip.addFile("chapters/ch00-intro.md", Buffer.from("# Intro\nContent"));
    const zipBase64 = zip.toBuffer().toString("base64");

    await expect(
      librarianAddBook(deps, { zip_base64: zipBase64 }),
    ).rejects.toThrow("book.json");
  });

  it("rejects zip with invalid book.json", async () => {
    const zipBase64 = createTestZip(
      { slug: "bad-book", title: "Bad" },
      [{ slug: "ch00-intro", content: "# Intro" }],
    );

    await expect(
      librarianAddBook(deps, { zip_base64: zipBase64 }),
    ).rejects.toThrow("book.json must contain");
  });

  it("rejects zip with invalid domain values", async () => {
    const zipBase64 = createTestZip(
      {
        slug: "bad-domain",
        title: "Bad Domain",
        number: "I",
        sortOrder: 1,
        domain: ["bogus"],
      },
      [{ slug: "ch00-intro", content: "# Intro" }],
    );

    await expect(
      librarianAddBook(deps, { zip_base64: zipBase64 }),
    ).rejects.toThrow("Invalid domain value");
  });

  it("rejects zip with slug conflict", async () => {
    // Create existing book
    const bookDir = path.join(corpusDir, "existing-book");
    await fs.mkdir(path.join(bookDir, "chapters"), { recursive: true });
    await fs.writeFile(
      path.join(bookDir, "book.json"),
      JSON.stringify({ slug: "existing-book", title: "Existing" }),
    );

    const zipBase64 = createTestZip(
      {
        slug: "existing-book",
        title: "Conflict",
        number: "I",
        sortOrder: 1,
        domain: ["teaching"],
      },
      [{ slug: "ch00-intro", content: "# Intro" }],
    );

    await expect(
      librarianAddBook(deps, { zip_base64: zipBase64 }),
    ).rejects.toThrow("Document already exists");
  });

  it("rejects zip with path traversal", async () => {
    const zip = new AdmZip();
    zip.addFile(
      "book.json",
      Buffer.from(
        JSON.stringify({
          slug: "evil-book",
          title: "Evil",
          number: "I",
          sortOrder: 1,
          domain: ["teaching"],
        }),
      ),
    );
    zip.addFile("chapters/ch00-intro.md", Buffer.from("# Intro"));
    // adm-zip sanitizes ".." during addFile, so manipulate entryName directly
    // to simulate a maliciously crafted zip archive
    const entries = zip.getEntries();
    const target = entries.find(
      (e) => e.entryName === "chapters/ch00-intro.md",
    )!;
    target.entryName = "../../../etc/passwd";
    const zipBase64 = zip.toBuffer().toString("base64");

    await expect(
      librarianAddBook(deps, { zip_base64: zipBase64 }),
    ).rejects.toThrow("Path traversal");
  });

  it("rejects zip exceeding size limit", async () => {
    const zip = new AdmZip();
    zip.addFile(
      "book.json",
      Buffer.from(
        JSON.stringify({
          slug: "big-book",
          title: "Big",
          number: "I",
          sortOrder: 1,
          domain: ["teaching"],
        }),
      ),
    );
    // Create a large entry that exceeds 50 MB when reported in header
    // We can't easily fake header.size with adm-zip, so we create real large content
    const bigContent = Buffer.alloc(51 * 1024 * 1024, "x");
    zip.addFile("chapters/ch00-big.md", bigContent);
    const zipBase64 = zip.toBuffer().toString("base64");

    await expect(
      librarianAddBook(deps, { zip_base64: zipBase64 }),
    ).rejects.toThrow("uncompressed limit");
  });

  it("rejects zip with suspicious compression ratio", async () => {
    // Create a zip with manually crafted entries to trigger ratio check.
    // adm-zip compresses entries, so a highly compressible buffer will
    // naturally have a high ratio.
    const zip = new AdmZip();
    zip.addFile(
      "book.json",
      Buffer.from(
        JSON.stringify({
          slug: "bomb-book",
          title: "Bomb",
          number: "I",
          sortOrder: 1,
          domain: ["teaching"],
        }),
      ),
    );
    // Create highly compressible content (repeated null bytes)
    // 10 MB of null bytes → compresses to a few KB → ratio > 100
    const compressible = Buffer.alloc(10 * 1024 * 1024, 0);
    zip.addFile("chapters/ch00-bomb.md", compressible);
    const zipBase64 = zip.toBuffer().toString("base64");

    await expect(
      librarianAddBook(deps, { zip_base64: zipBase64 }),
    ).rejects.toThrow("compression ratio");
  });

  it("rejects zip with symlink", async () => {
    const zip = new AdmZip();
    zip.addFile(
      "book.json",
      Buffer.from(
        JSON.stringify({
          slug: "symlink-book",
          title: "Symlink",
          number: "I",
          sortOrder: 1,
          domain: ["teaching"],
        }),
      ),
    );
    zip.addFile("chapters/ch00-intro.md", Buffer.from("# Intro"));

    // Manually set symlink attribute on an entry
    const entries = zip.getEntries();
    const chEntry = entries.find(
      (e) => e.entryName === "chapters/ch00-intro.md",
    )!;
    // Set Unix external attributes to symlink (0o120000 << 16)
    chEntry.header.attr = (0o120777 << 16) >>> 0;

    const zipBase64 = zip.toBuffer().toString("base64");

    await expect(
      librarianAddBook(deps, { zip_base64: zipBase64 }),
    ).rejects.toThrow("Symlinks not allowed");
  });

  it("rejects zip with duplicate chapters", async () => {
    const zip = new AdmZip();
    zip.addFile(
      "book.json",
      Buffer.from(
        JSON.stringify({
          slug: "dupe-book",
          title: "Dupe",
          number: "I",
          sortOrder: 1,
          domain: ["teaching"],
        }),
      ),
    );
    // adm-zip deduplicates addFile, so add two distinct files then rename
    zip.addFile("chapters/ch00-intro.md", Buffer.from("# Intro v1"));
    zip.addFile("chapters/ch01-second.md", Buffer.from("# Intro v2"));
    const entries = zip.getEntries();
    const second = entries.find(
      (e) => e.entryName === "chapters/ch01-second.md",
    )!;
    second.entryName = "chapters/ch00-intro.md";
    const zipBase64 = zip.toBuffer().toString("base64");

    await expect(
      librarianAddBook(deps, { zip_base64: zipBase64 }),
    ).rejects.toThrow("Duplicate chapter slug");
  });

  it("rejects zip with nested chapter dirs", async () => {
    const zip = new AdmZip();
    zip.addFile(
      "book.json",
      Buffer.from(
        JSON.stringify({
          slug: "nested-book",
          title: "Nested",
          number: "I",
          sortOrder: 1,
          domain: ["teaching"],
        }),
      ),
    );
    zip.addFile("chapters/sub/ch00-intro.md", Buffer.from("# Intro"));
    const zipBase64 = zip.toBuffer().toString("base64");

    await expect(
      librarianAddBook(deps, { zip_base64: zipBase64 }),
    ).rejects.toThrow("Nested directories");
  });

  it("rejects zip with no chapters", async () => {
    const zipBase64 = createTestZip(
      {
        slug: "empty-zip",
        title: "Empty",
        number: "I",
        sortOrder: 1,
        domain: ["teaching"],
      },
      [],
    );

    await expect(
      librarianAddBook(deps, { zip_base64: zipBase64 }),
    ).rejects.toThrow("at least one chapter");
  });

  it("rolls back on write failure", async () => {
    const zipBase64 = createTestZip(
      {
        slug: "rollback-book",
        title: "Rollback",
        number: "I",
        sortOrder: 1,
        domain: ["teaching"],
      },
      [{ slug: "ch00-intro", content: "# Intro" }],
    );

    // Make the corpus dir read-only so mkdir for the temp dir fails
    await fs.chmod(corpusDir, 0o444);

    await expect(
      librarianAddBook(deps, { zip_base64: zipBase64 }),
    ).rejects.toThrow();

    // Restore permissions for cleanup
    await fs.chmod(corpusDir, 0o755);

    // Verify no temp directory or final directory left behind
    const entries = await fs.readdir(corpusDir);
    const leftover = entries.filter(
      (e) => e.includes("rollback-book") || e.startsWith(".tmp-"),
    );
    expect(leftover).toEqual([]);
  });
});
