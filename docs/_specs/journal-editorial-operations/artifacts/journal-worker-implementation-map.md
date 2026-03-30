# Journal Worker Implementation Map

This artifact turns the worker inventory in Section 3.8.2 of the main spec into concrete implementation targets.

## Current Runtime Status

This artifact is intentionally more ambitious than the current shipped registry.

As of the current Sprint 2 implementation:

1. the admin workspace already performs metadata edits, draft-body edits, workflow transitions, and revision restore through `src/lib/journal/admin-journal-actions.ts` plus `JournalEditorialInteractor`
2. the runtime tool registry in `src/lib/chat/tool-composition-root.ts` still registers compatibility-safe blog-named tools such as `draft_content`, `publish_content`, `compose_blog_article`, and `produce_blog_article`
3. the journal-named worker entries below should therefore be read as the explicit wrapper and registration target, not as already-shipped registry names unless a matching implementation is present in the codebase
4. the sequenced implementation plan for these wrapper registrations now lives in `docs/_specs/journal-editorial-operations/sprints/sprint-2b-journal-worker-wrapper-registration.md`

It distinguishes between:

1. verified current seams already present in the codebase
2. exact new repository methods required by this package
3. exact interactor names the implementation should introduce
4. likely `createToolRegistry()` registration calls for the final worker set

## Sequenced Follow-On Sprint

This artifact is no longer a free-floating future-state inventory.

The remaining journal-named wrapper work is explicitly sequenced as Sprint 2B in `docs/_specs/journal-editorial-operations/sprints/sprint-2b-journal-worker-wrapper-registration.md`.

Use this map as the implementation-detail companion to that sprint, not as evidence that the registry has already landed these worker IDs.

## Verified Current Seams

| Seam | Verified current implementation |
| --- | --- |
| Tool registry composition root | `src/lib/chat/tool-composition-root.ts` via `createToolRegistry()` |
| Blog post persistence | `src/adapters/RepositoryFactory.ts` via `getBlogPostRepository()` returning `BlogPostDataMapper` |
| Blog asset persistence | `src/adapters/RepositoryFactory.ts` via `getBlogAssetRepository()` returning `BlogAssetDataMapper` |
| Blog artifact persistence | `src/adapters/RepositoryFactory.ts` via `getBlogPostArtifactRepository()` returning `BlogPostArtifactDataMapper` |
| Deferred-job status seam | `src/adapters/RepositoryFactory.ts` via `getJobStatusQuery()` |
| Existing draft and publish workers | `src/core/use-cases/tools/admin-content.tool.ts` |
| Existing staged article-production workers | `src/core/use-cases/tools/blog-production.tool.ts` |
| Existing article-production service | `src/lib/blog/blog-article-production-service.ts` via `getBlogArticleProductionService()` |

## Required New Repository Methods And Factories

The implementation should keep current-row persistence and revision persistence separate.

### BlogPostRepository additions

These methods belong on `src/core/use-cases/BlogPostRepository.ts` and its `BlogPostDataMapper` implementation.

1. `listForAdmin(filters)`
2. `updateDraftContent(id, patch)`
3. `updateEditorialMetadata(id, patch)`
4. `transitionWorkflow(id, nextStatus, actorUserId)`

The existing methods remain in use:

1. `create(seed)`
2. `findById(id)`
3. `findBySlug(slug)`
4. `listPublished()`
5. `publishById(id, publishedByUserId)`
6. `setHeroImageAsset(id, heroImageAssetId)`

### BlogPostRevisionRepository

This package should introduce a dedicated revision repository rather than overloading artifact storage.

Recommended file targets:

1. `src/core/use-cases/BlogPostRevisionRepository.ts`
2. `src/adapters/BlogPostRevisionDataMapper.ts`
3. `src/adapters/RepositoryFactory.ts` addition: `getBlogPostRevisionRepository()`

Required methods:

1. `create(snapshot)`
2. `listByPostId(postId)`
3. `findById(revisionId)`

## Exact Worker Mapping

