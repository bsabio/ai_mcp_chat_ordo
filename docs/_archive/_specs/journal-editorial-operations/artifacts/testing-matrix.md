# Testing Matrix

This artifact makes the package's testing expectations concrete.

## Existing Tests To Extend

| File | Why it matters |
| --- | --- |
| `tests/blog-pipeline-integration.test.ts` | Existing mapper and draft/publish behavior baseline for editorial metadata, workflow, and publish invariants |
| `tests/blog-post-artifact-repository.test.ts` | Guards the separation between generation artifacts and the new revision model |
| `tests/blog-hero-rendering.test.tsx` | Public journal rendering baseline for taxonomy fallback, canonical output, and route parity |
| `tests/blog-image-generation-service.test.ts` | Protects hero-image behavior touched by admin workspace reuse |
| `tests/deferred-blog-job-flow.test.ts` | Covers job-driven draft outputs and route summaries |
| `tests/deferred-blog-publish-flow.test.ts` | Covers publish-flow route summaries and visibility behavior |
| `tests/blog-orchestration-qa.test.ts` | Pre-cutover static compatibility guardrail for admin preview and orchestration route outputs; should be updated during Sprint 3 to assert `/journal` public truth instead of legacy admin-preview details |
| `src/app/admin/journal/preview/[slug]/page.test.tsx` | Baseline auth/noindex coverage for the canonical admin preview route |
| `src/app/api/admin/blog/posts/[postId]/hero-images/route.test.ts` | Existing tested admin API that the journal workspace should reuse or wrap |
| `src/app/api/admin/blog/posts/[postId]/artifacts/route.test.ts` | Existing tested admin API that the journal workspace should reuse or wrap |
| `src/adapters/ChatPresenter.test.ts` | Covers action links and user-facing route summaries |
| `src/components/AppShell.test.tsx` | Covers journal-route shell tone and surface behavior |
| `src/components/SiteNav.test.tsx` | Covers journal-route nav emphasis and href truth |
| `src/hooks/useGlobalChat.test.tsx` | Covers deferred job summaries surfaced in the UI |

## New Tests This Package Should Create

| Planned file | Scope |
| --- | --- |
| `tests/blog-post-revision-repository.test.ts` | Revision persistence, restore semantics, publish metadata invariants |
| `tests/journal-taxonomy-metadata.test.ts` | Explicit `section` and `standfirst` precedence over heuristic fallback |
| `src/lib/journal/admin-journal-actions.test.ts` | Helper-level validation for metadata, draft-body, workflow, and restore form parsing |
| `src/core/use-cases/tools/journal-query.tool.test.ts` | Journal query worker wrappers, result shaping, and policy-safe query behavior |
| `src/core/use-cases/tools/journal-write.tool.test.ts` | Journal mutation worker wrappers, failure paths, and deterministic editorial mutations |
| `src/app/admin/journal/page.test.tsx` | Admin list auth, search/filter rendering, counts, quick actions |
| `src/app/admin/journal/[id]/page.test.tsx` | Admin detail loading, metadata editing surface, revision visibility |
| `src/app/admin/journal/preview/[slug]/page.test.tsx` | Journal-named preview route parity and compatibility behavior |
| `src/app/journal/page.test.tsx` | Canonical public `/journal` index route, metadata truth, and shared implementation parity |
| `src/app/journal/[slug]/page.test.tsx` | Canonical public `/journal/[slug]` article route, published-only access, and metadata truth |
| `src/app/blog/page.test.tsx` | Legacy `/blog` index compatibility redirect or wrapper behavior after cutover |
| `src/app/blog/[slug]/page.test.tsx` | Legacy `/blog/[slug]` compatibility redirect behavior and published-only safety |
| `src/app/sitemap.test.ts` | Canonical sitemap emission for `/journal` without duplicate public `/blog` entries |
| `tests/journal-public-route-convergence.test.ts` | Static guard for presenter, job-status, shell, and eval emitters that must stop leaking accidental public `/blog` truth |
| `tests/td-a-journal-editorial-operations.test.ts` | Booch/object-boundary static or structural audit coverage |
| `tests/td-c-journal-editorial-operations.test.ts` | SOLID/layering audit coverage |
| `tests/td-d-journal-editorial-operations.test.ts` | Facade/repository/composition-root pattern audit coverage |

## Focused Verify Commands By Sprint

