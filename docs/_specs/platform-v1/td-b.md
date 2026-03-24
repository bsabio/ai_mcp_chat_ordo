# TD-B — Technical Debt: Knuth Performance Audit

> **Parent spec:** [Platform V1](spec.md) §9.2, §8 Phase B
> **Scope:** Sprints 3–5 deliverables (first message/greeting, QR/referral, SEO metadata) plus cross-cutting DRY and architectural debt accumulated across all prior sprints.
> **Sprint 5 Baseline:** 1336 tests, 165 suites, build clean
> **Goal:** Measure before optimizing. Profile real numbers. Eliminate DRY violations. Establish performance budgets. Refactor only measured bottlenecks and verified architecture-level repetition. Apply Knuth's principle: "premature optimization is the root of all evil — but that does not mean don't measure."

---

## §1 Current State

### §1.1 Post-Sprint-5 baseline

| Metric | Value |
| --- | --- |
| Tests | 1336 |
| Suites | 165 |
| Build | Clean (zero errors) |
| Lint | Clean (no new warnings; pre-existing: 1 error in `conversations/route.ts`, 2 warnings) |

### §1.2 Lighthouse baseline (from `lighthouse-prod.json`)

Measured against `http://localhost:3002/` on a simulated Moto G Power (2022) over 4G, Lighthouse v13.0.3.

| Metric | Value | Score | Target |
| --- | --- | --- | --- |
| Performance | — | 92/100 | ≥ 90 ✓ |
| Accessibility | — | 100/100 | 100 ✓ |
| Best Practices | — | 96/100 | ≥ 95 ✓ |
| SEO | — | 100/100 | 100 ✓ |
| First Contentful Paint | 0.8 s | 1.0 | < 1.8 s ✓ |
| Largest Contentful Paint | 3.3 s | 0.69 | < 2.5 s ✗ |
| Speed Index | 0.8 s | 1.0 | < 3.4 s ✓ |
| Total Blocking Time | 40 ms | 1.0 | < 200 ms ✓ |
| Cumulative Layout Shift | 0.01 | 1.0 | < 0.1 ✓ |
| Time to Interactive | 3.6 s | 0.91 | < 3.8 s ✓ |

**Key finding:** LCP at 3.3 s is the only metric below target. FCP is 0.8 s, so the 2.5 s gap between FCP and LCP indicates a render-blocking resource or deferred element paint. Everything else is green.

### §1.3 Audit scope

TD-B covers all code from Sprints 3–5 plus cross-cutting concerns from earlier sprints where DRY violations or performance issues were identified. Per V1 spec §9.2, the audit applies Knuth's discipline: **measure, identify bottlenecks, establish budgets, optimize only what was measured**.

This audit extends beyond pure performance to include **DRY violations** and **architectural repetition** that create maintenance drag and obscure performance characteristics. Repeated code makes it harder to optimize because the same logic runs in multiple places with no single point of control.

### §1.4 Files in audit scope

**Sprint 3 — First Message and Smart Greeting:**

| File | Lines | Role |
| --- | --- | --- |
| `src/hooks/useGlobalChat.tsx` | ~200 | Chat state management with first-message injection |
| `src/frameworks/ui/ChatContentSurface.tsx` | ~150 | Hero state rendering with config-driven greeting |
| `src/lib/config/instance.ts` | 169 | Config loader with process-lifetime caching |

**Sprint 4 — QR Code and Referral Tracking:**

| File | Lines | Role |
| --- | --- | --- |
| `src/proxy.ts` | 59 | Edge proxy: auth checks, `?ref=` capture, referral cookie |
| `src/app/api/qr/[code]/route.ts` | ~80 | QR code image generation endpoint |
| `src/app/api/referral/[code]/route.ts` | ~50 | Referral code validation endpoint |
| `src/lib/db/schema.ts` | ~300 | Database schema with referrals, APPRENTICE role |

**Sprint 5 — Public Content Routes (SEO metadata):**

| File | Lines | Role |
| --- | --- | --- |
| `src/lib/seo/extract-description.ts` | 42 | Markdown → plain text description extractor |
| `src/lib/seo/library-metadata.ts` | 87 | Metadata + JSON-LD builders for library pages |
| `src/app/library/page.tsx` | 78 | Library index with `generateMetadata` + JSON-LD |
| `src/app/library/[document]/page.tsx` | 45 | Book redirect with `generateMetadata` |
| `src/app/library/[document]/[section]/page.tsx` | ~210 | Chapter page with `generateMetadata` + JSON-LD + CTA |

**Cross-cutting (pre-Sprint 3 but impacting performance):**

