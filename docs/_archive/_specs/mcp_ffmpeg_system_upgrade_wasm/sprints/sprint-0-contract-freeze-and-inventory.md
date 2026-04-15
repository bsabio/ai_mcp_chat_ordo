# Sprint 0 - Contract Freeze And Inventory

> **Status:** Draft
> **Goal:** Freeze the real capability inventory, first-pass chat-surface classification, browser-runtime defaults, and replay-snapshot budgets before new card, progress, or FFmpeg implementation work begins.
> **Spec refs:** `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md` §1.2, §2.8 through §2.13, §3.2 through §3.4, §3.7, §3.10 through §3.13, §5, §6, §8
> **Prerequisite:** None

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md` | Canonical converged contract for capability presentation, transcript durability, progress UX, browser runtime, and FFmpeg routing |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/README.md` | Current sprint order and dependency graph |
| `src/frameworks/ui/chat/registry/default-tool-registry.ts` | Current set of tools with explicit custom-card renderers |
| `src/lib/jobs/job-capability-registry.ts` | Current deferred editorial capability registry and job-governance truth |
| `src/core/tool-registry/ToolDescriptor.ts` | Core execution contract for inline versus deferred tools |
| `src/core/use-cases/tools/admin-content.tool.ts` | Deferred editorial tool descriptors for `draft_content` and `publish_content` |
| `src/core/use-cases/tools/blog-production.tool.ts` | Deferred editorial pipeline tools such as `compose_blog_article` and `produce_blog_article` |
| `src/core/use-cases/tools/blog-image.tool.ts` | Deferred blog-image generation tool |
| `src/core/use-cases/tools/journal-query.tool.ts` | Inline journal query tools including `get_journal_workflow_summary` |
| `src/core/use-cases/tools/journal-write.tool.ts` | Journal mutation tools and deferred publish-readiness check |
| `src/core/use-cases/tools/user-profile.tool.ts` | Current self-service profile and referral tools |
| `src/core/use-cases/tools/affiliate-analytics.tool.ts` | Signed-in and admin affiliate analytics tools |
| `src/core/use-cases/tools/deferred-job-status.tool.ts` | Current job-status tools that should remain jobs/admin surfaces by default |
| `src/core/use-cases/tools/search-corpus.tool.ts` | Corpus search tool descriptor |
| `src/core/use-cases/tools/search-my-conversations.tool.ts` | Conversation search tool descriptor |
| `config/tools.json` | Currently empty and therefore not an authoritative inventory source |

---

## Cross-Layer Constraints

1. Sprint 0 is a contract-freeze sprint. It should not introduce new card families, new progress UI, or FFmpeg behavior.
2. Admin-only, operator-only, maintenance, and eval-oriented tools default to `chatExposed = false` unless there is an explicit product reason to surface them in chat.
3. The single active conversation model remains fixed. Sprint 0 cannot smuggle in multi-thread chat behavior while classifying tools.
4. Browser-runtime defaults and replay-snapshot budgets are locked inputs for later implementation sprints, not optional suggestions to revisit ad hoc.
5. Inventory truth must come from live tool descriptors, the current job registry, and the current custom renderer registry. `config/tools.json` is not a fallback registry because it is empty.

---

## QA Findings Before Implementation

1. Current custom-card coverage is intentionally narrow. `default-tool-registry.ts` explicitly covers chart, graph, audio, admin web search, theme inspection, profile/referral, editorial workflow, and journal workflow, but a large set of inline tools still falls through to generic rendering.
2. Deferred capability governance already exists for the editorial handlers in `src/lib/jobs/job-capability-registry.ts`, but that registry does not yet classify the larger inline chat surface.
3. The repo currently contains both explicit transcript-facing capabilities and tools that are better understood as jobs/admin/operator surfaces. Sprint 0 has to separate those before shared-card migration starts.
4. The current system already exposes `get_deferred_job_status`, `list_deferred_jobs`, `get_my_job_status`, and `list_my_jobs`. Those tools should inform progress UX and jobs surfaces, but they should not quietly become transcript defaults.
5. Journal mutations and self-service affiliate analytics exist as tool descriptors today, but they do not yet have dedicated card families. They are the clearest current examples of chat-capable tools that still need first-class presentation decisions.

---

## Task 0.1 - Freeze the audit matrix fields and first-pass inventory

**What:** Define the exact audit fields that later sprints must populate and freeze the first-pass classification of the current capability surface.

### Required audit matrix fields