| Sprint | Minimum focused verification |
| --- | --- |
| Sprint 0 | `npm exec vitest run tests/blog-pipeline-integration.test.ts tests/blog-post-artifact-repository.test.ts tests/blog-post-revision-repository.test.ts tests/journal-taxonomy-metadata.test.ts` |
| Sprint 1 | `npm exec vitest run src/app/admin/journal/page.test.tsx src/app/admin/journal/[id]/page.test.tsx src/app/admin/journal/preview/[slug]/page.test.tsx src/app/api/admin/blog/posts/[postId]/hero-images/route.test.ts src/app/api/admin/blog/posts/[postId]/artifacts/route.test.ts` |
| Sprint 2 | `npm exec vitest run src/lib/journal/admin-journal-actions.test.ts tests/blog-post-revision-repository.test.ts src/app/admin/journal/[id]/page.test.tsx src/adapters/ChatPresenter.test.ts src/hooks/useGlobalChat.test.tsx tests/deferred-blog-job-flow.test.ts tests/deferred-blog-publish-flow.test.ts && test -f docs/_specs/journal-editorial-operations/artifacts/executive-control-and-tool-matrix.md && test -f docs/_specs/journal-editorial-operations/artifacts/journal-worker-implementation-map.md` |
| Sprint 2B | `npm exec vitest run src/core/use-cases/tools/journal-query.tool.test.ts src/core/use-cases/tools/journal-write.tool.test.ts tests/tool-registry.integration.test.ts tests/tool-registry.test.ts src/lib/journal/admin-journal-actions.test.ts && test -f docs/_specs/journal-editorial-operations/sprints/sprint-2b-journal-worker-wrapper-registration.md && test -f docs/_specs/journal-editorial-operations/artifacts/journal-worker-implementation-map.md` |
| Sprint 3 | `npm exec vitest run tests/blog-hero-rendering.test.tsx src/components/AppShell.test.tsx src/components/SiteNav.test.tsx src/adapters/ChatPresenter.test.ts src/hooks/useGlobalChat.test.tsx tests/job-status-summary-tools.test.ts tests/blog-orchestration-qa.test.ts tests/journal-public-route-convergence.test.ts src/app/journal/page.test.tsx src/app/journal/[slug]/page.test.tsx src/app/blog/page.test.tsx src/app/blog/[slug]/page.test.tsx src/app/sitemap.test.ts && test -f docs/_specs/journal-editorial-operations/artifacts/route-convergence-checklist.md` |
| TD-A | `npm exec vitest run tests/td-a-journal-editorial-operations.test.ts` |
| TD-C | `npm exec vitest run tests/td-c-journal-editorial-operations.test.ts` |
| TD-D | `npm exec vitest run tests/td-d-journal-editorial-operations.test.ts` |

## Sprint 1 Scenario Coverage

This package should treat Sprint 1 as a support-surface sprint with explicit positive, negative, and edge-case coverage.

### `/admin/journal` list page

Positive:

1. admin sees a ledger of posts with title, slug, status, section, and quick actions
2. title and slug search narrow the visible rows correctly
3. workflow and section filters compose correctly with the search term

Negative:

1. anonymous visitor is redirected to `/login`
2. non-admin authenticated visitor is denied access
3. invalid workflow or section query values fail closed rather than widening the result set silently

Edge:

1. empty result set renders a stable empty-state message
2. rows with `null` `section` or `standfirst` values render safe fallback text
3. workflow counts are not incorrectly derived from a filtered or limit-bound slice when the UI claims to show totals

### `/admin/journal/[id]` detail workspace

Positive:

1. admin can load the post row by `id`
2. revision history from `listByPostId(id)` is visible
3. hero-image and artifact support surfaces are present through the existing admin APIs

Negative:

1. anonymous visitor is redirected to `/login`
2. non-admin authenticated visitor is denied access
3. unknown `id` fails closed through `notFound()` or equivalent denial behavior

Edge:

1. post with no hero candidates renders without broken selection controls
2. post with no artifact rows renders a safe empty inspection state
3. post with no explicit `standfirst` or `section` still renders stable editable fields

### Admin journal preview

Positive:

1. `/admin/journal/preview/[slug]` renders the expected title, preview label, markdown body, and hero image for the requested post
2. draft and published preview labels remain correct on the canonical admin preview route

Negative:

1. anonymous visitor redirects on the admin preview route
2. non-admin visitor is denied on the admin preview route
3. unknown slug fails closed on the admin preview route

Edge:

1. post without a hero image still renders a stable preview shell
2. generated metadata remains `noindex, nofollow`
3. preview helpers and emitters stay converged on `/admin/journal/preview/[slug]`