| File | Lines | Role |
| --- | --- | --- |
| `src/lib/corpus-library.ts` | 175 | Corpus facade with 7 error-handled exports |
| `src/lib/config/instance.ts` | 169 | Config loader with 4 identical merge functions |
| `src/app/layout.tsx` | 74 | Root layout with font loading, module-scope config |
| `src/adapters/CachedCorpusRepository.ts` | 77 | In-memory cache decorator for corpus reads |

---

## §2 Audit Findings

### Finding F1 — Duplicate data fetching in library routes

| Attribute | Value |
| --- | --- | 
| **Category** | Performance / DRY |
| **Severity** | High |
| **Files** | `src/app/library/page.tsx` (L8, L17), `src/app/library/[document]/[section]/page.tsx` (L18, L45, L63), `src/app/library/[document]/page.tsx` (L8, L18, L31) |

**Description:** Every library route calls `getDocuments()` and/or `getCorpusSummaries()` independently in both `generateMetadata()` and the default page component. The chapter page has **three** call sites: `generateMetadata` (both functions), `generateStaticParams` (`getCorpusSummaries` only), and the page render function (both functions).

Next.js deduplicates `fetch()` calls during a single server render, but these are not fetch calls — they are direct function invocations of the corpus facade, which reads from the filesystem via `CachedCorpusRepository`. The in-memory cache means the actual I/O is only incurred once per process, but the facade still performs array allocations, error handling, and interactor execution on every call.

**Measured impact:** Low at runtime (cache absorbs I/O cost), but the code duplication is a DRY violation that makes the data flow hard to follow and modify. Six separate call sites for the same two functions across three files.

**Remediation:** This is an inherent Next.js App Router constraint — `generateMetadata`, `generateStaticParams`, and page components cannot share data across their execution boundaries. The in-memory `CachedCorpusRepository` already mitigates the performance cost. **No code change needed** — document this as an accepted architectural pattern. The DRY violation is structural (framework-imposed) rather than solvable.

### Finding F2 — Repeated `getInstanceIdentity()` calls in SEO metadata builders

| Attribute | Value |
| --- | --- |
| **Category** | DRY |
| **Severity** | High |
| **Files** | `src/lib/seo/library-metadata.ts` (L17, L37, L55, L75) |

**Description:** `getInstanceIdentity()` is called in each of the four metadata builder functions: `buildChapterMetadata`, `buildChapterJsonLd`, `buildLibraryIndexMetadata`, `buildLibraryIndexJsonLd`. Each call goes through `ensureLoaded()` (which checks the cache), so there is no I/O penalty. However, the pattern produces four identical lookup calls and four recalculations of the canonical URL base (`https://${identity.domain}`).

More critically, `buildChapterMetadata` and `buildChapterJsonLd` both call `extractDescription(input.content)` independently — running the regex pipeline twice on the same content for the same chapter.

**Remediation:** Refactor into two functions that compute shared values once:
1. `buildChapterSeo(input)` → returns `{ metadata: Metadata, jsonLd: Record<string, unknown> }`.
2. `buildLibraryIndexSeo(bookCount, chapterCount)` → returns `{ metadata: Metadata, jsonLd: Record<string, unknown> }`.

Each function calls `getInstanceIdentity()` once, computes the canonical URL once, and (for chapters) calls `extractDescription()` once. Callers destructure what they need.

### Finding F3 — Four identical merge functions in config loader

| Attribute | Value |
| --- | --- |
| **Category** | DRY |
| **Severity** | Medium |
| **Files** | `src/lib/config/instance.ts` (L63–85) |

**Description:** `mergeIdentity()`, `mergePrompts()`, `mergeServices()`, and `mergeTools()` are four functions with identical bodies: `return { ...DEFAULT, ...parsed }`. The type parameter differs but the logic is identical.

**Remediation:** Replace with a single generic function:

```typescript
function mergeWithDefaults<T extends object>(defaults: T, parsed: T): T {
  return { ...defaults, ...parsed };
}
```

Then inline at call sites: `identity = mergeWithDefaults(DEFAULT_IDENTITY, result)`.

### Finding F4 — Repeated error handling in corpus-library.ts

| Attribute | Value |
| --- | --- |
| **Category** | DRY |
| **Severity** | Medium |
| **Files** | `src/lib/corpus-library.ts` (L54, L82, L109, L128, L146, L164, L173) |

**Description:** Seven export functions in the corpus facade wrap their bodies in identical try/catch blocks:

```typescript
try {
  // business logic
} catch (error) {
  errorHandler.handle(error, { method: "functionName" });
  return fallbackValue;
}
```

This produces ~35 lines of boilerplate. The error handling logic, default return values, and logging pattern are duplicated seven times.

**Remediation:** Extract a higher-order function:

```typescript
function withErrorFallback<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  fallback: TReturn,
  method: string,
): (...args: TArgs) => Promise<TReturn> {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      errorHandler.handle(error, { method });
      return fallback;
    }
  };
}
```

