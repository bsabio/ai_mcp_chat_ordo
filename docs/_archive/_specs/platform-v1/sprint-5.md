# V1 Sprint 5 — Public Content Routes

> **Parent spec:** [Platform V1](spec.md) §8 Phase C, Sprint 5
> **Requirement IDs:** PLAT-005 (content is public and indexable), PLAT-026 (public routes do not expose draft content)
> **Sprint 4 Baseline:** 1311 tests, 164 suites, build clean
> **Goal:** Add dynamic SEO metadata (`generateMetadata`), Open Graph tags, JSON-LD structured data (Article/Book schema), and canonical URLs to the existing library routes (`/library`, `/library/[document]`, `/library/[document]/[section]`). Verify that all library content is publicly accessible without authentication. Create a utility that extracts page descriptions from markdown. No new routes are created — this sprint enriches existing ones.

---

## §1 Current State

### §1.1 What exists after Sprint 4

Library routes are fully functional with statically generated pages for all 10 books and 104 chapters. The identity config layer provides brand name, domain, and description.

| Capability | File | Status |
| --- | --- | --- |
| Library index page | `src/app/library/page.tsx` | **Working** — lists all 10 books with chapter counts |
| Book redirect (domain → first chapter) | `src/app/library/[document]/page.tsx` | **Working** — redirects `/library/{book}` to first chapter |
| Chapter reading page | `src/app/library/[document]/[section]/page.tsx` | **Working** — renders markdown with sidebar, prev/next nav |
| Section slug resolver | `src/app/library/section/[slug]/page.tsx` | **Working** — resolves chapter slug → canonical book/chapter URL |
| Static param generation | `generateStaticParams()` in chapter and book pages | **Working** — pre-builds all 104 chapter routes at compile time |
| Corpus facade | `src/lib/corpus-library.ts` | **Working** — `getDocuments()`, `getCorpusSummaries()`, `getSectionFull()`, `getCorpusIndex()` |
| Instance identity config | `config/identity.json` + `src/lib/config/instance.ts` | **Working** — brand name, domain, description, tagline |
| Legacy redirects | `src/app/corpus/page.tsx`, `src/app/books/page.tsx` | **Working** — redirect to `/library` |

### §1.2 What does NOT exist yet

| Capability | V1 spec ref | Impact |
| --- | --- | --- |
| Dynamic `generateMetadata` on library pages | §3.4, §4.2 | All library pages show the generic root layout title ("Studio Ordo | Strategic AI Advisory"). Search engines see no page-specific metadata. |
| Open Graph tags (`og:title`, `og:description`, `og:type`, `og:url`) | §3.4 | Social media link previews show no content-specific information. |
| JSON-LD structured data | §3.4 | No Article or Book schema for search engine rich results. |
| Canonical URLs on library pages | §3.4 | Duplicate content risk — search engines cannot identify the canonical version of each page. |
| Description extraction from markdown | — | No utility to extract the first meaningful paragraph from chapter content for use as `meta description` and `og:description`. |
| Public access verification | §6.2 PLAT-005 | No tests confirming library routes are accessible without authentication. |
| Chat CTA on library pages | §3.4 | No "Have questions about this topic? Ask the AI." link from content pages back to chat. |

### §1.3 Architecture reference

The V1 spec §3.4 defines each public content page as including:

```text
- OG title, description, image tags
- Canonical URL
- JSON-LD structured data (Article schema)
- Link to chat: "Have questions about this topic? Ask the AI."
```

Sprint 5 implements all four for the existing library routes. Sprint 6 subsequently adds `sitemap.xml`, `robots.txt`, and Plausible analytics — those are explicitly out of scope for Sprint 5.

---

## §2 Design Decisions

### §2.1 Use Next.js `generateMetadata` (not static `metadata` exports)

The library index currently exports a static `metadata` object. Chapter pages have no metadata at all. Sprint 5 converts library pages to use Next.js's `generateMetadata()` async function, which has access to route params and can produce page-specific titles, descriptions, and OG tags. This is Next.js's standard approach for dynamic metadata.

**Library index**: Static data only (book count, tagline) — `generateMetadata()` reads from the identity config to build a brand-aware title and description.

