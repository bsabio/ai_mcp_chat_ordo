# Sprint 0 — Asset Model And Public Delivery

> **Goal:** Add the blog asset persistence model, public-serving route, and blog-post hero-image linkage contract so later native image-generation stages have a correct storage and delivery foundation.
> **Spec Sections:** `BAPP-015`, `BAPP-034` through `BAPP-037A`, `BAPP-042`, `BAPP-061`
> **Prerequisite:** Existing blog persistence and routing from Platform V1 Sprint 7, plus the deferred-jobs foundation already present in the runtime.

---

## QA Review Of Sprint Scope

Sprint 0 was reviewed against the parent spec before drafting. The following scope clarifications are now enforced in this sprint document:

1. Hero-image alt text lives on the asset record, not duplicated on `blog_posts`.
2. The canonical public route is `/api/blog/assets/[id]`.
3. `user_files` is not reused for public blog media in this sprint.
4. OpenAI image generation is explicitly out of scope for Sprint 0.
5. Artifact persistence is deferred to a later sprint so Sprint 0 stays focused on hero-asset storage and public delivery.

No unresolved sprint-contract issues remain at draft time.

The verification plan below explicitly includes positive, negative, and edge-case coverage and is part of the sprint definition rather than an optional add-on.

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/core/entities/blog.ts` | Current blog domain entity has title, description, content, status, and publication metadata only. It does not yet model hero-image linkage. |
| `src/core/use-cases/BlogPostRepository.ts` | Existing blog repository contract supports create/find/list/publish only. |
| `src/adapters/BlogPostDataMapper.ts` | Current mapper persists blog posts via SQLite and is the correct extension point for hero-image linkage. |
| `src/lib/db/tables.ts` | Existing schema uses additive `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` statements. New blog asset tables and columns must follow the same pattern. |
| `src/core/entities/user-file.ts` | Current private attachment model supports only `audio`, `chart`, and `document`, confirming that Sprint 0 should not overload `user_files` for public blog hero media. |
| `src/app/api/user-files/[id]/route.ts` | Private generated-file route enforces ownership and therefore cannot serve public blog hero images as-is. |
| `src/app/blog/page.tsx` | Blog index currently renders title, description, and published date only. |
| `src/app/blog/[slug]/page.tsx` | Public blog post page currently renders title, date, and markdown content only. |

---

## Tasks

### 1. Add blog asset domain entities and repository contracts

Create new core-layer types for blog assets.

Required entities:

- `BlogAsset`
- `BlogAssetSeed`
- `BlogAssetVisibility`

Required repository ports:

- `BlogAssetRepository`

Minimum capabilities:

- create a blog asset
- find a blog asset by id
- attach or detach an asset to a post
- list assets by post

Keep the asset port separate from `BlogPostRepository`. Do not add generic JSON-blob persistence methods to the blog post repository itself.

Verify:

- add focused contract tests such as `tests/blog-asset-contract.test.ts`
- run `npm exec vitest run tests/blog-asset-contract.test.ts tests/blog-pipeline-integration.test.ts`

### 2. Extend the database schema for asset and artifact persistence

Modify `src/lib/db/tables.ts` to add:

- `blog_assets`
- `hero_image_asset_id` column on `blog_posts`

Schema requirements:

- `blog_assets.post_id` may be null before attachment
- `blog_assets.visibility` defaults to `draft`
- `blog_assets.alt_text` is required with default empty string
- `blog_posts.hero_image_asset_id` references `blog_assets(id)` if present
- indexes support lookups by post id and visibility

Do not add `hero_image_alt` to `blog_posts`.

Verify:

- add focused schema tests such as `tests/blog-asset-schema.test.ts`
- run `npm exec vitest run tests/blog-asset-schema.test.ts`

### 3. Add adapter-layer data mappers

Create adapter implementations for the new repository ports.

Suggested files:

- `src/adapters/BlogAssetDataMapper.ts`

Implementation requirements:

- isolate SQL in the adapter layer
- map snake_case columns to camelCase entities
- support null `post_id` for pre-attachment assets
- support visibility transitions from `draft` to `published`

Also extend `BlogPostDataMapper` and `BlogPostRepository` so a blog post can store and return `heroImageAssetId`.

Verify:

- add focused repository tests such as `tests/blog-asset-repository.test.ts`
- run `npm exec vitest run tests/blog-asset-repository.test.ts tests/blog-pipeline-integration.test.ts`

### 4. Add repository-factory wiring

Extend `src/adapters/RepositoryFactory.ts` with cached getters for:

- `getBlogAssetRepository()`

Keep the existing singleton-style pattern already used by corpus, blog, queue, and push repositories.

Verify:

- add focused tests if repository-factory coverage needs extension
- run `npm exec vitest run tests/blog-asset-repository.test.ts tests/blog-assets-route.test.ts`

### 5. Add the canonical public blog asset route

Create `src/app/api/blog/assets/[id]/route.ts`.

Behavior requirements:

- published assets attached to published posts return binary content publicly
- draft assets require a resolved authenticated user and must only be readable by `createdByUserId` or an `ADMIN` role
- unknown asset ids return 404
- assets detached from posts or linked to non-published posts must not be publicly served
- route must look up assets by persisted ID, not by path fragments supplied by the client
- unauthorized reads must fail closed with a consistent auth response rather than silently exposing draft media

This sprint may implement storage by reading from a blog-asset storage path on disk, but the route contract must remain asset-id based.

Verify:

- add focused route tests such as `tests/blog-assets-route.test.ts`
- run `npm exec vitest run tests/blog-assets-route.test.ts`

### 6. Add blog rendering support for hero assets

Update the blog pages so they can render a hero image when `heroImageAssetId` exists.

Files expected to change:

- `src/app/blog/page.tsx`
- `src/app/blog/[slug]/page.tsx`

Rendering rules:

- pages must still work if no hero image exists
- image source must use `/api/blog/assets/[id]`
- image alt text must come from the asset record
- public metadata generation should be able to use the same route for OG-image linkage later, even if Sprint 0 only wires page rendering first

Implementation note:

- the sprint must explicitly choose how pages obtain hero-asset metadata; either:
  - add page-level `BlogAssetRepository` lookups when `heroImageAssetId` is present, or
  - add a dedicated published blog view-model method that hydrates hero asset data alongside the post
- do not leave alt-text retrieval as an implicit follow-up task

Verify:

- add focused component or page tests such as `tests/blog-hero-rendering.test.tsx`
- run `npm exec vitest run tests/blog-hero-rendering.test.tsx tests/blog-pipeline-integration.test.ts`

---

## Positive, Negative, And Edge-Case Test Matrix

### Positive tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| P1 | create a draft blog asset with alt text and storage metadata | asset row persists and round-trips through the repository |
| P2 | attach a draft asset to a draft blog post | post stores `heroImageAssetId` and asset remains `draft` visibility |
| P3 | publish a post with an attached hero asset | published page can fetch the asset through `/api/blog/assets/[id]` |
| P4 | render a published blog post with hero image | post page shows the image and correct alt text |
| P5 | render blog index where one post has hero media and one does not | both cards render correctly and no-hero posts remain valid |

### Negative tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| N1 | request a nonexistent blog asset id | route returns 404 |
| N2 | request a draft asset as a public anonymous reader | route denies access |
| N3 | request an asset attached to a draft post through the public route | route denies access |
| N4 | attempt to attach `heroImageAssetId` to an unknown asset id | repository or persistence layer rejects the linkage |
| N5 | request an asset by crafted path input rather than persisted id | route does not resolve arbitrary file paths |
| N6 | request a draft asset as an authenticated non-owner non-admin user | route denies access |

### Edge-case tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| E1 | published post has no `heroImageAssetId` | page still renders correctly with no image block |
| E2 | asset exists but is detached from any post | route does not publicly expose it |
| E3 | post is published but linked asset visibility remains `draft` due to stale state | route fails closed until visibility is corrected |
| E4 | asset file record exists but underlying disk file is missing | route returns not found or cleans up safely rather than throwing raw filesystem errors |
| E5 | a post switches from draft to published after asset attachment | asset becomes publicly available only after publication state is satisfied |

---

## Completion Checklist

- [x] blog asset entity and repository ports created
- [x] blog asset table added
- [x] `blog_posts.hero_image_asset_id` added without duplicating alt text on posts
- [x] adapter-layer blog asset persistence created
- [x] repository-factory getters added
- [x] canonical `/api/blog/assets/[id]` route added
- [x] blog pages render hero images safely when present
- [x] positive tests added
- [x] negative tests added
- [x] edge-case tests added
- [x] focused verification commands pass

## QA Deviations

- Sprint 0 acceptance criteria are satisfied.
- Additional post-sprint work now exists on top of the Sprint 0 foundation:
  - OpenAI-backed `generate_blog_image` provider and deferred admin tool
  - automatic hero-asset linking during image generation when `post_id` is supplied
  - automatic hero-asset visibility publication during `publish_content`
- These additions extend the pipeline beyond Sprint 0 scope but do not weaken or bypass the Sprint 0 storage, routing, auth, or rendering contract.
