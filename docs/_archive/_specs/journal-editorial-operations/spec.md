# Journal Editorial Operations - Architecture Spec

> **Status:** Draft
> **Date:** 2026-03-26
> **Scope:** Add a real editorial operating model for the journal: an admin journal management surface, explicit editorial metadata, a moderated workflow, revision history, and phased external route convergence from `/blog` to `/journal`. This work covers the canonical public journal routes, legacy public `/blog` compatibility redirects, the admin preview route, shell navigation, blog persistence, journal taxonomy, and journal-related tool descriptions.
> **Dependencies:** [RBAC](../rbac/spec.md), [Shell Navigation And Design System](../shell-navigation-and-design-system/spec.md), [Journal Publication Redesign](../journal-publication-redesign/spec.md), [Blog Article Production Pipeline](../blog-article-production-pipeline/spec.md), [Tool Architecture](../tool-architecture/spec.md), [Deferred Job Orchestration](../deferred-job-orchestration/spec.md), [Interactive Chat Actions](../interactive-chat-actions/spec.md), [Platform V1](../platform-v1/spec.md)
> **Affects:** `src/core/entities/blog.ts`, `src/core/use-cases/BlogPostRepository.ts`, `src/adapters/BlogPostDataMapper.ts`, `src/lib/db/tables.ts`, `src/lib/db/migrations.ts`, `src/lib/blog/journal-taxonomy.ts`, `src/app/admin/journal/preview/[slug]/page.tsx`, `src/app/blog/page.tsx`, `src/app/blog/[slug]/page.tsx`, `src/lib/shell/shell-navigation.ts`, `src/core/use-cases/tools/admin-content.tool.ts`, and focused journal/admin tests.
> **Motivation:** The product already presents a public-facing Journal, but its operating model is still a minimal blog implementation. Editors have preview-only admin support, the public route surface has only recently converged on `/journal`, content classification is still heuristic, and the persistence model has no workflow or revisions. The system needs Drupal-like editorial primitives without adopting Drupal itself.
> **Requirement IDs:** `JEO-001` through `JEO-129`

---

## 1. Problem Statement

### 1.1 Verified gaps in the current system

| # | Issue | Verified evidence | Impact |
| --- | --- | --- | --- |
| 1 | Public journal naming and public URL structure drifted historically | Earlier route and metadata emitters exposed `/blog` while product language said `Journal`; the current runtime now keeps `/blog` only as a compatibility redirect layer under canonical `/journal` truth | Route and naming drift had to be resolved before the journal could operate as a coherent product surface |
| 2 | There is no proper journal management surface | `src/app/admin/journal/preview/[slug]/page.tsx` is an admin-only preview page, not a list, editor workspace, moderation queue, or revision browser | Editors cannot manage content as a first-class system |
| 3 | Workflow is too small for editorial operations | `BlogPostStatus` is currently only `draft \| published` in `src/core/entities/blog.ts` | There is no review state, approval checkpoint, or controlled handoff before publication |
| 4 | Repository support is publish-only | `BlogPostRepository` currently exposes `create`, `findById`, `findBySlug`, `listPublished`, `publishById`, and `setHeroImageAsset` only | The admin surface has no query or mutation API for moderation, filtering, or revision-aware editing |
| 5 | Journal sectioning is still heuristic | `src/lib/blog/journal-taxonomy.ts` infers `essay` vs `briefing` from keywords and content structure | Editorial identity can drift as content changes and cannot be set intentionally by an editor |
| 6 | Artifact history exists, but editorial revision history does not | `blog_post_artifacts` exists for generation and image artifacts, but there is no revision model for content snapshots or restore operations | Publishing provenance exists for tooling, but not for editorial governance |
| 7 | Tooling language is still blog-first | `draft_content` and `publish_content` in `src/core/use-cases/tools/admin-content.tool.ts` still describe blog-post behavior | Product-facing editorial language remains inconsistent and harder to evolve |

### 1.2 Root cause

The public journal experience has advanced faster than the editorial domain model behind it.

The current implementation is still centered on a narrow blog-publishing contract:

1. create a draft row
2. optionally attach a hero image
3. publish the row