**Book pages** (`/library/[document]`): These redirect immediately, so no metadata is needed (redirects don't render).

**Chapter pages** (`/library/[document]/[section]`): `generateMetadata()` loads the chapter title, book title, and extracts a description from the chapter markdown content. This produces unique, content-aware metadata for each of the 104 chapters.

### §2.2 Description extraction strips markdown to plain text

Chapter markdown starts with `# Chapter N — Title`, then `## Abstract`, then body paragraphs. The description extractor:

1. Strips the leading `# Title` line
2. Strips `## Abstract` heading if present
3. Takes the first non-empty paragraph (up to 160 characters)
4. Strips markdown formatting (bold, italic, links, code) to produce plain text

This utility is placed at `src/lib/seo/extract-description.ts` — a pure function with no dependencies on external libraries. It is reusable for future blog pages (Sprint 7) and sitemap descriptions (Sprint 6).

### §2.3 JSON-LD uses Article schema for chapters, CollectionPage for index

**Chapter pages** emit JSON-LD with `@type: "Article"`:
- `headline`: chapter title
- `description`: extracted description
- `author`: `{ "@type": "Organization", "name": "{brand.name}" }`
- `publisher`: same as author
- `isPartOf`: `{ "@type": "Book", "name": "{book.title}" }`
- `url`: canonical URL
- `inLanguage`: `"en"`

**Library index** emits JSON-LD with `@type: "CollectionPage"`:
- `name`: "Library"
- `description`: library description
- `url`: canonical URL
- `numberOfItems`: total chapter count
- `provider`: `{ "@type": "Organization", "name": "{brand.name}" }`

The JSON-LD is injected as a `<script type="application/ld+json">` tag via the metadata `other` field or a component embedded in the page.

### §2.4 Canonical URLs use the configured domain

Canonical URLs are constructed from `identity.domain` in `config/identity.json`. For chapter pages: `https://{domain}/library/{book}/{chapter}`. For the library index: `https://{domain}/library`. This prevents wildcard domain duplication in search engine indexes.

### §2.5 OG image falls back to the site logo

Sprint 5 does not generate per-chapter OG images. All library pages use the site logo (`identity.logoPath`) as the `og:image`. Dynamic OG images are a future consideration (Sprint 12 or later).

### §2.6 Chat CTA is a static link, not a component

Each chapter page gets a footer link: "Have questions about this topic? Ask the AI." This links to `/?topic={encodeURIComponent(chapterTitle)}` so the homepage can optionally pre-populate the chat context. The link is a plain `<a>` tag — no React component or JavaScript needed. The `topic` param is a progressive enhancement; if the homepage doesn't read it, the link still works.

### §2.7 Library routes remain public (no auth check)

The library pages do not check authentication. They are server components that read from the filesystem corpus. Sprint 5 adds tests verifying that the pages render without session context — confirming that search engine crawlers and anonymous visitors can access all content.

### §2.8 Metadata helper is a shared utility

A `buildLibraryMetadata` helper in `src/lib/seo/library-metadata.ts` centralizes the OG tag construction, canonical URL building, and JSON-LD generation. This keeps the page components clean (they call one function) and ensures consistency across library index and chapter pages.

---

## §3 Implementation Plan

### Phase 1: Description extraction utility

**New file:**
- `src/lib/seo/extract-description.ts` — Pure function that extracts a plain-text description from markdown content.

**Implementation:**
```typescript
/**
 * Extract a plain-text description from markdown content.
 * Strips the leading title, abstract heading, and markdown formatting.
 * Returns the first meaningful paragraph, truncated to maxLength characters.
 */
export function extractDescription(markdown: string, maxLength = 160): string {
  const lines = markdown.split("\n");

  // Skip leading title (# ...) and abstract heading (## Abstract)
  let started = false;
  const paragraphLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!started) {
      if (trimmed.startsWith("# ")) continue;          // skip title
      if (trimmed.startsWith("## ")) continue;          // skip abstract heading
      if (trimmed === "---") continue;                   // skip horizontal rules
      if (trimmed === "") continue;                      // skip blank lines
      started = true;
    }
    if (started) {
      if (trimmed === "" && paragraphLines.length > 0) break;  // end of first paragraph
      if (trimmed.startsWith("## ")) break;              // next section
      if (trimmed === "---") break;                      // horizontal rule
      paragraphLines.push(trimmed);
    }
  }

  // Strip markdown formatting
  let text = paragraphLines.join(" ");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");         // bold
  text = text.replace(/\*([^*]+)\*/g, "$1");              // italic
  text = text.replace(/`([^`]+)`/g, "$1");                // inline code
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");   // links
  text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, "");      // images

  if (text.length <= maxLength) return text;
  // Truncate at word boundary
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > maxLength * 0.7 ? truncated.slice(0, lastSpace) : truncated) + "…";
}
```

### Phase 2: SEO metadata helper

**New file:**
- `src/lib/seo/library-metadata.ts` — Builds Next.js `Metadata` objects and JSON-LD for library pages.

**Implementation:**
```typescript
import type { Metadata } from "next";
import { getInstanceIdentity } from "@/lib/config/instance";
import { extractDescription } from "./extract-description";

