# Sprint 3 — Article Orchestration Tool

> **Goal:** Add a deterministic `produce_blog_article` orchestration tool that executes article composition, QA, QA resolution, hero-image prompt design, hero-image generation, and final draft persistence through the shared deferred-jobs runtime.
> **Spec Sections:** `BAPP-014`, `BAPP-031` through `BAPP-033`, `BAPP-040`, `BAPP-041`, `BAPP-050`, `BAPP-051`, `BAPP-060`
> **Prerequisite:** Sprint 0 asset and public-delivery foundation, Sprint 1 native image-generation path, Sprint 2 article QA stages, and the shared deferred-jobs runtime.

---

## QA Review Of Sprint Scope

Sprint 3 was reviewed against the parent spec and the shipped runtime before drafting. The following scope clarifications are enforced in this sprint document:

1. Sprint 3 is about the full orchestration path, not the existence of the underlying stage tools alone.
2. `produce_blog_article` is additive. It does not replace `draft_content`, `publish_content`, `compose_blog_article`, `qa_blog_article`, `resolve_blog_article_qa`, `generate_blog_image_prompt`, or `generate_blog_image`.
3. Deterministic sequencing is the main Sprint 3 requirement: article generation must stabilize before image-prompt design and hero-image generation run.
4. The orchestration path persists the full post-scoped artifact trail after draft creation rather than scattering persistence across intermediate stage handlers.
5. Deferred progress labels and result payload shape are part of Sprint 3 scope because the orchestration tool is specified as a deferred chat-native workflow.
6. Chat result actions for the orchestration outcome exist in the runtime and now have focused presenter coverage in addition to the service-level orchestration tests.

Sprint 3 is materially implemented in the current runtime. The orchestration path and the adjacent standalone QA-resolution path now both preserve the QA report and QA resolution artifacts needed for post-scoped editorial traceability.

The verification plan below focuses on orchestration order, artifact persistence, deferred-job progress semantics, admin-only exposure, and preservation of existing editorial flows.

## QA Against Parent Spec

Sprint 3 was reviewed directly against the parent spec sections it claims.

### Fully satisfied requirements

| Requirement | Status | Notes |
| --- | --- | --- |
| `BAPP-031` System boundaries | Satisfied | The runtime preserves separate stage services, discrete tools, and a dedicated orchestration path rather than collapsing production into one handler. |
| `BAPP-032` Target tool inventory | Satisfied for Sprint 3 scope | `produce_blog_article` is registered alongside the lower-level stage tools and existing editorial tools. |
| `BAPP-033` Internal service separation | Satisfied for Sprint 3 scope | The orchestration flow delegates to composition, QA, resolution, image-prompt design, image generation, and draft persistence rather than embedding provider logic directly inside the tool descriptor. |
| `BAPP-040` Article orchestration order | Satisfied | The service executes composition -> QA -> QA resolution -> image-prompt design -> hero-image generation -> final draft persistence in a fixed order. |
| `BAPP-041` Chat and deferred-job integration | Satisfied for the orchestration path | The service emits the named progress labels from the spec, the worker forwards progress updates, and the result payload includes the post id, slug, title, image asset id, completed stages, and a summary. |
| `BAPP-050` Admin-only generation surface | Satisfied | `produce_blog_article` is an `ADMIN`-only deferred tool. |
| `BAPP-051` Prompt and artifact privacy for drafts | Satisfied for Sprint 3 scope | Draft artifacts remain non-public, are inspectable only through an admin-only route, and the orchestration draft action now resolves to an admin-only preview page rather than the public published-post route. |
| `BAPP-060` Existing flow preservation | Satisfied | `draft_content` and `publish_content` remain available and green while orchestration adds a higher-level production path. |

### Partially satisfied requirements

| Requirement | Status | Notes |
| --- | --- | --- |
| `BAPP-014` Artifact preservation | Satisfied for Sprint 3 scope | The orchestration path persists generation prompt, generation result, QA report, QA resolution, hero-image prompt, and hero-image generation result artifacts after the draft is created, and standalone post-targeted QA resolution now preserves the supplied QA report when needed for traceability. |

### Out-of-scope or later-stage requirements

| Requirement | Status | Notes |
| --- | --- | --- |
| Browser rendering and published-page hardening | Deferred to Sprint 4 | Sprint 3 stops at producing a draft with a linked hero asset and deferred-job result payload. Browser verification of final blog rendering and published-reader behavior remains a later concern. |
| Retry ergonomics beyond the shared deferred runtime | Deferred to Sprint 4 | Shared job retry support exists, but sprint-specific retry-hardening and browser/runtime resiliency remain later work. |