That contract was enough to ship public pages, but it is not enough to operate a journal as a managed editorial system.

### 1.3 Why this matters

This is now an operating-model problem, not a presentation-only problem.

Without explicit editorial primitives:

1. a management page will remain a thin wrapper around ad hoc repository calls
2. route renaming will be high-risk because URL truth and content truth are not aligned
3. classification will keep drifting because the editor cannot state what a piece is
4. publishing will remain irreversible and under-audited compared with the rest of the system's seriousness

The correct fix is to add a journal operating model that borrows the right lessons from Drupal: workflow, taxonomy, revisions, and views-style management.

---

## 2. Design Goals

1. **Journal-first operating model.** Public and admin experiences should present the feature as a Journal even if some internal `Blog*` symbols remain temporarily for compatibility. `[JEO-010]`
2. **Phased route convergence.** Move external users to `/journal` without coupling that change to a full immediate internal rename. `[JEO-011]`
3. **Explicit editorial metadata.** Section identity and opener metadata must be persisted, not guessed every time from content heuristics. `[JEO-012]`
4. **Moderated workflow.** The system must support at least one state between draft and published so review can be explicit. `[JEO-013]`
5. **Revision safety.** Editorial changes must create restorable history with author and timestamp metadata. `[JEO-014]`
6. **Views-style management surface.** Editors need a list and detail workflow with filters, counts, quick actions, and preview access rather than a preview-only route. `[JEO-015]`
7. **Compatibility over churn.** Preserve current tool names and internal class names when renaming them would create broad risk without immediate product value. `[JEO-016]`
8. **Truthful redirects and canonicals.** Public metadata, sitemap behavior, and navigation should tell one coherent routing story once `/journal` becomes canonical. `[JEO-017]`
9. **Smallest useful taxonomy.** First implementation should support explicit section assignment and controlled editorial summary fields without overbuilding a CMS. `[JEO-018]`
10. **Admin safety.** All editorial operations must remain role-gated and preserve current noindex preview behavior. `[JEO-019]`
11. **Chat-first executive control.** The human owner should primarily instruct the LLM in natural language; the system should translate those instructions into managed editorial work rather than forcing explicit tool or page choreography. `[JEO-019N]`
12. **Discrete workforce, not one god-agent.** The LLM should delegate to narrow, typed editorial capabilities instead of one giant journal-management tool. `[JEO-019O]`
13. **Deferred work where latency matters.** Heavy or multi-stage editorial work should use the durable job system so the owner can delegate, leave, and return to status updates. `[JEO-019P]`
14. **Approval boundaries over manual workflows.** The owner should mostly ask, delegate, and approve; the system should only stop for confirmation at genuinely risky editorial boundaries. `[JEO-019Q]`

### 2.1 Ordo implementation principles

This package should be implemented in the repository's established style rather than as a mini-CMS bolted on beside the product.

Rules:

1. Reuse existing persistence and admin surfaces where they already express the right abstraction. Do not create parallel journal-only infrastructure when a compatibility-safe extension of the existing blog-backed surface is sufficient. `[JEO-019A]`
2. Follow Clean Architecture boundaries from Platform V1: composition-root wiring, repository plus data-mapper persistence, and business policy in interactors or application services rather than route handlers. `[JEO-019B]`
3. Prefer additive compatibility layers over destructive renames. Public routes and UI language may converge to Journal before internal `Blog*` symbols do. `[JEO-019C]`
4. Treat `/blog`, `/journal`, `/api/admin/blog`, and any future `/api/admin/journal` paths as projections and compatibility layers, not separate product centers. `[JEO-019D]`

### 2.2 CEO control-surface principles

Ordo is not a CMS with a chat widget. The owner is the CEO, the chat is the control surface, and the tools plus services are the workforce.

Rules:

1. The primary user interaction should be outcome-oriented natural language such as "draft a briefing", "prepare this for publish", or "show me what is blocked" rather than explicit tool invocation. `[JEO-019R]`
2. Admin journal pages are support surfaces for inspection, audit, and precise correction. They are not the primary operating mode for routine editorial work. `[JEO-019S]`
3. The LLM should interpret intent, select the right editorial workers, and report progress or blockers in executive language. `[JEO-019T]`
4. The owner should mainly perform three kinds of actions through chat: ask, delegate, and approve. `[JEO-019U]`
5. The system should require explicit human approval for irreversible or high-risk actions such as publication, destructive restore behavior, or live-route-affecting changes. `[JEO-019V]`

