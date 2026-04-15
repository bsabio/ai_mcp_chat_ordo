# Sprint 4 — Blog Rendering And Hardening

> **Goal:** Add published blog hero-image rendering, public-safe metadata and sitemap integration, deferred-job retry ergonomics, and browser/runtime hardening without widening draft visibility.
> **Spec Sections:** `BAPP-015`, `BAPP-037`, `BAPP-041`, `BAPP-050` through `BAPP-056`, `BAPP-060`
> **Prerequisite:** Sprint 0 asset and public-delivery foundation, Sprint 1 native image generation, Sprint 2 QA stages, Sprint 3 orchestration, and the shared deferred-jobs runtime.

---

## QA Review Of Sprint Scope

Sprint 4 was reviewed against the parent spec and the shipped runtime before drafting. The following scope clarifications are enforced in this sprint document:

1. Sprint 4 owns the published-reader surface for the blog-backed publication system: canonical public journal index rendering, public post rendering, metadata exposure, sitemap integration, and runtime retry behavior for deferred blog jobs.
2. Sprint 4 does not widen draft access. Drafts remain non-public, and the admin preview route added during Sprint 3 remains the correct draft-only surface.
3. Metadata integration in this sprint means published routes must use the public-safe blog asset route for hero imagery rather than any private file path or chat attachment path.
4. Retry hardening in this sprint is delivered through the shared deferred-job action surface and browser chat interactions, not through blog-specific backchannel endpoints.
5. Runtime hardening in this sprint includes public asset path safety, cache and visibility rules, browser reload resilience for deferred job cards, and guarded job action dispatch.
6. Sprint 4 is materially implemented in the current runtime. The canonical public journal index now matches the published post route on the key public-safe metadata contract by emitting canonical alternates and a representative Open Graph image when a published hero asset is available.

The verification plan below focuses on public-safe hero rendering, metadata and sitemap integration, retry semantics, browser reload behavior, and preservation of existing manual editorial flows.

## QA Against Parent Spec

Sprint 4 was reviewed directly against the parent spec sections it claims.

### Fully satisfied requirements

| Requirement | Status | Notes |
| --- | --- | --- |
| `BAPP-015` Public-blog-safe media | Satisfied | Published blog surfaces load hero imagery through `/api/blog/assets/[id]`, and the asset route only serves public media when the asset is attached to a published post. |
| `BAPP-037` Public-safe metadata and page rendering | Satisfied | The blog index and published post routes both render through the public-safe asset path, emit canonical URLs, and use published hero assets for Open Graph imagery without leaking draft media. |
| `BAPP-041` Chat and deferred-job integration | Satisfied for Sprint 4 scope | Deferred blog job cards survive reload, expose terminal actions, and the shared job action route supports cancel and retry operations for queued, running, failed, and canceled jobs as appropriate. |
| `BAPP-050` Admin-only generation surface | Satisfied | Sprint 4 preserves the earlier admin-only tool boundary and does not introduce any new public generation surface. |
| `BAPP-051` Prompt and artifact privacy for drafts | Satisfied | Draft assets remain private unless the requester is the owner or an admin, and draft preview stays on the admin-only route rather than the public blog reader route. |
| `BAPP-052` Published media safety | Satisfied | Public cache headers are only applied for assets attached to published posts; draft and unattached assets remain private and non-cacheable. |
| `BAPP-053` Provider-key safety | Satisfied for Sprint 4 scope | Sprint 4 adds no browser-side provider access. OpenAI image-provider composition remains server-side in the blog production root and adapters. |
| `BAPP-054` Input validation | Satisfied for Sprint 4 surfaces | The shared job action route validates job actions and terminal-state transitions, and the public asset route resolves persisted asset ids rather than accepting arbitrary paths. |
| `BAPP-056` Path safety | Satisfied | The public asset route resolves disk paths through `resolveBlogAssetDiskPath`, rejecting absolute paths and storage-root escapes before file reads. |
| `BAPP-060` Existing flow preservation | Satisfied | Deferred draft and publish flows remain green beside the newer orchestration path, and the published blog routes continue to expose only published content. |

### Out-of-scope or later-stage requirements

| Requirement | Status | Notes |
| --- | --- | --- |
| Broader SEO parity beyond the current blog routes | Deferred to later work | Sprint 4 covers the shipped blog routes and sitemap integration. Broader SEO polish or richer index-level social metadata can land as a follow-up without changing the public asset model. |
| Additional retry UX beyond the shared deferred-job action surface | Deferred to later work | Retry and cancel semantics are present, but more opinionated blog-specific retry messaging or analytics would be additive work, not required to satisfy the current sprint boundary. |