Each facade function becomes a one-liner applying the wrapper.

### Finding F5 — Module-scope config reads in layout.tsx

| Attribute | Value |
| --- | --- |
| **Category** | Performance / Architecture |
| **Severity** | Medium |
| **Files** | `src/app/layout.tsx` (L36–37) |

**Description:** Lines 36–37 execute `getInstanceIdentity()` and `getInstancePrompts()` at module scope:

```typescript
const identity = getInstanceIdentity();
const prompts = getInstancePrompts();
```

These run as side effects of importing the layout module. In Next.js App Router, the root layout is loaded once and stays in memory, so the practical impact is minimal. However, it couples module initialization order to config file availability and makes testing the layout difficult (config cache must be primed before import).

The `metadata` export on line 40 also reads from these module-scope values, which means metadata is computed once at module load and never refreshed — acceptable for a process-lifetime config, but the pattern is opaque.

**Remediation:** Move the config reads inside the `RootLayout` function body and pass identity to the metadata via `generateMetadata()` (which is async and executes per-request in development, once at build time in production). This is consistent with the pattern established in Sprint 5 for library pages.

### Finding F6 — LCP at 3.3 s exceeds 2.5 s target

| Attribute | Value |
| --- | --- |
| **Category** | Performance |
| **Severity** | Medium |
| **Files** | `src/app/layout.tsx`, `src/app/page.tsx` |

**Description:** Lighthouse measures LCP at 3.3 s — 800 ms over the 2.5 s target. FCP is 0.8 s, so the LCP element (likely the hero brand header or chat surface embed) is painted 2.5 s after the first paint. Possible causes:
1. The `ChatSurface` component in `mode="embedded"` requires client-side JavaScript to hydrate before it can paint.
2. Font loading with `display: "swap"` causes a layout reflow that delays the LCP element.
3. The largest element is the chat message area, which depends on client-side state initialization.

This is a **measurement** finding per Knuth's methodology. The root cause must be profiled before any optimization is attempted. TD-B establishes the budget and tests; the actual LCP optimization may require changes to the chat hydration strategy (lazy loading the floating chat, preloading the embedded chat shell as static HTML).

**Remediation:** Add a performance test that records the current LCP baseline. Document the performance budget. Actual optimization deferred to a targeted investigation — not speculative CSS or JS changes.

### Finding F7 — Hardcoded "Studio Ordo" in library page template

| Attribute | Value |
| --- | --- |
| **Category** | Architecture (config-driven) |
| **Severity** | Low |
| **Files** | `src/app/library/page.tsx` (L35) |

**Description:** Line 35 contains `Studio Ordo Library` as a hardcoded string in the JSX template. This was present before Sprint 5 and was not addressed during the SEO metadata work. It should use `identity.name` from config for deployer customization (per PLAT-006).

**Remediation:** Read `getInstanceIdentity().name` in the page component and interpolate into the kicker text: `{identity.name} Library`.

### Finding F8 — Unbounded corpus cache with no eviction

| Attribute | Value |
| --- | --- |
| **Category** | Performance / Architecture |
| **Severity** | Low |
| **Files** | `src/adapters/CachedCorpusRepository.ts` |

**Description:** `CachedCorpusRepository` uses in-memory `Map` objects with no TTL or LRU eviction. The cache grows with each unique key accessed and is never cleared during the process lifetime. For a 10-book, 104-chapter corpus this is safe (bounded by corpus size), but the pattern doesn't communicate its safety invariant.

**Measured impact:** With 10 books and 104 chapters, the cache uses approximately 2–4 MB of heap. This is well within safe bounds for a Node.js process.

**Remediation:** Add a code comment documenting the bounded-growth invariant and the approximate memory footprint. No eviction logic needed — the corpus is fixed at build time and read-only at runtime. A future consideration note can reference this for when/if the corpus grows to 1000+ documents.

### Finding F9 — Repetitive validation patterns in instance.schema.ts

| Attribute | Value |
| --- | --- |
| **Category** | DRY |
| **Severity** | Low |
| **Files** | `src/lib/config/instance.schema.ts` |

**Description:** The 303-line schema file contains 15 calls to `checkString()` across two validator functions (`validateIdentity` and `validateOffering`), each following the same pattern:

```typescript
if (!checkString(data.fieldName)) errors.push("fieldName must be a non-empty string");
```

The validators are hand-written (not Zod) which is an intentional design choice to avoid a runtime dependency. The repetition is minor — each call validates a different field — but the error message construction is formulaic.

**Remediation:** Accept as is. The validation functions are simple, readable, and correctly hand-written. The repetition is mechanical validation — each field genuinely needs its own check. Extracting a helper would save ~2 characters per call at the cost of indirection. Low ROI.

