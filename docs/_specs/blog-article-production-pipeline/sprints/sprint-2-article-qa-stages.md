# Sprint 2 — Article QA Stages

> **Goal:** Add native article QA and QA-resolution stages, a normalized QA report contract, and artifact persistence foundations so article review findings can be generated, resolved, and preserved without collapsing the pipeline into a single tool.
> **Spec Sections:** `BAPP-011`, `BAPP-014`, `BAPP-019`, `BAPP-031` through `BAPP-033`, `BAPP-036`, `BAPP-050`, `BAPP-051`, `BAPP-054`, `BAPP-060`
> **Prerequisite:** Sprint 0 asset and public-delivery foundation, Sprint 1 native image-generation path, and the shared deferred-jobs runtime.

---

## QA Review Of Sprint Scope

Sprint 2 was reviewed against the parent spec and the implemented runtime before drafting. The following scope clarifications are now enforced in this sprint document:

1. Sprint 2 introduces discrete article QA and QA-resolution stages rather than embedding editorial review logic inside `draft_content` or `produce_blog_article` alone.
2. The normalized QA contract is part of the public internal pipeline surface and is reused by both the standalone QA tools and the later orchestration path.
3. Artifact persistence is implemented through the dedicated `blog_post_artifacts` model, not by extending `blog_posts` with JSON blobs.
4. Standalone `qa_blog_article` and `resolve_blog_article_qa` executions may now persist their own artifacts when `post_id` is provided, including preserving the supplied QA report during direct post-targeted resolution when needed for editorial traceability.
5. Image-prompt design now exists adjacent to the Sprint 2 QA stages, but Sprint 2’s primary scope remains article review, QA normalization, revision, and artifact persistence foundations.
6. The first concrete article-stage model implementation is Anthropic-backed and lazily composed through the runtime root.

No unresolved sprint-contract issues remain at draft time.

The verification plan below includes contracts, adapter behavior, artifact schema, tool surfaces, and the current artifact-preservation boundary.

## QA Against Parent Spec

Sprint 2 was reviewed directly against the parent spec sections it claims.

### Fully satisfied requirements

| Requirement | Status | Notes |
| --- | --- | --- |
| `BAPP-011` Discrete tool stages | Satisfied | `qa_blog_article` and `resolve_blog_article_qa` are implemented as separate deferred admin tools rather than being hidden inside orchestration. |
| `BAPP-031` System boundaries | Satisfied | The code separates persistence, stage services, discrete tools, and orchestration. |
| `BAPP-032` Target tool inventory | Satisfied for Sprint 2 scope | The standalone QA and QA-resolution tools are registered in the runtime and wired through the worker. |
| `BAPP-033` Internal service separation | Satisfied for Sprint 2 scope | The article-stage model and production service preserve logical separation between review, resolution, image-prompt design, and orchestration. |
| `BAPP-036` Artifact preservation model | Satisfied | `blog_post_artifacts` exists as a dedicated persistence model with typed artifact kinds and repository access. |
| `BAPP-050` Admin-only generation surface | Satisfied | QA and QA-resolution tools are `ADMIN`-only. |
| `BAPP-054` Input validation | Satisfied for QA-stage inputs | Article payloads and normalized QA payloads are validated before service execution. |
| `BAPP-060` Existing flow preservation | Satisfied | Existing draft and publish flows remain intact and the new stages extend rather than replace them. |

### Partially satisfied requirements

| Requirement | Status | Notes |
| --- | --- | --- |
| `BAPP-014` Artifact preservation | Satisfied for Sprint 2 scope | The full production path persists the complete trail, and standalone QA-stage tools may now persist their own artifacts when given a target `post_id`. |
| `BAPP-019` Editorial traceability | Satisfied for Sprint 2 scope | QA reports and QA resolutions can now be attached directly to an existing post during standalone stage execution or during full orchestration. |
| `BAPP-051` Prompt and artifact privacy for drafts | Partially satisfied | Draft artifacts are not publicly exposed because no public artifact route exists. However, there is no dedicated admin retrieval surface or focused privacy test for artifact inspection yet. |

### Out-of-scope or later-stage requirements

| Requirement | Status | Notes |
| --- | --- | --- |
| `BAPP-040` Article orchestration order | Deferred to later sprint | The fixed article -> QA -> resolution order is verified by the orchestration layer, not the standalone Sprint 2 stages alone. |
| `BAPP-041` Progress-label UX | Deferred to later sprint | Named deferred progress labels are primarily delivered by the later `produce_blog_article` orchestration path. |

