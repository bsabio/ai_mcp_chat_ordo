# Blog Article Production Pipeline — Native Article, QA, And Image Toolchain

> **Status:** Draft v0.1
> **Date:** 2026-03-25
> **Scope:** Add a native, in-system blog article production pipeline that composes discrete MCP tools and internal services for article drafting, article QA, QA resolution, hero-image prompt generation, hero-image generation, and final draft persistence. The first implementation focus is blog hero-image generation, but the architecture must support full article orchestration.
> **Dependencies:** [Tool Architecture](../tool-architecture/spec.md), [Tool Manifest](../tool-manifest/spec.md), [Deferred Job Orchestration](../deferred-job-orchestration/spec.md), [Platform V1](../platform-v1/spec.md)
> **Affects:** `src/core/use-cases/tools/`, `src/lib/chat/tool-composition-root.ts`, blog persistence and rendering, file or asset storage, worker orchestration, and public blog asset delivery.
> **Motivation:** The current blog feature only persists markdown drafts and publishes them. It cannot natively generate article imagery, run structured LLM QA, resolve QA findings, or preserve pipeline artifacts such as generation prompts and image prompts. The system needs an internal media-and-article pipeline rather than relying on external CLI tooling.
> **Requirement IDs:** `BAPP-001` through `BAPP-099`

---

## 1. Problem Statement

### 1.1 Current state

Studio Ordo currently has a minimal blog workflow: `draft_content` persists a markdown draft and `publish_content` publishes it. That is sufficient for manual content entry but not for a native AI-assisted editorial pipeline. `[BAPP-001]`

### 1.2 Verified issues

| # | Issue | Evidence | Impact |
| --- | --- | --- | --- |
| 1 | **No native article-production pipeline** | `src/core/use-cases/tools/admin-content.tool.ts` only exposes `draft_content` and `publish_content`. | The system cannot generate, review, repair, and enrich content natively. |
| 2 | **No hero-image generation path** | There is no image-generation tool or service in the app runtime; OpenAI usage exists for web search and TTS only. | Blog articles cannot be enriched with generated hero media. |
| 3 | **No place to store article-production artifacts** | `blog_posts` stores title, description, content, and publish metadata only. | Prompt provenance, QA reports, and image prompts would be lost or stuffed into the wrong table. |
| 4 | **Current user-file serving is private** | `src/app/api/user-files/[id]/route.ts` enforces ownership checks. | Generated media stored as private user files cannot be used directly for public blog posts. |
| 5 | **Current user-file domain model is not image-oriented** | `src/core/entities/user-file.ts` only supports `audio`, `chart`, and `document` file types. | Reusing `user_files` for blog hero images would require expanding a private attachment model beyond its intended scope. |
| 6 | **No structured QA pass or QA-resolution stage** | The current workflow assumes manual admin review only. | The system cannot automatically evaluate article quality and repair issues before draft persistence. |
| 7 | **No discrete tool composition for article production** | Tool registration supports discrete tools, but article production currently has no stage-oriented tool set. | The blog feature risks collapsing into a monolithic god tool instead of reusable MCP stages. |

### 1.3 Root cause

The blog implementation shipped as a persistence feature, not as a production pipeline. The architecture now needs to separate:

1. low-level post persistence
2. article-generation stages
3. public media asset delivery
4. orchestration across those stages

`[BAPP-002]`

### 1.4 Why it matters

Without a native article-production system:

- blog content remains text-only unless authors manually source imagery
- image generation cannot benefit from platform-native storage, RBAC, or deferred jobs
- QA findings cannot be preserved or replayed
- future migration of external CLI-based capabilities into the platform will remain ad hoc
- the blog feature will not serve as a reusable pattern for future native creative tools

This spec treats blog hero images as the first implementation priority, but it deliberately designs for a broader native article-production system built from discrete MCP tools and internal services. `[BAPP-003]`

---

## 2. Design Goals

