# Journal Editorial Operations Artifacts

This folder holds verification evidence for the journal management and route-convergence work.

It also holds implementation control artifacts for:

1. exact route-convergence inventory
2. exact existing-versus-planned test coverage
3. executive-control workflow and worker matrix
4. sequenced worker-registration planning grounded in the current runtime

## Baseline Routes

1. `/admin/journal`
2. `/admin/journal/[id]` for one representative draft or review item
3. `/admin/journal/preview/[slug]`
4. `/journal`
5. one representative `/journal/[slug]`
6. legacy `/blog` redirect behavior after Sprint 3 lands

## Evidence Format

1. Browser screenshots for admin list, admin detail, public journal, and redirect outcomes when those pages materially change
2. Short notes describing what was verified, what remained intentionally deferred, and whether compatibility redirects were checked manually or by automated tests

## Cadence

1. Capture a baseline pass when Sprint 1 introduces the admin journal workspace
2. Capture a second pass when Sprint 2 adds workflow and revision actions
3. Capture a cutover pass when Sprint 3 makes `/journal` canonical and `/blog` a redirect

## Naming Guidance

Use sprint-prefixed artifact names so evidence stays attributable, for example:

1. `sprint-1-admin-journal-list.png`
2. `sprint-1-admin-journal-detail.md`
3. `sprint-2-revision-restore-flow.png`
4. `sprint-3-journal-index-canonical.png`
5. `sprint-3-blog-redirect-notes.md`

## Control Artifacts

1. `route-convergence-checklist.md` tracks every verified `/blog` surface that must converge to `/journal` or remain as explicit compatibility.
2. `testing-matrix.md` tracks which tests already exist, which ones this package should extend, and which new test files must be created.
3. `executive-control-and-tool-matrix.md` defines how the owner delegates journal work through chat, which workers exist behind the LLM, and which of those workers should be deferred.
4. `journal-worker-implementation-map.md` maps each concrete journal worker to exact repository methods, interactor names, reuse seams, and likely `createToolRegistry()` registration points, and now serves as the implementation-detail companion to Sprint 2B rather than a free-floating future-state list.