QA conclusion: Sprint 4 is implemented and acceptable for public rendering, metadata, sitemap inclusion, asset safety, deferred retry hardening, and browser/runtime resilience. No material Sprint 4 deviations remain in the current runtime.

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/app/journal/page.tsx` | Renders published posts on the canonical public journal index, loads published hero assets through the blog asset helper, and exports canonical and representative Open Graph metadata through the public asset path. |
| `src/app/journal/[slug]/page.tsx` | Restricts the canonical public post route to published posts, renders the published hero image, and exposes canonical and article Open Graph metadata using the public asset URL. |
| `src/lib/blog/hero-images.ts` | Centralizes public-safe hero asset loading and guarantees only published hero assets are returned for published-reader surfaces. |
| `src/app/api/blog/assets/[id]/route.ts` | Serves blog assets by persisted id, enforces publication and authorization rules, and applies public versus private cache headers correctly. |
| `src/lib/blog/blog-asset-storage.ts` | Resolves blog asset disk paths safely and rejects storage-root escapes or absolute-path access. |
| `src/app/sitemap.ts` | Includes `/journal` and published `/journal/[slug]` entries in the generated sitemap while excluding drafts by relying on the published-post repository surface. |
| `src/app/api/chat/jobs/[jobId]/route.ts` | Provides shared deferred-job cancel and retry handling with validation, dedupe-aware retry creation, and conversation projection. |
| `src/frameworks/ui/useChatSurfaceState.tsx` | Dispatches job actions from the chat surface and refreshes the active conversation after retry requests succeed. |
| `tests/blog-hero-rendering.test.tsx` | Verifies published hero rendering on the canonical public journal index and post page, metadata exposure for published post hero images, and omission of draft assets from public rendering. |
| `tests/blog-assets-route.test.ts` | Verifies public asset serving for published hero media, private handling for draft assets, owner/admin inspection, and storage-path escape rejection. |
| `tests/chat-job-actions-route.test.ts` | Verifies deferred job cancel and retry behavior on the shared route. |
| `tests/deferred-blog-job-flow.test.ts` | Verifies the shared worker and conversation projector for deferred blog drafting. |
| `tests/deferred-blog-publish-flow.test.ts` | Verifies the shared worker publishes draft posts and updates linked hero assets to published visibility. |
| `tests/browser-ui/deferred-blog-jobs.spec.ts` | Provides browser-level evidence for reload persistence, publish completion, orchestration completion, admin draft preview navigation, and hero-image opening. |
| `src/app/admin/journal/preview/[slug]/page.tsx` | Preserves the non-public draft preview boundary so Sprint 4 can harden public blog behavior without widening draft access. |

---

## Tasks

### 1. Render published hero media on the public journal surface

Sprint 4 must expose linked hero imagery on the reader-facing journal routes while keeping draft media private.

Implementation requirements:

- render published hero images on the journal index when a published post has a published hero asset
- render the linked hero image on the published post page
- omit draft, detached, or mismatched assets from public rendering
- keep hero URL generation routed through the public blog asset route

Current implementation note:

- the runtime satisfies this behavior through `loadPublishedHeroAsset()` and `loadPublishedHeroAssets()` and has focused rendering coverage

Suggested verification:

- `npm exec vitest run tests/blog-hero-rendering.test.tsx`

### 2. Integrate public-safe metadata and sitemap entries

Sprint 4 must make published journal routes visible and shareable using the public-safe asset transport.

Implementation requirements:

- expose journal index metadata
- expose published post metadata with canonical and Open Graph fields
- ensure published hero images are referenced through the public asset route when included in metadata
- include `/journal` and published `/journal/[slug]` entries in the sitemap

Current implementation note:

- both the journal index and published post routes now emit canonical metadata and public-safe Open Graph imagery when published hero assets are available

Suggested verification:

- `npm exec vitest run tests/blog-hero-rendering.test.tsx tests/blog-pipeline-integration.test.ts`

### 3. Harden public asset serving and path safety

Sprint 4 must preserve the public delivery model introduced earlier without leaking draft files or raw storage paths.

Implementation requirements:

- resolve blog assets by persisted id only
- reject storage paths that escape the configured asset root
- require publication state for public serving
- preserve owner/admin inspection for draft assets without making them public
- apply appropriate cache headers for public versus private media

Suggested verification:

- `npm exec vitest run tests/blog-assets-route.test.ts`

### 4. Expose retry and cancel flows through the shared deferred-job runtime

Sprint 4 must let deferred blog work recover through the existing job action surface instead of requiring a manual operator path.

Implementation requirements:

- support `cancel` for queued and running jobs
- support `retry` for failed and canceled jobs
- preserve dedupe rules when retrying
- re-project retried jobs into the conversation stream

Suggested verification:

- `npm exec vitest run tests/chat-job-actions-route.test.ts`

### 5. Preserve browser and reload resilience for deferred blog jobs

Sprint 4 must behave correctly in the browser after terminal job completion and page reload.

Implementation requirements:

- restore completed job cards after reload
- preserve published-post and produced-draft actions
- keep produced drafts routed to the admin preview surface
- keep hero-image actions routed through the public asset path

Suggested verification:

- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 npx playwright test tests/browser-ui/deferred-blog-jobs.spec.ts`