### Reused admin APIs

Positive:

1. hero-image listing returns post context and candidate assets for an admin
2. hero-image selection succeeds for a valid candidate
3. artifact inspection returns full rows and filtered rows by supported artifact type

Negative:

1. non-admin callers receive `403`
2. malformed hero-image mutation payloads receive `400`
3. unsupported artifact types receive `400`
4. missing posts receive `404`

Edge:

1. canonical hero rejection conflict returns `409`
2. artifact filter with zero matching rows still returns stable post context plus an empty artifact array
3. hero-image route handles posts with zero candidates without throwing

## Sprint 2 Scenario Coverage

This package should treat Sprint 2 as the canonical editorial-control sprint and explicitly cover positive, negative, and edge behavior across the admin console, revision safety, and journal-first operator language.

### Workflow actions and helper seams

Positive:

1. legal workflow progression records revisions and publish metadata correctly
2. the admin detail page renders the correct workflow controls for the current post state
3. published rows expose the explicit backward action currently allowed by the transition matrix

Negative:

1. invalid workflow targets fail closed in `src/lib/journal/admin-journal-actions.test.ts`
2. anonymous visitors are redirected before workflow controls render
3. non-admin visitors are denied before workflow controls render

Edge:

1. optional workflow change notes are accepted without becoming required validation blockers
2. the button set remains derived from the exported `ALLOWED_TRANSITIONS` policy instead of duplicated JSX logic
3. helper-level tests remain in the focused verify command because the page now depends on them as the canonical mutation bridge

### Revision history, restore, and draft editing

Positive:

1. admins can edit metadata and draft body from `/admin/journal/[id]`
2. admins can inspect revision history, actor identity, and restore controls
3. changed revisions render lightweight before/after restore previews

Negative:

1. unknown revision restore attempts fail without mutating the post
2. anonymous visitors are redirected from the detail workspace
3. unknown post IDs fail closed through `notFound()`

Edge:

1. empty hero-candidate and artifact states render safely
2. missing revision change notes render stable fallback copy
3. revisions identical to the current draft render `Matches current draft` rather than a misleading change list

### Journal-first copy and deferred-job surfaces

Positive:

1. presenter actions send draft review through `/admin/journal/preview/[slug]`
2. deferred draft jobs emit journal-first subtitles and draft-preview summaries
3. deferred publish jobs emit journal-first publish summaries

Negative:

1. compatibility-safe tool IDs remain unchanged even after copy convergence
2. draft review links do not reintroduce retired admin preview paths
3. journal-first wording changes do not break the focused chat-hook and presenter suite

Edge:

1. at Sprint 2 time, published links remained `/blog/[slug]` until Sprint 3 public-route convergence landed
2. draft and published labels diverge truthfully in both UI and metadata surfaces
3. executive-control and worker-map artifacts continue to exist alongside the focused runtime tests

## Sprint 2B Scenario Coverage

This package should treat Sprint 2B as the explicit registry-wrapper sprint and require positive, negative, and edge-case coverage at the tool and registry boundaries.

### Journal query and mutation wrappers

Positive:

1. journal query wrappers return editorial inventory, detail, revision history, and workflow-summary data through explicit interactor seams
2. journal mutation wrappers delegate metadata edits, draft edits, workflow changes, restore behavior, and publish preparation through deterministic editorial boundaries
3. worker outputs use the same journal-first operator language already established in the shipped admin support surfaces

Negative:

1. invalid identifiers and unsupported workflow targets fail closed without mutating post state
2. wrappers do not bypass the underlying editorial policy boundary by embedding ad hoc mutation logic in the tool factory
3. introducing journal-named wrappers does not silently remove compatibility-safe blog-named tools that current runtime behavior still depends on

Edge:

1. at Sprint 2B time, wrappers remained truthful about published-route behavior while public output still resolved through `/blog/[slug]` ahead of Sprint 3
2. empty workflow queues, zero revision rows, and no active jobs return stable summary structures rather than widened or misleading results
3. restore and publish wrappers preserve revision-safety requirements even when the target state closely matches the current head revision

### Registry composition and role exposure

Positive:

1. `tests/tool-registry.integration.test.ts` proves the new journal worker set is registered and exposed to the intended roles
2. duplicate-registration protections remain active after the journal wrapper set is added
3. lower-level registry tests remain aligned with the final registered worker names and schemas

Negative:

