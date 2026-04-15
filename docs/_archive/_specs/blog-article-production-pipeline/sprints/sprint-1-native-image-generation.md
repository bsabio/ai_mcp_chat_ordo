# Sprint 1 — Native Image Generation

> **Goal:** Add the native image-generation contract, OpenAI-backed provider adapter, blog-image persistence service, and deferred `generate_blog_image` tool so admins can generate and attach canonical hero images using the Sprint 0 asset foundation.
> **Spec Sections:** `BAPP-016`, `BAPP-018`, `BAPP-038` through `BAPP-041`, `BAPP-050`, `BAPP-053`, `BAPP-054`, `BAPP-060`
> **Prerequisite:** Sprint 0 asset persistence and public-delivery foundation, existing blog persistence tools, and the deferred-jobs runtime.

---

## QA Review Of Sprint Scope

Sprint 1 was reviewed against the parent spec and the implemented runtime before drafting. The following scope clarifications are now enforced in this sprint document:

1. Sprint 1 extends the Sprint 0 asset model rather than replacing it; generated hero media still persists through `blog_assets` and is served through `/api/blog/assets/[id]`.
2. The provider boundary remains provider-neutral even though the initial concrete adapter is OpenAI `gpt-image-1`.
3. `generate_blog_image` is an `ADMIN`-only deferred tool in the initial release.
4. The native service must preserve both the original prompt and the final provider-facing prompt for auditability.
5. Automatic post attachment and `heroImageAssetId` linkage are in scope when `post_id` is supplied.
6. Full article artifact persistence is not required for Sprint 1 acceptance, even though later work now adds richer article-stage artifacts on top of this foundation.
7. Image-prompt design is within the broader Sprint 1 problem space; the current codebase now satisfies that capability through the later-added `generate_blog_image_prompt` stage without weakening the standalone `generate_blog_image` path.

No unresolved sprint-contract issues remain at draft time.

The verification plan below includes provider, service, tool, lifecycle, and deferred-runtime behavior and is part of the sprint definition rather than an optional add-on.

## QA Against Parent Spec

Sprint 1 was reviewed directly against the parent spec sections it claims.

### Fully satisfied requirements

| Requirement | Status | Notes |
| --- | --- | --- |
| `BAPP-016` Deferred by default for heavy stages | Satisfied | `generate_blog_image` is implemented as a deferred admin tool and executed through the shared worker path. |
| `BAPP-018` Provider abstraction | Satisfied | `BlogImageProvider` cleanly separates the provider port from the OpenAI implementation. |
| `BAPP-038` Image-generation service contract | Satisfied | The current contract supports prompt, size, quality, preset, prompt-enhancement intent, binary persistence, prompt preservation, and provider metadata through a provider-neutral boundary. |
| `BAPP-039` Image heuristics | Satisfied for Sprint 1 scope | Prompt-aware size selection, preset-aware strategy selection, explicit `auto` handling, and default `high` quality are implemented at the tool boundary before provider execution. |
| `BAPP-041` Chat and deferred-job integration for image generation | Satisfied for Sprint 1 scope | The image tool is registered, worker-executed, and surfaced with chat follow-up actions. The multi-stage progress-label requirement is handled later by orchestration work, not the single image tool. |
| `BAPP-050` Admin-only generation surface | Satisfied | The tool descriptor is `ADMIN`-only. |
| `BAPP-053` Provider-key safety | Satisfied | OpenAI client construction remains server-side in the lazy composition root. |
| `BAPP-054` Input validation | Satisfied for image-generation inputs | Prompt, alt text, size, and quality are validated before service execution. |
| `BAPP-060` Existing flow preservation | Satisfied | `draft_content` and `publish_content` remain intact and the publish flow now also updates linked hero-asset visibility. |

### Partially satisfied requirements

| Requirement | Status | Notes |
| --- | --- | --- |
| Sprint-plan row for Sprint 1 image-prompt generation | Partially satisfied | The standalone image-generation path is complete. Image-prompt design exists, but it shipped later as `generate_blog_image_prompt` in the broader article pipeline rather than as a Sprint 1-only prompt service. |