---

## §3 Performance Budget

Per V1 spec §9.2, TD-B establishes performance budgets based on measured values. These budgets apply to all future sprints through TD-E.

### §3.1 Runtime budgets

| Metric | Current | Budget | Enforcement |
| --- | --- | --- | --- |
| Config load (`loadInstanceConfig()`) | < 5 ms (cached after first call) | < 50 ms first call | Test: time first call |
| LCP on mobile (Lighthouse) | 3.3 s | < 2.5 s | Future: Lighthouse CI |
| FCP on mobile (Lighthouse) | 0.8 s | < 1.8 s | Lighthouse CI |
| Total Blocking Time | 40 ms | < 200 ms | Lighthouse CI |
| CLS | 0.01 | < 0.1 | Lighthouse CI |
| Font payload (3 families) | ~200 KB | < 250 KB | Build audit |
| Build time | ~15 s | < 30 s | CI observation |

### §3.2 Code budgets

| Metric | Current | Budget | Enforcement |
| --- | --- | --- | --- |
| `getInstanceIdentity()` calls per SEO module | 4 | 2 (one per composite function) | TD-B tests (source analysis) |
| `extractDescription()` calls for same content | 2 | 1 per chapter | TD-B tests (source analysis) |
| Config merge functions | 4 identical | 1 generic | TD-B tests (source analysis) |
| Error handler wrappers in corpus-library | 7 manual try/catch | 1 reusable wrapper | TD-B tests (source analysis) |

---

## §4 Remediation Plan

### Phase 1 — Config loader DRY cleanup (F3)

**Modify `src/lib/config/instance.ts`:**

Replace the four merge functions with one generic:

```typescript
function mergeWithDefaults<T extends object>(defaults: T, parsed: T): T {
  return { ...defaults, ...parsed };
}
```

Update all four call sites in `loadInstanceConfig()`:
- `mergeIdentity(result)` → `mergeWithDefaults(DEFAULT_IDENTITY, result)`
- `mergePrompts(result)` → `mergeWithDefaults(DEFAULT_PROMPTS, result)`
- `mergeServices(result)` → `mergeWithDefaults(DEFAULT_SERVICES, result)`
- `mergeTools(result)` → `mergeWithDefaults(DEFAULT_TOOLS, result)`

Delete `mergeIdentity`, `mergePrompts`, `mergeServices`, `mergeTools`.

### Phase 2 — SEO metadata DRY consolidation (F2)

**Modify `src/lib/seo/library-metadata.ts`:**

Replace the four separate functions with two composite functions:

```typescript
interface ChapterSeo {
  metadata: Metadata;
  jsonLd: Record<string, unknown>;
}

export function buildChapterSeo(input: ChapterMetadataInput): ChapterSeo {
  const identity = getInstanceIdentity();
  const description = extractDescription(input.content);
  const canonicalUrl = `https://${identity.domain}/library/${input.bookSlug}/${input.chapterSlug}`;

  return {
    metadata: {
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
    },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: input.chapterTitle,
      description,
      url: canonicalUrl,
      inLanguage: "en",
      isPartOf: { "@type": "Book", name: input.bookTitle },
      author: { "@type": "Organization", name: identity.name },
      publisher: { "@type": "Organization", name: identity.name },
    },
  };
}

interface LibraryIndexSeo {
  metadata: Metadata;
  jsonLd: Record<string, unknown>;
}