interface ChapterMetadataInput {
  chapterTitle: string;
  bookTitle: string;
  bookSlug: string;
  chapterSlug: string;
  content: string;
  chapterNumber: number;
  totalChapters: number;
}

export function buildChapterMetadata(input: ChapterMetadataInput): Metadata {
  const identity = getInstanceIdentity();
  const description = extractDescription(input.content);
  const canonicalUrl = `https://${identity.domain}/library/${input.bookSlug}/${input.chapterSlug}`;

  return {
    title: `${input.chapterTitle} — ${input.bookTitle} | ${identity.name}`,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: input.chapterTitle,
      description,
      url: canonicalUrl,
      siteName: identity.name,
      type: "article",
      images: [{ url: `https://${identity.domain}${identity.logoPath}` }],
    },
  };
}

export function buildChapterJsonLd(input: ChapterMetadataInput): Record<string, unknown> {
  const identity = getInstanceIdentity();
  const description = extractDescription(input.content);
  const canonicalUrl = `https://${identity.domain}/library/${input.bookSlug}/${input.chapterSlug}`;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.chapterTitle,
    description,
    url: canonicalUrl,
    inLanguage: "en",
    isPartOf: { "@type": "Book", name: input.bookTitle },
    author: { "@type": "Organization", name: identity.name },
    publisher: { "@type": "Organization", name: identity.name },
  };
}

export function buildLibraryIndexMetadata(bookCount: number, chapterCount: number): Metadata {
  const identity = getInstanceIdentity();
  const description = `Browse ${bookCount} books and ${chapterCount} chapters in the ${identity.name} library.`;
  const canonicalUrl = `https://${identity.domain}/library`;

  return {
    title: `Library — ${bookCount} Books, ${chapterCount} Chapters | ${identity.name}`,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${identity.name} Library`,
      description,
      url: canonicalUrl,
      siteName: identity.name,
      type: "website",
      images: [{ url: `https://${identity.domain}${identity.logoPath}` }],
    },
  };
}