### Out-of-scope or later-stage requirements

| Requirement | Status | Notes |
| --- | --- | --- |
| `BAPP-040` Article orchestration order | Deferred to later sprint | This belongs to orchestration and is implemented later through `produce_blog_article`, not Sprint 1 itself. |

QA conclusion: Sprint 1 is acceptable and implemented. The remaining gap against the sprint-plan row is only the placement of image-prompt design work, which shipped as a later dedicated stage rather than a Sprint 1-only prompt service.

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/core/use-cases/BlogImageProvider.ts` | Defines the provider-neutral request and response contract for native blog-image generation, including prompt, size, quality, original prompt, final prompt, and raw bytes. |
| `src/adapters/OpenAiBlogImageProvider.ts` | Implements the initial OpenAI `gpt-image-1` adapter, including base64 decoding, revised-prompt capture, MIME fallback, and size-to-dimension inference. |
| `src/lib/blog/blog-image-generation-service.ts` | Persists generated image bytes to disk, creates `blog_assets` rows, links generated assets to posts, and returns blog-facing output payloads. |
| `src/core/use-cases/tools/blog-image.tool.ts` | Exposes the `generate_blog_image` tool, validates input payloads, applies preset-aware and prompt-aware strategy selection, and enforces the deferred admin surface. |
| `src/lib/blog/blog-production-root.ts` | Lazily composes the OpenAI-backed image provider into the runtime so registry construction does not eagerly fail on provider-key lookup. |
| `src/lib/chat/tool-composition-root.ts` | Registers `generate_blog_image` in the admin tool registry alongside the existing blog persistence tools. |
| `scripts/process-deferred-jobs.ts` | Wires `generate_blog_image` into the shared deferred-job worker path used by other admin tools. |
| `src/adapters/ChatPresenter.ts` | Adds successful job actions for generated images, including direct links to the image and linked post when present. |
| `src/lib/blog/blog-production-root.test.ts` | Verifies that the image-generation service is lazily composed and that missing OpenAI credentials fail only at invocation time. |
| `src/core/use-cases/tools/admin-content.tool.ts` | Publishes a linked hero asset when a post is published, preserving the publication lifecycle expected by the Sprint 0 route contract. |
| `src/adapters/OpenAiBlogImageProvider.test.ts` | Verifies byte decoding, prompt metadata preservation, prompt-enhancement disabling, `auto` sizing behavior, and provider failure handling. |
| `tests/blog-image-generation-service.test.ts` | Verifies byte persistence, asset creation, post linkage, unattached asset behavior, unknown-post rejection, and published-post visibility behavior. |
| `tests/blog-image-tool.test.ts` | Verifies payload parsing, default injection, invalid enum rejection, and deferred-admin descriptor metadata. |
| `tests/deferred-blog-publish-flow.test.ts` | Verifies that publishing a post also publishes its linked hero asset. |

---

## Tasks

### 1. Add a provider-neutral native blog-image contract

Create a dedicated image-generation port rather than embedding provider calls directly inside tool or repository code.

Required types:

- `BlogImageSize`
- `BlogImageQuality`
- `BlogImageGenerationRequest`
- `BlogImageGenerationResult`
- `BlogImageProvider`

Minimum contract capabilities:

- accept prompt, size, quality, and prompt-enhancement intent
- accept preset or strategy guidance
- return raw image bytes for persistence
- preserve both `originalPrompt` and `finalPrompt`
- surface provider and model metadata

Keep this boundary provider-neutral so later providers can be added without rewriting the tool or service layer.

Verify:

- add focused provider-contract coverage such as `src/adapters/OpenAiBlogImageProvider.test.ts`
- run `npm exec vitest run src/adapters/OpenAiBlogImageProvider.test.ts`

### 2. Add the initial OpenAI `gpt-image-1` adapter

Create the first provider implementation using OpenAI image generation.

Suggested file:

- `src/adapters/OpenAiBlogImageProvider.ts`

Implementation requirements:

- send prompt, size, and quality to `gpt-image-1`
- decode base64 image bytes from the provider response
- preserve the provider-revised prompt when prompt enhancement is allowed
- preserve the original prompt when prompt enhancement is disabled
- infer image dimensions from the requested size when the provider does not return them
- fail fast if the provider returns no image bytes

The adapter should not write files, mutate blog posts, or manage publication state.

Verify:

- add focused adapter tests such as `src/adapters/OpenAiBlogImageProvider.test.ts`
- run `npm exec vitest run src/adapters/OpenAiBlogImageProvider.test.ts`

### 3. Add the blog image-generation service

Create a service that translates provider output into persisted blog assets and optional hero-image linkage.

Suggested file:

- `src/lib/blog/blog-image-generation-service.ts`

Implementation requirements:

- resolve the target post when `postId` is provided
- generate image bytes through the provider port
- derive a safe storage path under the blog-asset root
- write image bytes to disk
- create a `blog_assets` row with MIME type, dimensions, alt text, source prompt, provider, and provider model
- attach the generated asset to the target post when `postId` is provided
- set `blog_posts.heroImageAssetId` to the generated asset id when attached
- return a blog-facing result payload including asset id, post slug, image URL, prompt metadata, and summary text
- mark newly generated assets `published` immediately when attached to an already published post; otherwise keep them `draft`

The service must keep storage writes and blog-asset persistence inside the server runtime rather than delegating them to the provider adapter.

Verify:

- add focused service tests such as `tests/blog-image-generation-service.test.ts`
- run `npm exec vitest run tests/blog-image-generation-service.test.ts`

### 4. Add lazy runtime composition for the image-generation path

Extend the runtime composition root so the OpenAI-backed image-generation service can be constructed without forcing eager provider-key resolution during registry setup.

Required wiring:

- `getBlogImageGenerationService()` in `src/lib/blog/blog-production-root.ts`
- lazy provider creation using `getOpenaiApiKey()` only at generation time
- repository wiring through existing repository-factory getters

Implementation requirements:

- keep the provider instantiation server-side
- do not expose provider keys to the browser
- preserve the existing singleton-style runtime composition pattern

Verify:

- run `npm run typecheck`
- run `npm exec vitest run tests/tool-registry.integration.test.ts`

### 5. Add the `generate_blog_image` tool and deferred worker integration

Expose native image generation as a discrete admin tool rather than hiding it behind orchestration or browser-only code.

Required files expected to change:

- `src/core/use-cases/tools/blog-image.tool.ts`
- `src/lib/chat/tool-composition-root.ts`
- `scripts/process-deferred-jobs.ts`
- `src/adapters/ChatPresenter.ts`

Tool requirements:

- input fields: `post_id`, `prompt`, `alt_text`, `preset`, `size`, `quality`, `enhance_prompt`
- if `size` is omitted, resolve it from preset-aware and prompt-aware heuristics
- default `quality` to `high`
- default `enhance_prompt` to `true`
- validate enum inputs before calling the service
- require non-empty prompt and alt text
- mark the tool `ADMIN`-only and `deferred`
- return enough result data for chat-native follow-up actions

Worker and UX requirements:

- the shared deferred worker must execute `generate_blog_image`
- successful chat job results should include at least `Open image`
- successful results for attached assets should also include `Open post`

Verify:

- add focused tool tests such as `tests/blog-image-tool.test.ts`
- run `npm exec vitest run tests/blog-image-tool.test.ts tests/tool-registry.integration.test.ts`

### 6. Preserve the publish lifecycle for generated hero assets

Generated hero assets must honor publication state rather than becoming public immediately in all cases.

Implementation requirements:

- attached assets generated for draft posts remain `draft`
- attached assets generated for already published posts may be created as `published`
- publishing a draft post with a linked hero asset must transition that asset to `published`
- this behavior must work through both direct publish execution and the shared deferred worker path

Do not weaken the Sprint 0 route contract by making all generated hero images public at creation time.

Verify:

- add focused lifecycle tests such as `tests/deferred-blog-publish-flow.test.ts`
- run `npm exec vitest run tests/deferred-blog-publish-flow.test.ts tests/blog-assets-route.test.ts`

---

## Positive, Negative, And Edge-Case Test Matrix

### Positive tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| P1 | generate an image through the OpenAI adapter | decoded bytes, MIME metadata, original prompt, and final prompt round-trip correctly |
| P2 | generate an image for a draft blog post | image bytes persist to disk, a `blog_assets` row is created, and the post stores the new `heroImageAssetId` |
| P3 | generate an image for an already published post | the returned asset is immediately `published` and remains compatible with the Sprint 0 public route |
| P4 | execute `generate_blog_image` with only required fields | the tool applies prompt-aware size selection, default `high` quality, and prompt-enhancement behavior before calling the service |
| P5 | publish a draft post with a linked generated hero asset | the linked asset visibility transitions to `published` during the publish flow |

### Negative tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| N1 | provider returns no image bytes | adapter throws a provider-response error and no persistence work is attempted |
| N2 | `generate_blog_image` receives an invalid size | input parsing rejects the payload before service execution |
| N3 | `generate_blog_image` receives an invalid quality | input parsing rejects the payload before service execution |
| N4 | image generation is requested for an unknown post id | service rejects the request rather than creating a misleading asset linkage |
| N5 | provider credentials are unavailable at runtime | generation fails server-side without exposing secrets or breaking registry composition |

### Edge-case tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| E1 | generate an unattached image with no `post_id` | the asset persists as a draft asset with no post linkage and remains inspectable only through draft-safe paths |
| E2 | prompt enhancement is disabled | `finalPrompt` remains equal to the original input prompt |
| E3 | the requested size is `auto` | dimensions may remain null while bytes, MIME type, and prompt metadata still persist correctly |
| E4 | a draft post with a linked hero asset is later published | the existing asset becomes publicly readable only after publication conditions are satisfied |
| E5 | successful deferred generation returns a linked-post result | chat actions include both an image link and a post link |
| E6 | an explicit preset is supplied with omitted size | the tool resolves the preset into the expected output strategy before provider execution |

Coverage note:

- P1-P5, N1-N5, and E1-E6 are covered by focused tests in the current suite.
- E5 is validated by a dedicated ChatPresenter test.

---

## Completion Checklist

- [x] provider-neutral blog-image generation contract created
- [x] OpenAI `gpt-image-1` adapter added
- [x] native blog image-generation service persists bytes and `blog_assets` metadata
- [x] optional post attachment and `heroImageAssetId` linkage implemented
- [x] lazy runtime composition added for the image-generation path
- [x] `generate_blog_image` deferred admin tool added
- [x] tool-registry and shared worker wiring added
- [x] successful chat actions added for generated image jobs
- [x] publish flow preserves hero-asset visibility lifecycle
- [x] focused verification commands pass

Focused verification run for this QA pass:

- `npm exec vitest run src/adapters/OpenAiBlogImageProvider.test.ts tests/blog-image-generation-service.test.ts tests/blog-image-tool.test.ts tests/tool-registry.integration.test.ts tests/deferred-blog-publish-flow.test.ts tests/blog-assets-route.test.ts`
- `npm exec vitest run src/lib/blog/blog-production-root.test.ts`

## QA Deviations

- Sprint 1 acceptance criteria are satisfied.
- The original sprint-plan row referenced image-prompt generation as part of the broader native image workflow. In the current codebase, that capability now exists through the later-added `generate_blog_image_prompt` stage in the article-production pipeline rather than a Sprint 1-only prompt service.
- Additional post-sprint work now exists on top of the Sprint 1 foundation:
  - article QA, QA resolution, and full article orchestration
  - `blog_post_artifacts` persistence for article-stage provenance
  - `produce_blog_article` deterministic end-to-end orchestration
- These additions extend the platform beyond Sprint 1 scope but do not weaken or bypass the Sprint 1 provider, service, deferred-job, or publication-lifecycle contract.