1. **Native over wrapper.** The platform should implement article production internally rather than shelling out to external CLI tools. `[BAPP-010]`
2. **Discrete tool stages.** Article generation, QA, QA resolution, image-prompt generation, and image generation must be modeled as separate MCP-capable stages. `[BAPP-011]`
3. **Deterministic orchestration.** The platform may expose one orchestration tool, but orchestration must call verified internal stages in a fixed order rather than rely on emergent LLM behavior. `[BAPP-012]`
4. **Image-first delivery.** The first implementation must focus on hero-image generation for blog posts while preserving compatibility with the larger staged pipeline. `[BAPP-013]`
5. **Artifact preservation.** The system must retain prompts, QA reports, resolutions, generation parameters, and image metadata as first-class artifacts. `[BAPP-014]`
6. **Public-blog-safe media.** Generated blog media must be served publicly only when attached to published blog posts or otherwise explicitly marked public. `[BAPP-015]`
7. **Deferred by default for heavy stages.** Long-running generation stages should use the existing deferred-jobs architecture. `[BAPP-016]`
8. **RBAC and ownership safety.** Only authorized roles may generate, review, modify, attach, or publish article assets. `[BAPP-017]`
9. **Provider abstraction.** The platform should expose an internal image-generation service that starts with OpenAI `gpt-image-1` but does not hardwire the entire product to one provider surface. `[BAPP-018]`
10. **Editorial traceability.** A published post should be traceable back to its generation artifacts and QA stages. `[BAPP-019]`

---

## 3. Architecture

### 3.1 System boundaries

The article-production feature is composed of four layers:

1. **Low-level content persistence**
   - `draft_content`
   - `publish_content`
2. **Stage services**
   - article generation
   - article QA
   - QA resolution
   - image-prompt generation
   - image generation
3. **Discrete MCP tools**
   - each stage exposed as its own tool descriptor
4. **Optional orchestration tool**
   - a deferred tool that executes the full production path deterministically

This keeps persistence, generation, and orchestration from collapsing into one tool. `[BAPP-031]`

### 3.2 Recommended tool inventory

The target tool set is:

| Tool | Responsibility | Execution mode |
| --- | --- | --- |
| `draft_content` | Persist a supplied draft post | Deferred or inline-compatible existing path |
| `publish_content` | Publish a persisted draft | Deferred existing path |
| `compose_blog_article` | Generate title, description, and markdown draft from a brief | Deferred |
| `qa_blog_article` | Run structured editorial QA against a draft article | Deferred |
| `resolve_blog_article_qa` | Revise a draft using QA findings | Deferred |
| `generate_blog_image_prompt` | Produce a hero-image prompt and alt text from a final article | Inline or deferred |
| `generate_blog_image` | Generate and persist a hero image asset | Deferred |
| `produce_blog_article` | Orchestrate article generation, QA, resolution, image prompt, image generation, and final draft persistence | Deferred |

`draft_content` and `publish_content` remain low-level tools. The new tools add production stages above them rather than replacing them. `[BAPP-032]`

### 3.3 Internal service layer

The runtime should add internal services with stable contracts. Suggested service names:

- `BlogArticleGenerationService`
- `BlogArticleQaService`
- `BlogArticleQaResolutionService`
- `BlogImagePromptService`
- `BlogImageGenerationService`
- `BlogArticleProductionOrchestrator`

These services are not required to map one-to-one with files immediately, but the logical separation should be preserved in implementation. `[BAPP-033]`

### 3.4 Blog asset model

The platform must distinguish between **private generated files** and **public blog assets**.

Current `user_files` behavior is ownership-gated and private. That is appropriate for chat attachments and TTS, but not for published blog hero images.

The system should add a public-blog-safe asset model, either via:

1. a dedicated `blog_assets` table
2. or a broader future public-asset abstraction with a blog-specific adapter

Initial recommended table:

```sql
CREATE TABLE IF NOT EXISTS blog_assets (
  id TEXT PRIMARY KEY,
  post_id TEXT DEFAULT NULL,
  kind TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER DEFAULT NULL,
  height INTEGER DEFAULT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  source_prompt TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT 'openai',
  provider_model TEXT NOT NULL DEFAULT 'gpt-image-1',
  visibility TEXT NOT NULL DEFAULT 'draft',
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);
```

`visibility` should support at minimum:

- `draft`
- `published`

`[BAPP-034]`

### 3.5 Blog post extensions

The `blog_posts` table and corresponding domain entity should gain a canonical hero-image linkage field at minimum:

- `hero_image_asset_id`

Hero-image alt text should remain sourced from the linked asset record so the system keeps one authoritative copy of media metadata. This allows the post model to reference a canonical hero image without embedding duplicate asset payload in the main content row. `[BAPP-035]`

