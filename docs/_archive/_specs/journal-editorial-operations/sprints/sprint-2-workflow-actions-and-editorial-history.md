# Sprint 2 - Workflow Actions And Editorial History

> **Goal:** Complete the editorial operating loop by grounding workflow transitions, revision restore, metadata editing, draft-body editing, and journal-first language in the canonical editorial seams already established in Sprint 0 and Sprint 1, while keeping deterministic journal chat workers explicit as either shipped runtime seams or clearly identified follow-on work.
> **Spec ref:** `JEO-013`, `JEO-014`, `JEO-016`, `JEO-019`, `JEO-019N` through `JEO-019AI`, `JEO-040` through `JEO-044`, `JEO-052`, `JEO-057` through `JEO-059`, `JEO-090` through `JEO-092S`, `JEO-102`, `JEO-103`, `JEO-106`, `JEO-110`, `JEO-116`
> **Prerequisite:** Sprint 1 complete
> **Test count target:** 1373 existing + approximately 20 focused tests covering legal workflow transitions, revision restore, metadata and draft edits, restore previews, presenter output, journal-first language, and helper-level validation.

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/core/use-cases/tools/admin-content.tool.ts` | `executeDraftContent()` validates title/content, generates slug/description, and persists a draft; `executePublishContent()` publishes by post ID and can publish hero-image visibility |
| `src/lib/journal/admin-journal-actions.ts` | Shared Sprint 2 helper module now creates the canonical `JournalEditorialInteractor`, exports visible workflow-action descriptors from `ALLOWED_TRANSITIONS`, and parses metadata, draft-body, workflow, and restore form payloads |
| `src/lib/journal/admin-journal-actions.test.ts` | Helper-level coverage now proves positive, negative, and edge-case parsing behavior for metadata, draft-body, workflow, and restore inputs |
| `src/core/entities/blog-artifact.ts` | Existing artifact types already cover generation and image provenance, confirming that editorial revision history should remain a separate concern |
| `src/adapters/BlogPostArtifactDataMapper.ts` | Artifact repository stores JSON payload history by post and artifact type, which can coexist with the new revision model |
| Sprint 0 repository work | Provides state transition and revision APIs needed for admin actions |
| Sprint 1 admin journal pages | Provide the surfaces that now host metadata forms, draft-body editing, workflow controls, revision history, and restore previews through shared loader and interactor seams |
| `src/app/admin/journal/[id]/page.tsx` | The admin detail workspace now performs metadata edits, draft-body edits, workflow transitions, and revision restore through page server actions backed by the shared helper and `JournalEditorialInteractor` |
| `src/adapters/ChatPresenter.ts` and `src/adapters/ChatPresenter.test.ts` | Chat-facing action links and summaries now partially converge toward journal truth while preserving public `/blog` compatibility where that route remains canonical |
| `src/core/use-cases/tools/blog-production.tool.ts` | Existing staged article-production tools already model composition, QA, remediation, prompt design, and orchestration as discrete workers |
| `src/core/use-cases/tools/deferred-job-status.tool.ts` | Existing job-status tools already provide the baseline status surface for deferred editorial work |
| `docs/_specs/journal-editorial-operations/artifacts/executive-control-and-tool-matrix.md` | The owner-facing ask/delegate/approve operating model already exists as an artifact and should remain aligned to the actual shipped worker inventory |
| `docs/_specs/journal-editorial-operations/artifacts/journal-worker-implementation-map.md` | The worker map must distinguish between shipped runtime seams and still-planned journal-named wrappers so the sprint package does not imply missing tool registrations are already live |

---

## Current Grounding

This sprint is no longer greenfield. The current repository already includes several Sprint 2 outcomes:

1. `JournalEditorialInteractor` remains the canonical workflow and revision policy seam.
2. `src/lib/journal/admin-journal-actions.ts` centralizes the form-to-interactor bridge used by the admin workspace.
3. `/admin/journal/[id]` now exposes metadata editing, draft-body editing, workflow transitions, revision restore, and restore previews.
4. Journal-first copy has already been applied to key user-facing tool, job, and presenter surfaces without renaming compatibility-safe tool IDs.

The main remaining ambiguity is not the admin page path. It is the gap between:

1. the shipped runtime, which still registers compatibility-safe blog-named tool IDs in `createToolRegistry()`, and
2. the worker artifacts, which describe the intended journal-named query and mutation worker inventory.

Sprint 2 docs must treat that distinction explicitly instead of implying the wrapper inventory is already wired.

---

## Task 2.1 - Add legal workflow actions to the admin workspace

**What:** Make workflow movement explicit and validated instead of treating publish as the only state change.

| Item | Detail |
| --- | --- |
| **Modify** | admin journal workspace routes and components from Sprint 1 |
| **Modify** | editorial interactors or service helpers from Sprint 0 as needed |
| **Spec** | `JEO-013`, `JEO-052`, `JEO-057`, `JEO-102`, `JEO-110` |

### Task 2.1 Notes

Supported actions should cover at minimum:

1. move `draft` to `review`
2. move `review` to `approved`
3. move `approved` to `published`
4. move backward only through explicit admin actions with revision-safe recording

Keep the allowed transition matrix simple and visible in code. Do not hide workflow policy inside scattered route handlers.

The current transition surface already runs through `src/lib/journal/admin-journal-actions.ts` and `JournalEditorialInteractor.transitionWorkflow()`. Any future `submit_journal_review`, `approve_journal_post`, and `publish_journal_post` wrappers should delegate to those same seams rather than re-implement workflow logic in chat tools or route handlers.

Minimum test coverage for this task:

Positive:

1. legal forward transitions render the correct workflow buttons in `/admin/journal/[id]`
2. forward transitions persist publish metadata and record revisions through `tests/blog-post-revision-repository.test.ts`
3. published posts expose the explicit backward action currently allowed by the visible transition matrix

Negative:

1. invalid workflow targets fail closed in helper-level parsing instead of widening to an implicit default
2. anonymous visitors are redirected away from the admin workspace before workflow controls render
3. non-admin users are denied access before workflow controls render

Edge:

1. published rows expose the backward transition button without losing published metadata display context
2. workflow change notes remain optional but accepted on every action surface
3. the visible button set stays derived from the exported transition matrix rather than duplicating status logic in JSX

### Task 2.1 Verify

```bash
npm exec vitest run src/lib/journal/admin-journal-actions.test.ts tests/blog-post-revision-repository.test.ts src/app/admin/journal/[id]/page.test.tsx
```

---

## Task 2.2 - Add revision browsing and restore

**What:** Let admins inspect revision history and restore prior editorial states safely.

| Item | Detail |
| --- | --- |
| **Modify** | `/admin/journal/[id]` workspace and supporting data loaders |
| **Modify** | revision repository or services as needed |
| **Spec** | `JEO-014`, `JEO-040` through `JEO-044`, `JEO-058`, `JEO-059`, `JEO-103`, `JEO-110` |

### Task 2.2 Notes

The restore flow should:

1. show who made each revision and when
2. include any stored `change_note`
3. create a fresh revision when a restore occurs
4. avoid silently erasing the current draft state

If a diff UI is too large for this sprint, a snapshot summary plus restore action is sufficient.

The current admin detail page already satisfies the minimum acceptable UI by showing:

1. revision actor and timestamp
2. stored change-note fallback handling
3. explicit restore controls
4. lightweight before/after restore preview cards with changed-field summaries

`restore_journal_revision` should still be treated as a first-class deterministic worker boundary in the artifact package, but the current shipped runtime exposes restore through page server actions plus `JournalEditorialInteractor.restoreRevision()` rather than through a registered journal-named tool.

Minimum test coverage for this task:

Positive:

1. admins can see revision history, artifact context, and hero-image context on `/admin/journal/[id]`
2. restore preview renders stable current-vs-revision snapshots when the snapshot differs from the current draft
3. missing revision restore attempts fail without mutating the current post state

Negative:

1. anonymous visitors are redirected from the workspace
2. non-admin visitors are denied from the workspace
3. unknown post IDs fail closed through `notFound()`

Edge:

1. revisions with no `changeNote` render the explicit fallback copy
2. revisions identical to the current draft render `Matches current draft` instead of a misleading change list
3. posts with no hero candidates or artifacts still render stable empty inspection states

### Task 2.2 Verify

```bash
npm exec vitest run src/lib/journal/admin-journal-actions.test.ts tests/blog-post-revision-repository.test.ts src/app/admin/journal/[id]/page.test.tsx
```

---

## Task 2.3 - Move user-facing content operations toward journal language

**What:** Update admin-facing descriptions and tool-facing text so the product stops speaking about a Journal through blog-only language.

| Item | Detail |
| --- | --- |
| **Modify** | `src/core/use-cases/tools/admin-content.tool.ts` |
| **Modify** | admin journal UI labels and action text |
| **Modify** | `src/adapters/ChatPresenter.ts`, `src/lib/jobs/job-status.ts`, and related tests where user-facing route strings or labels still expose blog-first language |
| **Spec** | `JEO-016`, `JEO-090` through `JEO-092`, `JEO-116` |

### Task 2.3 Notes

Constraints:

1. keep tool names such as `draft_content` and `publish_content` stable
2. update descriptions, success text, and UI labels to say `Journal` or `journal article` where appropriate
3. do not change wire-level payload shapes unless a real functional requirement demands it
4. update chat-presenter and job-summary copy in lockstep with route-truth changes so deferred-job and admin flows do not drift away from the UI contract

This task should also align user-facing text with the concrete worker inventory in the main spec so the LLM can reason in journal terms even while compatibility IDs remain in place.

Current shipped grounding:

1. `src/core/use-cases/tools/admin-content.tool.ts` now uses journal-first descriptions while keeping `draft_content` and `publish_content` IDs stable
2. `src/lib/jobs/job-status.ts` now emits journal-first summaries for draft and publish states
3. At Sprint 2 time, `src/adapters/ChatPresenter.ts` linked journal drafts through `/admin/journal/preview/[slug]` while published public links still pointed at `/blog/[slug]` ahead of Sprint 3 cutover

Minimum test coverage for this task:

Positive:

1. deferred draft jobs surface journal-first subtitles and draft-preview links
2. deferred publish jobs surface journal-first publish summaries
3. presenter actions route draft review into the journal admin preview path

Negative:

1. compatibility-safe tool IDs remain unchanged even after copy convergence
2. chat and deferred-job surfaces do not reintroduce retired admin preview paths for draft review links
3. journal-first copy changes do not break the focused presenter and chat-hook suite

Edge:

1. at Sprint 2 time, public published links remained `/blog/[slug]` until Sprint 3 route convergence completed
2. draft and published summaries diverge correctly without exposing contradictory labels
3. helper-level admin parsing tests stay in the Sprint 2 verify path because the admin page now depends on them as part of the canonical mutation bridge

### Task 2.3A - Define chat-first executive workflows and worker boundaries

**What:** Make the owner-facing operating model explicit: ask, delegate, approve through chat, backed by discrete workers and deferred jobs where appropriate.

| Item | Detail |
| --- | --- |
| **Modify** | feature-owned spec docs and artifacts for executive workflows and tool matrix |
| **Modify** | worker/tool descriptions as needed to align with journal-first operator language |
| **Spec** | `JEO-019N` through `JEO-019AI`, `JEO-092A` through `JEO-092E`, `JEO-119H`, `JEO-119I` |

### Task 2.3A Notes

Define at minimum:

1. ask workflows such as "what is blocked" and "what is ready"
2. delegate workflows such as "draft this", "prepare this for publish", and "review all drafts"
3. approve workflows such as publication, hero-image selection, or restore confirmation
4. which workers stay inline and which should use deferred jobs
5. which existing blog-production workers are reused directly versus wrapped in journal-first language

This sprint should leave no ambiguity about the concrete worker set. The main spec's Section 3.8.2 inventory is the required first-pass implementation target, even if some workers are exposed as wrappers over existing blog-named tool identifiers.

This task is complete when the package clearly explains how the owner uses chat as the control surface while admin pages remain support surfaces.

### Task 2.3A Verify

```bash
test -f docs/_specs/journal-editorial-operations/artifacts/executive-control-and-tool-matrix.md
test -f docs/_specs/journal-editorial-operations/artifacts/journal-worker-implementation-map.md
```

### Task 2.3 Verify

```bash
npm exec vitest run src/lib/journal/admin-journal-actions.test.ts src/adapters/ChatPresenter.test.ts src/hooks/useGlobalChat.test.tsx tests/deferred-blog-job-flow.test.ts tests/deferred-blog-publish-flow.test.ts
```

---

## Completion Checklist

- [ ] Admins can move content through explicit workflow states before publish
- [ ] Revision history is visible and restore-safe
- [ ] Metadata editing is integrated into the admin journal workspace
- [ ] Chat-facing summaries and admin preview actions move toward journal truth without breaking compatibility
- [ ] User-facing tool and admin language is journal-first without a risky tool-ID rename
- [ ] Deterministic worker boundaries for review, approval, publish, metadata edits, revision restore, and hero-image selection are explicit enough that chat and admin use the same canonical operations

## QA Deviations

1. The worker artifacts still describe journal-named deterministic query and mutation workers as the intended end state, but the shipped runtime continues to register compatibility-safe blog-named tools in `src/lib/chat/tool-composition-root.ts`. Sprint 2 should document this as an explicit compatibility boundary rather than implying the journal-named tool registrations already exist.
2. Admin-page server actions backed by `src/lib/journal/admin-journal-actions.ts` and `JournalEditorialInteractor` are the current shipped mutation path for metadata edits, draft-body edits, workflow transitions, and revision restore. Future journal-named chat workers must delegate to that same policy seam instead of replacing it.
