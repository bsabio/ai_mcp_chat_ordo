# Sprint 1 — Corpus Visibility And Library Enforcement

> **Goal:** Add audience metadata to corpus content and enforce it consistently across corpus entities, library routes, alias routes, summaries, sitemap generation, and shared search/retrieval use cases.
> **Spec Sections:** `GSCA-055` through `GSCA-072`
> **Prerequisite:** Sprint 0 complete

---

## QA Scope Corrections

Sprint 1 was originally underspecified relative to the shipped architecture. This sprint must explicitly cover the surfaces below to avoid implementation drift:

1. The runtime corpus repository is created via `getCorpusRepository()` as `CachedCorpusRepository(new FileSystemCorpusRepository(...))`, so audience metadata must survive both the filesystem adapter and the cache wrapper.
2. Visibility enforcement is not only a chapter-page concern. `CorpusSummaryInteractor` and `CorpusIndexInteractor` currently feed route discovery, redirect aliases, and sitemap generation, and therefore belong in Sprint 1 scope.
3. Legacy resolver routes under `/library/section`, `/corpus`, `/corpus/section`, and `/book` currently use unrestricted corpus data and must converge on the same access behavior as `/library`.
4. The repo currently uses plain `redirect("/login")` for auth gates. If Sprint 1 introduces return-intent behavior, it must define one concrete convention and apply it consistently rather than leaving redirect semantics implicit.

---

## Available Assets

| Asset | Verified shape | Why it matters |
| --- | --- | --- |
| `src/adapters/FileSystemCorpusRepository.ts` | parses `book.json` with `slug`, `title`, `number`, `sortOrder`, `domain`, `tags?`; returns `Document[]` and `Section[]` | This adapter is where manifest and chapter-level audience metadata should enter the runtime |
| `src/adapters/CachedCorpusRepository.ts` | transparent in-memory wrapper over corpus reads | Sprint 1 must preserve audience metadata through the cached repository and avoid role-leaky cache behavior |
| `src/core/entities/corpus.ts` | `Document` has `slug`, `title`, `number`, `id?`; `Section` constructor currently has no access field | These entities must carry the effective content audience |
| `src/core/use-cases/CorpusRepository.ts` | `CorpusRepository` exposes raw document and section reads only | This should remain the raw content contract; role filtering belongs above the repository layer |
| `src/core/use-cases/LibrarySearchInteractor.ts` | `execute({ query, maxResults })` currently searches all documents/sections | Search use cases need role-aware filtering |
| `src/core/use-cases/GetChapterInteractor.ts` | chapter retrieval use case for full section reads | Direct chapter retrieval must enforce access before returning content |
| `src/core/use-cases/CorpusSummaryInteractor.ts` | builds document/chapter summaries from unrestricted corpus data | Library index, metadata, and sitemap visibility depend on this layer |
| `src/core/use-cases/CorpusIndexInteractor.ts` | builds slug resolver index from unrestricted corpus data | Alias routes and redirect pages depend on this layer |
| `src/lib/corpus-library.ts` | `getDocuments`, `getCorpusIndex`, `getCorpusSummaries`, `searchCorpus`, `getSectionFull` currently have no role argument | This facade is the immediate integration point for pages, metadata, and redirects |
| `src/app/library/page.tsx` | index page loads all documents/summaries publicly | Public inventory must stop advertising inaccessible member content |
| `src/app/library/[document]/page.tsx` | document redirect page resolves first section from unrestricted summaries | Alias-like library entry behavior must become role-aware |
| `src/app/library/[document]/[section]/page.tsx` | renders full chapter content with no auth check | This is the most direct content leak path today |
| `src/app/library/section/[slug]/page.tsx` | redirects by consulting unrestricted corpus index | Resolver routes must respect the same filtered index |
| `src/app/corpus/[document]/page.tsx` | legacy route redirects via unrestricted documents/summaries | Legacy routes cannot remain a bypass path |
| `src/app/corpus/section/[slug]/page.tsx` and `src/app/book/[chapter]/page.tsx` | legacy chapter resolver routes use unrestricted corpus index | These routes are also part of the access surface |
| `src/app/sitemap.ts` | emits library chapter URLs from unrestricted summaries | Member-only content must not leak into public sitemap inventory |
| `src/lib/seo/library-metadata.ts` | builds library metadata/SEO payloads for public pages | Metadata generation must not assume all corpus content is public |
| `src/lib/auth.ts` | `getSessionUser()` returns the effective runtime role | Public library routes can resolve the viewer role server-side without inventing a new auth source |

---

## Tasks

### 1. Add Audience Metadata To Corpus Content

**What:** Extend corpus manifests and section parsing so content carries an explicit audience.

**Create or modify:**

1. Extend `book.json` parsing in `FileSystemCorpusRepository` with `audience`.
2. Support optional per-chapter audience overrides via one explicit, documented chapter-level field. Prefer a standard YAML frontmatter field named `audience` unless implementation finds an existing parser seam worth reusing.
3. Extend `Document` and `Section` to include the effective `audience`.
4. Ensure `CachedCorpusRepository` returns the same audience-bearing entities without stripping or recomputing metadata.

**Implementation details:**

1. Default missing audience to `public` during migration.
2. Chapter audience inherits from the document when not explicitly set.
3. Invalid audience values should be rejected or safely skipped, never silently treated as `public`.
4. Keep `CorpusRepository` as a raw content interface. Do not add role-aware repository methods unless forced by implementation evidence.
5. If any cache keying changes are required, cache raw corpus entities or key filtered results by role; do not let one viewer's filtered view poison another viewer's results.

**Verify:**