### 6. Preserve existing manual editorial flows

Sprint 4 must extend the system without regressing direct draft and publish behavior.

Implementation requirements:

- deferred draft creation remains functional through the shared worker
- deferred publish continues to expose the published post route after completion
- publishing a post upgrades the linked hero asset to published visibility
- public blog routes continue to show only published posts

Suggested verification:

- `npm exec vitest run tests/deferred-blog-job-flow.test.ts tests/deferred-blog-publish-flow.test.ts`

---

## Positive, Negative, And Edge-Case Test Matrix

### Positive tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| P1 | render the journal index with a published hero asset | the index displays the hero image through `/api/blog/assets/[id]` |
| P2 | render a published post with a linked hero asset | the post page displays the hero image and exposes it in Open Graph metadata |
| P3 | generate the sitemap | `/journal` and published `/journal/[slug]` entries are present |
| P4 | retry a failed deferred blog job | a fresh queued job is created and projected back into the conversation |
| P5 | reload after a completed deferred blog job | the terminal job card remains visible and its actions still work |

### Negative tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| N1 | render a published post whose linked asset is still draft-only | the hero image is omitted from the public surface |
| N2 | request a draft asset anonymously | the asset route returns `401` |
| N3 | request a private draft asset as a non-owner non-admin | the asset route returns `403` |
| N4 | retry a job that is still queued or running | the job action route returns `409` |
| N5 | request an asset whose storage path escapes the asset root | the asset route returns `404` |

### Edge-case tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| E1 | render a published post without a hero asset | the page still renders and metadata omits the image field cleanly |
| E2 | serve a published hero asset | the response is cacheable with long-lived public headers |
| E3 | retry a failed job when an active deduped twin already exists | the route returns the existing active job rather than creating a duplicate |
| E4 | reload the browser after terminal deferred blog completion | the visible status card persists through conversation reload |
| E5 | navigate from a produced draft action | the action resolves to the admin preview surface rather than the public journal route |

Coverage note:

- P1-P2, N1, and E1-E2 are covered directly by the current blog rendering tests.
- P3 is covered by the sitemap coverage already in the blog pipeline suite.
- P4, N4, and E3 are covered by the shared job action route tests.
- P5 and E4-E5 are covered by the browser deferred blog-jobs spec.
- N2-N3 and N5 are covered by the blog asset route tests.

Focused verification run for this QA pass:

- `npm exec vitest run tests/blog-hero-rendering.test.tsx`
- `npm exec vitest run tests/blog-pipeline-integration.test.ts tests/blog-assets-route.test.ts tests/chat-job-actions-route.test.ts tests/deferred-blog-job-flow.test.ts tests/deferred-blog-publish-flow.test.ts`
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 npx playwright test tests/browser-ui/deferred-blog-jobs.spec.ts`

---

## Completion Checklist

- [x] published hero rendering added on the canonical public journal index and post page
- [x] published blog URLs included in sitemap output
- [x] public asset route enforces publication, ownership, and path-safety rules
- [x] shared deferred-job cancel and retry route added for blog workflows
- [x] browser deferred-job flow survives reload and preserves terminal actions
- [x] deferred draft and publish flows remain green beside orchestration
- [x] blog index metadata adds canonical alternates
- [x] blog index metadata exposes a representative Open Graph image

## QA Deviations

- No material Sprint 4 deviations remain after adding canonical and representative Open Graph metadata to the canonical public journal index route.