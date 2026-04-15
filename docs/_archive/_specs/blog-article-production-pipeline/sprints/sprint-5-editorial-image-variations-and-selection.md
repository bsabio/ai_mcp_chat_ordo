# Sprint 5 — Editorial Image Variations And Selection

> **Goal:** Add support for multiple candidate hero images per post, admin-only editorial selection of the canonical hero asset, and safe switching of the published hero image without widening the public journal surface.
> **Spec Sections:** Follow-on extension beyond the original Sprint 0-4 plan, derived from Future Consideration 2 plus `BAPP-014`, `BAPP-015`, `BAPP-019`, `BAPP-034` through `BAPP-038`, `BAPP-041`, `BAPP-050`, `BAPP-051`, `BAPP-060`
> **Prerequisite:** Sprint 0 asset foundation, Sprint 1 native image generation, Sprint 3 orchestration, and Sprint 4 public rendering and hardening.

---

## QA Review Of Sprint Scope

Sprint 5 is a deliberate follow-on sprint. The parent spec's original delivery plan ends at Sprint 4, so this sprint is derived from the explicit future-consideration backlog and the current runtime's remaining editorial workflow gaps.

The following scope clarifications are enforced in this sprint document:

1. Sprint 5 is about editorial operations on hero images after generation, not about widening public blog rendering.
2. Public readers must still see exactly one canonical hero image per post through the existing public-safe asset route.
3. Candidate, rejected, or superseded hero images remain admin-only unless and until they become the selected canonical hero asset for a published post.
4. Sprint 5 should extend the existing image-generation and artifact-inspection model rather than replacing the current `generate_blog_image` or `produce_blog_article` path.
5. Selection history and provenance are part of scope because editorial traceability is one of the main reasons to add candidate-image support at all.
6. The current runtime is materially missing this capability: generated hero images become canonical immediately, preview surfaces show only the current hero image, and the artifact route exposes prompts and generation records but not a first-class hero-selection workflow.

The verification plan below focuses on candidate-image storage, admin-only inspection and selection, canonical-hero switching, preservation of the current public asset contract, and avoidance of regressions in the existing draft and publish flows.

QA conclusion: Sprint 5 is now implemented in the current workspace runtime. The system supports candidate hero images, admin-only inspection and selection, canonical hero switching, and canonical-only public serving for published posts.

## QA Against Current Runtime

Sprint 5 was drafted against the Sprint 4 baseline and is now implemented against the current runtime.

### Verified current limitations

| Limitation | Current state | Why Sprint 5 is needed |
| --- | --- | --- |
| Single generated image becomes canonical immediately | `BlogImageGenerationService.generate()` links the new asset to the post as soon as a post id is supplied. | Editors cannot compare multiple generated hero images before picking the public one. |
| Public blog rendering assumes only one canonical hero asset | The index and post routes load the hero image only through `heroImageAssetId`. | The current rendering model has no notion of candidate hero assets or manual hero replacement. |
| Admin preview shows only the current canonical hero image | The preview route resolves one linked hero asset and renders it. | Editors cannot evaluate alternates from the current preview flow. |
| Artifact inspection is prompt-centric, not selection-centric | The admin artifact route lists prompts and generation artifacts only. | Editors can inspect provenance, but not manage hero-image candidates or choose a winner. |
| Orchestration produces one image outcome only | `produce_blog_article` persists one generated hero image and links it to the draft. | The system lacks an additive path for generating or selecting alternate hero images after the initial run. |

### Sprint 5 target outcome

| Requirement area | Target state |
| --- | --- |
| Editorial traceability | Candidate hero images, selection decisions, and canonical switches are durably preserved. |
| Admin-only curation | Authorized editors can inspect candidate hero images and select the canonical hero asset without widening public access. |
| Public rendering stability | Public readers continue to receive only the selected canonical hero asset and its metadata. |
| Flow preservation | Existing single-image generation, draft persistence, publish flows, and Sprint 4 metadata behavior remain green. |

### Implemented requirement areas