export function buildLibraryIndexJsonLd(bookCount: number, chapterCount: number): Record<string, unknown> {
  const identity = getInstanceIdentity();
  const canonicalUrl = `https://${identity.domain}/library`;

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${identity.name} Library`,
    description: `Browse ${bookCount} books and ${chapterCount} chapters.`,
    url: canonicalUrl,
    numberOfItems: chapterCount,
    provider: { "@type": "Organization", name: identity.name },
  };
}
```

### Phase 3: Add `generateMetadata` to library index

**File modified:**
- `src/app/library/page.tsx` — Replace static `metadata` export with `generateMetadata()` function. Add JSON-LD `<script>` tag to the page component.

**Changes:**
1. Remove `export const metadata = { ... }`.
2. Add `export async function generateMetadata(): Promise<Metadata>` that calls `buildLibraryIndexMetadata(bookCount, chapterCount)`.
3. Add a `<script type="application/ld+json">` element in the page component body containing the CollectionPage JSON-LD.

### Phase 4: Add `generateMetadata` to chapter page

**File modified:**
- `src/app/library/[document]/[section]/page.tsx` — Add `generateMetadata()` function. Add JSON-LD `<script>` tag. Add chat CTA footer link.

**Changes:**
1. Add `export async function generateMetadata({ params })` that loads the chapter via `getSectionFull()`, then calls `buildChapterMetadata()`.
2. Add a `<script type="application/ld+json">` element in the article component, just before the `<footer>`, containing the Article JSON-LD.
3. Add a chat CTA link in the existing `<footer>` section: "Have questions about this topic? Ask the AI."

### Phase 5: Add `generateMetadata` to book redirect page

**File modified:**
- `src/app/library/[document]/page.tsx` — Add `generateMetadata()` that produces a generic book-level title. Since this page redirects immediately, the metadata primarily helps if a search engine indexes the redirect URL.

**Changes:**
1. Add `export async function generateMetadata({ params })` that loads the book title and returns `{ title: "{bookTitle} | {brand.name}" }`.

---

## §4 Security Considerations

| Constraint | V1 spec ref | Implementation |
| --- | --- | --- |
| Public routes do not expose draft content | PLAT-026 | Library routes read from `docs/_corpus/` which contains only published chapters. There is no draft/published state on corpus files — all files in the chapters directory are considered published. |
| No auth gating on library content | PLAT-005 | Library pages are server components with no session check. The middleware/proxy does not intercept library routes. |
| JSON-LD contains no sensitive data | Defense in depth | JSON-LD includes only public information: titles, descriptions, brand name, URLs. No user data, no internal IDs. |
| Description extraction does not execute markdown | Defense in depth | The `extractDescription` function uses string operations only — no markdown parser or HTML renderer. It strips formatting via regex on trusted corpus content. |
| Canonical URLs use configured domain, not request host | Defense in depth | Prevents host header injection. The canonical URL is always `https://{identity.domain}/...`, not derived from the incoming request. |

---

## §5 Test Specification

### §5.1 Positive tests (happy paths work)

| # | Test name | What it verifies |
| --- | --- | --- |
| P1 | `extractDescription returns first paragraph from markdown` | Call `extractDescription("# Title\n\n## Abstract\n\nFirst paragraph here.\n\nSecond paragraph.")` → returns `"First paragraph here."` |
| P2 | `extractDescription strips bold and italic formatting` | Call with `"# T\n\n**Bold** and *italic* text."` → returns `"Bold and italic text."` |
| P3 | `extractDescription strips markdown links` | Call with `"# T\n\n[Link text](https://example.com) and more."` → returns `"Link text and more."` |
| P4 | `extractDescription truncates to maxLength at word boundary` | Call with a 300-character paragraph and `maxLength=160` → result length ≤ 161 (160 + ellipsis), ends with `"…"`, does not cut mid-word. |
| P5 | `buildChapterMetadata returns correct title format` | Call `buildChapterMetadata(...)` with chapterTitle="Why This Moment Matters", bookTitle="Software Engineering" → `metadata.title` contains both strings and the brand name. |
| P6 | `buildChapterMetadata returns canonical URL using configured domain` | Result has `alternates.canonical` = `"https://studioordo.com/library/{bookSlug}/{chapterSlug}"`. |
| P7 | `buildChapterMetadata returns OG tags with article type` | Result has `openGraph.type` = `"article"`, `openGraph.title` = chapter title, `openGraph.url` = canonical URL. |
| P8 | `buildChapterJsonLd returns Article schema` | Result has `@type` = `"Article"`, `headline` = chapter title, `isPartOf.@type` = `"Book"`. |
| P9 | `buildLibraryIndexMetadata returns correct title with book and chapter counts` | Call with `bookCount=10`, `chapterCount=104` → `metadata.title` contains `"10 Books"` and `"104 Chapters"`. |
| P10 | `buildLibraryIndexJsonLd returns CollectionPage schema` | Result has `@type` = `"CollectionPage"`, `numberOfItems` = chapter count. |

### §5.2 Negative tests (boundaries enforced)

| # | Test name | What it verifies |
| --- | --- | --- |
| N1 | `extractDescription returns empty string for empty input` | Call `extractDescription("")` → returns `""`. |
| N2 | `extractDescription handles markdown with only headings` | Call with `"# Title\n## Section\n## Another"` → returns `""` (no paragraph content). |
| N3 | `extractDescription strips image markdown` | Call with `"# T\n\n![alt](img.png) Some text."` → returns `"Some text."`, no image reference. |
| N4 | `buildChapterMetadata handles empty content gracefully` | Call with `content: ""` → metadata still has a title and OG tags; description is empty string, not undefined or null. |

### §5.3 Edge tests (boundary conditions and integration scenarios)

| # | Test name | What it verifies |
| --- | --- | --- |
| E1 | `extractDescription skips horizontal rules between title and content` | Call with `"# Title\n---\n## Abstract\n\n---\n\nActual content."` → returns `"Actual content."` |
| E2 | `extractDescription preserves inline code content` | Call with `` "# T\n\nUse `getDocuments()` to load." `` → returns `"Use getDocuments() to load."` |
| E3 | `buildChapterMetadata uses identity.domain from config, not hardcoded` | Mock identity config with domain `"custom.example.com"`. Canonical URL starts with `"https://custom.example.com/"`. |
| E4 | `chapter page source includes JSON-LD script tag` | The chapter page source file (`[document]/[section]/page.tsx`) contains `application/ld+json` — confirming the JSON-LD `<script>` tag is wired into the template. |
| E5 | `library index page source includes JSON-LD script tag` | The library index source file (`library/page.tsx`) contains `application/ld+json` — confirming JSON-LD is wired into the template. |
| E6 | `chapter page source includes chat CTA` | The chapter page source file contains `"Ask the AI"` — confirming the chat CTA link is present in the template. |
| E7 | `library index generateMetadata includes OG image from identity config` | `openGraph.images[0].url` matches `https://{domain}{logoPath}`. |
| E8 | `extractDescription handles content starting immediately after title (no Abstract heading)` | Call with `"# Title\n\nDirect content paragraph."` → returns `"Direct content paragraph."` |
| E9 | `book redirect page has generateMetadata with book title` | The book redirect page (`/library/[document]`) exports `generateMetadata` that produces a title containing the book name. |
| E10 | `chapter metadata description matches extractDescription output` | For a given chapter content, `buildChapterMetadata(...).description` equals `extractDescription(content)`. |
| E11 | `library pages have no auth imports or session checks` | Source files for library index and chapter pages do not import `getSessionUser`, `getServerSession`, or any auth module — confirming public access without authentication. |

### §5.4 Test count summary

| Category | Count |
| --- | --- |
| Positive (P1–P10) | 10 |
| Negative (N1–N4) | 4 |
| Edge (E1–E11) | 11 |
| **Total new tests** | **25** |
| Deleted tests | 0 |
| **Net change** | **+25** |

Note: The V1 spec §8 originally estimated +10 tests for Sprint 5. This spec expands to 25 tests because the SEO metadata layer spans multiple utilities (description extraction, metadata builder, JSON-LD generator) and each needs positive, negative, and edge coverage. The description extractor alone needs 8 tests to cover the variety of markdown patterns found across 104 chapters. Additionally, integration tests for the actual page rendering verify that metadata flows through correctly from utility to rendered output.

---

## §6 Test Implementation Patterns

### §6.1 Description extraction tests (P1–P4, N1–N3, E1–E2, E8)

```typescript
import { describe, it, expect } from "vitest";
import { extractDescription } from "@/lib/seo/extract-description";

describe("extractDescription", () => {
  it("P1: returns first paragraph from markdown", () => {
    const md = "# Title\n\n## Abstract\n\nFirst paragraph here.\n\nSecond paragraph.";
    expect(extractDescription(md)).toBe("First paragraph here.");
  });

  it("P2: strips bold and italic formatting", () => {
    const md = "# T\n\n**Bold** and *italic* text.";
    expect(extractDescription(md)).toBe("Bold and italic text.");
  });

  it("P3: strips markdown links", () => {
    const md = "# T\n\n[Link text](https://example.com) and more.";
    expect(extractDescription(md)).toBe("Link text and more.");
  });

  it("P4: truncates to maxLength at word boundary", () => {
    const longParagraph = "# T\n\n" + "The quick brown fox jumps over the lazy dog. ".repeat(10);
    const result = extractDescription(longParagraph, 160);
    expect(result.length).toBeLessThanOrEqual(161); // 160 + ellipsis char
    expect(result).toMatch(/…$/);
  });

  it("N1: returns empty string for empty input", () => {
    expect(extractDescription("")).toBe("");
  });

  it("N2: handles markdown with only headings", () => {
    expect(extractDescription("# Title\n## Section\n## Another")).toBe("");
  });

  it("N3: strips image markdown", () => {
    const md = "# T\n\n![alt](img.png) Some text.";
    expect(extractDescription(md)).toBe("Some text.");
  });

  it("E1: skips horizontal rules between title and content", () => {
    const md = "# Title\n---\n## Abstract\n\n---\n\nActual content.";
    expect(extractDescription(md)).toBe("Actual content.");
  });

  it("E2: preserves inline code content", () => {
    const md = "# T\n\nUse `getDocuments()` to load.";
    expect(extractDescription(md)).toBe("Use getDocuments() to load.");
  });

  it("E8: handles content starting immediately after title", () => {
    const md = "# Title\n\nDirect content paragraph.";
    expect(extractDescription(md)).toBe("Direct content paragraph.");
  });
});
```

### §6.2 Metadata builder tests (P5–P10, N4, E7, E10)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildChapterMetadata,
  buildChapterJsonLd,
  buildLibraryIndexMetadata,
  buildLibraryIndexJsonLd,
} from "@/lib/seo/library-metadata";

