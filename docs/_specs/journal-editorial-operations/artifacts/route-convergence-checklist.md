# Route Convergence Checklist

This artifact tracks the verified public and admin surfaces touched by `/blog` to `/journal` convergence.

## Current Runtime Status

As of the current Sprint 3 cutover QA state:

1. canonical public pages, metadata, sitemap entries, and public chat/job summaries now use `/journal`
2. legacy public `/blog` pages remain as compatibility redirects to canonical `/journal` destinations
3. admin draft preview is canonical at `/admin/journal/preview/[slug]` and legacy admin preview compatibility has been retired
4. shell route tone now treats `/journal` as canonical while still tolerating `/blog` during the compatibility window

Mark each item as one of:

1. `keep` — remains intentionally blog-named as an internal compatibility layer
2. `wrap` — gains a journal-named wrapper over the canonical implementation
3. `redirect` — becomes a compatibility redirect to the journal truth
4. `rename` — moves fully to journal naming with no compatibility requirement

## Public Routes

| Surface | Current path or emitter | Expected outcome |
| --- | --- | --- |
| Journal index page | `src/app/blog/page.tsx` | `redirect` after canonical `/journal` parity is complete |
| Journal article page | `src/app/blog/[slug]/page.tsx` | `redirect` after canonical `/journal/[slug]` parity is complete |
| Canonical metadata | `src/app/blog/page.tsx`, `src/app/blog/[slug]/page.tsx` | `rename` to `/journal` |
| Sitemap entries | `src/app/sitemap.ts` | `rename` to `/journal` |

## Shell And UI Tone

| Surface | Current path or emitter | Expected outcome |
| --- | --- | --- |
| Shell journal-route detection | `src/components/AppShell.tsx` | `rename` to `/journal` with `/blog` compatibility if needed during cutover |
| Nav quiet-route detection | `src/components/SiteNav.tsx` | `rename` to `/journal` with `/blog` compatibility if needed during cutover |
| Chat-surface route tone | `src/frameworks/ui/ChatSurface.tsx` | `rename` to `/journal` with `/blog` compatibility if needed during cutover |
| Primary nav href | `src/lib/shell/shell-navigation.ts` | `rename` to `/journal` |

## Chat, Jobs, And Eval Outputs

| Surface | Current path or emitter | Expected outcome |
| --- | --- | --- |
| Chat presenter published-post action | `src/adapters/ChatPresenter.ts` | `rename` to `/journal` |
| Chat presenter draft-preview action | `src/adapters/ChatPresenter.ts` | `keep` on `/admin/journal/preview/[slug]`; do not regress to legacy admin preview |
| Deferred job status summaries | `src/lib/jobs/job-status.ts` | `rename` to `/journal` |
| Global chat tests and summaries | `src/hooks/useGlobalChat.test.tsx` | `rename` to `/journal` |
| Live eval summaries | `src/lib/evals/live-runner.ts` | `rename` to `/journal` |
| Deterministic eval summaries | `src/lib/evals/runner.ts` | `rename` to `/journal` |

## Admin Routes And APIs

| Surface | Current path or emitter | Expected outcome |
| --- | --- | --- |
| Admin preview page | `src/app/admin/journal/preview/[slug]/page.tsx` | `rename` canonical admin preview path |
| Admin preview test | `src/app/admin/journal/preview/[slug]/page.test.tsx` | `rename` canonical preview coverage |
| Hero-image admin API | `src/app/api/admin/blog/posts/[postId]/hero-images/route.ts` | `keep` or `wrap`; do not bypass |
| Artifact admin API | `src/app/api/admin/blog/posts/[postId]/artifacts/route.ts` | `keep` or `wrap`; do not bypass |

## Browser And Regression Coverage

| Surface | Current path or emitter | Expected outcome |
| --- | --- | --- |
| Public journal rendering tests | `tests/blog-hero-rendering.test.tsx` | `rename` assertions to `/journal` truth |
| Shell regression tests | `src/components/AppShell.test.tsx`, `src/components/SiteNav.test.tsx` | `rename` route expectations to `/journal` |
| Overlay/browser tests | `tests/browser-overlays.test.tsx` and related browser suite | `rename` route expectations if they depend on journal route tone |
| Blog orchestration QA | `tests/sprint-3-blog-orchestration-qa.test.ts` | `wrap` or `rename` depending on retained compatibility contract |

## Completion Rule

Route convergence is only complete when all rows above have an explicit status and no public-facing emitter still points at `/blog` accidentally.

Current focused QA status: canonical `/journal` routes, legacy `/blog` redirects, sitemap output, shell tone, presenter output, and job-summary emitters are verified by focused tests. Residual risk remains in broader browser regression coverage until those suites are rerun.