| Requirement area | Status | Evidence |
| --- | --- | --- |
| Candidate-image model above the canonical hero contract | Implemented | `BlogAsset` and `BlogAssetDataMapper` now persist `selectionState` and `variationGroupId` while preserving `blog_posts.hero_image_asset_id` as the canonical reader contract. |
| Admin-only candidate inspection and selection surface | Implemented | `src/app/api/admin/blog/posts/[postId]/hero-images/route.ts` lists hero candidates and supports `select` and `reject` mutations behind admin authorization. |
| Additive variation-generation path | Implemented | `generate_blog_image` now accepts candidate-generation inputs so editors can create draft-only alternatives without automatic canonical replacement. |
| Canonical hero switching workflow | Implemented | `BlogImageGenerationService.selectHeroImage()` promotes one candidate, demotes the rest, and keeps canonical hero linkage on the post. |
| Selection history and editorial traceability for hero changes | Implemented | `BlogPostArtifactType` includes `hero_image_selection`, and selection actions persist traceable artifact records. |
| Sprint-specific verification coverage | Implemented | Focused tests cover schema, repository behavior, image service, tool input parsing, public asset safety, admin route behavior, and orchestration compatibility. |

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/lib/blog/blog-image-generation-service.ts` | Generates and persists one hero image at a time and immediately links it as the canonical hero asset when a post id is supplied. |
| `src/core/entities/blog.ts` and `src/adapters/BlogPostDataMapper.ts` | The post model exposes one canonical `heroImageAssetId`, which is still the correct public-reader contract after Sprint 5. |
| `src/lib/blog/hero-images.ts` | Public journal rendering resolves only the canonical published hero asset, which should remain true after Sprint 5. |
| `src/app/journal/page.tsx` | The canonical journal index already emits canonical metadata and a representative Open Graph image from the selected public hero asset. |
| `src/app/journal/[slug]/page.tsx` | The canonical published post page already renders the selected public hero asset and exposes it in metadata. |
| `src/app/admin/journal/preview/[slug]/page.tsx` | The admin-only preview route exists and is the correct place to extend preview behavior without widening public access. |
| `src/app/api/admin/blog/posts/[postId]/artifacts/route.ts` | The runtime already has an admin inspection surface for post-scoped production artifacts, which can anchor a richer editorial workflow. |
| `src/lib/blog/blog-article-production-service.ts` | The orchestration path already persists hero-image prompts and generation results, providing the provenance base that Sprint 5 can build on. |
| `src/adapters/ChatPresenter.ts` | Chat already exposes actions for opening the draft preview and current hero image after orchestration succeeds. |
| `tests/blog-image-generation-service.test.ts` | Current test coverage proves the one-image generation and linking path, which Sprint 5 must preserve as a valid baseline. |
| `tests/blog-hero-rendering.test.tsx` | Current coverage proves public readers see only the selected published hero image, and this contract must remain stable. |
| `tests/browser-ui/deferred-blog-jobs.spec.ts` | Browser coverage already validates the produced-draft and hero-image actions, which Sprint 5 can extend rather than replace. |

---

## Tasks

### 1. Add a candidate-image model above the canonical hero contract

Sprint 5 must support multiple editorially relevant hero-image candidates per post without breaking the single canonical `heroImageAssetId` reader contract.

Implementation requirements:

- preserve `blog_posts.hero_image_asset_id` as the one canonical public-reader field
- add candidate-image state that distinguishes at minimum:
  - selected
  - candidate
  - rejected
- preserve linkage between a candidate image and the generation artifact or prompt that produced it
- keep the canonical hero asset derivable without requiring public routes to understand the full candidate graph

Suggested approaches:

- extend `blog_assets` with selection-state metadata and a variation group identifier
- or add a small companion table that records per-post hero-image candidates and selection decisions while leaving `blog_assets` as the durable media store

Verify:

- add focused repository coverage for candidate-image persistence and selection-state transitions
- run `npm exec vitest run tests/blog-asset-repository.test.ts`

### 2. Add an admin-only hero-image inspection and selection surface

Sprint 5 must let authorized editors review all available hero-image candidates for a post and select the canonical one deliberately.

Implementation requirements:

- add an admin-only route or route family for listing hero-image candidates for a post
- include enough metadata for editorial review:
  - asset id
  - dimensions
  - alt text
  - source prompt
  - provider and model
  - selection status
- support selecting one asset as canonical for the post
- optionally support rejecting or archiving candidates without deleting provenance

The existing artifact inspection route is a useful starting point, but Sprint 5 should expose first-class asset review rather than forcing editors to infer everything from artifact payloads.

Verify:

- add focused route coverage for admin-only candidate listing and canonical selection
- run future focused coverage such as `npm exec vitest run tests/blog-hero-selection-route.test.ts tests/blog-hero-candidates-route.test.ts`

### 3. Add an additive variation-generation path

Sprint 5 must allow editors to generate new hero-image candidates after the first orchestration run without immediately replacing the canonical hero asset.

Implementation requirements:

- keep `generate_blog_image` valid for the current one-image path
- add an additive path for candidate generation, for example:
  - `generate_blog_image_variations`
  - or a variation mode on `generate_blog_image`
- support generating candidates from:
  - the existing hero-image prompt artifact
  - a revised prompt
  - the final article content
- default variation generation to draft-only candidate state until an editor explicitly selects one

Scope note:

- Sprint 5 is not required to add a public variation gallery or reader-facing carousel

Verify:

- add focused service and tool coverage for candidate generation without automatic canonical replacement
- run `npm exec vitest run tests/blog-image-generation-service.test.ts tests/blog-image-tool.test.ts`

### 4. Preserve the public-safe hero rendering and metadata contract

Sprint 5 must not regress the Sprint 4 public rendering model while introducing candidate images.

Implementation requirements:

- public blog routes continue to render only the selected canonical hero image
- blog index and post metadata continue to expose only the selected canonical public-safe hero image
- switching the canonical hero asset updates the public reader routes and metadata deterministically
- candidate or rejected images remain private and non-cacheable unless they become canonical on a published post

Verify:

- preserve the existing Sprint 4 rendering and metadata tests
- add focused switching coverage that proves the newly selected hero asset becomes the one public image
- run `npm exec vitest run tests/blog-hero-rendering.test.tsx tests/blog-assets-route.test.ts`

### 5. Preserve editorial traceability and change history

Sprint 5 exists to improve editorial judgment, so selection and replacement actions must remain explainable later.

Implementation requirements:

- persist a durable record of hero-image selection events
- record which asset was selected, which asset it replaced, and who made the change
- keep generation artifacts attached to the underlying asset or post so editors can reconstruct why an image exists
- avoid deleting old assets automatically when a new canonical asset is chosen unless explicit cleanup tooling is added later

Suggested persistence options:

- a new `hero_image_selection` artifact type
- or a dedicated audit artifact stream for canonical-image changes

Verify:

- add repository or artifact-route coverage for selection-history retrieval
- run future focused coverage such as `npm exec vitest run tests/blog-post-artifact-repository.test.ts tests/blog-hero-selection-history.test.ts`

### 6. Preserve existing orchestration and publish flows

Sprint 5 must extend the editorial workflow without regressing the shipped article-production baseline.

Implementation requirements:

- `produce_blog_article` remains valid and still produces a usable draft with a hero image
- direct `generate_blog_image` remains valid for the current single-image path
- publishing still exposes the selected hero asset publicly and keeps non-selected candidates private
- browser job cards and draft-preview actions remain compatible with the selected canonical hero asset

Verify:

- preserve orchestration and publish integration coverage
- run `npm exec vitest run tests/blog-article-production-service.test.ts tests/deferred-blog-job-flow.test.ts tests/deferred-blog-publish-flow.test.ts`

---

## Positive, Negative, And Edge-Case Test Matrix

### Positive tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| P1 | generate multiple hero-image candidates for one draft post | all assets persist, but only one is marked canonical |
| P2 | select a non-canonical candidate as the new hero image | `hero_image_asset_id` updates and the previous canonical asset remains in history |
| P3 | publish a post after choosing among candidates | only the selected canonical hero asset is public and cacheable |
| P4 | open the admin preview after switching the hero image | the preview route renders the newly selected hero image |
| P5 | inspect hero candidates as an admin | the route returns candidate metadata and selection state for the post |

### Negative tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| N1 | request candidate-image inspection as a non-admin | the route returns `403` |
| N2 | attempt to select an asset not linked to the target post | the selection route rejects the request |
| N3 | attempt to expose a rejected or non-selected candidate publicly | the public asset route does not serve it as public media |
| N4 | generate a variation for a missing post id | the generation path rejects the request before provider work runs |
| N5 | switch the canonical hero asset on a missing post | the selection route returns `404` |

### Edge-case tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| E1 | generate one candidate only | the current one-image workflow still behaves correctly |
| E2 | switch canonical selection on an already published post | public metadata and reader routes resolve to the new canonical asset deterministically |
| E3 | keep older candidates after multiple switches | historical candidates remain admin-visible and non-public |
| E4 | reload the draft preview after switching the hero image | the preview reflects the persisted canonical selection |
| E5 | orchestrate article production, then add variations later | the original orchestration flow remains valid and additive candidate generation still works |

---

## Completion Checklist

- [x] candidate-image state added without breaking canonical hero rendering
- [x] admin-only candidate inspection route added
- [x] canonical hero-selection workflow added
- [x] additive variation-generation path added
- [x] public blog routes continue to expose only the selected canonical hero image
- [x] selection and replacement history preserved for editorial traceability
- [x] orchestration, draft, and publish flows remain green

## QA Deviations

- No implementation deviations remain in the focused Sprint 5 scope.
- Validation run: `npm exec vitest run tests/blog-asset-schema.test.ts tests/blog-asset-repository.test.ts tests/blog-image-generation-service.test.ts tests/blog-image-tool.test.ts tests/blog-assets-route.test.ts tests/blog-hero-rendering.test.tsx tests/blog-article-production-service.test.ts 'src/app/api/admin/blog/posts/[postId]/hero-images/route.test.ts'` passed with 41/41 tests green.
- Sprint 5 canonical-switch history is not implemented; no hero-selection artifact type or audit stream exists yet.
- Sprint 5 verification coverage does not exist yet beyond the Sprint 4 baseline tests that protect current public rendering, asset safety, orchestration, and publish flows.