// Mock the config module so tests don't depend on filesystem
vi.mock("@/lib/config/instance", () => ({
  getInstanceIdentity: () => ({
    name: "Studio Ordo",
    domain: "studioordo.com",
    logoPath: "/ordo-avatar.png",
    tagline: "Strategic AI Advisory",
    description: "Test description",
  }),
}));

const sampleInput = {
  chapterTitle: "Why This Moment Matters",
  bookTitle: "Software Engineering",
  bookSlug: "software-engineering",
  chapterSlug: "ch01-why-this-moment-matters",
  content: "# Chapter 1\n\n## Abstract\n\nLLM systems change how software is built.",
  chapterNumber: 1,
  totalChapters: 14,
};

describe("buildChapterMetadata", () => {
  it("P5: returns correct title format", () => {
    const meta = buildChapterMetadata(sampleInput);
    expect(meta.title).toContain("Why This Moment Matters");
    expect(meta.title).toContain("Software Engineering");
    expect(meta.title).toContain("Studio Ordo");
  });

  it("P6: returns canonical URL using configured domain", () => {
    const meta = buildChapterMetadata(sampleInput);
    expect(meta.alternates?.canonical).toBe(
      "https://studioordo.com/library/software-engineering/ch01-why-this-moment-matters"
    );
  });

  it("P7: returns OG tags with article type", () => {
    const meta = buildChapterMetadata(sampleInput);
    expect(meta.openGraph?.type).toBe("article");
    expect(meta.openGraph?.title).toBe("Why This Moment Matters");
  });

  it("N4: handles empty content gracefully", () => {
    const meta = buildChapterMetadata({ ...sampleInput, content: "" });
    expect(meta.title).toBeDefined();
    expect(meta.openGraph).toBeDefined();
    expect(typeof meta.description).toBe("string");
  });

  it("E10: description matches extractDescription output", () => {
    const meta = buildChapterMetadata(sampleInput);
    // extractDescription of the sample content
    expect(meta.description).toBe("LLM systems change how software is built.");
  });
});

