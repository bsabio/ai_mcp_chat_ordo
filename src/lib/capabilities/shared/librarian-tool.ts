import * as fs from "fs/promises";
import * as path from "path";
import AdmZip from "adm-zip";
import type { VectorStore } from "@/core/search/ports/VectorStore";
import {
  assertSafePath,
  assertValidSlug,
  pathExists,
  validateZipSafety,
  VALID_DOMAINS,
} from "./librarian-safety";

// ---------------------------------------------------------------------------
// Deps
// ---------------------------------------------------------------------------

export interface CorpusToolDeps {
  corpusDir: string; // absolute path to docs/_corpus/
  vectorStore: VectorStore; // for embedding cleanup on remove
  clearCaches: () => void; // callback to clear repo + discovery caches
}

export type LibrarianToolDeps = CorpusToolDeps;

// ---------------------------------------------------------------------------
// addDocumentFromZip (Sprint 2 — LIBRARIAN-040)
// ---------------------------------------------------------------------------

async function addDocumentFromZip(
  deps: CorpusToolDeps,
  zipBase64: string,
) {
  // 1. Decode base64 to Buffer
  const zipBuffer = Buffer.from(zipBase64, "base64");
  const zip = new AdmZip(zipBuffer);

  // 2. Validate zip safety
  const entries = zip.getEntries();
  validateZipSafety(entries);

  // 3. Find and parse book.json
  const bookJsonEntry = entries.find((e) => e.entryName === "book.json");
  if (!bookJsonEntry) {
    throw new Error("Zip archive must contain book.json at the root.");
  }
  const manifest = JSON.parse(
    bookJsonEntry.getData().toString("utf-8"),
  ) as Record<string, unknown>;
  if (!manifest.slug || !manifest.title || !manifest.number) {
    throw new Error("book.json must contain slug, title, and number.");
  }
  if (typeof manifest.sortOrder !== "number") {
    throw new Error("book.json must contain a numeric sortOrder.");
  }
  if (!Array.isArray(manifest.domain) || manifest.domain.length === 0) {
    throw new Error("book.json must contain a non-empty domain array.");
  }
  for (const d of manifest.domain as string[]) {
    if (!VALID_DOMAINS.has(d)) {
      throw new Error(
        `Invalid domain value in zip book.json: "${d}". Valid: ${[...VALID_DOMAINS].join(", ")}`,
      );
    }
  }
  assertValidSlug(manifest.slug as string);

  // 4. Check slug uniqueness — never overwrite
  const targetDir = assertSafePath(deps.corpusDir, manifest.slug as string);
  if (await pathExists(targetDir)) {
    throw new Error(`Document already exists: ${manifest.slug as string}`);
  }

  // 5. Extract to temp directory first (atomic)
  const tmpDir = path.join(
    deps.corpusDir,
    `.tmp-${manifest.slug as string}-${Date.now()}`,
  );
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

      // Validate no nested directories under chapters/
      if (entry.entryName.split("/").length > 2) {
        throw new Error(
          `Nested directories under chapters/ not allowed: "${entry.entryName}"`,
        );
      }

      // Validate chapter slug
      assertValidSlug(chapterSlug);

      // Reject duplicate chapter slugs
      if (seenSlugs.has(chapterSlug)) {
        throw new Error(
          `Duplicate chapter slug in zip: "${chapterSlug}"`,
        );
      }
      seenSlugs.add(chapterSlug);

      const chapterPath = assertSafePath(chaptersDir, `${chapterSlug}.md`);
      await fs.writeFile(chapterPath, entry.getData().toString("utf-8"));
      chaptersWritten++;
    }

    if (chaptersWritten === 0) {
      throw new Error(
        "Zip archive must contain at least one chapter in chapters/.",
      );
    }

    // 6. Atomic move: temp → final location
    await fs.rename(tmpDir, targetDir);

    // 7. Clear caches
    deps.clearCaches();

    return {
      slug: manifest.slug as string,
      title: manifest.title as string,
      directory: `_corpus/${manifest.slug as string}`,
      chaptersWritten,
      indexed: false,
      hint: "Run rebuild_index to make this document searchable.",
    };
  } catch (err) {
    // Rollback: remove temp directory on any failure
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.warn("[librarian] temp cleanup failed", cleanupError);
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// corpus_list
// ---------------------------------------------------------------------------

export async function corpusList(deps: CorpusToolDeps) {
  const collected: Array<{
    slug: string;
    title: string;
    number: string;
    domain: string[];
    tags: string[];
    chapterCount: number;
    indexed: boolean;
    sortOrder: number;
  }> = [];

  let entries: string[] = [];
  try {
    entries = await fs.readdir(deps.corpusDir);
  } catch {
    // Missing corpus directory is a valid empty-state for local/bootstrap setups.
  }

  const dirChecks = await Promise.all(
    entries.map(async (name) => {
      const stat = await fs.stat(path.join(deps.corpusDir, name));
      return { name, isDir: stat.isDirectory() };
    }),
  );
  const dirs = dirChecks.filter((d) => d.isDir);

  for (const dir of dirs) {
    const manifestPath = path.join(deps.corpusDir, dir.name, "book.json");
    try {
      const raw = await fs.readFile(manifestPath, "utf-8");
      const manifest = JSON.parse(raw) as Record<string, unknown>;

      const slug = manifest.slug as string | undefined;
      const title = manifest.title as string | undefined;
      const number = manifest.number as string | undefined;
      const sortOrder = manifest.sortOrder;
      const domain = manifest.domain as string[] | undefined;
      const tags = (manifest.tags ?? []) as string[];

      if (!slug || !title || !number) continue;
      if (typeof sortOrder !== "number") continue;
      if (!Array.isArray(domain) || domain.length === 0) continue;
      if (dir.name !== slug) continue;

      // Count chapters
      const chaptersDir = path.join(deps.corpusDir, slug, "chapters");
      let chapterSlugs: string[] = [];
      try {
        const files = await fs.readdir(chaptersDir);
        chapterSlugs = files
          .filter((f) => f.endsWith(".md"))
          .map((f) => f.replace(/\.md$/, ""));
      } catch {
        // Missing chapters directory is allowed so partially-authored documents still list.
      }

      // Check indexing status — any chapter has embeddings?
      const indexed = chapterSlugs.some(
        (cs) => deps.vectorStore.getBySourceId(`${slug}/${cs}`).length > 0,
      );

      collected.push({
        slug,
        title,
        number,
        domain,
        tags,
        chapterCount: chapterSlugs.length,
        indexed,
        sortOrder: sortOrder as number,
      });
    } catch (error) {
      console.warn(`[librarian] skipping invalid manifest: ${manifestPath}`, error);
    }
  }

  // Sort by sortOrder ascending
  collected.sort((a, b) => a.sortOrder - b.sortOrder);

  // Strip sortOrder from output
  const documents = collected.map(({ sortOrder: _, ...rest }) => rest);
  const totalSections = documents.reduce((sum, document) => sum + document.chapterCount, 0);

  return {
    documents,
    books: documents,
    totalDocuments: documents.length,
    totalBooks: documents.length,
    totalSections,
    totalChapters: totalSections,
  };
}

export const librarianList = corpusList;

// ---------------------------------------------------------------------------
// corpus_get
// ---------------------------------------------------------------------------

export async function corpusGetDocument(
  deps: CorpusToolDeps,
  args: { slug: string },
) {
  assertValidSlug(args.slug);

  const bookDir = assertSafePath(deps.corpusDir, args.slug);
  const manifestPath = path.join(bookDir, "book.json");

  if (!(await pathExists(manifestPath))) {
    throw new Error(`Document not found: "${args.slug}".`);
  }

  const raw = await fs.readFile(manifestPath, "utf-8");
  const manifest = JSON.parse(raw) as Record<string, unknown>;

  const chaptersDir = path.join(bookDir, "chapters");
  const chapters: Array<{
    slug: string;
    title: string;
    indexed: boolean;
    contentLength: number;
  }> = [];

  try {
    const files = (await fs.readdir(chaptersDir))
      .filter((f) => f.endsWith(".md"))
      .sort();

    for (const file of files) {
      const chapterSlug = file.replace(/\.md$/, "");
      const content = await fs.readFile(
        path.join(chaptersDir, file),
        "utf-8",
      );

      // Extract title from first # heading, fallback to filename
      const headingMatch = content.match(/^#\s+(.+)$/m);
      const title = headingMatch ? headingMatch[1] : chapterSlug;

      const indexed =
        deps.vectorStore.getBySourceId(`${args.slug}/${chapterSlug}`).length >
        0;

      chapters.push({
        slug: chapterSlug,
        title,
        indexed,
        contentLength: content.length,
      });
    }
  } catch {
    // Books may be created before any chapter files exist.
  }

  const document = {
    slug: manifest.slug as string,
    title: manifest.title as string,
    number: manifest.number as string,
    domain: (manifest.domain ?? []) as string[],
    tags: (manifest.tags ?? []) as string[],
    directory: `_corpus/${args.slug}`,
    chapters,
  };

  return {
    ...document,
    document,
    sections: chapters,
  };
}

export const librarianGetBook = corpusGetDocument;

// ---------------------------------------------------------------------------
// corpus_add_document (manual JSON + zip dispatch)
// ---------------------------------------------------------------------------

export async function corpusAddDocument(
  deps: CorpusToolDeps,
  args: {
    slug?: string;
    title?: string;
    number?: string;
    sortOrder?: number;
    domain?: string[];
    tags?: string[];
    chapters?: Array<{ slug: string; content: string }>;
    zip_base64?: string;
  },
) {
  // Dispatch to zip mode if zip_base64 is provided
  if (args.zip_base64) {
    return addDocumentFromZip(deps, args.zip_base64);
  }

  // Manual mode — validate required fields
  if (!args.slug || !args.title || !args.number) {
    throw new Error(
      "corpus_add_document requires slug, title, number, sortOrder, and domain.",
    );
  }
  if (typeof args.sortOrder !== "number") {
    throw new Error("sortOrder must be a number.");
  }
  assertValidSlug(args.slug);

  // 1b. Validate domain against controlled vocabulary
  if (!Array.isArray(args.domain) || args.domain.length === 0) {
    throw new Error("domain must be a non-empty array.");
  }
  for (const d of args.domain) {
    if (!VALID_DOMAINS.has(d)) {
      throw new Error(
        `Invalid domain value: "${d}". Valid: ${[...VALID_DOMAINS].join(", ")}`,
      );
    }
  }

  // 2. LIBRARIAN-090: directory = slug
  const bookDir = assertSafePath(deps.corpusDir, args.slug);
  if (await pathExists(bookDir)) {
    throw new Error(`Document already exists: ${args.slug}`);
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
    hint: "Run rebuild_index to make this document searchable.",
  };
}

export const librarianAddBook = corpusAddDocument;

// ---------------------------------------------------------------------------
// corpus_add_section
// ---------------------------------------------------------------------------

export async function corpusAddSection(
  deps: CorpusToolDeps,
  args: { book_slug: string; chapter_slug: string; content: string },
) {
  assertValidSlug(args.book_slug);
  assertValidSlug(args.chapter_slug);

  if (!args.content || args.content.length === 0) {
    throw new Error("Chapter content must not be empty.");
  }

  const bookDir = assertSafePath(deps.corpusDir, args.book_slug);
  if (!(await pathExists(bookDir))) {
    throw new Error(`Document not found: "${args.book_slug}".`);
  }

  const chaptersDir = path.join(bookDir, "chapters");
  await fs.mkdir(chaptersDir, { recursive: true });

  const chapterPath = assertSafePath(chaptersDir, `${args.chapter_slug}.md`);
  await fs.writeFile(chapterPath, args.content);

  // LIBRARIAN-050: clear caches after mutation
  deps.clearCaches();

  return {
    book_slug: args.book_slug,
    chapter_slug: args.chapter_slug,
    written: true,
  };
}

export const librarianAddChapter = corpusAddSection;

// ---------------------------------------------------------------------------
// corpus_remove_document
// ---------------------------------------------------------------------------

export async function corpusRemoveDocument(
  deps: CorpusToolDeps,
  args: { slug: string },
) {
  assertValidSlug(args.slug);

  const bookDir = assertSafePath(deps.corpusDir, args.slug);
  if (!(await pathExists(bookDir))) {
    throw new Error(`Document not found: "${args.slug}".`);
  }

  // Enumerate chapters so we can clean up embeddings
  const chaptersDir = path.join(bookDir, "chapters");
  let chapterSlugs: string[] = [];
  try {
    const files = await fs.readdir(chaptersDir);
    chapterSlugs = files
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, ""));
  } catch {
    // Missing chapters directory means there is nothing to de-index.
  }

  // LIBRARIAN-060: delete embeddings for each chapter
  let embeddingsDeleted = 0;
  for (const cs of chapterSlugs) {
    const before = deps.vectorStore.count();
    deps.vectorStore.delete(`${args.slug}/${cs}`);
    embeddingsDeleted += before - deps.vectorStore.count();
  }

  // Remove entire book directory
  await fs.rm(bookDir, { recursive: true });

  // LIBRARIAN-050: clear caches
  deps.clearCaches();

  return {
    slug: args.slug,
    chaptersRemoved: chapterSlugs.length,
    embeddingsDeleted,
  };
}

