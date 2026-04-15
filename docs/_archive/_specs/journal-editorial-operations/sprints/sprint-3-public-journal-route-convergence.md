# Sprint 3 - Public Journal Route Convergence

> **Goal:** Make `/journal` the canonical public route, preserve `/blog` as a compatibility redirect, and align navigation, metadata, chat summaries, and route truth around the Journal name already shown to users.
> **Spec ref:** `JEO-010`, `JEO-011`, `JEO-017`, `JEO-020` through `JEO-024`, `JEO-080` through `JEO-085`, `JEO-092I`, `JEO-092N`, `JEO-092Q`, `JEO-104`, `JEO-113`, `JEO-114`, `JEO-117`, `JEO-118`
> **Prerequisite:** Sprint 2 and Sprint 2B complete
> **Test count target:** 1373 existing + approximately 20 focused tests covering route parity, redirects, shell tone, sitemap output, presenter/job-summary updates, and browser verification.

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/components/journal/PublicJournalPages.tsx` | Shared public journal renderer now centralizes canonical `/journal` metadata and rendering so `/blog` does not duplicate page logic |
| `src/app/journal/page.tsx`, `src/app/journal/[slug]/page.tsx` | Canonical public route tree now exists and reuses the shared journal implementation |
| `src/app/blog/page.tsx`, `src/app/blog/[slug]/page.tsx` | Legacy public routes now act as compatibility redirects to canonical `/journal` destinations |
| `src/lib/shell/shell-navigation.ts` | Primary navigation label remains `Journal` and now points to `/journal` |
| `src/lib/blog/journal-taxonomy.ts` | Publication structure builder remains separated from the route file and is reused by canonical `/journal` pages |
| Journal Publication Redesign work | Public journal composition already exists and should be reused rather than redesigned inside this route-convergence sprint |
| `src/components/AppShell.tsx`, `src/components/SiteNav.tsx`, `src/frameworks/ui/ChatSurface.tsx` | Shell tone and quiet-route behavior now treat `/journal` as canonical while still tolerating legacy `/blog` paths during compatibility rollout |
| `src/app/sitemap.ts` | Sitemap now emits canonical `/journal` URLs for published posts |
| `src/adapters/ChatPresenter.ts`, `src/lib/jobs/job-status.ts`, `src/lib/evals/live-runner.ts`, `src/lib/evals/runner.ts` | User-facing summaries and eval expectations now emit `/journal` for public destinations while preserving journal-first admin preview routes |

## Current Runtime Status

Sprint 3 public-route convergence has now landed in the repository. The current QA task is to verify the cutover state and record any residual gaps honestly.

Verified current state:

1. canonical public journal pages now live at `src/app/journal/page.tsx` and `src/app/journal/[slug]/page.tsx`
2. legacy public `/blog` routes now redirect to matching `/journal` destinations for published content and fail closed for missing or unpublished content
3. `src/app/sitemap.ts` emits `/journal` URLs for published posts and does not advertise duplicate public `/blog` entries
4. `src/lib/shell/shell-navigation.ts`, `src/components/AppShell.tsx`, `src/components/SiteNav.tsx`, and `src/frameworks/ui/ChatSurface.tsx` now treat `/journal` as canonical journal route truth while preserving `/blog` compatibility behavior where appropriate
5. public-facing chat, job, worker, and eval summaries now emit `/journal` truth for published destinations
6. admin draft preview remains converged on `/admin/journal/preview/[slug]`, and the legacy admin preview path is retired
7. direct route-level tests now exist for canonical `/journal` pages, legacy `/blog` redirects, the Sprint 3 static convergence guard, and sitemap output

Residual QA scope is now limited to broader regression coverage outside the focused Sprint 3 suite, especially browser-facing route-tone and end-to-end navigation checks.

---

## Task 3.1 - Extract shared public journal page modules

**What:** Separate public journal rendering from route naming so `/blog` and `/journal` do not duplicate the same implementation.

| Item | Detail |
| --- | --- |
| **Create or Modify** | shared page modules for journal index and article rendering under `src/app/` or `src/components/journal/` |
| **Modify** | `src/app/blog/page.tsx` and `src/app/blog/[slug]/page.tsx` |
| **Spec** | `JEO-080`, `JEO-081`, `JEO-113` |

### Task 3.1 Notes

This task is structural. It should make route cutover low-risk by ensuring there is one public journal implementation, not two diverging route trees.

Do not fork logic into separate `/blog` and `/journal` page implementations.

The same rule applies to route emitters used by workers and chat summaries: there should be one canonical route-truth helper rather than page-local and presenter-local string construction.

Current QA grounding:

1. `tests/blog-hero-rendering.test.tsx` now exercises the canonical public rendering behavior through the `/journal` pages
2. direct route tests now exist for canonical `/journal` pages and legacy `/blog` redirect wrappers
3. the shared implementation lives in `src/components/journal/PublicJournalPages.tsx`, so parity is proven at the route boundary without duplicating the page logic

### Task 3.1 Verify

```bash
npm exec vitest run tests/blog-hero-rendering.test.tsx src/components/AppShell.test.tsx src/components/SiteNav.test.tsx
```

---

## Task 3.2 - Add canonical `/journal` routes and update metadata truth

**What:** Introduce the journal-first public route tree and make it the canonical metadata source.

| Item | Detail |
| --- | --- |
| **Create** | `src/app/journal/page.tsx` and `src/app/journal/[slug]/page.tsx` |
| **Modify** | shared metadata generation used by the public journal pages |
| **Spec** | `JEO-020`, `JEO-021`, `JEO-081`, `JEO-084`, `JEO-114` |

### Task 3.2 Notes

Rules:

1. canonical URLs must point to `/journal`
2. story, archive, and related links emitted by the page must point to `/journal/...`
3. published content parity must be preserved during the cutover
4. shell route-tone detection must treat `/journal` exactly as the old `/blog` route family was treated
5. worker summaries such as `get_journal_workflow_summary`, `prepare_journal_post_for_publish`, and `publish_journal_post` must emit `/journal` truth for public destinations once cutover lands

Current QA grounding:

1. the canonical route tree now includes `src/app/journal/page.tsx` and `src/app/journal/[slug]/page.tsx`
2. the shell and direct route tests now assert `/journal` as the journal route family that carries public tone and canonical metadata truth
3. direct route coverage now includes legacy `/blog` redirect behavior so the compatibility layer is verified instead of assumed

### Task 3.2 Verify

```bash
npm exec vitest run tests/blog-hero-rendering.test.tsx src/components/AppShell.test.tsx src/components/SiteNav.test.tsx
```

---

## Task 3.3 - Convert `/blog` into compatibility redirects and update navigation

**What:** Preserve external compatibility while making `/journal` the single public truth.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/blog/page.tsx` and `src/app/blog/[slug]/page.tsx` into redirects or wrappers |
| **Modify** | `src/lib/shell/shell-navigation.ts` and any journal-link emitters discovered during implementation |
| **Modify** | sitemap, chat presenter, job-status summaries, eval runners, and preview-link emitters that still produce `/blog` truth |
| **Spec** | `JEO-022`, `JEO-082`, `JEO-083`, `JEO-104`, `JEO-114` |