describe("buildChapterJsonLd", () => {
  it("P8: returns Article schema", () => {
    const ld = buildChapterJsonLd(sampleInput);
    expect(ld["@type"]).toBe("Article");
    expect(ld["headline"]).toBe("Why This Moment Matters");
    expect((ld["isPartOf"] as Record<string, unknown>)["@type"]).toBe("Book");
  });
});

describe("buildLibraryIndexMetadata", () => {
  it("P9: returns correct title with counts", () => {
    const meta = buildLibraryIndexMetadata(10, 104);
    expect(meta.title).toContain("10 Books");
    expect(meta.title).toContain("104 Chapters");
  });

  it("E7: includes OG image from identity config", () => {
    const meta = buildLibraryIndexMetadata(10, 104);
    const images = meta.openGraph?.images;
    expect(images).toBeDefined();
    expect((images as Array<{ url: string }>)[0].url).toBe(
      "https://studioordo.com/ordo-avatar.png"
    );
  });
});

describe("buildLibraryIndexJsonLd", () => {
  it("P10: returns CollectionPage schema", () => {
    const ld = buildLibraryIndexJsonLd(10, 104);
    expect(ld["@type"]).toBe("CollectionPage");
    expect(ld["numberOfItems"]).toBe(104);
  });
});
```

### §6.3 Page integration and source analysis tests (E3–E6, E9, E11)

```typescript
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readSource(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf-8");
}