QA conclusion: Sprint 2 is implemented and acceptable. The main remaining gap is artifact inspection ergonomics, not the underlying QA-stage or artifact-persistence capability.

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/core/use-cases/BlogArticlePipelineModel.ts` | Defines the article-stage contracts for composed articles, QA findings, QA reports, QA resolution, and image-prompt design. |
| `src/adapters/AnthropicBlogArticlePipelineModel.ts` | Implements article composition, review, QA resolution, and image-prompt design using Anthropic JSON-only responses and normalization helpers. |
| `src/core/entities/blog-artifact.ts` | Defines the canonical artifact types used to preserve generation prompts, QA reports, QA resolutions, and image-stage outputs. |
| `src/core/use-cases/BlogPostArtifactRepository.ts` | Defines the artifact persistence port separate from `BlogPostRepository`. |
| `src/adapters/BlogPostArtifactDataMapper.ts` | Persists artifact rows to SQLite using `payload_json` and exposes post-scoped and post-and-type lookups. |
| `src/lib/db/tables.ts` | Adds the `blog_post_artifacts` table and supporting indexes. |
| `src/lib/db/migrations.ts` | Ensures the artifact table and indexes are added for migrated databases. |
| `src/lib/blog/blog-article-production-service.ts` | Exposes review and resolution stage methods and persists QA artifacts during standalone post-targeted stage execution and the full production path, including direct resolution runs that supply a post-targeted QA report. |
| `src/core/use-cases/tools/blog-production.tool.ts` | Exposes `qa_blog_article`, `resolve_blog_article_qa`, and adjacent article-stage tools with deferred admin descriptors. |
| `src/lib/blog/blog-production-root.ts` | Lazily composes the Anthropic-backed article pipeline model and the production service. |
| `src/lib/chat/tool-composition-root.ts` | Registers the QA-stage tools in the admin registry. |
| `scripts/process-deferred-jobs.ts` | Wires `qa_blog_article` and `resolve_blog_article_qa` into the shared deferred worker. |
| `src/adapters/AnthropicBlogArticlePipelineModel.test.ts` | Verifies normalized QA handling for empty findings, approved reports with findings, and malformed JSON failure paths. |
| `tests/blog-post-artifact-repository.test.ts` | Verifies artifact persistence and post/type filtering. |
| `tests/blog-production-tool.test.ts` | Verifies QA-stage parsing, execution, and deferred-admin tool descriptors. |
| `tests/blog-article-production-service.test.ts` | Verifies orchestration order and persistence of QA artifacts in the full production path. |

---

## Tasks

### 1. Add a normalized article QA contract

Create explicit contracts for structured article review and revision.

Required types:

- `BlogQaSeverity`
- `BlogQaFinding`
- `BlogQaReport`
- `ResolvedBlogArticle`

Minimum contract capabilities:

- represent normalized review findings with stable ids
- constrain severity to `low`, `medium`, or `high`
- separate article content from QA report content
- preserve a revision summary after QA resolution

Keep these types in the core article-pipeline contract rather than embedding them directly inside a tool file.

Verify:

- add focused stage-contract coverage such as `tests/blog-production-tool.test.ts`
- run `npm exec vitest run tests/blog-production-tool.test.ts`

### 2. Add the first article QA and QA-resolution adapter

Implement the article-stage model using Anthropic with normalized JSON-only responses.

Suggested file:

- `src/adapters/AnthropicBlogArticlePipelineModel.ts`

Implementation requirements:

- review structured articles for clarity, structure, restraint, accessibility, and usefulness
- return `{ approved, summary, findings }` for QA reviews
- revise articles against a normalized QA report and return `{ title, description, content, resolutionSummary }`
- reject malformed or incomplete JSON responses
- normalize string fields and reject empty critical values

The adapter should not persist artifacts directly and should not create blog posts itself.

Verify:

- add focused adapter coverage when practical
- run `npm run typecheck`

### 3. Add the artifact persistence model

Create a dedicated persistence model for production artifacts rather than overloading the post row.

Required assets:

- `BlogPostArtifact`
- `BlogPostArtifactSeed`
- `BlogPostArtifactRepository`
- `BlogPostArtifactDataMapper`
- `blog_post_artifacts` table and indexes

Implementation requirements:

- persist `payload_json` as serialized JSON
- keep artifact persistence separate from `BlogPostRepository`
- support listing artifacts by post and by post plus artifact type
- keep the artifact-type vocabulary explicit and stable

Initial artifact types for Sprint 2:

- `article_generation_prompt`
- `article_generation_result`
- `article_qa_report`
- `article_qa_resolution`

Verify:

- add focused repository tests such as `tests/blog-post-artifact-repository.test.ts`
- run `npm exec vitest run tests/blog-post-artifact-repository.test.ts`

### 4. Extend the production service with QA and artifact behavior

Add review and resolution methods to the article production service and use the artifact repository during full production runs.

Suggested file:

- `src/lib/blog/blog-article-production-service.ts`

Implementation requirements:

- expose `reviewArticle()` and `resolveQa()` stage methods
- preserve the normalized QA report contract across service boundaries
- persist QA report and QA resolution artifacts during the full production path
- keep standalone stage methods reusable for tools and orchestration
- preserve deterministic stage sequencing when used through orchestration

Current implementation note:

- standalone QA-stage persistence requires `post_id`; direct post-targeted resolution now preserves the supplied QA report as well as the resolution output, and full orchestration continues to persist the full artifact trail automatically

Verify:

- add focused service tests such as `tests/blog-article-production-service.test.ts`
- run `npm exec vitest run tests/blog-article-production-service.test.ts`

### 5. Add discrete deferred tools for article QA stages

Expose QA and QA-resolution as first-class admin tools.

Required files expected to change:

- `src/core/use-cases/tools/blog-production.tool.ts`
- `src/lib/chat/tool-composition-root.ts`
- `scripts/process-deferred-jobs.ts`

Tool requirements:

- `qa_blog_article` accepts `title`, `description`, `content`, and optional `post_id`
- `resolve_blog_article_qa` accepts `title`, `description`, `content`, a normalized `qa_report`, and optional `post_id`
- both tools validate required strings and structured QA payloads before execution
- both tools are `ADMIN`-only and `deferred`
- worker handlers execute both tools through the shared deferred-job system

Verify:

- add focused tool tests such as `tests/blog-production-tool.test.ts`
- run `npm exec vitest run tests/blog-production-tool.test.ts tests/tool-registry.integration.test.ts`

### 6. Preserve manual editorial flows and artifact isolation

Sprint 2 must not regress the existing direct-persistence workflow.

Implementation requirements:

- `draft_content` and `publish_content` remain valid manual editorial paths
- artifact persistence remains isolated from the public blog route surface
- no artifact data is duplicated into `blog_posts`
- QA-stage additions do not widen the public-serving rules introduced in Sprint 0

Verify:

- run `npm exec vitest run tests/tool-registry.integration.test.ts tests/sprint-7-blog-pipeline.test.ts`

---

## Positive, Negative, And Edge-Case Test Matrix

### Positive tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| P1 | run `qa_blog_article` against a structured article | the service returns a normalized QA summary and findings list |
| P2 | run `resolve_blog_article_qa` with a normalized report | the service returns revised article content and a `resolutionSummary` |
| P3 | persist multiple artifacts for one post | artifact rows round-trip and remain queryable by post id |
| P4 | filter artifacts by post and artifact type | only matching artifacts are returned |
| P5 | run the full production path with QA findings present | QA report and QA resolution artifacts are persisted alongside the rest of the production trail |

### Negative tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| N1 | `qa_blog_article` receives a payload missing article fields | parsing fails before service execution |
| N2 | `resolve_blog_article_qa` receives a missing or non-object `qa_report` | parsing fails before service execution |
| N3 | a QA finding has missing required fields | normalization rejects the malformed finding |
| N4 | the model returns malformed JSON | the Anthropic adapter fails closed instead of silently producing partial artifacts |
| N5 | artifact persistence is attempted for an unknown post id | foreign-key protection rejects the insert |

### Edge-case tests

| ID | Test | Expected outcome |
| --- | --- | --- |
| E1 | a QA report contains no findings | the normalized contract remains valid with an empty findings array |
| E2 | `approved` is true but findings still exist | the normalized report still preserves the findings payload exactly as returned |
| E3 | a production run yields no QA findings | the later orchestration path may use the original article content and emit a no-op resolution summary |
| E4 | artifact payloads include nested JSON structures | repository serialization and hydration preserve the payload shape |
| E5 | standalone QA-stage tools are executed without orchestration | results are returned, and artifacts persist when `post_id` is provided |

Coverage note:

- P1-P5, N1-N5, and E1-E5 are covered by the current focused suite, including direct standalone resolution persistence.

---

## Completion Checklist

- [x] normalized article QA and QA-resolution contracts added
- [x] Anthropic-backed article pipeline adapter added
- [x] `blog_post_artifacts` entity, repository port, and data mapper added
- [x] artifact schema and indexes added
- [x] production service exposes review and resolution stages
- [x] `qa_blog_article` deferred admin tool added
- [x] `resolve_blog_article_qa` deferred admin tool added
- [x] tool-registry and worker wiring added for QA stages
- [x] focused verification commands pass

Focused verification run for this QA pass:

- `npm exec vitest run src/adapters/AnthropicBlogArticlePipelineModel.test.ts tests/blog-post-artifact-repository.test.ts tests/blog-production-tool.test.ts tests/blog-article-production-service.test.ts tests/tool-registry.integration.test.ts`

## QA Deviations

- Sprint 2 acceptance criteria are materially satisfied.
- Additional post-sprint work now exists on top of the Sprint 2 foundation:
  - image-prompt generation as an adjacent article stage
  - full deterministic `produce_blog_article` orchestration
  - chat-native orchestration progress labels and final result actions
- These additions extend the platform beyond Sprint 2 scope but do not weaken or bypass the Sprint 2 QA-stage, artifact-model, or deferred-tool contract.