### 3.6 Artifact preservation model

Article production must preserve artifact history separately from the main blog post row.

Recommended table:

```sql
CREATE TABLE IF NOT EXISTS blog_post_artifacts (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);
```

Initial artifact types:

- `article_generation_prompt`
- `article_generation_result`
- `article_qa_report`
- `article_qa_resolution`
- `hero_image_prompt`
- `hero_image_generation_result`

This preserves provenance without bloating `blog_posts`. `[BAPP-036]`

### 3.7 Public asset delivery

The app must add a public-serving path for blog assets that is distinct from the private `user_files` route.

Canonical route form:

- `/api/blog/assets/[id]`

Behavior requirements:

1. if the asset belongs to a published post, it is publicly fetchable
2. if the asset belongs to a draft post, it is restricted to an authorized user
3. metadata generation and page rendering should use this public-safe asset path rather than the private user-file route
4. the route must resolve persisted asset IDs only and never expose raw storage paths

`[BAPP-037]`

### 3.7.1 Relationship to `user_files`

Sprint 0 should **not** widen the existing `user_files` model into a public blog-asset transport. `user_files` remains the private attachment and generated-file store for chat- and user-owned artifacts. Blog hero images should be modeled separately so public delivery rules, metadata, and publication state do not leak into the private attachment subsystem. `[BAPP-037A]`

### 3.8 Image-generation service contract

The native image-generation service must support the following provider-facing concepts because they are core to the desired `gpt-image-1` workflow:

- prompt enhancement
- input prompt preservation
- final prompt preservation
- size selection
- quality selection
- preset or strategy selection
- binary image persistence
- generated image metadata

Suggested request shape:

```typescript
interface BlogImageGenerationRequest {
  prompt: string;
  size: "1024x1024" | "1536x1024" | "1024x1536" | "auto";
  quality: "low" | "medium" | "high" | "auto";
  preset?: "portrait" | "landscape" | "square" | "hd" | "artistic";
  enhancePrompt?: boolean;
}
```

Suggested response shape:

```typescript
interface BlogImageGenerationResult {
  assetId: string;
  mimeType: string;
  width?: number;
  height?: number;
  originalPrompt: string;
  finalPrompt: string;
  provider: "openai";
  model: "gpt-image-1";
}
```

The implementation may begin with OpenAI only, but the service contract should stay provider-neutral. `[BAPP-038]`

### 3.9 Image heuristics

The first implementation should reproduce the most valuable native-image behavior rather than blindly exposing provider parameters.

Recommended heuristics:

- use `1536x1024` for broad scene or editorial hero imagery
- use `1024x1536` for portrait or person-centric compositions
- use `1024x1024` for neutral or ambiguous prompts
- default to `high` quality for final article hero images
- preserve `auto` as a platform-level decision path, not an unexplained pass-through

Prompt enhancement should be explicit, persisted, and auditable. `[BAPP-039]`

### 3.10 Article orchestration order

If the orchestration tool is used, the stage order should be fixed as:

1. generate article draft
2. run article QA
3. resolve QA findings
4. generate hero-image prompt from the final article
5. generate hero image
6. persist the final draft with linked hero asset and stored artifacts

This order prevents image generation from running against unstable content and makes retries more precise. `[BAPP-040]`

### 3.11 Chat and deferred-job integration

Heavy stages should use the deferred-jobs system, with clear status labels such as:

- `Composing article`
- `Reviewing article`
- `Resolving QA findings`
- `Designing hero image prompt`
- `Generating hero image`
- `Saving draft`

The job result payload for a successful orchestration run should include:

- post id
- post slug
- title
- image asset id if present
- summary of completed stages

This preserves the existing chat-native deferred-job UX. `[BAPP-041]`

### 3.12 Sprint 0 boundary

Sprint 0 is intentionally limited to the asset and public-delivery foundation. It should not yet implement OpenAI image generation, article QA, or full article orchestration. The goal is to establish the storage, public-serving, and rendering contract that later image-generation stages will attach to. `[BAPP-042]`

---

## 4. Security And Access