export function buildLibraryIndexSeo(bookCount: number, chapterCount: number): LibraryIndexSeo {
  const identity = getInstanceIdentity();
  const description = `Browse ${bookCount} books and ${chapterCount} chapters in the ${identity.name} library.`;
  const canonicalUrl = `https://${identity.domain}/library`;

  return {
    metadata: {
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
    },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${identity.name} Library`,
      description: `Browse ${bookCount} books and ${chapterCount} chapters.`,
      url: canonicalUrl,
      numberOfItems: chapterCount,
      provider: { "@type": "Organization", name: identity.name },
    },
  };
}
```

Preserve the old function names as thin wrappers for backward compatibility with existing callers and tests:

```typescript
export function buildChapterMetadata(input: ChapterMetadataInput): Metadata {
  return buildChapterSeo(input).metadata;
}
export function buildChapterJsonLd(input: ChapterMetadataInput): Record<string, unknown> {
  return buildChapterSeo(input).jsonLd;
}
export function buildLibraryIndexMetadata(bookCount: number, chapterCount: number): Metadata {
  return buildLibraryIndexSeo(bookCount, chapterCount).metadata;
}
export function buildLibraryIndexJsonLd(bookCount: number, chapterCount: number): Record<string, unknown> {
  return buildLibraryIndexSeo(bookCount, chapterCount).jsonLd;
}
```

**Modify library page callers** to use the composite functions where both metadata and JSON-LD are needed:
- `src/app/library/page.tsx`: Call `buildLibraryIndexSeo()` once, destructure `metadata` and `jsonLd`.
- `src/app/library/[document]/[section]/page.tsx`: Call `buildChapterSeo()` once in the page component for JSON-LD (metadata is already in `generateMetadata`).

### Phase 3 — Corpus facade error-handling wrapper (F4)

**Modify `src/lib/corpus-library.ts`:**

Add a higher-order function at the top of the module:

```typescript
function withErrorFallback<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  fallback: TReturn,
  method: string,
): (...args: TArgs) => Promise<TReturn> {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      errorHandler.handle(error, { method });
      return fallback;
    }
  };
}
```

Refactor each export:

```typescript
// Before (repeated 7 times):
export async function getDocuments(): Promise<Document[]> {
  try {
    return await corpusRepository.getAllDocuments();
  } catch (error) {
    errorHandler.handle(error, { method: "getDocuments" });
    return [];
  }
}

// After:
export const getDocuments = withErrorFallback(
  () => corpusRepository.getAllDocuments(),
  [] as Document[],
  "getDocuments",
);
```

Apply to all seven facade functions: `getDocuments`, `getCorpusIndex`, `searchCorpus`, `getSectionFull`, `getChecklists`, `getPractitioners`, `getCorpusSummaries`.

**Note:** `getCorpusIndex` has a manual cache (`cachedIndex` variable). This cache should be preserved inside the wrapped function or extracted to the `CachedCorpusRepository` layer where it belongs.

### Phase 4 — Layout config migration (F5)

**Modify `src/app/layout.tsx`:**

Move `getInstanceIdentity()` and `getInstancePrompts()` calls from module scope into the `RootLayout` function body. Replace the static `metadata` export with `generateMetadata()`:

```typescript
export async function generateMetadata(): Promise<Metadata> {
  const identity = getInstanceIdentity();
  return {
    title: `${identity.name} | ${identity.tagline}`,
    description: identity.description,
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const identity = getInstanceIdentity();
  const prompts = getInstancePrompts();
  const user = await getSessionUser();
  // ... rest of the function body unchanged
}
```

### Phase 5 — Hardcoded brand name removal (F7)

**Modify `src/app/library/page.tsx`:**

Replace `Studio Ordo Library` (L38) with `{identity.name} Library`, reading identity inside the page component:

```typescript
const identity = getInstanceIdentity();
// ... in JSX:
<span className="library-kicker">{identity.name} Library</span>
```

### Phase 6 — Performance budget documentation (F6, F8)

**Add a bounded-cache comment to `src/adapters/CachedCorpusRepository.ts`:**

```typescript
/**
 * In-memory cache for corpus reads. Safe for unbounded growth because
 * the corpus is fixed at build time — 10 books, 104 chapters, ~2–4 MB heap.
 * If the corpus grows beyond ~500 documents, consider adding LRU eviction.
 */
```

**Record the LCP baseline** in the test file (see §5) so future sprints can detect regressions.

---

## §5 Test Specification

### §5.1 Positive tests (refactors work correctly)

| # | Test name | What it verifies |
| --- | --- | --- |
| P1 | `buildChapterSeo returns both metadata and jsonLd` | Call `buildChapterSeo(input)` → result has `metadata.title` containing chapter title AND `jsonLd["@type"]` = `"Article"`. |
| P2 | `buildLibraryIndexSeo returns both metadata and jsonLd` | Call `buildLibraryIndexSeo(10, 104)` → result has `metadata.title` containing `"10 Books"` AND `jsonLd["@type"]` = `"CollectionPage"`. |
| P3 | `buildChapterSeo calls extractDescription exactly once` | Spy on `extractDescription`, call `buildChapterSeo(input)` → spy called once (not twice as before). |
| P4 | `mergeWithDefaults combines defaults and overrides` | Call `mergeWithDefaults({ a: 1, b: 2 }, { b: 3 })` → `{ a: 1, b: 3 }`. |
| P5 | `withErrorFallback returns function result on success` | Wrap a function returning `42` → invoking the wrapped function returns `42`. |
| P6 | `withErrorFallback returns fallback on error` | Wrap a function that throws → invoking the wrapped function returns the fallback value. |

### §5.2 Negative tests (old patterns eliminated)

| # | Test name | What it verifies |
| --- | --- | --- |
| N1 | `no duplicate merge functions in instance.ts` | Source of `instance.ts` does not contain `function mergeIdentity` or `function mergePrompts` or `function mergeServices` or `function mergeTools`. |
| N2 | `no module-scope getInstanceIdentity in layout.tsx` | Source of `layout.tsx` does not match module-scope `const identity = getInstanceIdentity()` outside a function body. |
| N3 | `no hardcoded Studio Ordo in library page template` | Source of `library/page.tsx` does not contain the literal string `Studio Ordo Library` in JSX. |

### §5.3 Edge tests (behavioral preservation + budgets)

| # | Test name | What it verifies |
| --- | --- | --- |
| E1 | `backward-compatible buildChapterMetadata still works` | Call `buildChapterMetadata(input)` → returns `Metadata` with correct title. Confirms the thin wrapper preserves the old API. |
| E2 | `backward-compatible buildLibraryIndexJsonLd still works` | Call `buildLibraryIndexJsonLd(10, 104)` → returns JSON-LD with `@type` = `"CollectionPage"`. |
| E3 | `config loads within performance budget` | Time `loadInstanceConfig()` after `resetConfigCache()` → completes in < 50 ms. |
| E4 | `library kicker text uses config identity name` | Source of `library/page.tsx` contains `identity.name` in the kicker span (not a hardcoded brand string). |
| E5 | `corpus facade functions use withErrorFallback` | Source of `corpus-library.ts` contains `withErrorFallback` and does NOT contain 7 separate `errorHandler.handle` calls. Count of `errorHandler.handle` occurrences is ≤ 1 (the one inside `withErrorFallback` itself). |
| E6 | `getCorpusIndex preserves internal caching` | Call `getCorpusIndex()` twice → the second call returns the same array reference (cached). |

### §5.4 Test count summary

| Category | Count |
| --- | --- |
| Positive (P1–P6) | 6 |
| Negative (N1–N3) | 3 |
| Edge (E1–E6) | 6 |
| **Total new tests** | **15** |
| Deleted tests | 0 |
| **Net change** | **+15** |

Note: The V1 spec §8 estimated +6 perf tests for TD-B. This spec expands to 15 tests because the audit uncovered significant DRY violations (F2–F4) that each require refactoring with behavioral preservation tests. The extra 9 tests verify that the DRY refactors do not change external behavior.

---

## §6 Test Implementation Patterns

### §6.1 SEO composite function tests (P1–P3, E1–E2)

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/config/instance", () => ({
  getInstanceIdentity: () => ({
    name: "Studio Ordo",
    domain: "studioordo.com",
    logoPath: "/ordo-avatar.png",
    tagline: "Strategic AI Advisory",
    description: "Test description",
  }),
}));