1. non-admin or otherwise unauthorized roles do not gain access to privileged journal mutation workers
2. unknown-tool handling continues to fail closed after the registry expands
3. registry tests fail if the spec package claims journal workers that the composition root does not actually register

Edge:

1. legacy blog-named registrations and journal-named wrappers can coexist during the transition period without name collisions
2. registry assertions remain stable if a worker is intentionally deferred and the sprint doc is updated in the same change
3. wrapper registration remains grounded in the composition root rather than spread across page code or incidental startup paths

## Sprint 3 Scenario Coverage

This package should treat Sprint 3 as the canonical public-route cutover sprint and require positive, negative, and edge-case coverage across public pages, compatibility redirects, and all public route emitters.

### Canonical `/journal` pages and metadata

Positive:

1. `/journal` and `/journal/[slug]` render the same published content currently served by the legacy `/blog` pages
2. canonical metadata, story links, archive links, and related links emit `/journal` truth
3. public article pages preserve hero-image, standfirst, and markdown rendering behavior after route extraction

Negative:

1. unknown or unpublished slugs fail closed on the canonical public route
2. metadata does not keep advertising `/blog` as the canonical public URL after cutover
3. route extraction does not introduce a second divergent page implementation for `/blog` and `/journal`

Edge:

1. posts without hero images still render a stable canonical `/journal/[slug]` page
2. legacy rows without explicit `section` or `standfirst` continue to render through fallback logic after route cutover
3. shared modules keep canonical `/journal` pages and compatibility `/blog` wrappers behaviorally aligned during the transition period

### Legacy `/blog` compatibility redirects and shell tone

Positive:

1. `/blog` and `/blog/[slug]` redirect to the matching `/journal` destination for published content
2. shell route tone and nav emphasis move to `/journal` without losing the current journal styling semantics
3. sitemap entries switch to `/journal` and no longer advertise `/blog` as public truth

Negative:

1. redirect logic does not expose draft or unpublished content publicly
2. invalid legacy paths fail closed rather than redirecting to non-existent `/journal` destinations
3. shell and nav tests do not keep passing only because they still target `/blog` after cutover

Edge:

1. temporary `/blog` compatibility handling can remain in shell route detection during rollout without making `/blog` canonical again
2. existing deep links and bookmarks to `/blog` continue to land on the corresponding `/journal` destination
3. canonical metadata and sitemap output do not duplicate public entries for both `/blog` and `/journal`

### Chat, jobs, and eval public-route emitters

Positive:

1. chat presenter links for published destinations emit `/journal`
2. deferred publish and production summaries emit `/journal` for public destinations while keeping admin draft review on `/admin/journal/preview/[slug]`
3. eval summaries and static route-emitter guards update to `/journal` truth consistently

Negative:

1. admin draft preview links do not reintroduce retired admin preview paths
2. public-route emitters do not mix `/blog` and `/journal` truth in the same post-cutover workflow
3. Sprint 3 static guards do not keep asserting pre-cutover compatibility behavior as if that were the final public contract

Edge:

1. draft-oriented flows keep admin preview routes while published public flows move to `/journal`
2. queued or historical jobs created before cutover still render sensible labels and summaries after route-truth changes
3. compatibility-safe blog tool IDs remain unchanged even after public route truth moves to `/journal`

## Full Feature Verification

```bash
npm exec vitest run tests/blog-pipeline-integration.test.ts tests/blog-post-artifact-repository.test.ts tests/blog-post-revision-repository.test.ts tests/journal-taxonomy-metadata.test.ts tests/blog-hero-rendering.test.tsx tests/deferred-blog-job-flow.test.ts tests/deferred-blog-publish-flow.test.ts tests/blog-orchestration-qa.test.ts src/lib/journal/admin-journal-actions.test.ts src/app/admin/journal/page.test.tsx src/app/admin/journal/[id]/page.test.tsx src/app/admin/journal/preview/[slug]/page.test.tsx src/app/api/admin/blog/posts/[postId]/hero-images/route.test.ts src/app/api/admin/blog/posts/[postId]/artifacts/route.test.ts src/adapters/ChatPresenter.test.ts src/components/AppShell.test.tsx src/components/SiteNav.test.tsx src/hooks/useGlobalChat.test.tsx tests/td-a-journal-editorial-operations.test.ts tests/td-c-journal-editorial-operations.test.ts tests/td-d-journal-editorial-operations.test.ts
npm run build
```

If any planned file above is intentionally renamed during implementation, this matrix should be updated in the same sprint so the spec package stays authoritative.