---

## 3. Architecture

### 3.0 Design patterns and clean-code contract

This feature touches persistence, admin operations, route compatibility, and chat-adjacent user-facing summaries. To prevent architectural drift, the implementation must name and follow the patterns it is using.

| Pattern | Source | Required application |
| --- | --- | --- |
| **Repository + Data Mapper** | Existing adapter layer | Journal persistence stays behind repository interfaces; SQL remains isolated in mappers rather than leaking into routes or interactors. `[JEO-019E]` |
| **Interactor / Application Service** | Existing `*Interactor` use-case pattern | Workflow transition rules, revision restore policy, and admin mutation orchestration live in interactors or a journal editorial service facade, not in route handlers. `[JEO-019F]` |
| **Read Model** | Existing operator-loader and route-service style | `/admin/journal` should use a purpose-built admin list/detail read model rather than overloading the public publication builder. `[JEO-019G]` |
| **Facade / Compatibility Layer** | Existing config and route compatibility guidance | `/blog` and `/journal`, plus `/api/admin/blog` and any journal-named admin API, should be treated as compatibility facades over one canonical implementation. `[JEO-019H]` |
| **Composition Root** | Platform V1 architectural contract | All wiring should happen in composition-root modules, not scattered through route files or UI components. `[JEO-019I]` |

Implementation prohibitions:

1. no SQL in use cases `[JEO-019J]`
2. no business rules in route handlers `[JEO-019K]`
3. no duplicated journal-vs-blog page logic when a shared canonical module can be extracted `[JEO-019L]`
4. no parallel admin API families unless the compatibility relationship is explicitly documented `[JEO-019M]`

### 3.0.1 Executive control-surface contract

The journal system should operate through the chat as the owner's executive control surface.

Required behavior:

1. The owner can ask for state: what is in draft, what is blocked, what is ready, what changed. `[JEO-019W]`
2. The owner can delegate work: draft, review, refine, prepare, generate, compare, or publish-ready a piece. `[JEO-019X]`
3. The owner can approve or reject: publish this, restore that, use this hero image, keep this revision. `[JEO-019Y]`
4. The LLM should compose discrete workforce capabilities behind the scenes and return concise operator-readable summaries rather than raw tool chatter by default. `[JEO-019Z]`
5. Rich content such as action links, status cards, and operator-brief style summaries should be used where they improve control-surface clarity. `[JEO-019AA]`

This contract should be implemented using the current chat-first runtime, ICA rendering, and deferred-job reporting model rather than inventing a separate journal-specific orchestration surface.

### 3.0.2 Discrete workforce-tools contract

The owner may not think in tools, but the LLM still needs reliable workers. Journal operations should therefore be exposed as discrete capabilities grouped by role.

Tool families:

1. **Read/reporting workers** for status, inventory, revisions, and publish readiness. `[JEO-019AB]`
2. **Deterministic mutation workers** for metadata edits, workflow transitions, revision restore, and hero-image selection. `[JEO-019AC]`
3. **LLM-assisted editorial workers** for composition, QA, remediation, metadata suggestion, and image-prompt design. `[JEO-019AD]`
4. **Orchestration workers** for multi-stage article production or publish-ready preparation. `[JEO-019AE]`

Rules:

1. prefer many narrow workers over one `manage_journal` god-tool `[JEO-019AF]`
2. keep deterministic workers deterministic; do not hide policy or persistence side effects in prompt-only tools `[JEO-019AG]`
3. use orchestrator tools only where they compose multiple existing workers in a stable order `[JEO-019AH]`

The concrete matrix for these workers should be maintained in [artifacts/executive-control-and-tool-matrix.md](./artifacts/executive-control-and-tool-matrix.md). `[JEO-019AI]`

### 3.1 Naming and compatibility contract

The feature should distinguish between **external product language** and **internal compatibility names**.

Rules:

1. Public navigation, canonicals, metadata, redirects, and admin UI should say `Journal`, not `Blog`. `[JEO-020]`
2. The canonical public routes should become `/journal` and `/journal/[slug]`. `[JEO-021]`
3. Legacy `/blog` and `/blog/[slug]` routes should remain as compatibility redirects after parity is verified. `[JEO-022]`
4. Initial implementation may keep internal names such as `BlogPostRepository`, `BlogPostDataMapper`, and `draft_content` where changing them would create unnecessary blast radius. `[JEO-023]`
5. Any temporary mismatch between external naming and internal symbol names must be intentional and documented in sprint docs, not accidental drift. `[JEO-024]`

### 3.2 Editorial domain model

The current `BlogPost` entity should evolve into a journal-capable content record without forcing an immediate table rename.

Minimum persisted additions:

1. explicit `section` metadata replacing heuristic-first classification for new and edited content `[JEO-030]`
2. explicit `standfirst` metadata so article openers are editor-controlled rather than only parsed from body copy `[JEO-031]`
3. expanded workflow state beyond `draft | published` to at least:
   - `draft`
   - `review`
   - `approved`
   - `published` `[JEO-032]`

The section model for the first implementation should remain deliberately small:

1. `essay`
2. `briefing`

Additional taxonomy such as tags, series, or issues can be added later once the base operating model is stable. `[JEO-033]`

### 3.3 Revision model

Generation artifacts and editorial revisions serve different purposes and should remain separate.

Rules:

1. `blog_post_artifacts` continues to store pipeline provenance such as article-generation and hero-image artifacts. `[JEO-040]`
2. Editorial revisions should use a dedicated persistence model, recommended as a `blog_post_revisions` table, rather than overloading artifact types. `[JEO-041]`
3. Each revision should capture at minimum:
   - `post_id`
   - revision snapshot payload containing title, description, standfirst, content, section, slug, and status
   - `change_note`
   - `created_by_user_id`
   - `created_at` `[JEO-042]`
4. Revisions should be created automatically before any destructive or state-changing editorial write. `[JEO-043]`
5. Revision restore should create a new revision entry rather than silently mutating history. `[JEO-044]`

### 3.4 Repository contract expansion

`BlogPostRepository` currently supports only create/find/listPublished/publish/setHeroImageAsset.

It should be expanded to support journal operations with methods in these categories:

1. admin listing and filtering `[JEO-050]`
2. metadata updates `[JEO-051]`
3. workflow transitions `[JEO-052]`
4. revision listing and restore `[JEO-053]`

Recommended additions include methods analogous to:

1. `listForAdmin(filters)` `[JEO-054]`
2. `updateDraftContent(id, patch)` `[JEO-055]`
3. `updateEditorialMetadata(id, patch)` `[JEO-056]`
4. `transitionWorkflow(id, nextStatus, actorUserId)` `[JEO-057]`
5. `listRevisions(id)` `[JEO-058]`
6. `restoreRevision(id, revisionId, actorUserId)` `[JEO-059]`

The exact signatures belong in sprint docs and must be verified against the implemented code before merge.

Repository boundaries:

1. repositories own persistence concerns and atomic data operations `[JEO-059A]`
2. interactors or editorial services own workflow policy, restore orchestration, and authorization-aware business decisions `[JEO-059B]`
3. route handlers and server components call those use-case boundaries and should not reimplement transition matrices or revision semantics `[JEO-059C]`

### 3.5 Taxonomy transition contract

`src/lib/blog/journal-taxonomy.ts` should move from primary classifier to presentation helper.

Rules:

1. New and edited posts should use persisted `section` and `standfirst` values when present. `[JEO-060]`
2. Legacy rows without explicit metadata may continue to use heuristic fallback so old content does not disappear or require immediate migration-by-hand. `[JEO-061]`
3. Fallback heuristics must never overwrite explicit editorial choices. `[JEO-062]`
4. Archive grouping remains a presentation concern and can stay derived from publish dates. `[JEO-063]`

### 3.6 Admin route architecture

The management experience should become a journal-first admin surface.

Minimum route set:

1. `/admin/journal`
   - views-style list
   - counts by workflow state
   - search by title or slug
   - filters by state and section
   - quick actions for preview and workflow movement `[JEO-070]`
