# Sprint 0 - Editorial Domain And Revisions

> **Goal:** Expand the current blog-backed content model into a journal-capable editorial domain with explicit metadata, moderated workflow states, revision persistence, compatibility-safe repository expansion, and the canonical service seams required by the chat-first journal workforce.
> **Spec ref:** `JEO-012` through `JEO-018`, `JEO-019O`, `JEO-019T`, `JEO-030` through `JEO-063`, `JEO-092A` through `JEO-092M`, `JEO-100` through `JEO-106`, `JEO-110`, `JEO-115`
> **Prerequisite:** None
> **Test count target:** 1373 existing + approximately 18 focused tests covering revision persistence, workflow transitions, taxonomy fallback, and migration-safe compatibility behavior.

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/core/entities/blog.ts` | `BlogPostStatus` is currently `draft \| published`; `BlogPost` already includes `heroImageAssetId`, publish metadata, and creator metadata |
| `src/core/use-cases/BlogPostRepository.ts` | Current interface exposes `create`, `findById`, `findBySlug`, `listPublished`, `publishById`, and `setHeroImageAsset` only |
| `src/adapters/BlogPostDataMapper.ts` | `BlogPostDataMapper` writes to `blog_posts`, inserts drafts, publishes only from `draft`, and orders public content by `published_at DESC` |
| `src/lib/db/tables.ts` | `blog_posts`, `blog_assets`, and `blog_post_artifacts` already exist; `blog_posts` currently has no explicit section or standfirst columns and no revision table |
| `src/lib/db/migrations.ts` | Migration helper already adds blog asset and blog artifact schema changes incrementally |
| `src/core/use-cases/BlogPostArtifactRepository.ts` | Artifact storage already supports `create`, `listByPost`, and `listByPostAndType`, which is useful for preserving generation provenance but not enough for editorial restore |
| `src/lib/blog/journal-taxonomy.ts` | `describeJournalPost()` and `buildJournalPublicationStructure()` currently infer section identity heuristically and split standfirsts from markdown |
| `tests/blog-pipeline-integration.test.ts` | Existing blog mapper and draft/publish tests are the correct baseline to extend for editorial metadata and workflow expansion |
| `tests/blog-post-artifact-repository.test.ts` | Existing artifact repository tests already cover blog artifact persistence and help guard separation from the new revision model |

---

## Task 0.1 - Extend the persisted editorial model

**What:** Add the smallest useful persisted metadata required to operate the journal intentionally rather than heuristically.

| Item | Detail |
| --- | --- |
| **Modify** | `src/core/entities/blog.ts` |
| **Modify** | `src/lib/db/tables.ts` |
| **Modify** | `src/lib/db/migrations.ts` |
| **Spec** | `JEO-012`, `JEO-018`, `JEO-030` through `JEO-033` |

### Task 0.1 Notes

Add at minimum:

1. explicit editorial `section` persisted on the post row
2. explicit `standfirst` persisted on the post row
3. expanded workflow status with `draft`, `review`, `approved`, and `published`

Keep the storage model compatibility-safe:

1. do not rename `blog_posts` in this sprint
2. backfill legacy rows with null-safe defaults so old published content continues rendering
3. keep `published_at` semantics intact for public chronology

This metadata is not just for pages. It is the authoritative substrate for `get_journal_post`, `get_journal_workflow_summary`, and every later deterministic worker.

### Task 0.1 Verify

```bash
npm exec vitest run tests/blog-pipeline-integration.test.ts tests/blog-hero-rendering.test.tsx
```

---

## Task 0.2 - Add editorial revision persistence

**What:** Create a dedicated revision model that records restore-safe snapshots for editorial changes.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/db/tables.ts` |
| **Modify** | `src/lib/db/migrations.ts` |
| **Create** | revision entity and repository files under `src/core/entities/` and `src/core/use-cases/` |
| **Create or Modify** | data mapper under `src/adapters/` |
| **Create** | focused revision repository tests under `tests/` |
| **Spec** | `JEO-040` through `JEO-044`, `JEO-103`, `JEO-110` |

### Task 0.2 Notes

The revision payload should capture editorial state, not just markdown body text.

Required fields in the snapshot payload:

1. `slug`
2. `title`
3. `description`
4. `standfirst`
5. `content`
6. `section`
7. `status`

Required metadata outside the payload:

1. `post_id`
2. `change_note`
3. `created_by_user_id`
4. `created_at`

This revision model should remain separate from `blog_post_artifacts`.

It should also become the canonical persistence seam for `list_journal_revisions` and `restore_journal_revision`; no later sprint should scrape ad hoc history from UI state or artifact payloads.

### Task 0.2 Verify

```bash
npm exec vitest run tests/blog-post-artifact-repository.test.ts tests/blog-post-revision-repository.test.ts
```

---

## Task 0.3 - Expand repository and mapper contracts for editorial operations

**What:** Add admin-safe query and mutation support for journal operations while preserving the current public routes.

| Item | Detail |
| --- | --- |
| **Modify** | `src/core/use-cases/BlogPostRepository.ts` |
| **Modify** | `src/adapters/BlogPostDataMapper.ts` |
| **Modify** | `src/adapters/RepositoryFactory.ts` only if new repository accessors are required |
| **Create** | interactor or editorial service boundary under `src/core/use-cases/` or `src/lib/` composition-root wiring as needed |
| **Spec** | `JEO-050` through `JEO-059`, `JEO-102`, `JEO-105`, `JEO-110` |

### Task 0.3 Notes

Add repository support for these capabilities:

1. list posts for admin by search, workflow state, and section
2. update draft content and editorial metadata
3. transition workflow state with validated transitions
4. list revisions and restore a revision

These seams should line up directly with the first-pass worker inventory:

1. admin listing powers `list_journal_posts`
2. detail loading powers `get_journal_post`
3. revision queries power `list_journal_revisions`
4. workflow queries plus job visibility power `get_journal_workflow_summary`
5. metadata and body writes power `update_journal_metadata` and `update_journal_draft`
6. validated transitions power `submit_journal_review`, `approve_journal_post`, and `publish_journal_post`

Implementation rules:

1. all list and search queries must use parameterized statements
2. workflow transition policy should live in an interactor or editorial service boundary, with repositories enforcing only persistence-safe invariants and atomic operations
3. public `listPublished()` behavior must remain backward-compatible for the current public journal pages
4. no route handler should invent workflow policy ad hoc
5. do not make the first worker layer page-owned; the same canonical use-case seams must be callable from chat orchestration, admin routes, and tests

### Task 0.3 Verify

```bash
npm exec vitest run tests/blog-pipeline-integration.test.ts tests/blog-post-revision-repository.test.ts tests/td-c-journal-editorial-operations.test.ts
```

---

## Task 0.4 - Make taxonomy helpers explicit-metadata aware

**What:** Rework journal taxonomy helpers so persisted metadata is authoritative and heuristics only fill gaps for legacy rows.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/blog/journal-taxonomy.ts` |
| **Create or Modify** | focused taxonomy tests |
| **Spec** | `JEO-060` through `JEO-063`, `JEO-115` |

### Task 0.4 Notes

Rules:

1. if `section` is present, use it directly
2. if `standfirst` is present, do not resplit the opener from markdown body
3. if metadata is absent, keep the existing heuristic classifier as a compatibility fallback
4. explicit metadata must never be overwritten by fallback inference

The fallback path should be invisible to the owner. Worker and page outputs should surface explicit editorial truth when present and only rely on heuristics as a legacy compatibility behavior.

### Task 0.4 Verify

```bash
npm exec vitest run tests/blog-hero-rendering.test.tsx tests/journal-taxonomy-metadata.test.ts
```

---

## Completion Checklist

- [ ] Post rows persist explicit editorial metadata required for journal operations
- [ ] Workflow status supports review and approval before publish
- [ ] Editorial revisions are stored separately from generation artifacts
- [ ] Repository APIs support admin listing, metadata updates, workflow transitions, and revision history
- [ ] Workflow and restore policy live behind a use-case or editorial service boundary rather than route handlers
- [ ] Journal taxonomy helpers prefer explicit metadata and preserve legacy fallback behavior
- [ ] Sprint 0 leaves clear service seams for the read and deterministic journal workers rather than forcing later sprints to invent page-local logic

## QA Deviations

None yet.