| Worker | Exact repository methods | Exact interactor name | Tool factory target | Likely registration call |
| --- | --- | --- | --- | --- |
| `list_journal_posts` | `BlogPostRepository.listForAdmin(filters)` | `ListJournalPostsInteractor` | `createListJournalPostsTool` in `src/core/use-cases/tools/journal-query.tool.ts` | `reg.register(createListJournalPostsTool(listJournalPostsInteractor));` |
| `get_journal_post` | `BlogPostRepository.findById(id)` | `GetJournalPostInteractor` | `createGetJournalPostTool` in `src/core/use-cases/tools/journal-query.tool.ts` | `reg.register(createGetJournalPostTool(getJournalPostInteractor));` |
| `list_journal_revisions` | `BlogPostRevisionRepository.listByPostId(postId)` | `ListJournalRevisionsInteractor` | `createListJournalRevisionsTool` in `src/core/use-cases/tools/journal-query.tool.ts` | `reg.register(createListJournalRevisionsTool(listJournalRevisionsInteractor));` |
| `get_journal_workflow_summary` | `BlogPostRepository.listForAdmin(filters)`, `JobStatusQuery.listUserJobSnapshots(userId, options)` | `GetJournalWorkflowSummaryInteractor` | `createGetJournalWorkflowSummaryTool` in `src/core/use-cases/tools/journal-query.tool.ts` | `reg.register(createGetJournalWorkflowSummaryTool(getJournalWorkflowSummaryInteractor));` |
| `update_journal_metadata` | `BlogPostRepository.findById(id)`, `BlogPostRepository.updateEditorialMetadata(id, patch)`, `BlogPostRevisionRepository.create(snapshot)` | `UpdateJournalMetadataInteractor` | `createUpdateJournalMetadataTool` in `src/core/use-cases/tools/journal-write.tool.ts` | `reg.register(createUpdateJournalMetadataTool(updateJournalMetadataInteractor));` |
| `update_journal_draft` | `BlogPostRepository.findById(id)`, `BlogPostRepository.updateDraftContent(id, patch)`, `BlogPostRevisionRepository.create(snapshot)` | `UpdateJournalDraftInteractor` | `createUpdateJournalDraftTool` in `src/core/use-cases/tools/journal-write.tool.ts` | `reg.register(createUpdateJournalDraftTool(updateJournalDraftInteractor));` |
| `submit_journal_review` | `BlogPostRepository.findById(id)`, `BlogPostRepository.transitionWorkflow(id, "review", actorUserId)`, `BlogPostRevisionRepository.create(snapshot)` | `SubmitJournalReviewInteractor` | `createSubmitJournalReviewTool` in `src/core/use-cases/tools/journal-write.tool.ts` | `reg.register(createSubmitJournalReviewTool(submitJournalReviewInteractor));` |
| `approve_journal_post` | `BlogPostRepository.findById(id)`, `BlogPostRepository.transitionWorkflow(id, "approved", actorUserId)`, `BlogPostRevisionRepository.create(snapshot)` | `ApproveJournalPostInteractor` | `createApproveJournalPostTool` in `src/core/use-cases/tools/journal-write.tool.ts` | `reg.register(createApproveJournalPostTool(approveJournalPostInteractor));` |
| `publish_journal_post` | `BlogPostRepository.findById(id)`, `BlogPostRepository.publishById(id, actorUserId)`, `BlogPostRevisionRepository.create(snapshot)`, `BlogAssetRepository.setVisibility(assetId, "published")` when needed | `PublishJournalPostInteractor` | `createPublishJournalPostTool` in `src/core/use-cases/tools/journal-write.tool.ts` | `reg.register(createPublishJournalPostTool(publishJournalPostInteractor));` |
| `restore_journal_revision` | `BlogPostRevisionRepository.findById(revisionId)`, `BlogPostRepository.findById(id)`, `BlogPostRepository.updateDraftContent(id, patch)`, `BlogPostRepository.updateEditorialMetadata(id, patch)`, `BlogPostRepository.transitionWorkflow(id, nextStatus, actorUserId)`, `BlogPostRevisionRepository.create(snapshot)` | `RestoreJournalRevisionInteractor` | `createRestoreJournalRevisionTool` in `src/core/use-cases/tools/journal-write.tool.ts` | `reg.register(createRestoreJournalRevisionTool(restoreJournalRevisionInteractor));` |
| `select_journal_hero_image` | `BlogPostRepository.findById(id)`, `BlogPostRepository.setHeroImageAsset(id, assetId)`, `BlogAssetRepository.setVisibility(assetId, visibility)` when policy requires it | `SelectJournalHeroImageInteractor` | `createSelectJournalHeroImageTool` in `src/core/use-cases/tools/journal-write.tool.ts` | `reg.register(createSelectJournalHeroImageTool(selectJournalHeroImageInteractor));` |
| `prepare_journal_post_for_publish` | `BlogPostRepository.findById(id)`, `BlogPostRevisionRepository.listByPostId(postId)`, `JobStatusQuery.listUserJobSnapshots(userId, options)` and existing `BlogArticleProductionService.reviewArticleForPost()` when readiness QA is requested | `PrepareJournalPostForPublishInteractor` | `createPrepareJournalPostForPublishTool` in `src/core/use-cases/tools/journal-orchestration.tool.ts` | `reg.register(createPrepareJournalPostForPublishTool(prepareJournalPostForPublishInteractor));` |

## Exact Interactor Responsibilities

These names should be used literally unless implementation discovers a stronger existing abstraction.