2. `/admin/journal/[id]`
   - detail workspace for metadata, body copy, hero-image selection, workflow actions, and revision history `[JEO-071]`
3. `/admin/journal/preview/[slug]`
   - journal-first replacement for the current preview route, preserving auth and noindex behavior `[JEO-072]`

Legacy admin preview compatibility is retired; admin preview emitters and tests should converge on `/admin/journal/preview/[slug]` only. `[JEO-073]`

### 3.6.1 Admin API convergence

The repository already has working admin blog APIs for hero-image management and artifact inspection. This package should extend those surfaces rather than bypassing them.

Rules:

1. Existing `/api/admin/blog/posts/[postId]/hero-images` and `/api/admin/blog/posts/[postId]/artifacts` endpoints remain the current authoritative admin APIs until journal-named replacements are intentionally introduced. `[JEO-073A]`
2. Sprint 1, Sprint 2, and Sprint 2B should either:
   - extend the existing `/api/admin/blog/...` endpoints, or
   - add `/api/admin/journal/...` wrappers that delegate to the same canonical implementation `[JEO-073B]`
3. The spec package must not create a second, UI-only admin management backend that bypasses these API and service seams. `[JEO-073C]`
4. Any journal-named admin API introduced by this feature must preserve compatibility for the existing tested blog-named endpoints until a later cleanup sprint explicitly retires them. `[JEO-073D]`

### 3.7 Public route convergence

The route rename should be staged so the system can converge without a brittle full rename.

Rules:

1. Extract shared public journal page logic from the existing `/blog` route files before adding new route files. `[JEO-080]`
2. Add canonical `/journal` and `/journal/[slug]` pages that reuse the shared public implementation. `[JEO-081]`
3. Convert `/blog` and `/blog/[slug]` into redirects once parity and metadata correctness are verified. `[JEO-082]`
4. Update shell navigation and journal-related generated links to point to `/journal`. `[JEO-083]`
5. Update canonical metadata on index and article pages to emit `/journal` URLs only once the redirect cutover lands. `[JEO-084]`
6. Keep internal repository and tool names stable until a later cleanup sprint or separate refactor justifies changing them. `[JEO-085]`

### 3.7.1 Verified route-convergence inventory

The `/blog` rename touches more than page files. Implementation and QA must account for all currently verified surfaces:

1. public index and article routes `[JEO-085A]`
2. shell route-tone detection in `AppShell`, `SiteNav`, and `ChatSurface` `[JEO-085B]`
3. sitemap output `[JEO-085C]`
4. chat presenter action links and job-summary rendering `[JEO-085D]`
5. deferred-job, orchestration, and live-eval summaries `[JEO-085E]`
6. admin preview links `[JEO-085F]`
7. focused route and browser tests that assert current `/blog` behavior `[JEO-085G]`

No sprint may claim route convergence complete while any of these still emit public `/blog` truth unintentionally.

The living implementation checklist for this inventory should be maintained in [artifacts/route-convergence-checklist.md](./artifacts/route-convergence-checklist.md). `[JEO-085H]`

### 3.8 Tooling language contract

The `draft_content` and `publish_content` tool names may remain stable for compatibility, but their descriptions and user-facing text should move toward journal language.

Rules:

1. Tool descriptions should describe the content as journal content or journal articles, not only blog posts. `[JEO-090]`
2. Tool outputs and job summaries should prefer `Journal` in user-facing language where that does not break consumers expecting existing enum values or tool names. `[JEO-091]`
3. No sprint in this package requires a risky rename of tool identifiers. `[JEO-092]`

### 3.8.1 Tool and job execution strategy

This package should use the existing tool registry and deferred-job infrastructure to its fullest rather than reinventing editorial orchestration.

Rules:

1. Existing tool-descriptor patterns should remain the way journal workers are exposed to the LLM. `[JEO-092A]`
2. Heavy or multi-stage editorial work should opt into deferred execution at the tool descriptor level instead of building one-off background flows. `[JEO-092B]`
3. Fast read/reporting and deterministic mutation workers should remain inline unless they trigger meaningful downstream work. `[JEO-092C]`
4. Deferred journal work should emit durable, human-readable progress so the owner experiences the result as workforce reporting, not low-level job plumbing. `[JEO-092D]`
5. Existing job-status tools and chat-native job cards should be reused as the status surface, with richer editorial naming layered on top where useful. `[JEO-092E]`