| Field | Purpose | Sprint 0 source |
| --- | --- | --- |
| `toolName` | Exact MCP tool or deferred handler name | Live tool descriptors and `JOB_CAPABILITY_REGISTRY` |
| `family` | Capability family grouping | First-pass classification in this sprint |
| `executionMode` | `inline`, `deferred`, `browser`, or `hybrid` | `ToolDescriptor.executionMode` plus planned browser/hybrid overlays |
| `chatExposed` | Whether the capability should render in chat by default | Sprint 0 classification |
| `currentRendererMode` | `custom_card`, `generic_fallback`, `compatibility`, or `non_chat` | `default-tool-registry.ts` plus current behavior |
| `envelopeStatus` | `native`, `projected`, `legacy`, or `mixed` | Sprint 0 audit artifact, filled as implementation confirms payload truth |
| `progressMode` | `none`, `single`, or `phased` | Deferred-job behavior and tool-specific output shape |
| `historyMode` | `payload_snapshot` or `compatibility` | Current transcript durability path |
| `defaultSurface` | `conversation`, `jobs`, `admin`, or `global_strip` | First-pass product classification |
| `artifactKinds` | Output artifact classes such as `audio`, `chart`, `graph`, `image`, `video`, `subtitle` | Tool output and future normalized media asset model |
| `retryPolicy` | `none` or `whole_job` in chat | Job registry plus first-pass chat policy |
| `notes` | Justification, gaps, or migration comment | Sprint 0 owner note |

### First-pass classification - current custom-card transcript surfaces

| Tool | Execution | Family | chatExposed | currentRendererMode | defaultSurface | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `generate_chart` | `inline` | `artifact` | `true` | `custom_card` | `conversation` | Currently resolves to `ChartRendererCard` |
| `generate_graph` | `inline` | `artifact` | `true` | `custom_card` | `conversation` | Currently resolves to `GraphRendererCard` |
| `generate_audio` | `inline` | `artifact` | `true` | `custom_card` | `conversation` | Currently resolves to `AudioPlayerCard`; later media/runtime work builds on this |
| `admin_web_search` | `inline` | `search` | `true` | `custom_card` | `conversation` | Explicit admin-only chat exception with dedicated card |
| `inspect_theme` | `inline` | `theme` | `true` | `custom_card` | `conversation` | Current theme inspection surface |
| `get_my_profile` | `inline` | `profile` | `true` | `custom_card` | `conversation` | Current self-service profile card |
| `update_my_profile` | `inline` | `profile` | `true` | `custom_card` | `conversation` | Shares current profile card surface |
| `get_my_referral_qr` | `inline` | `profile` | `true` | `custom_card` | `conversation` | Shares current referral/profile card surface |
| `draft_content` | `deferred` | `editorial` | `true` | `custom_card` | `conversation` | Deferred editorial workflow card; progress-strip eligible later |
| `publish_content` | `deferred` | `editorial` | `true` | `custom_card` | `conversation` | Deferred editorial workflow card |
| `compose_blog_article` | `deferred` | `editorial` | `true` | `custom_card` | `conversation` | Deferred editorial workflow card |
| `qa_blog_article` | `deferred` | `editorial` | `true` | `custom_card` | `conversation` | Deferred editorial workflow card |
| `resolve_blog_article_qa` | `deferred` | `editorial` | `true` | `custom_card` | `conversation` | Deferred editorial workflow card |
| `generate_blog_image_prompt` | `deferred` | `editorial` | `true` | `custom_card` | `conversation` | Deferred editorial workflow card |
| `generate_blog_image` | `deferred` | `editorial` | `true` | `custom_card` | `conversation` | Deferred editorial workflow card backed by asset generation |
| `produce_blog_article` | `deferred` | `editorial` | `true` | `custom_card` | `conversation` | Deferred multi-step editorial pipeline; likely `phased` |
| `get_journal_workflow_summary` | `inline` | `journal` | `true` | `custom_card` | `conversation` | Current journal workflow card |
| `prepare_journal_post_for_publish` | `deferred` | `journal` | `true` | `custom_card` | `conversation` | Deferred journal readiness workflow card |

### First-pass classification - chat-exposed but still on generic or fallback rendering