export const librarianRemoveBook = corpusRemoveDocument;

// ---------------------------------------------------------------------------
// corpus_remove_section
// ---------------------------------------------------------------------------

export async function corpusRemoveSection(
  deps: CorpusToolDeps,
  args: { book_slug: string; chapter_slug: string },
) {
  assertValidSlug(args.book_slug);
  assertValidSlug(args.chapter_slug);

  const bookDir = assertSafePath(deps.corpusDir, args.book_slug);
  if (!(await pathExists(bookDir))) {
    throw new Error(`Document not found: "${args.book_slug}".`);
  }

  const chapterPath = assertSafePath(
    bookDir,
    "chapters",
    `${args.chapter_slug}.md`,
  );
  if (!(await pathExists(chapterPath))) {
    throw new Error(
      `Chapter not found: "${args.chapter_slug}" in book "${args.book_slug}".`,
    );
  }

  // LIBRARIAN-060: delete embeddings
  const before = deps.vectorStore.count();
  deps.vectorStore.delete(`${args.book_slug}/${args.chapter_slug}`);
  const embeddingsDeleted = before - deps.vectorStore.count();

  // Remove the file
  await fs.unlink(chapterPath);

  // LIBRARIAN-050: clear caches
  deps.clearCaches();

  return {
    book_slug: args.book_slug,
    chapter_slug: args.chapter_slug,
    embeddingsDeleted,
  };
}