1. **Admin-only generation surface.** Article-generation, QA, QA-resolution, and image-generation tools should be `ADMIN`-only in the initial release. `[BAPP-050]`
2. **Prompt and artifact privacy for drafts.** Draft-stage artifacts must not be publicly exposed before publication. `[BAPP-051]`
3. **Published media safety.** Only assets explicitly linked to published posts may be served publicly. `[BAPP-052]`
4. **Provider-key safety.** OpenAI keys must remain server-side and never be exposed to the browser. `[BAPP-053]`
5. **Input validation.** Prompt, title, markdown, and QA-payload inputs must be validated before any provider call or persistence step. `[BAPP-054]`
6. **Content policy enforcement.** Existing blog content safety rules must continue to apply to generated and revised article content. `[BAPP-055]`
7. **Path safety.** Public asset routes must resolve only persisted asset identifiers, never arbitrary filesystem paths. `[BAPP-056]`

---

## 5. Testing Strategy

### 5.1 Unit tests

| Area | Estimated count | What is tested |
| --- | --- | --- |
| Image heuristic selection | 8 | prompt-to-size and quality decisions |
| Prompt enhancement logic | 6 | original vs enhanced prompt behavior |
| QA report normalization | 6 | structured QA outputs and severity handling |
| Artifact serialization | 6 | payload persistence shapes |
| Tool descriptor coverage | 8 | RBAC, execution mode, schema shapes |

### 5.2 Integration tests

| Area | Estimated count | What is tested |
| --- | --- | --- |
| Blog asset persistence | 6 | asset row creation and post linkage |
| Public-vs-draft asset delivery | 6 | route access control and serving rules |
| Image-generation service | 5 | OpenAI response handling and file persistence |
| Orchestrator stage ordering | 6 | article -> QA -> resolution -> image prompt -> image -> save |
| Artifact preservation | 5 | prompts and QA payloads attached to post |

### 5.2.1 Sprint 0 verification categories

Sprint 0 must explicitly include:

- **Positive tests** for valid asset creation, post linkage, and published-asset delivery
- **Negative tests** for unauthorized draft-asset access, missing assets, and invalid linkage attempts
- **Edge-case tests** for published posts with no hero asset, assets detached from posts, and posts transitioning from draft to published visibility

`[BAPP-061]`

### 5.3 Browser and runtime tests

| Area | Estimated count | What is tested |
| --- | --- | --- |
| Blog page hero rendering | 4 | index and post page hero-image rendering |
| Deferred article job UI | 4 | stage summaries and final draft result |
| Public asset fetch behavior | 3 | published readers can load hero assets |

### 5.4 Existing test preservation

The existing `draft_content` and `publish_content` flows must remain green for manual editorial use cases. The new pipeline must extend the blog feature, not regress the current direct-persistence behavior. `[BAPP-060]`

---

## 6. Sprint Plan

| Sprint | Name | Goal | Estimated tests |
| --- | --- | --- | --- |
| **0** | **Asset Model And Public Delivery** | Add blog asset persistence, public-serving route, and blog post hero-image linkage fields. | +18 |
| **1** | **Native Image Generation** | Add `BlogImageGenerationService`, image-prompt generation, and `generate_blog_image` tool support. | +18 |
| **2** | **Article QA Stages** | Add `qa_blog_article` and `resolve_blog_article_qa` plus artifact persistence. | +16 |
| **3** | **Article Orchestration Tool** | Add `produce_blog_article` and deterministic staged execution through deferred jobs. | +14 |
| **4** | **Blog Rendering And Hardening** | Add hero-image rendering, metadata integration, retries, and browser/runtime hardening. | +14 |
| **5** | **Editorial Image Variations And Selection** | Add candidate hero-image variations, admin-only selection workflows, and canonical-hero switching without widening public exposure. | +16 |
| **6** | **Deferred Job Clarity And Blog Operator UX** | Add explicit deferred-job status and listing surfaces, deterministic completion delivery into chat, and publish-ready operator actions for blog jobs. | +18 |

---

## 7. Future Considerations

1. Broaden the asset model from blog-only media into a shared public-media abstraction.
2. Extend the initial image-variation and editorial-selection workflow beyond the blog use case after Sprint 5 ships.
3. Support non-blog content outputs such as landing pages, case studies, and downloadable collateral.
4. Add provider pluggability for image generation after the OpenAI-first path is stable.
5. Add staff-facing or apprentice-facing generation roles later if policy allows it.
6. Extend the orchestration system to support fully native replacements for other external creative CLI workflows over time.