```bash
npx vitest run tests/corpus/book-discovery.test.ts tests/cached-book-repository.test.ts tests/corpus/cached-repo-clear.test.ts
npx tsc --noEmit
```

### 2. Make Corpus Use Cases Role-Aware

**What:** Thread viewer role into corpus search and retrieval so inaccessible items are filtered before presentation.

**Create or modify:**

1. Update `LibrarySearchInteractor` to filter out sections and documents the current role cannot access.
2. Update `GetChapterInteractor` to deny inaccessible chapter retrievals.
3. Update `CorpusSummaryInteractor` so summaries and chapter inventories only include visible content.
4. Update `CorpusIndexInteractor` so slug resolver indexes only include visible destinations.
5. Update `src/lib/corpus-library.ts` so pages, aliases, metadata, and tools can request role-filtered data instead of raw unrestricted data.

**Implementation details:**

1. Do not rely on `RoleAwareSearchFormatter` for enforcement. It is output shaping, not access control.
2. Keep the filtering close to the use-case or facade layer so both pages and tools can reuse it.
3. Preserve the ability for admins to see all content through the same access helper.
4. Make failure semantics explicit: inaccessible reads should resolve to either `null`, `notFound`, or redirect behavior chosen by the consuming route, rather than leaking existence through partial payloads.

**Verify:**

```bash
npx vitest run src/core/use-cases/LibrarySearchInteractor.test.ts tests/tool-result-formatter.test.ts tests/tool-registry.integration.test.ts
npx tsc --noEmit
```

### 3. Enforce Audience In Library And Alias Routes

**What:** Update public library routes so direct navigation respects the same access policy as search and tools.

**Create or modify:**

1. `src/app/library/page.tsx` should only list documents and summaries visible to the current viewer.
2. `src/app/library/[document]/page.tsx` and `src/app/library/[document]/[section]/page.tsx` should resolve the current viewer before redirecting or rendering.
3. `src/app/library/section/[slug]/page.tsx`, `src/app/corpus/[document]/page.tsx`, `src/app/corpus/section/[slug]/page.tsx`, and `src/app/book/[chapter]/page.tsx` should use the same role-filtered corpus index/summaries and should not provide a bypass around library enforcement.
4. Anonymous requests for member-only content should follow one explicit redirect policy. If Sprint 1 adopts login return intent, define the exact parameter name and reuse it everywhere; otherwise align to the repo's existing plain `/login` redirect behavior.

**Implementation details:**

1. Public content may remain crawlable.
2. Member-only content must not be exposed through route resolution, metadata generation, or direct chapter rendering.
3. Prefer one shared helper for resolving the current viewer role in library routes rather than open-coding `getSessionUser()` in multiple pages.
4. If public and member pages must diverge in caching strategy, prefer correctness over static pre-render coverage.

**Verify:**

```bash
npx tsc --noEmit
npm run build
```

### 4. Remove Member Content From Public Inventory

**What:** Prevent inaccessible content from being emitted through static params, metadata, SEO helpers, and sitemap generation.

**Create or modify:**

1. Update any `generateStaticParams()` usage under affected library and alias routes so only public content is emitted into static route inventory.
2. Update `generateMetadata()` and library SEO helpers as needed so inaccessible content does not leak titles, canonicals, or chapter counts to anonymous users.
3. Update `src/app/sitemap.ts` so only publicly visible library entries are emitted.

**Implementation details:**

1. Treat sitemap and metadata as access surfaces, not passive presentation details.
2. Public inventory generation should use the same filtered summaries/index path as pages rather than duplicating custom filtering.
3. Keep journal sitemap behavior unchanged while tightening library sitemap visibility.

**Verify:**

```bash
npx vitest run tests/blog-pipeline-integration.test.ts
npx tsc --noEmit
npm run build
```

### 5. Update QA Coverage For The New Access Model

**What:** Replace outdated tests that assert the pre-Sprint-1 public-only library behavior and add focused regression coverage around the new access seams.

**Create or modify:**

1. Add or extend repository tests to cover manifest-level and chapter-level audience parsing.
2. Add focused coverage for summary/index filtering and alias route resolution behavior.
3. Add sitemap coverage proving member-only chapters are excluded from anonymous public inventory.
4. Update any source-analysis tests that currently assert library pages have no auth/session checks.

**Implementation details:**

1. The existing `tests/public-content-routes.test.ts` assertion that library pages contain no auth imports or session checks is expected to become stale in Sprint 1 and should be replaced, not preserved.
2. Prefer focused route and interactor tests over broad snapshot-style page assertions.
3. Keep test fixtures synthetic and local to the tests rather than depending on live corpus data.

**Verify:**

```bash
npx vitest run tests/corpus/book-discovery.test.ts tests/cached-book-repository.test.ts tests/corpus/cached-repo-clear.test.ts src/core/use-cases/LibrarySearchInteractor.test.ts tests/blog-pipeline-integration.test.ts
npx tsc --noEmit
npm run build
```

---

## Completion Checklist

- [ ] Corpus manifests and sections carry audience metadata
- [ ] Cached corpus reads preserve audience-bearing entities correctly
- [ ] Corpus search, chapter retrieval, summaries, and indexes filter by viewer role before returning results
- [ ] Library and legacy alias routes enforce access server-side through the same role-aware corpus facade
- [ ] Member-only content is not emitted through static params, metadata, or sitemap inventory
- [ ] Outdated tests asserting unauthenticated-only library behavior are replaced with Sprint 1 coverage
- [ ] Type-check and build pass for the updated library flow

---

## QA Deviations

- The underlying corpus audience model, chapter-level overrides, and library access checks are already present in the runtime. The remaining work is confirming every discovery surface and public inventory path uses the same filtered view.