QA conclusion: Sprint 3 is implemented and acceptable for the deterministic orchestration path. Remaining risk is concentrated in later rendering and retry hardening, not in the core `produce_blog_article` sequence itself.

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/lib/blog/blog-article-production-service.ts` | Implements the deterministic orchestration sequence, progress-label emission, final draft creation, hero-asset linkage, and full post-scoped artifact persistence. |
| `src/core/use-cases/tools/blog-production.tool.ts` | Exposes `produce_blog_article` as a deferred admin tool with validated orchestration input. |
| `src/lib/chat/tool-composition-root.ts` | Registers `produce_blog_article` alongside the stage tools and existing editorial paths. |
| `scripts/process-deferred-jobs.ts` | Wires `produce_blog_article` into the shared deferred worker and forwards progress updates through the worker handler context. |
| `src/adapters/ChatPresenter.ts` | Adds orchestration result actions for opening the produced draft in the admin-only preview route and opening the hero image after job completion. |
| `src/adapters/ChatPresenter.test.ts` | Verifies the `produce_blog_article` success payload is projected into draft and hero-image actions for chat. |
| `src/app/admin/journal/preview/[slug]/page.tsx` | Provides the admin-only preview route that renders draft posts and linked draft hero assets without widening public journal access. |
| `src/app/admin/journal/preview/[slug]/page.test.tsx` | Verifies login redirect, admin-only gating, and draft hero-image rendering for the canonical preview route. |
| `src/app/api/admin/blog/posts/[postId]/artifacts/route.ts` | Exposes an admin-only inspection surface for post-scoped production artifacts without widening public draft access. |
| `src/app/api/admin/blog/posts/[postId]/artifacts/route.test.ts` | Verifies admin-only access, artifact-type filtering, invalid-filter rejection, and missing-post handling for artifact inspection. |
| `src/core/use-cases/tools/admin-content.tool.ts` | Remains the final draft-persistence path used by orchestration rather than being replaced. |
| `src/core/use-cases/tools/blog-image.tool.ts` | Supplies the discrete image-generation stage that Sprint 3 orchestration composes rather than duplicates. |
| `tests/blog-article-production-service.test.ts` | Verifies orchestration order, progress labels, no-findings behavior, hero-asset linkage, and full artifact persistence. |
| `tests/blog-production-tool.test.ts` | Verifies orchestration input parsing, command-level context requirements, service delegation, and deferred admin descriptor registration. |
| `tests/tool-registry.integration.test.ts` | Verifies the registry still composes the blog tool surface without regressing existing access control. |
| `tests/deferred-blog-job-flow.test.ts` | Verifies the shared worker and conversation projector continue to support deferred blog workflows. |
| `tests/deferred-blog-publish-flow.test.ts` | Verifies the existing publish path remains intact beside the new orchestration surface. |
| `tests/browser-ui/deferred-blog-jobs.spec.ts` | Provides browser-level evidence for deferred blog-job UX for both the draft/publish path and a dedicated `produce_blog_article` flow, including reload persistence and the admin draft-preview action. |

---

## Tasks

### 1. Add the orchestration tool contract

Expose a dedicated orchestration input and output rather than requiring callers to manually coordinate stage tools.

Required types:

- `ProduceBlogArticleInput`
- `ProduceBlogArticleOutput`

Minimum contract capabilities:

- accept the article brief plus optional audience, objective, and tone
- optionally accept `enhance_image_prompt`
- return the persisted draft identity and linked hero image id
- return the ordered stage list used to produce the result
- return a human-readable completion summary

Keep the orchestration contract in the production-service and tool layer rather than embedding it in chat-specific code.

Verify:

- add or preserve focused orchestration-tool coverage such as `tests/blog-production-tool.test.ts`
- run `npm exec vitest run tests/blog-production-tool.test.ts`

### 2. Implement deterministic orchestration sequencing

Add a service method that executes the full production flow in the fixed order required by the spec.

Suggested file:

- `src/lib/blog/blog-article-production-service.ts`

Implementation requirements:

- compose the article from the brief
- run QA on the composed article
- resolve QA findings before any image stage runs
- bypass the resolution model call when there are no findings and emit a no-op resolution summary instead
- design the hero-image prompt from the final article state
- generate the hero image using the existing image-generation service
- persist the final draft and link the hero asset to the post

Verify:

- add focused service tests such as `tests/blog-article-production-service.test.ts`
- run `npm exec vitest run tests/blog-article-production-service.test.ts`

### 3. Persist the full orchestration artifact trail

Sprint 3 must retain a complete post-scoped record of the orchestration run.

Required artifact types for this path:

- `article_generation_prompt`
- `article_generation_result`
- `article_qa_report`
- `article_qa_resolution`
- `hero_image_prompt`
- `hero_image_generation_result`

Implementation requirements:

- persist artifacts only after a draft post exists so artifacts can be attached to a concrete post id
- keep artifact persistence in the dedicated artifact repository
- avoid duplicating prompt or artifact payloads into `blog_posts`
- preserve hero-image linkage on both the asset row and the blog post row

Verify:

- use focused orchestration persistence coverage such as `tests/blog-article-production-service.test.ts`
- run `npm exec vitest run tests/blog-article-production-service.test.ts tests/blog-post-artifact-repository.test.ts`

### 4. Integrate orchestration with deferred jobs

Expose `produce_blog_article` through the shared deferred-job runtime rather than a special-case execution path.

Required files expected to change:

- `src/core/use-cases/tools/blog-production.tool.ts`
- `src/lib/chat/tool-composition-root.ts`
- `scripts/process-deferred-jobs.ts`

Implementation requirements:

- register `produce_blog_article` as an `ADMIN`-only deferred tool
- require execution context for orchestration execution
- pass worker progress updates through the existing deferred-job handler context
- keep dedupe, retry, and notification semantics aligned with the shared deferred-tool conventions

Verify:

- add focused tool and registry checks such as `tests/blog-production-tool.test.ts` and `tests/tool-registry.integration.test.ts`
- run `npm exec vitest run tests/blog-production-tool.test.ts tests/tool-registry.integration.test.ts`

### 5. Preserve chat-native orchestration feedback

Sprint 3 must feel like a first-class deferred workflow in chat rather than a silent background batch.

Implementation requirements:

- emit the named progress labels from the parent spec
- return a completion payload with draft and hero-image information
- project the final job result back into the conversation stream
- expose result actions for opening the admin draft preview and hero image after success

Current implementation note:

- the runtime emits progress labels and result actions, and the produced draft now opens through an admin-only preview route with focused presenter and preview-page coverage in addition to the service-level orchestration tests

Verify:

- preserve worker and conversation-flow checks such as `tests/deferred-blog-job-flow.test.ts`
- preserve browser deferred-job checks when practical

### 6. Preserve manual editorial flows

Sprint 3 must extend the editorial system without regressing the pre-existing low-level tools.

Implementation requirements:

- `draft_content` remains a valid direct persistence path
- `publish_content` remains the publishing path for approved drafts
- orchestration must reuse these foundations rather than replacing them with a parallel persistence model
- deferred orchestration must not widen public artifact exposure or published-media rules

Verify:

- run `npm exec vitest run tests/deferred-blog-job-flow.test.ts tests/deferred-blog-publish-flow.test.ts tests/tool-registry.integration.test.ts`

---

## Positive, Negative, And Edge-Case Test Matrix

### Positive tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| P1 | run `produce_blog_article` with a valid brief | a draft post is created with a linked hero image and a completed stage summary |
| P2 | inspect orchestration progress updates | the flow emits the fixed progress labels in deterministic order |
| P3 | inspect artifacts after orchestration | generation, QA, resolution, and hero-image artifacts are attached to the produced post |
| P4 | register the composed tool surface | `produce_blog_article` appears as a deferred admin tool beside the stage tools |
| P5 | complete a deferred blog workflow through the shared worker | the worker and conversation projector still surface a successful blog job outcome |

### Negative tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| N1 | `produce_blog_article` receives a payload without `brief` | parsing fails before service execution |
| N2 | orchestration is executed without tool context | execution fails because draft persistence and image generation require a user context |
| N3 | the image-generation service fails | the orchestration run fails instead of silently persisting a partial final draft |
| N4 | a later stage would run before QA resolution | service ordering tests fail, protecting deterministic sequencing |
| N5 | existing draft and publish flows are exercised after orchestration work lands | those flows remain green and unchanged in behavior |

### Edge-case tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| E1 | the QA report has no findings | the orchestration path skips the resolver call and persists a no-op resolution summary |
| E2 | the hero image starts unattached | the produced draft becomes the linked post and the hero asset id is set on the post |
| E3 | the orchestration result is projected back to chat | the final payload includes draft identity, hero-image identity, stage list, and summary |
| E4 | the user enables prompt enhancement explicitly or implicitly | the orchestration call forwards the expected enhancement flag to image generation |
| E5 | the lower-level stage tools remain present beside orchestration | callers can still use discrete tools without losing the full orchestration path |

Coverage note:

- P1-P4, N1-N4, and E1-E2, E4-E5 are covered directly by the current focused suite.
- P5 and N5 are covered by adjacent deferred blog-flow tests.
- E3 is covered by focused presenter coverage in addition to the service and registry layers.

---

## Completion Checklist

- [x] `ProduceBlogArticleInput` and `ProduceBlogArticleOutput` added
- [x] deterministic orchestration service method added
- [x] full orchestration artifact trail persisted to `blog_post_artifacts`
- [x] final draft persistence reuses the existing draft-content path
- [x] hero asset is linked to the produced draft
- [x] `produce_blog_article` deferred admin tool added
- [x] tool-registry and worker wiring added for orchestration
- [x] progress labels from the parent spec are emitted
- [x] focused verification commands pass for the shipped orchestration path

Focused verification run for this QA pass:

- `npm exec vitest run tests/blog-production-tool.test.ts tests/blog-article-production-service.test.ts`
- `npm exec vitest run src/adapters/ChatPresenter.test.ts 'src/app/admin/journal/preview/[slug]/page.test.tsx'`
- `npm exec vitest run 'src/app/api/admin/blog/posts/[postId]/artifacts/route.test.ts'`
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 npx playwright test tests/browser-ui/deferred-blog-jobs.spec.ts`

## QA Deviations

- No material Sprint 3 deviations remain in the orchestration path after routing draft access through the admin-only preview surface.
