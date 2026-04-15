import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import type { LibrarianToolDeps } from "@/lib/capabilities/shared/librarian-tool";
import {
  librarianAddBook,
  librarianAddChapter,
} from "@/lib/capabilities/shared/librarian-tool";
import type { VectorStore } from "@/core/search/ports/VectorStore";

/**
 * Sprint 1 — Path traversal prevention and slug validation (LIBRARIAN-070, 080).
 */

let tmpDir: string;
let corpusDir: string;
let deps: LibrarianToolDeps;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "librarian-security-"));
  corpusDir = path.join(tmpDir, "_corpus");
  await fs.mkdir(corpusDir, { recursive: true });
  deps = {
    corpusDir,
    vectorStore: {
      upsert: vi.fn(),
      delete: vi.fn(),
      getAll: vi.fn(() => []),
      getBySourceId: vi.fn(() => []),
      getContentHash: vi.fn(() => null),
      getModelVersion: vi.fn(() => null),
      count: vi.fn(() => 0),
    } as unknown as VectorStore,
    clearCaches: vi.fn(),
  };
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("path traversal and slug validation", () => {
  it("rejects slug with path traversal", async () => {
    await expect(
      librarianAddBook(deps, {
        slug: "../etc",
        title: "Evil",
        number: "I",
        sortOrder: 1,
        domain: ["teaching"],
      }),
    ).rejects.toThrow(/[Ii]nvalid slug/);
  });

  it("rejects slug with dots", async () => {
    await expect(
      librarianAddBook(deps, {
        slug: "my.book",
        title: "Dotted",
        number: "I",
        sortOrder: 1,
        domain: ["teaching"],
      }),
    ).rejects.toThrow(/[Ii]nvalid slug/);
  });

  it("rejects absolute path in slug", async () => {
    await expect(
      librarianAddBook(deps, {
        slug: "/tmp/evil",
        title: "Absolute",
        number: "I",
        sortOrder: 1,
        domain: ["teaching"],
      }),
    ).rejects.toThrow(/[Ii]nvalid slug/);
  });

  it("rejects chapter slug with traversal", async () => {
    // Create a valid book first
    await librarianAddBook(deps, {
      slug: "safe-book",
      title: "Safe",
      number: "I",
      sortOrder: 1,
      domain: ["teaching"],
    });

    await expect(
      librarianAddChapter(deps, {
        book_slug: "safe-book",
        chapter_slug: "../../passwd",
        content: "evil content",
      }),
    ).rejects.toThrow(/[Ii]nvalid slug/);
  });

  it("rejects single-char slug", async () => {
    await expect(
      librarianAddBook(deps, {
        slug: "a",
        title: "Single",
        number: "I",
        sortOrder: 1,
        domain: ["teaching"],
      }),
    ).rejects.toThrow(/[Ii]nvalid slug/);
  });
});