| Tool | Execution | Family | chatExposed | currentRendererMode | defaultSurface | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `search_corpus` | `inline` | `search` | `true` | `generic_fallback` | `conversation` | Needs structured search-result card family |
| `search_my_conversations` | `inline` | `search` | `true` | `generic_fallback` | `conversation` | Needs conversation-search card family |
| `get_section` | `inline` | `search` | `true` | `generic_fallback` | `conversation` | Retrieval result should not stay plain text |
| `get_corpus_summary` | `inline` | `search` | `true` | `generic_fallback` | `conversation` | Summary surface still generic |
| `get_checklist` | `inline` | `system` | `true` | `generic_fallback` | `conversation` | Checklist/result receipt candidate |
| `list_practitioners` | `inline` | `search` | `true` | `generic_fallback` | `conversation` | Structured list candidate |
| `list_available_pages` | `inline` | `system` | `true` | `generic_fallback` | `conversation` | Navigation list candidate |
| `get_current_page` | `inline` | `system` | `true` | `generic_fallback` | `conversation` | Navigation-context card candidate |
| `navigate` | `inline` | `system` | `true` | `generic_fallback` | `conversation` | Action receipt candidate |
| `navigate_to_page` | `inline` | `system` | `true` | `generic_fallback` | `conversation` | Action receipt candidate |
| `calculator` | `inline` | `system` | `true` | `generic_fallback` | `conversation` | Simple result receipt candidate |
| `set_preference` | `inline` | `profile` | `true` | `generic_fallback` | `conversation` | Preference receipt candidate |
| `set_theme` | `inline` | `theme` | `true` | `generic_fallback` | `conversation` | Theme receipt candidate |
| `adjust_ui` | `inline` | `theme` | `true` | `generic_fallback` | `conversation` | Theme receipt candidate |
| `inspect_runtime_context` | `inline` | `system` | `true` | `generic_fallback` | `conversation` | Diagnostic/system card candidate |
| `get_my_affiliate_summary` | `inline` | `profile` | `true` | `generic_fallback` | `conversation` | Self-service affiliate summary needs a dedicated surface |
| `list_my_referral_activity` | `inline` | `profile` | `true` | `generic_fallback` | `conversation` | Timeline/activity card candidate |
| `list_journal_posts` | `inline` | `journal` | `true` | `generic_fallback` | `conversation` | Journal list view candidate |
| `get_journal_post` | `inline` | `journal` | `true` | `generic_fallback` | `conversation` | Journal detail card candidate |
| `list_journal_revisions` | `inline` | `journal` | `true` | `generic_fallback` | `conversation` | Revision timeline candidate |
| `update_journal_metadata` | `inline` | `journal` | `true` | `generic_fallback` | `conversation` | Editorial mutation receipt candidate |
| `update_journal_draft` | `inline` | `journal` | `true` | `generic_fallback` | `conversation` | Editorial mutation receipt candidate |
| `submit_journal_review` | `inline` | `journal` | `true` | `generic_fallback` | `conversation` | Workflow-transition receipt candidate |
| `approve_journal_post` | `inline` | `journal` | `true` | `generic_fallback` | `conversation` | Workflow-transition receipt candidate |
| `publish_journal_post` | `inline` | `journal` | `true` | `generic_fallback` | `conversation` | Workflow-transition receipt candidate |
| `restore_journal_revision` | `inline` | `journal` | `true` | `generic_fallback` | `conversation` | Revision-restore receipt candidate |
| `select_journal_hero_image` | `inline` | `journal` | `true` | `generic_fallback` | `conversation` | Asset-selection receipt candidate |

### First-pass classification - non-chat by default

| Tool | Execution | Family | chatExposed | currentRendererMode | defaultSurface | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `get_deferred_job_status` | `inline` | `system` | `false` | `non_chat` | `admin` | Admin/operator jobs surface, not transcript default |
| `list_deferred_jobs` | `inline` | `system` | `false` | `non_chat` | `admin` | Admin/operator jobs surface, not transcript default |
| `get_my_job_status` | `inline` | `system` | `false` | `non_chat` | `jobs` | Self-service jobs route truth |
| `list_my_jobs` | `inline` | `system` | `false` | `non_chat` | `jobs` | Self-service jobs route truth |
| `admin_search` | `inline` | `search` | `false` | `non_chat` | `admin` | Admin workspace search/tooling surface |
| `admin_prioritize_leads` | `inline` | `workflow` | `false` | `non_chat` | `admin` | Operator/admin decision support tool |
| `admin_prioritize_offer` | `inline` | `workflow` | `false` | `non_chat` | `admin` | Operator/admin decision support tool |
| `admin_triage_routing_risk` | `inline` | `workflow` | `false` | `non_chat` | `admin` | Operator/admin decision support tool |
| `get_admin_affiliate_summary` | `inline` | `profile` | `false` | `non_chat` | `admin` | Admin analytics summary should not quietly fall into chat |
| `list_admin_referral_exceptions` | `inline` | `profile` | `false` | `non_chat` | `admin` | Admin exception-review surface |