export const librarianRemoveChapter = corpusRemoveSection;

// ---------------------------------------------------------------------------
// Tool schemas — Sprint 17: extracted from the MCP operations server transport shell
// ---------------------------------------------------------------------------

export function getCorpusToolSchemas() {
  return [
    {
      name: "corpus_list",
      description:
        "List all documents in the corpus with section counts and indexing status.",
      inputSchema: {
        type: "object" as const,
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "corpus_get",
      description:
        "Get details of a corpus document including its sections.",
      inputSchema: {
        type: "object" as const,
        properties: {
          slug: { type: "string", description: "Document slug." },
        },
        required: ["slug"],
        additionalProperties: false,
      },
    },
    {
      name: "corpus_add_document",
      description:
        "Add a new document to the corpus. Provide slug/title/number/sortOrder/domain/chapters, OR a base64-encoded zip archive containing book.json and chapters/.",
      inputSchema: {
        type: "object" as const,
        properties: {
          slug: {
            type: "string",
            description:
              "Document slug (lowercase kebab-case). Becomes the directory name.",
          },
          title: { type: "string", description: "Document title." },
          number: {
            type: "string",
            description: "Display number (e.g. 'XI'). Decorative only.",
          },
          sortOrder: { type: "number", description: "Numeric sort order." },
          domain: {
            type: "array",
            description:
              "Content domains (e.g. ['teaching', 'reference']).",
            items: { type: "string" },
          },
          tags: {
            type: "array",
            description:
              "Optional freeform tags (lowercase kebab-case).",
            items: { type: "string" },
          },
          chapters: {
            type: "array",
            description: "Array of {slug, content} section objects.",
            items: {
              type: "object",
              properties: {
                slug: { type: "string" },
                content: { type: "string" },
              },
              required: ["slug", "content"],
            },
          },
          zip_base64: {
            type: "string",
            description:
              "Base64-encoded zip archive containing book.json and chapters/. If provided, all other fields are ignored.",
          },
        },
        additionalProperties: false,
      },
    },
    {
      name: "corpus_add_section",
      description:
        "Add a section to an existing document in the corpus. Overwrites if the section already exists.",
      inputSchema: {
        type: "object" as const,
        properties: {
          book_slug: {
            type: "string",
            description: "Slug of the target document.",
          },
          chapter_slug: {
            type: "string",
            description: "Section slug (becomes filename).",
          },
          content: {
            type: "string",
            description: "Section markdown content.",
          },
        },
        required: ["book_slug", "chapter_slug", "content"],
        additionalProperties: false,
      },
    },
    {
      name: "corpus_remove_document",
      description:
        "Remove a document and all its embeddings from the corpus.",
      inputSchema: {
        type: "object" as const,
        properties: {
          slug: {
            type: "string",
            description: "Document slug to remove.",
          },
        },
        required: ["slug"],
        additionalProperties: false,
      },
    },
    {
      name: "corpus_remove_section",
      description:
        "Remove a single section and its embeddings from a document.",
      inputSchema: {
        type: "object" as const,
        properties: {
          book_slug: { type: "string", description: "Document slug." },
          chapter_slug: {
            type: "string",
            description: "Section slug to remove.",
          },
        },
        required: ["book_slug", "chapter_slug"],
        additionalProperties: false,
      },
    },
  ];
}