### 3.8.2 Concrete journal worker inventory

The control surface should be backed by a concrete first-pass worker set so implementation does not drift into vague "journal management" behavior.

This inventory is the package-level target state, but its implementation is intentionally sequenced: Sprint 2 owns the shipped editorial support surfaces and journal-first operator language, while Sprint 2B owns explicit journal-named wrapper registration in the canonical tool registry.

The first-pass inventory should be:

| Worker | Role | Reuse strategy | Execution mode | Approval boundary |
| --- | --- | --- | --- | --- |
| `list_journal_posts` | Admin inventory by state, section, search, and recency | New read worker over Sprint 0 repository/admin-list seams | Inline | None `[JEO-092F]` |
| `get_journal_post` | Full inspection of one post, including workflow and metadata context | New read worker over canonical detail loader | Inline | None `[JEO-092G]` |
| `list_journal_revisions` | Revision-history inspection | New read worker over revision repository/query seam | Inline | None `[JEO-092H]` |
| `get_journal_workflow_summary` | Executive summary of blocked, ready, in-review, and recently changed work | New read worker that composes inventory and job status into operator language | Inline | None `[JEO-092I]` |
| `update_journal_metadata` | Deterministic metadata edits for title, description, standfirst, section, and approved slug policy | New deterministic worker over editorial service boundary | Inline | None `[JEO-092J]` |
| `update_journal_draft` | Deterministic draft/body edits for managed content updates | New deterministic worker over editorial service boundary | Inline | None `[JEO-092K]` |
| `submit_journal_review` | Transition draft work into review | New deterministic worker over workflow interactor | Inline | None `[JEO-092L]` |
| `approve_journal_post` | Transition review work into approved | New deterministic worker over workflow interactor | Inline | None `[JEO-092M]` |
| `publish_journal_post` | Publish approved work with journal-first summaries | Prefer wrapper over existing publish behavior until deeper cleanup is justified | Inline unless publish side effects expand materially | Explicit human approval `[JEO-092N]` |
| `restore_journal_revision` | Restore a prior revision with revision-safe history | New deterministic worker over revision-restore interactor | Inline | Explicit human approval `[JEO-092O]` |
| `select_journal_hero_image` | Select or replace the canonical hero image | Prefer wrapper over existing hero-image admin APIs and selection flow | Inline | Approval only if policy requires confirmation for live content `[JEO-092P]` |
| `prepare_journal_post_for_publish` | Inspect readiness, run missing checks, and report blockers or readiness | New orchestration worker that may compose QA, metadata checks, and job summaries | Usually deferred when it triggers multi-stage work | None to prepare, explicit approval to publish `[JEO-092Q]` |

Existing LLM-assisted blog-production workers such as `compose_blog_article`, `qa_blog_article`, `resolve_blog_article_qa`, `generate_blog_image_prompt`, and `produce_blog_article` remain the baseline editorial workforce; this package should prefer compatibility-safe journal wrappers or journal-first descriptions over a parallel second pipeline. `[JEO-092R]`

Existing `draft_content` and `publish_content` identifiers may remain as compatibility workers, but any new owner-facing orchestration should reason in the journal-worker vocabulary above. `[JEO-092S]`

The living implementation map for these workers, including exact repository methods, interactor names, and likely composition-root registrations, should be maintained in [artifacts/journal-worker-implementation-map.md](./artifacts/journal-worker-implementation-map.md). `[JEO-092T]`

### 3.9 Existing system leverage

The correct Ordo implementation uses the strongest seams already present in the repository.

Required leverage points:

1. `blog_posts`, `blog_assets`, and `blog_post_artifacts` remain the base persistence substrate; the feature extends them rather than replacing them. `[JEO-093A]`
2. Existing artifact inspection and hero-image management APIs are part of the admin foundation and should be reused by the new workspace. `[JEO-093B]`
3. Existing deferred jobs, chat presenter summaries, and eval runners must be updated as part of route convergence rather than treated as unrelated cleanup. `[JEO-093C]`
4. Existing shell route-tone hooks from the journal publication redesign must be preserved when `/journal` becomes canonical. `[JEO-093D]`
5. Existing markdown-based article rendering remains the content delivery model; this package does not introduce a second content model. `[JEO-093E]`
6. Existing blog-production tools and services are the starting point for journal-oriented editorial workers; compatibility-safe wrappers or renamed descriptions are preferred over a parallel pipeline. `[JEO-093F]`
7. Existing deferred-job status tools are the starting point for editorial progress visibility; do not create a separate journal-only job-query mechanism. `[JEO-093G]`
8. Existing ICA/operator-brief rendering patterns should be used where journal work needs concise executive summaries, action links, or approval affordances. `[JEO-093H]`

### 3.10 Workflow and revision invariants

The workflow and revision model must be explicit enough that two agents would implement the same behavior.

Required invariants:

1. `publishedAt` and `publishedByUserId` are set only when entering `published` from a non-published state. `[JEO-094]`
2. Any edit or restore that changes a published post must create a revision before mutation. `[JEO-095]`
3. If a published post is allowed to move back to a non-published state, that behavior must be an explicit admin action and must preserve auditability. `[JEO-096]`
4. Slug mutation after publication must be explicitly decided in implementation. If allowed, the system should also define redirect behavior or an equivalent compatibility record. `[JEO-097]`
5. Restoring a revision must create a new head revision and may not erase the replaced state. `[JEO-098]`
6. Concurrent edits should use a pragmatic conflict strategy such as updated-at checks or optimistic-write failure rather than last-write-wins by accident. `[JEO-099]`

---

## 4. Security And Operational Constraints

1. All admin journal routes must remain restricted to authorized roles, with anonymous users redirected to `/login` and unauthorized users denied. `[JEO-100]`
2. Preview routes must remain `noindex, nofollow`. `[JEO-101]`
3. Workflow transitions must validate allowed state changes and reject illegal transitions. `[JEO-102]`
4. Revision restore must be explicit and auditable; it may not silently rewrite history. `[JEO-103]`
5. Redirects from `/blog` to `/journal` must preserve only valid published destinations. Draft-only content may not become publicly discoverable. `[JEO-104]`
6. Admin filters and search should be user-safe and parameterized; no raw SQL string interpolation is allowed. `[JEO-105]`
7. Persisted `section` and `standfirst` values must be sanitized and length-bounded appropriately for metadata and UI rendering. `[JEO-106]`
8. Admin compatibility APIs and journal-named wrappers must preserve the current administrator-only behavior of hero-image and artifact inspection endpoints. `[JEO-107]`
9. Route redirects and chat action links must not leak draft preview destinations to non-admin users. `[JEO-108]`
10. LLM-driven journal actions must preserve explicit human approval for publish and other high-risk terminal actions. `[JEO-109]`

---

## 5. Testing Strategy

The implementation must add or update tests for the following:

1. repository and data-mapper coverage for workflow transitions, metadata persistence, revision creation, and revision restore `[JEO-110]`
2. admin route authorization and preview behavior for `/admin/journal` routes `[JEO-111]`
3. list filtering and state-count behavior for the journal management page `[JEO-112]`
4. public journal route parity between `/journal` and the prior `/blog` behavior before redirect cutover `[JEO-113]`
5. canonical metadata and redirect behavior once `/journal` becomes authoritative `[JEO-114]`
6. taxonomy fallback behavior for legacy rows missing explicit metadata `[JEO-115]`
7. tool-description and user-facing language updates where journal wording is introduced `[JEO-116]`
8. browser verification of the admin journal list and a representative public `/journal/[slug]` page after route cutover `[JEO-117]`
9. chat-presenter, job-summary, and live-eval updates that currently emit `/blog` or retired admin preview links `[JEO-118]`
10. admin API compatibility for hero-image and artifact inspection endpoints, plus any journal-named wrappers introduced by the feature `[JEO-119]`
11. chat-native executive workflows for ask/delegate/approve paths, including concise status summaries and approval-safe behavior `[JEO-119H]`