### Task 0.1 outcomes

1. No later sprint may treat an unlisted capability as implicitly covered.
2. Any new tool or deferred handler added after Sprint 0 must first gain a matrix row.
3. The first-pass tables above become the baseline that later implementation sprints refine, not a suggestion to re-inventory from scratch.

---

## Task 0.2 - Lock browser runtime defaults before implementation

**What:** Freeze the default policy values for browser-local execution so later WASM work does not reopen operational questions during UI implementation.

### Browser runtime defaults

1. Default active browser-local concurrency: `maxConcurrentExecutions = 1`.
2. Default browser-runtime queue policy: FIFO with at most 2 pending local executions per tab beyond the active slot.
3. Default hybrid-capability fallback policy: `fallbackPolicy = "server"`.
4. Default hybrid-capability interruption recovery: `recoveryPolicy = "fallback_to_server"`.
5. Browser-only capabilities must opt in explicitly with `fallbackPolicy = "fail"` and `recoveryPolicy = "fail_interrupted"`.
6. Default v1 browser-media input budget: `maxInputBytes = 32 MiB` unless a narrower cap is declared.
7. Default v1 browser-media duration cap: `maxDurationSeconds = 30` unless a narrower cap is declared.
8. Admission-control overflow must reroute to the server when a valid server route exists; otherwise it must fail explicitly and visibly.

### Task 0.2 outcomes

1. Browser-runtime implementation starts from one policy baseline instead of per-capability improvisation.
2. Hybrid versus browser-only behavior is explicit in the registry and audit artifact.
3. Any capability that overrides these defaults must record an owner and justification in the audit matrix.

---

## Task 0.3 - Lock replay-snapshot budget rules before implementation

**What:** Freeze the size and content rules for transcript replay so payload-first durability does not turn the transcript store into a blob store.

### Replay snapshot defaults

1. `replaySnapshot` must be JSON-serializable and may not contain raw binary, base64 blobs, or full document bodies.
2. Default serialized `replaySnapshot` target budget: 12 KiB.
3. Hard `replaySnapshot` max without an explicit audit exception: 24 KiB.
4. Default serialized persisted-envelope target budget, excluding externalized artifacts: 48 KiB.
5. Hard persisted-envelope max without an explicit audit exception: 64 KiB.
6. Collection previews inside `replaySnapshot` cap at 10 visible items and must report omitted counts.
7. Free-text preview fields inside `replaySnapshot` cap at 500 visible characters per field.
8. Over-budget detail must move into artifact refs or drill-in surfaces rather than transcript payloads.

### Task 0.3 outcomes

1. Historical transcript playback stays legible without becoming a retention sink for heavyweight payload detail.
2. Capability cards can rely on small replay-safe data while larger payloads move into governed artifact storage.
3. Budget exceptions become deliberate product decisions instead of accidental growth.

---

## Sprint 0 Verification Bundle

Before marking Sprint 0 complete, verify:

```bash
npx vitest run tests/tool-plugin-registry.test.tsx tests/full-registry-coverage.test.ts src/frameworks/ui/chat/plugins/custom/EditorialWorkflowCard.test.tsx src/frameworks/ui/RichContentRenderer.test.tsx
npm run build
```

And keep markdown diagnostics clean in:

1. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md`
2. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/README.md`
3. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/sprint-0-contract-freeze-and-inventory.md`

---

## Completion Checklist

- [ ] the audit matrix fields are fixed and documented
- [ ] every currently known transcript-facing tool has a first-pass classification row
- [ ] admin/operator/jobs surfaces are explicitly marked `chatExposed = false` by default
- [ ] browser-runtime defaults are locked before implementation
- [ ] replay-snapshot budget rules are locked before implementation
- [ ] budget and policy exceptions require explicit audit ownership
- [ ] markdown diagnostics are clean in all touched docs

---

## Sprint 0 Exit Criteria

Sprint 0 is complete only when the repository has one authoritative answer to all of the following:

1. which current capabilities are transcript-first versus non-chat by default
2. which current tools already have dedicated custom-card coverage
3. which current tools still depend on generic or fallback rendering
4. what the default browser-runtime policy is for local WASM execution
5. what the replay-snapshot and envelope budgets are for durable transcript playback

If later sprints still need to rediscover any of those answers from scattered code, Sprint 0 is not complete.
