# Sprint 1 - Admin Journal Workspace

> **Goal:** Add a proper journal management support surface with a views-style list, a detail workspace, and preview-route convergence so journal operations stop living behind a preview-only path while still sharing the same canonical loaders and worker seams used by chat.
> **Spec ref:** `JEO-015`, `JEO-019`, `JEO-019S`, `JEO-024`, `JEO-070` through `JEO-073`, `JEO-092F` through `JEO-092I`, `JEO-100`, `JEO-101`, `JEO-111`, `JEO-112`
> **Prerequisite:** Sprint 0 complete
> **Test count target:** 1373 existing + approximately 16 focused tests covering admin auth, list rendering, detail loading, canonical preview coverage, and admin API reuse.

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/app/admin/journal/preview/[slug]/page.tsx` | Current admin preview route calls `getSessionUser()`, redirects anonymous users to `/login`, denies non-admin users, loads by slug through `getBlogPostRepository().findBySlug()`, and emits `noindex, nofollow` metadata |
| `src/lib/auth.ts` | `getSessionUser()` returns the current session user and defaults to `ANONYMOUS`; auth helpers already model role-aware access |
| `src/adapters/RepositoryFactory.ts` | Server routes and RSC pages already resolve repositories through `getBlogPostRepository()`, `getBlogPostRevisionRepository()`, `getBlogAssetRepository()`, and `getBlogPostArtifactRepository()` |
| `src/core/use-cases/BlogPostRepository.ts` | Sprint 0 already added `listForAdmin(filters)`, `findById(id)`, and draft/metadata/workflow mutation methods that the admin workspace should consume instead of inventing parallel persistence seams |
| `src/core/use-cases/BlogPostRevisionRepository.ts` | `listByPostId(postId)` already exists for revision history loading in the detail workspace |
| `src/core/use-cases/JournalEditorialInteractor.ts` | Workflow and revision policy already live behind an interactor; Sprint 1 should keep pages as read and action surfaces over those seams rather than moving business rules back into route handlers |
| `src/lib/shell/shell-navigation.ts` | Shell route definitions already expose route labels, hrefs, and visibility rules that can be extended for admin navigation entry points if needed |
| `src/core/use-cases/tools/admin-content.tool.ts` | `draft_content` already creates a structured markdown draft via `blogRepo.create()` and `publish_content` publishes via `publishById()` |
| `src/app/api/admin/blog/posts/[postId]/hero-images/route.ts` | Existing admin hero-image API already supports list/select/reject flows, validates admin access, returns `400` for malformed payloads, `404` for missing posts, and `409` for canonical-rejection conflicts |
| `src/app/api/admin/blog/posts/[postId]/artifacts/route.ts` | Existing admin artifact API already supports artifact inspection, artifact-type filtering, and explicit `400`, `403`, and `404` branches that the journal workspace should reuse or wrap rather than replace |
| `src/app/admin/journal/preview/[slug]/page.test.tsx` | Existing preview-route tests are the baseline for the canonical journal-named admin preview route |
| `src/app/api/admin/blog/posts/[postId]/hero-images/route.test.ts` | Existing tests already cover positive, negative, and conflict behavior for the hero-image admin API |
| `src/app/api/admin/blog/posts/[postId]/artifacts/route.test.ts` | Existing tests already cover positive, invalid-filter, unauthorized, and missing-post behavior for artifact inspection |
| `src/app/admin/journal/**` | No admin journal route tree exists yet, so Sprint 1 is defining the first real management surface rather than refining an existing one |

---

## QA Findings Before Implementation

1. There is still no `src/app/admin/journal/**` route tree in the repository, so Sprint 1 must create the first canonical journal-named admin surface rather than assuming a rename-only change.
2. The current preview route already proves the auth and metadata contract. Sprint 1 should reuse that implementation rather than duplicating auth, noindex, hero-asset, and markdown-preview logic in separate trees.
3. Sprint 0 already delivered the persistence seams needed for Sprint 1 list and detail loading: `BlogPostRepository.listForAdmin()`, `findById()`, and `BlogPostRevisionRepository.listByPostId()`. Sprint 1 should add loaders and pages over those seams, not new ad hoc repository methods unless there is a verified gap.
4. The current hero-image and artifact APIs are blog-named but already behaviorally close to what the journal workspace needs. Sprint 1 should reuse or compat-wrap them and preserve their tested failure semantics.
5. Counts-by-state are now a product requirement for `/admin/journal`, but the current `listForAdmin(filters)` method is row-oriented and limit-bound. Sprint 1 must not derive global workflow counts from a filtered or limited page slice; if the page shows true totals, it needs a dedicated count read model or explicit repository support.

---

## Task 1.1 - Add `/admin/journal` list page and read model

**What:** Build the management index that lets admins browse and act on journal content intentionally.

| Item | Detail |
| --- | --- |
| **Create** | `src/app/admin/journal/page.tsx` and supporting admin list components as needed |
| **Create or Modify** | admin list read-model helpers under `src/lib/` or `src/core/use-cases/` |
| **Spec** | `JEO-015`, `JEO-070`, `JEO-100`, `JEO-111`, `JEO-112` |

### Task 1.1 Notes

The list page should include at minimum:

1. total counts by workflow state
2. search by title or slug
3. filters for workflow state and section
4. rows that show title, slug, section, state, updated-at, and quick actions
5. actions for preview and opening the detail workspace

Architecture rules:

1. the list page should use a read model or route service built for admin operations rather than reusing the public publication structure builder
2. if server components load directly from repositories, the read-model composition should still happen through one canonical loader rather than duplicated query logic in multiple pages
3. the same canonical loader should be suitable for `list_journal_posts` and `get_journal_workflow_summary`; do not make the page the only consumer of admin inventory logic
4. the initial loader should be grounded in `getBlogPostRepository().listForAdmin()` rather than a fresh SQL seam unless counts or grouped summaries prove that a repository extension is genuinely required
5. if state counts are shown as true totals, they must come from a count-capable admin read model rather than from the current limited row slice

Do not make this page a decorative dashboard. It should behave like an operational ledger.

This sprint does not redefine the primary operating model. `/admin/journal` is a support surface for inspection, audit, and precision editing; the owner should still be able to run ordinary editorial work through chat-first delegation.

Minimum test coverage for this task:

Positive cases:

1. admin can render the list page with mixed `draft`, `review`, `approved`, and `published` rows
2. search by slug or title narrows the visible ledger rows correctly
3. section and workflow filters preserve quick-action links to preview and detail routes

Negative cases:

1. anonymous visitors redirect to `/login`
2. authenticated non-admin users are denied access
3. invalid query-param values for state or section fail closed to a safe default or explicit validation path instead of widening the result set silently

Edge cases:

1. empty-state rendering when no posts match the current search/filter set
2. posts with `null` `section` or `standfirst` still render safely in the ledger
3. counts remain truthful when the visible row list is limit-bound or filtered

### Task 1.1 Verify

```bash
npm exec vitest run src/app/admin/journal/page.test.tsx src/app/admin/journal/preview/[slug]/page.test.tsx
```

---

## Task 1.2 - Add `/admin/journal/[id]` detail workspace

**What:** Create the page where an admin can manage one post's metadata, body, hero-image linkage, and revision history.

| Item | Detail |
| --- | --- |
| **Create** | `src/app/admin/journal/[id]/page.tsx` and supporting form/view components |
| **Modify** | repository-backed loaders created in Sprint 0 as needed |
| **Create or Modify** | admin route services or server actions as needed, but keep workflow and restore business rules out of the page module |
| **Spec** | `JEO-071`, `JEO-100`, `JEO-111` |

### Task 1.2 Notes

The first detail workspace does not need a rich editor. A pragmatic implementation is acceptable if it supports:

1. title and description inspection or editing
2. standfirst and section editing
3. body copy editing for draft content
4. hero-image visibility and selection context
5. revision history visibility
6. workflow action controls or placeholders if Sprint 2 owns the actions themselves

The data-loading path used here should also be the canonical basis for `get_journal_post` and `list_journal_revisions`, with the page acting as a support surface over those seams rather than inventing a separate detail loader story.

The initial detail loader should be grounded in these existing seams:

1. `getBlogPostRepository().findById(id)` for the canonical post row
2. `getBlogPostRevisionRepository().listByPostId(id)` for revision history
3. existing admin hero-image and artifact APIs for candidate selection and provenance inspection

Use post `id` rather than `slug` for the management route so slug edits do not destabilize the admin workspace URL.

The detail workspace is a fallback and correction surface, not the primary way the owner should advance editorial work.

Minimum test coverage for this task:

Positive cases:

1. admin can load a post by `id` and see title, description, slug, standfirst, section, body copy, and revision history
2. hero-image context is visible when candidate assets exist
3. artifact-inspection affordances are present when artifacts exist for the post

Negative cases:

1. anonymous visitors redirect to `/login`
2. non-admin users are denied access
3. unknown post `id` fails closed through `notFound()` or the equivalent page-level denial path

Edge cases:

1. posts with no hero image candidates still render the workspace without broken controls
2. posts with zero revisions beyond the current head still show a safe empty-state history panel
3. posts with `null` `standfirst`, `section`, or `publishedAt` values render stable fallback copy instead of blank structural holes

### Task 1.2 Verify

```bash
npm exec vitest run src/app/admin/journal/[id]/page.test.tsx src/app/api/admin/blog/posts/[postId]/hero-images/route.test.ts src/app/api/admin/blog/posts/[postId]/artifacts/route.test.ts
```

---

## Task 1.3 - Converge preview under `/admin/journal`

**What:** Establish the admin preview route as journal-first and keep all emitters converged on the canonical path.

| Item | Detail |
| --- | --- |
| **Create** | `src/app/admin/journal/preview/[slug]/page.tsx` or a shared page module consumed by admin preview emitters |
| **Create or Modify** | preview tests for the canonical admin preview route and its emitters |
| **Spec** | `JEO-072`, `JEO-073`, `JEO-101`, `JEO-111` |

### Task 1.3 Notes

Rules:

1. anonymous users still redirect to `/login`
2. non-admin users still receive access denial
3. preview metadata remains `noindex, nofollow`
4. no legacy admin preview compatibility is required in the final state
5. any new journal-named admin API or route should delegate to the same canonical preview implementation rather than fork it
6. the current preview implementation should become the shared source of truth unless a shared module is extracted; do not hand-copy its auth and content-loading behavior into a second file

Preview-link emitters used in chat summaries or admin quick actions should converge through the same canonical route helper so pages and workers do not drift.

Minimum test coverage for this task:

Positive cases:

1. `/admin/journal/preview/[slug]` renders the expected post title, preview label, markdown body, and hero image
2. published and draft preview labels still render correctly on the canonical admin preview route

Negative cases:

1. anonymous visitors redirect to `/login`
2. non-admin users are denied
3. unknown slugs fail closed through `notFound()`

Edge cases:

1. posts without a hero image still render a stable preview shell
2. metadata generation remains `noindex, nofollow` even when the slug resolves to a published post
3. preview helpers and emitters stay converged on `/admin/journal/preview/[slug]`

### Task 1.3 Verify

```bash
npm exec vitest run src/app/admin/journal/preview/[slug]/page.test.tsx
```

---

## Completion Checklist

- [ ] `/admin/journal` provides an operational list of journal content
- [ ] `/admin/journal/[id]` provides a real management workspace
- [ ] Preview lives under journal-first admin routing with no retired legacy preview dependency
- [ ] Existing admin hero-image and artifact APIs are reused or wrapped rather than bypassed
- [ ] Admin journal routes preserve current auth and noindex guarantees
- [ ] Sprint 1 keeps admin pages as support surfaces over canonical read-model seams that chat-facing workers can reuse
- [ ] Sprint 1 test coverage explicitly includes positive, negative, and edge-case behavior for list, detail, preview, and reused admin APIs

## QA Deviations

None yet.