| Interactor | Responsibility |
| --- | --- |
| `ListJournalPostsInteractor` | Return filtered admin inventory for pages and chat workers |
| `GetJournalPostInteractor` | Return one post with workflow, metadata, and support-surface detail context |
| `ListJournalRevisionsInteractor` | Return revision history without leaking data-mapper details |
| `GetJournalWorkflowSummaryInteractor` | Summarize blocked, ready, in-review, and active-job work in executive language |
| `UpdateJournalMetadataInteractor` | Validate and persist title, description, standfirst, section, and slug-policy-safe metadata changes |
| `UpdateJournalDraftInteractor` | Persist draft body changes with revision safety |
| `SubmitJournalReviewInteractor` | Enforce draft-to-review transition policy |
| `ApproveJournalPostInteractor` | Enforce review-to-approved transition policy |
| `PublishJournalPostInteractor` | Enforce approval boundary, create a pre-publish revision, publish the post, and align hero-image visibility |
| `RestoreJournalRevisionInteractor` | Restore a prior revision by creating a new head revision and applying snapshot state safely |
| `SelectJournalHeroImageInteractor` | Reuse hero-image admin behavior through one deterministic boundary |
| `PrepareJournalPostForPublishInteractor` | Check readiness, optionally run QA, and report blockers or readiness without publishing |

## Exact Composition-Root Block

The final registration block should land in `src/lib/chat/tool-composition-root.ts` beside the existing blog-content and blog-production registrations.

```ts
const blogRepo = getBlogPostRepository();
const blogAssetRepo = getBlogAssetRepository();
const blogRevisionRepo = getBlogPostRevisionRepository();
const blogArticleService = getBlogArticleProductionService();
const jobStatusQuery = getJobStatusQuery();

const listJournalPostsInteractor = new ListJournalPostsInteractor(blogRepo);
const getJournalPostInteractor = new GetJournalPostInteractor(blogRepo);
const listJournalRevisionsInteractor = new ListJournalRevisionsInteractor(blogRevisionRepo);
const getJournalWorkflowSummaryInteractor = new GetJournalWorkflowSummaryInteractor(blogRepo, jobStatusQuery);
const updateJournalMetadataInteractor = new UpdateJournalMetadataInteractor(blogRepo, blogRevisionRepo);
const updateJournalDraftInteractor = new UpdateJournalDraftInteractor(blogRepo, blogRevisionRepo);
const submitJournalReviewInteractor = new SubmitJournalReviewInteractor(blogRepo, blogRevisionRepo);
const approveJournalPostInteractor = new ApproveJournalPostInteractor(blogRepo, blogRevisionRepo);
const publishJournalPostInteractor = new PublishJournalPostInteractor(blogRepo, blogRevisionRepo, blogAssetRepo);
const restoreJournalRevisionInteractor = new RestoreJournalRevisionInteractor(blogRepo, blogRevisionRepo);
const selectJournalHeroImageInteractor = new SelectJournalHeroImageInteractor(blogRepo, blogAssetRepo);
const prepareJournalPostForPublishInteractor = new PrepareJournalPostForPublishInteractor(
  blogRepo,
  blogRevisionRepo,
  blogArticleService,
  jobStatusQuery,
);

reg.register(createListJournalPostsTool(listJournalPostsInteractor));
reg.register(createGetJournalPostTool(getJournalPostInteractor));
reg.register(createListJournalRevisionsTool(listJournalRevisionsInteractor));
reg.register(createGetJournalWorkflowSummaryTool(getJournalWorkflowSummaryInteractor));
reg.register(createUpdateJournalMetadataTool(updateJournalMetadataInteractor));
reg.register(createUpdateJournalDraftTool(updateJournalDraftInteractor));
reg.register(createSubmitJournalReviewTool(submitJournalReviewInteractor));
reg.register(createApproveJournalPostTool(approveJournalPostInteractor));
reg.register(createPublishJournalPostTool(publishJournalPostInteractor));
reg.register(createRestoreJournalRevisionTool(restoreJournalRevisionInteractor));
reg.register(createSelectJournalHeroImageTool(selectJournalHeroImageInteractor));
reg.register(createPrepareJournalPostForPublishTool(prepareJournalPostForPublishInteractor));
```

## Wrapper And Reuse Rules

1. `publish_journal_post` should preserve the proven parts of `publish_content` rather than replacing publish semantics ad hoc.
2. `select_journal_hero_image` should wrap the current hero-image selection behavior already exposed through the admin API surface.
3. `prepare_journal_post_for_publish` should reuse `BlogArticleProductionService` for readiness or QA steps instead of cloning article-production logic.
4. Existing blog-production workers should remain available as the underlying editorial workforce until a later cleanup sprint intentionally retires blog-named wrappers.

## QA Expectations For This Map

This artifact is correct only if the implementation preserves these package-level rules:

1. no route file owns business logic that should live in an interactor
2. no journal worker bypasses repository or revision seams
3. no support surface invents a second loader or transition path distinct from the chat-facing worker path
4. `createToolRegistry()` remains the canonical registration point for all new journal workers