### Task 3.3 Notes

Keep the redirect behavior honest:

1. redirect only to valid published journal destinations
2. do not expose draft-only paths publicly
3. preserve the current user-facing `Journal` label in nav and update the href to `/journal`
4. update all verified public `/blog` emitters, not just page routes, before calling the cutover complete

This includes chat presenter links, job-summary links, sitemap entries, shell-route detection, and eval summaries that point to public journal destinations.

It does not include reintroducing retired admin preview paths.

This sprint does not require renaming internal route IDs such as `blog` if that would create unnecessary churn.

Current QA grounding:

1. `src/adapters/ChatPresenter.ts`, `src/lib/jobs/job-status.ts`, `src/lib/evals/live-runner.ts`, and `src/lib/evals/runner.ts` now emit `/journal` for published public destinations
2. admin draft review remains on `/admin/journal/preview/[slug]` and has not reintroduced retired admin preview routes
3. `tests/sprint-3-blog-orchestration-qa.test.ts` now verifies post-cutover public `/journal` truth while preserving admin preview convergence
4. `tests/journal-public-route-convergence.test.ts` and `src/app/sitemap.test.ts` now provide additional direct guard coverage for emitter and sitemap truth

### Task 3.3 Verify

```bash
npm exec vitest run tests/blog-hero-rendering.test.tsx src/components/AppShell.test.tsx src/components/SiteNav.test.tsx src/adapters/ChatPresenter.test.ts src/hooks/useGlobalChat.test.tsx tests/job-status-summary-tools.test.ts tests/sprint-3-blog-orchestration-qa.test.ts tests/journal-public-route-convergence.test.ts src/app/journal/page.test.tsx src/app/journal/[slug]/page.test.tsx src/app/blog/page.test.tsx src/app/blog/[slug]/page.test.tsx src/app/sitemap.test.ts
```

---

## Completion Checklist

- [x] Public `/journal` routes are canonical and reuse the existing journal implementation
- [x] Legacy `/blog` paths remain available as compatibility redirects
- [x] Navigation and generated metadata point to `/journal`
- [x] Shell tone, sitemap, chat presenter, jobs, evals, and preview links no longer emit accidental public `/blog` truth
- [x] Route cutover does not expose drafts or break published journal rendering
- [x] Public route truth is shared by pages, presenters, and journal workers rather than duplicated in separate emitters

## QA Deviations

1. The focused Sprint 3 suite is green against the current repository, including direct route tests for canonical `/journal` pages, legacy `/blog` redirects, the public-route static guard, and sitemap output.
2. This QA pass did not rerun the browser-overlay and broader browser navigation suites that may also key off journal route tone, so those remain residual regression risk until reverified.
3. This QA pass did not run `npm run build`, so full production compilation remains an explicit follow-up validation step.