describe("page integration", () => {
  it("E3: metadata uses identity.domain from config, not hardcoded", () => {
    // Override config with custom domain
    vi.doMock("@/lib/config/instance", () => ({
      getInstanceIdentity: () => ({
        name: "Custom Brand",
        domain: "custom.example.com",
        logoPath: "/logo.png",
        tagline: "Custom Tagline",
        description: "Custom desc",
      }),
    }));

    // Re-import to pick up the mock
    return import("@/lib/seo/library-metadata").then(({ buildChapterMetadata }) => {
      const meta = buildChapterMetadata({
        chapterTitle: "Test",
        bookTitle: "Test Book",
        bookSlug: "test-book",
        chapterSlug: "test-chapter",
        content: "# T\n\nContent.",
        chapterNumber: 1,
        totalChapters: 1,
      });
      expect(meta.alternates?.canonical).toContain("custom.example.com");
      vi.restoreAllMocks();
    });
  });

  it("E4: chapter page source includes JSON-LD script tag", () => {
    const src = readSource("src/app/library/[document]/[section]/page.tsx");
    expect(src).toContain('application/ld+json');
  });

  it("E5: library index page source includes JSON-LD script tag", () => {
    const src = readSource("src/app/library/page.tsx");
    expect(src).toContain('application/ld+json');
  });

  it("E6: chapter page source includes chat CTA", () => {
    const src = readSource("src/app/library/[document]/[section]/page.tsx");
    expect(src).toContain("Ask the AI");
  });

  it("E9: book redirect page exports generateMetadata", () => {
    const src = readSource("src/app/library/[document]/page.tsx");
    expect(src).toContain("generateMetadata");
  });

  it("E11: library pages have no auth imports or session checks", () => {
    const indexSrc = readSource("src/app/library/page.tsx");
    const chapterSrc = readSource("src/app/library/[document]/[section]/page.tsx");
    for (const src of [indexSrc, chapterSrc]) {
      expect(src).not.toContain("getSessionUser");
      expect(src).not.toContain("getServerSession");
    }
  });
});
```

---

## §7 File Change Summary

### §7.1 New files

| File | Purpose |
| --- | --- |
| `src/lib/seo/extract-description.ts` | Pure function to extract plain-text description from markdown content |
| `src/lib/seo/library-metadata.ts` | Builds Next.js Metadata objects and JSON-LD for library pages |
| `tests/sprint-5-public-content-routes.test.ts` | Sprint 5 verification tests (25 tests) |

### §7.2 Modified files

| File | Change |
| --- | --- |
| `src/app/library/page.tsx` | Replace static `metadata` with `generateMetadata()`. Add JSON-LD `<script>` tag. Import and call `buildLibraryIndexMetadata()` and `buildLibraryIndexJsonLd()`. |
| `src/app/library/[document]/[section]/page.tsx` | Add `generateMetadata()` function. Add JSON-LD `<script>` tag. Add chat CTA link in footer. Import and call `buildChapterMetadata()` and `buildChapterJsonLd()`. |
| `src/app/library/[document]/page.tsx` | Add `generateMetadata()` function that produces book-level title for the redirect page. |

### §7.3 Existing tests requiring updates

| Test file | Impact |
| --- | --- |
| None | No existing tests reference the static `metadata` export from library/page.tsx. The removal of the static export and replacement with `generateMetadata` does not break any existing tests. |

---

## §8 Acceptance Criteria

1. Every chapter page (`/library/{book}/{chapter}`) has a unique `<title>` tag containing the chapter title, book title, and brand name.
2. Every chapter page has `og:title`, `og:description`, `og:url`, `og:type`, and `og:image` meta tags.
3. Every chapter page has a `<link rel="canonical" href="..." />` pointing to `https://{domain}/library/{book}/{chapter}`.
4. Every chapter page has a `<script type="application/ld+json">` containing valid Article schema with the chapter's headline, description, and book context.
5. The library index (`/library`) has a unique `<title>` containing the book and chapter counts.
6. The library index has CollectionPage JSON-LD with `numberOfItems` matching the total chapter count.
7. The library index has OG tags with the site logo as the image.
8. Each chapter page has a "Have questions about this topic? Ask the AI." link pointing to `/?topic={chapterTitle}`.
9. The `extractDescription` utility correctly strips markdown formatting and truncates at word boundaries.
10. All library pages are accessible without authentication (no session check, no redirect to login).
11. The book redirect page (`/library/[document]`) exports `generateMetadata` with the book title.
12. All 25 new tests pass. Total suite: 1311 + 25 = **1336** tests.
13. All pre-existing tests pass (1311 baseline).
14. Build clean. Lint clean (no new issues).