The package should leverage the repo's strongest existing tests and add explicit new ones rather than relying on unrelated broad tests.

Minimum target coverage by layer:

1. **Repository/data mapper:** extend `tests/blog-pipeline-integration.test.ts`, `tests/blog-post-artifact-repository.test.ts`, and add a dedicated revision repository test file for state transitions, revision creation, and restore behavior. `[JEO-119A]`
2. **Admin routes/pages:** extend `src/app/admin/journal/preview/[slug]/page.test.tsx` and add `/admin/journal` page tests for auth, list rendering, and preview behavior. `[JEO-119B]`
3. **Admin APIs:** extend `src/app/api/admin/blog/posts/[postId]/hero-images/route.test.ts` and `src/app/api/admin/blog/posts/[postId]/artifacts/route.test.ts`; add journal-named wrapper tests only if wrappers are introduced. `[JEO-119C]`
4. **Presentation and chat-facing outputs:** extend `src/adapters/ChatPresenter.test.ts`, `src/hooks/useGlobalChat.test.tsx`, and `src/components/AppShell.test.tsx` for `/journal` cutover and preview-link updates. `[JEO-119D]`
5. **Public route parity and browser verification:** extend `tests/blog-hero-rendering.test.tsx`, relevant browser tests, and route/canonical coverage for sitemap and shell tone hooks. `[JEO-119E]`
6. **Architectural audits:** add feature-scoped Booch, SOLID, and GoF audit tests under `tests/` to prevent regression into route-level business logic, duplicated route implementations, or persistence leakage. `[JEO-119F]`
7. **Chat-native workflows:** add or extend tests that prove the owner can delegate journal work, receive progress, and approve outcomes through chat-facing summaries without needing direct tool vocabulary. `[JEO-119I]`

The exact existing and planned test-file inventory for this package should be maintained in [artifacts/testing-matrix.md](./artifacts/testing-matrix.md). `[JEO-119G]`

Minimum feature verification should remain:

```bash
npm exec vitest run tests/blog-pipeline-integration.test.ts tests/blog-post-artifact-repository.test.ts tests/blog-hero-rendering.test.tsx src/adapters/ChatPresenter.test.ts src/components/AppShell.test.tsx
npm run build
```

Later sprint docs should add focused commands for the new admin, revision, API, and audit tests they introduce. `[JEO-118A]`

---

## 6. Sprint Plan

| Sprint | Goal |
| --- | --- |
| Sprint 0 | Add explicit editorial metadata, workflow states, revision persistence, and compatibility-safe repository expansion |
| Sprint 1 | Add `/admin/journal` list and detail workspace as support surfaces, plus preview-route convergence and compatibility redirects |
| TD-A | Audit the editorial domain, repository surface, and admin read model for Booch-style object boundaries and cohesion before route cutover |
| Sprint 2 | Add workflow actions, revision restore, metadata editing, and chat-first journal language across the shipped editorial support surfaces |
| Sprint 2B | Register the remaining journal-named query and mutation wrappers in the canonical tool registry, with registry-level verification and compatibility-safe coexistence |
| Sprint 3 | Add canonical public `/journal` routes, convert `/blog` to compatibility redirects, and update navigation, metadata truth, and public link emitters |
| TD-C | Audit SOLID and Clean Architecture boundaries across interactors, repositories, routes, and admin services |
| TD-D | Audit Repository, Facade, Composition Root, and compatibility-pattern correctness across journal operations and route convergence |

---

## 7. Future Considerations

The following are intentionally out of scope for this package:

1. a full internal rename from `Blog*` to `Journal*` across the codebase `[JEO-120]`
2. a rich Drupal-style taxonomy system with tags, issue packages, and term management `[JEO-121]`
3. content scheduling and embargo release windows `[JEO-122]`
4. non-admin editorial roles such as reviewer-only or publisher-only permissions `[JEO-123]`
5. a WYSIWYG or structured-block editor replacing markdown `[JEO-124]`
6. podcast-feed generation or article-to-audio workflow beyond staying compatible with those future needs `[JEO-125]`

If those capabilities are needed later, they should build on this package rather than bypass it.