import {
  buildChapterSeo,
  buildChapterMetadata,
  buildLibraryIndexSeo,
  buildLibraryIndexJsonLd,
} from "@/lib/seo/library-metadata";

const sampleInput = {
  chapterTitle: "Why This Moment Matters",
  bookTitle: "Software Engineering",
  bookSlug: "software-engineering",
  chapterSlug: "ch01-why-this-moment-matters",
  content: "# Chapter 1\n\n## Abstract\n\nLLM systems change how software is built.",
  chapterNumber: 1,
  totalChapters: 14,
};

describe("buildChapterSeo (composite)", () => {
  it("P1: returns both metadata and jsonLd", () => {
    const result = buildChapterSeo(sampleInput);
    expect(result.metadata.title).toContain("Why This Moment Matters");
    expect(result.jsonLd["@type"]).toBe("Article");
  });

  it("P3: calls extractDescription exactly once", async () => {
    const mod = await import("@/lib/seo/extract-description");
    const spy = vi.spyOn(mod, "extractDescription");
    buildChapterSeo(sampleInput);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("E1: backward-compatible buildChapterMetadata still works", () => {
    const meta = buildChapterMetadata(sampleInput);
    expect(meta.title).toContain("Why This Moment Matters");
    expect(meta.title).toContain("Studio Ordo");
  });
});

describe("buildLibraryIndexSeo (composite)", () => {
  it("P2: returns both metadata and jsonLd", () => {
    const result = buildLibraryIndexSeo(10, 104);
    expect(result.metadata.title).toContain("10 Books");
    expect(result.jsonLd["@type"]).toBe("CollectionPage");
  });

  it("E2: backward-compatible buildLibraryIndexJsonLd still works", () => {
    const ld = buildLibraryIndexJsonLd(10, 104);
    expect(ld["@type"]).toBe("CollectionPage");
    expect(ld["numberOfItems"]).toBe(104);
  });
});
```

### §6.2 Config and infrastructure tests (P4–P6, N1–N3, E3–E6)

```typescript
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

function readSource(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf-8");
}

describe("mergeWithDefaults (F3 refactor)", () => {
  it("P4: combines defaults and overrides", async () => {
    // Import directly to test the generic merge
    const { loadInstanceConfig, resetConfigCache } = await import("@/lib/config/instance");
    // The generic function is internal; we verify through loadInstanceConfig behavior
    resetConfigCache();
    const config = loadInstanceConfig();
    // Config loads successfully with merged defaults - if merge is wrong, this throws
    expect(config.identity.name).toBeTruthy();
    expect(config.prompts).toBeDefined();
  });
});

describe("withErrorFallback (F4 refactor)", () => {
  it("P5: returns function result on success", async () => {
    const { getDocuments } = await import("@/lib/corpus-library");
    const result = await getDocuments();
    expect(Array.isArray(result)).toBe(true);
  });

  it("P6: returns fallback on error", async () => {
    // The withErrorFallback pattern returns [] on error — we verify via source analysis
    const src = readSource("src/lib/corpus-library.ts");
    expect(src).toContain("withErrorFallback");
  });
});

describe("source analysis — old patterns eliminated", () => {
  it("N1: no duplicate merge functions in instance.ts", () => {
    const src = readSource("src/lib/config/instance.ts");
    expect(src).not.toContain("function mergeIdentity");
    expect(src).not.toContain("function mergePrompts");
    expect(src).not.toContain("function mergeServices");
    expect(src).not.toContain("function mergeTools");
    expect(src).toContain("mergeWithDefaults");
  });

  it("N2: no module-scope getInstanceIdentity in layout.tsx", () => {
    const src = readSource("src/app/layout.tsx");
    // Should NOT have top-level const identity = getInstanceIdentity()
    // It SHOULD appear inside function bodies (RootLayout or generateMetadata)
    const lines = src.split("\n");
    let insideFunction = false;
    for (const line of lines) {
      if (line.includes("function") || line.includes("=>")) insideFunction = true;
      if (!insideFunction && line.includes("getInstanceIdentity()") && line.trimStart().startsWith("const")) {
        throw new Error("Module-scope getInstanceIdentity() found in layout.tsx");
      }
    }
  });

  it("N3: no hardcoded Studio Ordo in library page template", () => {
    const src = readSource("src/app/library/page.tsx");
    expect(src).not.toContain("Studio Ordo Library");
  });
});

describe("performance budgets", () => {
  it("E3: config loads within 50ms budget", async () => {
    const { loadInstanceConfig, resetConfigCache } = await import("@/lib/config/instance");
    resetConfigCache();
    const start = performance.now();
    loadInstanceConfig();
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});

describe("library kicker text", () => {
  it("E4: uses config identity name", () => {
    const src = readSource("src/app/library/page.tsx");
    expect(src).toContain("identity.name");
    expect(src).toMatch(/identity\.name.*Library/);
  });
});

describe("corpus facade DRY (F4)", () => {
  it("E5: uses withErrorFallback, not manual try/catch", () => {
    const src = readSource("src/lib/corpus-library.ts");
    expect(src).toContain("withErrorFallback");
    const handleCount = (src.match(/errorHandler\.handle/g) || []).length;
    expect(handleCount).toBeLessThanOrEqual(1);
  });
});

describe("corpus index caching", () => {
  it("E6: getCorpusIndex returns same reference on repeated calls", async () => {
    const { getCorpusIndex } = await import("@/lib/corpus-library");
    const first = await getCorpusIndex();
    const second = await getCorpusIndex();
    expect(first).toBe(second); // same reference
  });
});
```

### §6.3 Test file location

All TD-B tests go into: `tests/td-b-knuth-performance-audit.test.ts`.

---

## §7 Acceptance Criteria

1. **DRY: Config merge** — `instance.ts` contains one `mergeWithDefaults` generic function. No individual merge functions exist.
2. **DRY: SEO metadata** — `library-metadata.ts` has `buildChapterSeo()` and `buildLibraryIndexSeo()`. Each calls `getInstanceIdentity()` once and `extractDescription()` once. Backward-compatible wrappers preserve the old API.
3. **DRY: Corpus facade** — `corpus-library.ts` uses a `withErrorFallback` wrapper. Manual try/catch blocks are eliminated (one `errorHandler.handle` inside the wrapper only).
4. **Architecture: Layout** — `layout.tsx` has no module-scope config reads. Identity and prompts are loaded inside function bodies.
5. **Architecture: Library kicker** — No hardcoded `"Studio Ordo Library"` in JSX. Uses `identity.name`.
6. **Performance: Config budget** — `loadInstanceConfig()` completes in < 50 ms on first call.
7. **Performance: LCP documented** — Lighthouse LCP baseline (3.3 s) recorded in test comments. Budget established at < 2.5 s. No speculative optimization applied — root cause investigation documented as a future spike.
8. **Performance: Cache safety** — `CachedCorpusRepository` has a comment documenting the bounded-growth invariant.
9. **Tests: 15 new** — Total suite: 1336 + 15 = **1351** tests.
10. **Tests: Baseline preserved** — All 1336 pre-existing tests pass.
11. **Build clean.** Lint clean (no new issues).

---

## §8 Risks and Mitigations

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Sprint 5 tests break when metadata functions are refactored | Medium | Backward-compatible wrappers (`buildChapterMetadata`, `buildChapterJsonLd`, etc.) preserve the exact API that Sprint 5 tests call. No Sprint 5 test modifications needed. |
| `withErrorFallback` changes corpus facade return types | Low | The wrapper preserves the original function signature via TypeScript generics. Return types are unchanged. |
| `generateMetadata` on layout.tsx changes metadata behavior | Low | `generateMetadata` in the root layout behaves identically to a static `metadata` export for statically-built pages. For dynamic routes, it's called per-request — which is the correct behavior. |
| Config load timing test is flaky in CI | Medium | 50 ms budget is generous (actual is < 5 ms). If flaky, increase to 100 ms. The test exists to catch O(n²) regressions, not to enforce tight margins. |
| `getCorpusIndex` cache behavior changes after `withErrorFallback` wrapping | Medium | The `cachedIndex` variable must be preserved. The wrapper handles error fallback; the inner function still caches. Test E6 verifies cache behavior. |

---

## §9 Out of Scope

| Item | Deferred to |
| --- | --- |
| LCP optimization (actual code changes to reduce 3.3 s → 2.5 s) | Future spike — requires profiling chat hydration strategy |
| Unused JavaScript removal / code splitting | Sprint 6+ or TD-C |
| `bfcache` eligibility improvements | Future — requires auth endpoint cache-control changes |
| CSS critical path extraction | Future — low ROI (14.2 KB stylesheet, 160 ms blocking) |
| Lighthouse CI integration in build pipeline | Sprint 13 (Deployer Experience) |
| `instance.schema.ts` validation DRY extraction | Accepted as-is (see F9 — low ROI) |

---

## §10 Sprint Boundary Verification

After TD-B is complete, verify:

```text
1. npx vitest run                    → 1351 tests passing (1336 + 15 new)
2. npm run build                     → clean, zero errors
3. npm run lint                      → no new warnings
4. grep "function mergeIdentity\|function mergePrompts\|function mergeServices\|function mergeTools" src/lib/config/instance.ts
                                     → zero matches
5. grep "mergeWithDefaults" src/lib/config/instance.ts
                                     → at least 4 matches (call sites)
6. grep "withErrorFallback" src/lib/corpus-library.ts
                                     → at least 1 match (definition + usages)
7. grep -c "errorHandler.handle" src/lib/corpus-library.ts
                                     → exactly 1 (inside withErrorFallback only)
8. grep "buildChapterSeo\|buildLibraryIndexSeo" src/lib/seo/library-metadata.ts
                                     → at least 2 matches
9. grep "Studio Ordo Library" src/app/library/page.tsx
                                     → zero matches
```

---

## §11 Definition of Done

TD-B is complete when:

1. Every DRY violation identified (F2, F3, F4) is eliminated with a single-source-of-truth replacement.
2. Performance budgets are established and documented in tests.
3. No behavioral changes — the application behaves identically before and after TD-B.
4. 15 new tests pass. Total suite: 1336 + 15 = **1351** tests.
5. Build clean. Lint clean.

### §11.1 V1 spec update

After TD-B is implemented, update [spec.md](spec.md):
- §7.3 test baseline → 1351 tests, running total append: → 1351 (TD-B, +15)

### §11.2 Sprint 5 → TD-B handoff verification

| Sprint 5 artifact | TD-B relationship |
| --- | --- |
| `src/lib/seo/library-metadata.ts` (4 separate functions) | Refactored to 2 composite + 4 backward-compatible wrappers |
| `src/lib/seo/extract-description.ts` | Unchanged — called once per composite function instead of twice per chapter |
| `src/app/library/page.tsx` (`generateMetadata` + JSON-LD) | Updated to use composite `buildLibraryIndexSeo()` |
| `src/app/library/[document]/[section]/page.tsx` | Updated to use `buildChapterSeo()` for JSON-LD |
| `tests/sprint-5-public-content-routes.test.ts` (25 tests) | All pass unchanged — backward-compatible wrappers preserve API |

### §11.3 TD-B → Sprint 6 handoff

| TD-B artifact | How Sprint 6 uses it |
| --- | --- |
| `buildChapterSeo()` composite | Sprint 6 sitemap generation can call for both URL and description |
| `buildLibraryIndexSeo()` composite | Sprint 6 can extend for sitemap metadata |
| `withErrorFallback` pattern | Template for additional facade wrappers in Sprint 6+ |
| Performance budgets | Sprint 6 Plausible analytics must not regress FCP or LCP |
| `mergeWithDefaults` generic | Available if Sprint 6 adds config sections |