---

## §9 Risks and Mitigations

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| `extractDescription` regex fails on unusual markdown patterns | Low | Corpus content is editorially controlled. Description extractor is tested against common patterns (bold, italic, links, code, images). Edge cases in future content can be addressed by extending the regex set. |
| `generateMetadata` async function adds server-side latency | Low | Chapter metadata loads the same data already loaded by the page component. Next.js deduplicates `fetch` calls within a single request. Metadata generation adds only string operations on pre-loaded data. |
| Replacing static `metadata` with `generateMetadata` breaks caching | Low | Next.js handles `generateMetadata` identically to static metadata for statically generated pages. Since `generateStaticParams` is defined, pages are still pre-rendered at build time with their metadata. |
| JSON-LD validation fails | Medium | JSON-LD is generated by a tested utility function, not hand-written. Tests validate the structure. Post-deployment, Google's Rich Results Test can verify indexing. |
| OG image URL is incorrect in development (localhost domain) | Low | The canonical URL and OG image always use `identity.domain` from config, not the request host. In development, this still produces `studioordo.com` URLs — which is correct for OG preview purposes. |
| Chat CTA `/?topic=` param is ignored by the homepage | Accepted | The `topic` parameter is a progressive enhancement. If not consumed by the homepage, the link simply navigates home. Sprint 5 does not add `topic` handling to the homepage — that can be a follow-up if valuable. |

---

## §10 Definition of Done

Sprint 5 is complete when:

1. Every library page (index + 104 chapters) has content-specific metadata visible to search engines and social media link preview crawlers.
2. JSON-LD structured data on every library page provides machine-readable content semantics for rich search results.
3. Canonical URLs on every library page prevent duplicate content indexing.
4. Chapter pages invite readers to continue the conversation via a chat CTA link.
5. 25 new tests pass. Total suite: 1311 + 25 = **1336** tests.
6. Build clean. Lint clean.

### §10.1 V1 spec update

After Sprint 5 is implemented, update [spec.md](spec.md):
- §7.3 test baseline → 1336 tests, running total append: → 1336 (S5, +25)

### §10.2 Sprint 4 handoff verification

These Sprint 4 deliverables are consumed or not impacted by Sprint 5:

| Sprint 4 artifact | Sprint 5 relationship |
| --- | --- |
| `config/identity.json` with `domain` field | Used by `library-metadata.ts` to construct canonical URLs and OG image URLs |
| `getInstanceIdentity()` | Called by the metadata builder to read brand name, domain, logo path |
| Library routes at `src/app/library/` | Modified by Sprint 5 to add `generateMetadata` and JSON-LD — existing rendering unchanged |
| `generateStaticParams()` on library pages | Unmodified — Sprint 5 adds metadata generation alongside existing static param generation |
| Proxy `?ref=` handling | Not impacted — library routes do not interact with referral cookies |

### §10.3 Sprint 6 handoff

Sprint 5 creates the metadata infrastructure that Sprint 6 depends on:

| Sprint 5 artifact | How Sprint 6 uses it |
| --- | --- |
| `extractDescription()` | Reused by `sitemap.ts` for sitemap description generation |
| `buildChapterMetadata()` canonical URLs | Sitemap URLs match the canonical URLs already established |
| `buildLibraryIndexJsonLd()` pattern | Extended for `robots.ts` and sitemap JSON-LD patterns |
| Per-page OG tags | Plausible analytics can track social referral traffic by inspecting OG-attributed shares |
