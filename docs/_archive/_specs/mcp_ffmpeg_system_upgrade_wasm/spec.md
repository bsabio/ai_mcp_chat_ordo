# MCP + FFmpeg System Upgrade (Hybrid WASM)

> **Status:** Draft v0.1
> **Date:** 2026-04-10
> **Scope:** Converge chat-exposed MCP capability presentation, capability audit closure, multi-step job UX, shared card primitives, chat chrome simplification, and hybrid browser/server FFmpeg media generation into one payload-first system.
> **Consolidation:** This feature package absorbs the former standalone FFmpeg planning so there is one canonical source of truth for MCP, cards, jobs, and media generation.
> **Dependencies:** [Tool Architecture](../tool-architecture/spec.md), [Deferred Job Orchestration](../deferred-job-orchestration/spec.md), [Job Visibility And Control](../job-visibility-and-control/spec.md), [Job Operations And Resilience](../job-operations-and-resilience/spec.md), [Chat Experience](../chat-experience/spec.md), [Floating Chat Visual Authority](../floating-chat-visual-authority/spec.md), [Shell Navigation And Design System](../shell-navigation-and-design-system/spec.md)
> **Affects:** `src/core/tool-registry/**`, `src/lib/jobs/**`, `src/frameworks/ui/chat/**`, `src/frameworks/ui/ChatContentSurface.tsx`, `src/frameworks/ui/ChatConversationToolbar.tsx`, `src/frameworks/ui/ChatSurfaceHeader.tsx`, `src/frameworks/ui/ChatInput.tsx`, `src/hooks/useGlobalChat.tsx`, `src/hooks/chat/useChatJobEvents.ts`, `src/core/use-cases/ConversationInteractor.ts`, `src/core/use-cases/SummarizationInteractor.ts`, `src/app/api/chat/uploads/route.ts`, `src/app/api/tts/route.ts`, future browser worker and media execution modules, and related tests and QA scripts.
> **Requirement IDs:** `MFW-001` through `MFW-199`

---

## 1. Problem Statement

### 1.1 Verified strengths to preserve

The current platform already has the right foundational seams. This feature does
not replace them; it converges them.

1. `ToolDescriptor` already supports `executionMode?: "inline" | "deferred"`
   and deferred policy metadata, so the execution contract does not need to be
   reinvented.
2. `JOB_CAPABILITY_REGISTRY` already carries execution principal, retry policy,
   recovery mode, retention mode, and artifact policy. Governance exists.
3. `useChatJobEvents` already reconciles `/api/chat/jobs` snapshots and listens
   to `/api/chat/events`, so the transcript already has a durable job event path.
4. `default-tool-registry.ts` and `ToolPluginPartRenderer.tsx` already prove the
   registry-driven card approach works for charts, graphs, audio, editorial,
   journal, web-search, and a fallback path.
5. `ThemeProvider` and the theme runtime already support multiple themes,
   density, dark mode, and accessibility settings. The theme system is stronger
   than the external design-system repo and should remain authoritative.
6. `useGlobalChat.tsx` and `ConversationInteractor` already encode a single
   active conversation model. `ConversationInteractor` archives the existing
   active conversation before creating a new one, and summarization already
   exists via `SummarizationInteractor`.

### 1.2 Verified gaps this spec owns

| Area | Verified current behavior | Gap this spec closes |
| --- | --- | --- |
| Capability presentation | Execution metadata lives in `ToolDescriptor` and `JOB_CAPABILITY_REGISTRY`, while UI rendering lives in `default-tool-registry.ts` and tool-specific cards. | There is no single presentation contract describing family, card kind, progress model, history strategy, artifact outputs, and allowed transcript actions for every chat-exposed capability. |
| Result payloads | Some tools render from `toolCall.result`, some fall back to `toolCall.args`, and job projection heuristics infer titles and summaries from tool-specific payload shapes. | There is no unified immutable result envelope for inline tools, deferred jobs, transcript playback, and historical rendering. |
| Progress UX | `JobStatusMessagePart` supports `progressPercent`, `progressLabel`, `summary`, and terminal states, but progress is rendered inside each card only. | The system lacks phase-level progress and a global progress strip above the composer with stoplight-dot affordances. |
| Composer and header chrome | `ChatContentSurface.tsx` still mounts `ChatConversationToolbar` directly above the composer; `ChatSurfaceHeader.tsx` only exposes fullscreen/minimize controls. | Conversation export/import/data actions still consume composer space instead of living in a header-level user-data menu. |
| Card system | Rich custom cards exist for a subset of tools, but the visual language is uneven and many capabilities still degrade to the generic fallback card. | The platform needs shared semantic card primitives that borrow the external design system's composition strengths without replacing Ordo's theme runtime. |
| Capability audit coverage | There is no repo-level matrix covering every chat-exposed MCP tool, deferred job family, and compatibility renderer with its execution mode, renderer owner, envelope status, progress model, and history path. | The rollout needs an explicit audit and coverage contract so no capability stays half-migrated or silently degrades through the wrong UI path. |
| System cards | `JobStatusFallbackCard` and `ErrorCard` exist, but system-level fallback, compatibility, progress, and drill-in surfaces are not yet a coherent family. | The system needs first-class shared system cards and drill-in surfaces so fallback, failure, compatibility, and progress states feel intentional rather than accidental. |
| Transcript durability | Completed payload snapshots now render better than before, but historical compatibility still depends on mixed legacy paths. | All chat-exposed capabilities need payload-first, immutable, no-refetch transcript rendering with explicit compatibility adapters only where unavoidable. |
| Media generation | `generate_audio` plus `/api/tts` already produce audio, and chart/graph cards already render structured visuals. | There is no normalized media asset contract, no subtitle timing contract, no video composition model, and no FFmpeg execution router. |
| Media ingest | `/api/chat/uploads/route.ts` currently accepts PDF, plain text, and image MIME types only. | Media workflows need governed audio/video ingestion or a dedicated media ingest path, plus stable references to generated assets. |
| Browser-side execution | Browser-local work is currently implied only by the FFmpeg direction, and there is no shared worker or WASM capability runtime. | The platform needs a reusable browser-side capability runtime for bounded client execution, capability probes, progress, cancellation, asset staging, and clean fallback to server execution. |
| FFmpeg planning | The old FFmpeg note assumed a backend-only deferred job and even suggested `framer-motion`. | The platform now needs a hybrid model: browser-local FFmpeg WASM as the preferred path for simple local transforms, with deferred server fallback for heavier work. |

### 1.3 Why this feature exists

The product direction is now clear:

1. The MCP system should feel like one coherent operating surface, not a
   collection of unrelated custom cards and fallback boxes.
2. Long-running work should be visible globally without turning the transcript
   into an operations console.
3. Conversation chrome should prioritize the work itself, not toolbar clutter.
4. The product should remain single-threaded at the active conversation level.
5. FFmpeg and media generation should not be bolted on as a separate subsystem;
   they should inherit the same capability contract, card system, progress UX,
   and transcript durability rules as every other chat-exposed tool.
6. Browser-side WASM work should become a reusable platform capability for
   bounded local compute, with FFmpeg as the first major consumer rather than a
   one-off exception.

---

## 2. Design Goals

1. **One presentation contract per capability.** Every chat-exposed tool or
   deferred job must declare how it presents, progresses, retries, and replays.
2. **Payload-first durability.** Live rendering and historical transcript
   playback must render from immutable payload snapshots, not live refetches.
3. **Shared card language.** Capabilities should differ by family and content,
   not by one-off structural markup.
4. **Global progress without chrome bloat.** Multi-step work should surface in a
   hidden-by-default strip above the composer, not only inside transcript cards.
5. **Retry-whole-job only in v1.** Restart behavior should be explicit and
   limited to whole-job retry where policy allows it.
6. **Single active conversation remains the product model.** Archive,
   summarization, import, and export support that model; they do not replace it.
7. **Theme runtime stays authoritative.** Borrow semantic surface and
   composition ideas from the external design system, but do not transplant its
   palette, typography, or theme state model.
8. **Reusable browser execution substrate.** Browser-side WASM or worker
   compute should run through one governed capability runtime so FFmpeg is the
   first consumer, not a special case.
9. **Browser-local first for simple media.** Short deterministic local
   transforms should prefer browser execution, while heavier or more durable
   workflows fall back to deferred server execution.
10. **Bounded media scope in v1.** Image/chart/graph plus TTS clip renders,
    multi-video composition, subtitles, and waveform generation should ship
    inside explicit runtime limits rather than as an open-ended editor.
11. **Audit before rollout.** Every chat-exposed MCP tool, deferred job family,
    and compatibility renderer must be inventoried before migration work is
    called complete.
12. **System surfaces are first-class.** Fallback, error, compatibility, and
    drill-in surfaces should be designed intentionally rather than inherited as
    leftovers from generic cards.
13. **Release-gated completeness.** Registry coverage, transcript durability,
    browser-runtime parity, progress UX, and media routing must all be
    test-backed and block release when they drift.

---

## 3. Architecture

### 3.1 Verified current contracts that remain in place

The current execution and governance seams should remain the lower-level truth.

Current execution contract in `src/core/tool-registry/ToolDescriptor.ts`:

```typescript
export interface ToolDescriptor<TInput = unknown, TOutput = unknown> {
  name: string;
  schema: AnthropicToolSchema;
  command: ToolCommand<TInput, TOutput>;
  roles: RoleName[] | "ALL";
  category: ToolCategory;
  executionMode?: ToolExecutionMode;
  deferred?: DeferredExecutionConfig;
}
```

Current job governance contract in
`src/lib/jobs/job-capability-registry.ts`:

```typescript
export interface JobCapabilityDefinition {
  toolName: DeferredJobHandlerName;
  family: JobFamily;
  label: string;
  description: string;
  executionPrincipal: JobExecutionPrincipal;
  executionAllowedRoles: readonly RoleName[];
  retryPolicy: JobRetryPolicy;
  recoveryMode: JobRecoveryMode;
  resultRetention: JobResultRetentionMode;
  artifactPolicy: JobArtifactPolicy;
  initiatorRoles: readonly RoleName[];
  ownerViewerRoles: readonly RoleName[];
  ownerActionRoles: readonly RoleName[];
  globalViewerRoles: readonly RoleName[];
  globalActionRoles: readonly RoleName[];
  defaultSurface: JobSurface;
}
```

This feature adds a presentation layer above those contracts rather than
rewriting them.

### 3.2 Capability audit and rollout inventory

Before implementation phases begin, the feature must establish a canonical audit
matrix for every chat-exposed capability.

Required matrix fields:

| Field | Purpose |
| --- | --- |
| `toolName` | Exact MCP tool or deferred handler name |
| `family` | Capability family grouping |
| `executionMode` | Inline, deferred, browser, or hybrid |
| `chatExposed` | Whether the capability is intended to render in chat |
| `currentRendererMode` | Custom card, system card, compatibility renderer, or unsupported |
| `envelopeStatus` | Native envelope, projected envelope, or legacy payload |
| `progressMode` | None, single, or phased |
| `historyMode` | Payload snapshot or compatibility |
| `artifactKinds` | Output artifact classes |
| `retryPolicy` | None or whole-job retry in chat |

Rules:

1. No capability may be treated as “covered” without a matrix entry.
2. Any tool that is not meant to render in chat must be marked `chatExposed = false`
   rather than silently falling through the UI.
3. Any chat-exposed capability without a custom card must be explicitly marked
   as `system card` or `compatibility renderer` until migrated.
4. Editorial, search/retrieval, and artifact families lead the first migration
   wave, because they carry the most visible product value.
5. Deferred job families and inline MCP tools must be audited together so the
   platform does not keep two parallel presentation standards.
6. Admin-only, operator-only, maintenance, or eval utilities should default to
   `chatExposed = false` unless there is an explicit product reason to surface
   them in the transcript. The audit should classify them to admin or jobs
   surfaces rather than forcing them through chat by habit.

### 3.3 Capability presentation contract

Add a first-class capability presentation registry for every chat-exposed
tool-family surface, whether execution is inline, deferred, browser-local, or
hybrid.

```typescript
type CapabilityFamily =
  | "editorial"
  | "search"
  | "artifact"
  | "theme"
  | "profile"
  | "journal"
  | "media"
  | "system";

type CapabilityCardKind =
  | "editorial_workflow"
  | "search_result"
  | "artifact_viewer"
  | "theme_inspection"
  | "profile_summary"
  | "journal_workflow"
  | "media_render"
  | "fallback";

type CapabilityProgressMode = "none" | "single" | "phased";

interface CapabilityPresentationDescriptor {
  toolName: string;
  family: CapabilityFamily;
  label: string;
  cardKind: CapabilityCardKind;
  executionMode: "inline" | "deferred" | "browser" | "hybrid";
  progressMode: CapabilityProgressMode;
  historyMode: "payload_snapshot" | "compatibility";
  defaultSurface: "conversation" | "jobs" | "admin" | "global_strip";
  artifactKinds: readonly string[];
  supportsRetry: "none" | "whole_job";
}
```

Rules:

1. `ToolDescriptor` remains the execution registry.
2. `JOB_CAPABILITY_REGISTRY` remains the governance registry.
3. The new presentation registry becomes the UI source of truth for:
   - renderer selection
   - progress strip eligibility
   - retry affordance policy in chat
   - transcript history mode
   - family-level card theming and artifact affordances
4. `default-tool-registry.ts` should stop being a hand-maintained map of ad hoc
   component assignments and instead resolve from this descriptor set.

### 3.4 Unified result envelope

Every capability that renders in chat should produce or project into the same
result envelope shape.

```typescript
interface CapabilityProgressPhase {
  key: string;
  label: string;
  status: "pending" | "active" | "succeeded" | "failed" | "canceled";
  percent?: number | null;
}

interface CapabilityArtifactRef {
  kind: string;
  label: string;
  mimeType: string;
  assetId?: string;
  uri?: string;
   retentionClass?: "ephemeral" | "conversation" | "durable";
}

interface CapabilityResultEnvelope<TPayload = Record<string, unknown>> {
  schemaVersion: 1;
  toolName: string;
  family: CapabilityFamily;
  cardKind: CapabilityCardKind;
  executionMode: "inline" | "deferred" | "browser" | "hybrid";
  inputSnapshot: Record<string, unknown>;
  summary: {
    title?: string;
    subtitle?: string;
    statusLine?: string;
    message?: string;
  };
   replaySnapshot?: Record<string, unknown> | null;
  progress?: {
    percent?: number | null;
    label?: string | null;
    phases?: CapabilityProgressPhase[];
    activePhaseKey?: string | null;
  };
  artifacts?: CapabilityArtifactRef[];
  payload: TPayload | null;
}
```

Rules:

1. Inline tools should return this envelope directly.
2. Deferred jobs should store this envelope in `resultPayload`.
3. `buildJobStatusPartFromProjection` should prefer envelope summary and
   progress fields over tool-specific inference logic.
4. History rendering should consume the envelope snapshot only. No network
   refetch is allowed for normal transcript playback.
5. Every chat-exposed capability must define a compact `replaySnapshot`
   sufficient for normal historical transcript playback even when heavyweight
   payloads or artifacts are no longer retained.
6. Large tables, logs, binary data, and intermediate media details should move
   into artifact refs or drill-in surfaces rather than bloating transcript
   envelopes.

V1 replay snapshot budget defaults:

1. `replaySnapshot` must be JSON-serializable and may not include raw binary,
   base64 blobs, or full document bodies.
2. Serialized `replaySnapshot` target budget: 12 KiB. Hard max without an
   explicit Sprint 0 audit exception: 24 KiB.
3. Serialized persisted envelope target budget, excluding externalized
   artifacts: 48 KiB. Hard max without an explicit audit exception: 64 KiB.
4. Collection previews inside `replaySnapshot` should cap at 10 visible items
   and report omitted counts rather than embedding full result sets.
5. Free-text preview fields inside `replaySnapshot` should cap at 500 visible
   characters per field and point to artifacts or drill-in surfaces for more.
6. Any capability that exceeds these budgets must declare an audit-matrix
   exception with owner, reason, and mitigation before it is considered ready.

### 3.5 Shared card system

Build a shared card design system for MCP capabilities using the current theme
runtime and semantic ideas borrowed from the external design-system repo.

Required primitives:

1. `CapabilityCardShell` for tone, spacing, border, and motion discipline.
2. `CapabilityCardHeader` for eyebrow, title, subtitle, and status cluster.
3. `CapabilityMetricStrip` for compact counts, durations, and artifact totals.
4. `CapabilityArtifactRail` for assets, downloads, previews, and open actions.
5. `CapabilityTimeline` for phase progress and event summaries.
6. `CapabilityDisclosure` for progressive detail without transcript sprawl.
7. `CapabilityContextPanel` for route, ownership, or workflow context.
8. `CapabilityActionRail` for primary actions, retry affordances, and drill-in
   actions without turning every card into a toolbar.

Tone model requirements:

1. Tone is semantic, not palette-specific.
2. Minimum tones: `neutral`, `accent`, `success`, `warning`, `danger`,
   `editorial`, and `media`.
3. Tone implementation must consume existing theme CSS variables from
   `ThemeProvider`, not fixed imported color tokens.

Explicit design rule:

1. Borrow composition patterns such as tone panels, context rails, action rails,
   and progressive disclosure.
2. Do not import the external design system's visual identity wholesale.

### 3.6 System cards and drill-in surfaces

The platform needs explicit system-level surfaces, not just ad hoc fallback
boxes.

Required shared system surfaces:

1. `SystemJobCard` for generic queued or running states when a family-specific
   renderer is not yet available.
2. `CapabilityErrorCard` for failed and canceled states across all families.
3. `CompatibilitySnapshotCard` for historical records where only legacy payload
   fragments remain.
4. `ProgressStripBubble` for the global stoplight summary surface.
5. `CapabilityDetailDrawer` or equivalent drill-in surface for logs, phase
   timelines, large payload summaries, and artifact bundles.

Rules:

1. Failed and canceled states should route through shared system surfaces unless
   a family explicitly overrides them while preserving the same affordance set.
2. A generic fallback is acceptable only for capabilities that are explicitly
   marked as uncovered in the audit matrix, not as a silent default forever.
3. Historical compatibility rendering must be static, readable, and honest
   about degraded fidelity.
4. Drill-in surfaces should expose detail without forcing the transcript card to
   expand indefinitely.

### 3.7 Global progress strip above the composer

`ChatContentSurface.tsx` should gain a global progress strip between the message
viewport and the composer shell.

Contract:

1. The strip is hidden when there are no active or attention-requiring jobs.
2. It renders one compact stoplight-dot item per tracked capability.
3. Dot states:
   - queued: amber
   - running: green
   - attention or failed: red
4. Clicking a dot opens an anchored status bubble showing:
   - capability label
   - title or subtitle when available
   - phase label and percent
   - elapsed or updated time
   - `Retry whole job` when policy allows it and the job is terminal
5. The strip is a summary surface only. It never replaces the full transcript
   card.
6. The strip complements `/jobs` and `/admin/jobs`; it does not replace those
   surfaces or turn the chat transcript into the only job-management view.
7. Items should be ordered by urgency and relevance: attention or failed first,
   then active work, then queued work, with the most recently updated item
   winning inside each class.
8. The strip must cap visible items and collapse overflow into a summary bubble;
   the mobile cap should be lower than desktop.
9. Color cannot be the only status signal. Each item and overflow bubble must
   expose readable labels, status text, and assistive descriptions.
10. The strip and its anchored bubbles must be keyboard navigable, manage focus
    explicitly, and support pointer-free open and dismiss flows.
11. Reduced-motion mode must remove nonessential animation, and progress update
    frequency should be coalesced so rapid event bursts do not create visual
    jitter.
12. The progress aggregator must update independently from transcript card
    rendering so frequent job ticks do not force full message-list rerenders.

This requires a progress aggregator that reads the current conversation's
`job_status` parts from the presented messages and normalizes them into one UI
state independent of any single card family.

### 3.8 Chat chrome simplification and data menu

Current composer chrome is wasting high-value space on conversation operations.

Required changes:

1. Remove `ChatConversationToolbar` from the composer row.
2. Introduce a header-level user-data menu anchored from `ChatSurfaceHeader`.
3. Move transcript copy/export/import and future archive/summarize actions into
   that menu.
4. Where a full chat header is not present, expose the same menu in the owning
   shell header or equivalent top chrome, never back in the composer row.

The composer row should prioritize:

1. active jobs summary
2. file and media attachment state
3. message entry
4. send or stop controls

This change should also be treated as part of input-surface optimization rather
than a pure navigation move. Reclaimed composer space should be reserved for the
progress strip, media-aware attachment affordances, and cleaner input rhythm.

### 3.9 Single active conversation stays intact

The product should remain single-threaded at the active conversation layer.

Rules:

1. `useGlobalChat.tsx` continues to own one `conversationId` at a time.
2. `ConversationInteractor` keeps archiving any existing active conversation
   before creating a new one.
3. Summarization remains the continuity mechanism, not a tabbed multi-thread UI.
4. Archive, import, export, and future data-management actions support that
   model and do not introduce concurrent active chat lanes.

### 3.10 Transcript durability and compatibility rules

The transcript must become payload-first and replay-safe.

Rules:

1. Known tools must resolve through the registry in queued, running, succeeded,
   failed, and canceled states.
2. Historical playback must render from saved payloads and snapshots only.
3. Compatibility renderers may exist for legacy records, but they must be
   static and must not live-refetch remote data.
4. Registry coverage tests should fail if a chat-exposed capability has neither
   a declared custom card nor an explicit fallback designation.
5. Immutable result snapshots should remain available for transcript replay even
   when artifact retention policies later prune heavyweight payloads.
6. Durable transcript storage must distinguish compact `replaySnapshot` data
   from heavyweight payload detail and artifact storage.
7. Envelope size budgets should be enforced so large structured payloads do not
   silently turn transcript history into a blob store.

### 3.11 Media asset normalization

FFmpeg is not the first problem. Stable media asset normalization is.

Add a shared media asset contract that can represent uploaded assets, generated
audio, chart/graph outputs, derived subtitles, and rendered videos.

```typescript
type MediaAssetKind =
  | "image"
  | "chart"
  | "graph"
  | "audio"
  | "video"
  | "subtitle"
  | "waveform";

interface MediaAssetDescriptor {
  id: string;
  kind: MediaAssetKind;
  mimeType: string;
  source: "generated" | "uploaded" | "derived";
  assetId?: string;
  uri?: string;
  width?: number;
  height?: number;
   durationSeconds?: number;
   conversationId?: string;
   toolName?: string;
   retentionClass?: "ephemeral" | "conversation" | "durable";
}
```

Requirements:

1. `generate_audio` must become a first-class media asset producer, not just an
   audio player card payload.
2. Chart and graph capabilities must be assetizable to stable SVG or PNG output
   in addition to card rendering payloads.
3. TTS generation must gain a timing-aware subtitle contract so v1 can produce
   both burned-in captions and sidecar subtitle tracks.
4. Media composition tools must consume asset descriptors, never raw shell-like
   path strings supplied by the model.
5. The chat attachment model must expand to support audio and video ingest or a
   dedicated governed media-ingest path with the same ownership and retention
   guarantees.
6. Media descriptors must carry provenance fields such as owning conversation,
   originating tool, and retention class.

### 3.12 Reusable browser-side capability runtime

Browser-local FFmpeg should not arrive as a one-off helper. The platform needs
a reusable browser capability runtime for bounded client-side WASM and worker
execution.

```typescript
type BrowserCapabilityRuntimeKind = "wasm_worker" | "worker_only";

interface BrowserCapabilityDescriptor {
  capabilityId: string;
  runtimeKind: BrowserCapabilityRuntimeKind;
  moduleId: string;
  maxInputBytes?: number;
  maxDurationSeconds?: number;
   requiresCrossOriginIsolation?: boolean;
   maxConcurrentExecutions?: number;
   fallbackPolicy: "server" | "fail";
   recoveryPolicy: "fallback_to_server" | "fail_interrupted";
}

interface BrowserCapabilityExecutionRequest {
  capabilityId: string;
  plan: unknown;
  assetInputs: MediaAssetDescriptor[];
}

interface BrowserCapabilityExecutionResult {
   status: "succeeded" | "failed" | "fallback_required" | "interrupted";
  envelope?: CapabilityResultEnvelope;
  failureCode?: string;
}
```

Requirements:

1. Browser-side execution must run inside a governed worker runtime, not on the
   main UI thread.
2. The runtime must own capability probes, worker boot, asset staging,
   progress emission, cancellation, cleanup, and fallback signaling.
3. Each browser-side capability must register limits, feature requirements,
   fallback policy, and supported input kinds in a shared descriptor rather
   than open-coded checks inside UI components.
4. The browser runtime must emit the same result envelope and progress model
   used by inline and deferred server capabilities so transcript rendering
   stays path-independent.
5. Asset staging for browser execution must use stable descriptors and governed
   temporary storage rules rather than ad hoc blob juggling inside cards.
6. FFmpeg is the first major consumer of this runtime, but the runtime should
   be able to host future client-side WASM capabilities without redefining the
   contract.
7. When a browser capability cannot run, the failure mode must be explicit:
   either clean server fallback or a user-visible bounded-local-only failure,
   depending on policy.
8. The runtime must enforce admission control and backpressure. Capabilities
   declare concurrency and resource ceilings, and the router must queue,
   defer, or reroute when local capacity is exhausted.
9. In v1, browser-local execution is conversation-scoped and tab-bound unless a
   later phase explicitly adds stronger persistence. Reload, tab close, worker
   crash, or browser interruption must reconcile into an explicit `interrupted`
   or fallback-required outcome rather than leaving ghost progress states.
10. Startup reconciliation must restore, close out, or reroute any locally
    tracked browser jobs before the progress strip presents them as active.

V1 browser runtime defaults:

1. Unless a documented capability exception says otherwise,
   `maxConcurrentExecutions = 1` for browser-local work.
2. The browser runtime queue is FIFO and may hold at most 2 pending local
   executions per tab beyond the active slot. Additional work must reroute to
   the server when allowed or fail explicitly when no server route exists.
3. Any capability with a valid server route defaults to
   `fallbackPolicy = "server"`.
4. Any capability with a valid server route defaults to
   `recoveryPolicy = "fallback_to_server"` for reload, tab-close, background
   eviction, or worker-interruption cases.
5. Browser-only capabilities must explicitly declare
   `fallbackPolicy = "fail"` and `recoveryPolicy = "fail_interrupted"`; that
   behavior is never an implicit default.
6. For v1 media work, `maxInputBytes` defaults to 32 MiB and
   `maxDurationSeconds` defaults to 30 unless a narrower cap is declared.
7. Admission-control overflow, server reroute, and interruption recovery must
   surface through the same result-envelope and progress contracts as normal
   success and failure states.

### 3.13 Hybrid FFmpeg execution router

Introduce a media execution router, built on the browser-side capability
runtime, that chooses `browser_wasm` or `deferred_server` from a structured
composition plan.

```typescript
type MediaExecutionRoute = "browser_wasm" | "deferred_server";

interface VideoCompositionPlan {
  clips: Array<{
    visualAssetId?: string;
    audioAssetId?: string;
    videoAssetId?: string;
    subtitles: "none" | "burned" | "sidecar" | "both";
    motion: "static" | "subtle_pan_zoom";
    durationSeconds?: number;
  }>;
  output: {
    format: "mp4";
    maxTotalDurationSeconds: 900;
  };
}
```

Routing rules for v1:

1. Browser FFmpeg WASM is preferred for simple local transforms such as:
   - a single image/chart/graph plus TTS clip render
   - bounded single-clip subtitle burn-in or sidecar packaging
   - small local trims or short deterministic transforms
2. Server deferred execution is required when:
   - multiple videos must be stitched together
   - total series output grows beyond simple clip work
   - subtitle muxing, waveform generation, or durable artifact packaging becomes
     expensive
   - the browser capability probe fails
   - the browser attempt fails and must fall back cleanly
3. The selected route must still emit the same capability result envelope so the
   transcript and cards do not need separate browser-vs-server render paths.
4. Browser capability probing should include worker availability, memory budget,
   codec support, and any feature gates required by the target transform.

Explicit v1 media limits:

1. single image-plus-audio clip: max 30 seconds
2. total combined series runtime: max 15 minutes
3. subtitle support: both burned-in and sidecar outputs must be supported,
   though a given workflow may request one or both
4. motion language: mostly static with subtle pan and zoom only

### 3.14 FFmpeg capability family

The initial media family should cover the actual product need, not general video
editing.

In scope for v1:

1. system-generated image/chart/graph plus TTS to MP4
2. multi-clip composition into a bounded series
3. combining multiple existing videos
4. subtitle generation and muxing
5. waveform generation as an auxiliary artifact

Out of scope for v1:

1. arbitrary freeform timeline editing
2. high-motion Ken Burns tooling beyond subtle pan and zoom
3. browser-only execution with no fallback
4. user-authored raw FFmpeg command access

---

## 4. Security And Safety

1. All media and FFmpeg capabilities must operate on structured composition
   plans, never raw CLI strings or arbitrary shell fragments.
2. Asset references must be ownership-checked and MIME-validated before any
   server execution path runs.
3. Browser-local media processing should remain local unless the user or policy
   explicitly routes the plan to the server.
4. Server fallback must preserve auditability through the existing deferred-job
   runtime, capability registry, and event stream.
5. Card theming must consume governed theme tokens. Capability cards may not
   bypass `ThemeProvider` with hardcoded palettes that break theme controls or
   accessibility settings.
6. Transcript snapshots must remain safe to replay even if large payloads are
   later pruned or artifact URIs expire; summaries and metadata must remain
   durable.

---

## 5. Testing Strategy

Required coverage categories:

1. **Contract tests**
   - capability audit matrix coverage for every chat-exposed tool and deferred
     job family
   - capability presentation registry coverage for every chat-exposed tool
   - envelope schema validation for inline and deferred results
   - replay snapshot and payload-size budget coverage for heavy capabilities
   - explicit exception coverage for any capability that exceeds snapshot,
     envelope, or browser-runtime defaults
   - browser capability descriptor coverage for every client-executable
     capability
   - history-mode and fallback declarations for every capability
2. **Card and chrome component tests**
   - shared card-shell primitives
   - system fallback, error, compatibility, and drill-in surfaces
   - progress strip aggregation, dot states, and retry-whole-job bubble actions
   - header user-data menu and composer toolbar removal
3. **Transcript durability tests**
   - queued, running, succeeded, failed, and canceled known tools resolve
     through the registry
   - historical playback renders from stored payload snapshots with no refetch
       and remains legible when heavyweight artifacts or detail payloads are
       pruned
4. **Browser runtime tests**
   - capability probe, worker boot, progress, cancellation, cleanup, and
     fallback signaling
   - result-envelope and progress parity between browser and server execution
     paths
   - admission control, concurrency caps, reroute behavior under exhausted
       local capacity, and reload, tab-close, or worker-crash reconciliation
       into explicit terminal or fallback states
5. **Browser tests**
   - progress strip behavior on desktop and mobile, including overflow
       grouping, priority ordering, accessible labeling, and keyboard behavior
   - card-family interactions and disclosure behavior
   - FFmpeg browser-path capability detection and graceful fallback to server
6. **Media pipeline tests**
   - subtitle timing contracts
   - asset normalization for chart, graph, image, audio, and video assets
   - bounded clip and series routing decisions
7. **Performance guardrails**
   - coalesced progress updates under rapid event streams
   - no full transcript rerender on strip-only progress changes
   - bounded local memory behavior for browser asset staging and runtime queues
8. **Full verification**
   - typecheck, targeted Vitest suites, build, and any new governed media QA
     scripts

Closeout expectation:

```bash
npm exec vitest run tests/tool-plugin-registry.test.tsx tests/full-registry-coverage.test.ts src/frameworks/ui/chat/plugins/custom/EditorialWorkflowCard.test.tsx src/frameworks/ui/RichContentRenderer.test.tsx
npm run build
```

If capability-presentation, browser-runtime, progress-strip, or media QA
scripts do not exist yet, the final roadmap phase must add them.

---

## 6. Phase Roadmap

| Phase | Goal |
| --- | --- |
| **0** | Freeze the converged architecture contract and build the audit matrix for every chat-exposed MCP tool, deferred job family, compatibility renderer, and media path |
| **1** | Introduce the capability presentation registry and unified result envelope across inline tools, deferred jobs, and transcript playback |
| **2** | Build the shared card design system and the shared system-card family using Ordo theme tokens and semantic composition primitives inspired by the external design system |
| **3** | Extend job and message projection to support phased progress, whole-job retry affordances, and payload-first transcript durability |
| **4** | Ship the global progress strip above the composer and move conversation data actions from the composer row into a header user-data menu |
| **5** | Roll the new card system across current capability families, with editorial, search/retrieval, and artifacts first, and explicitly close any uncovered chat-exposed families |
| **6** | Add reusable browser-side capability runtime, admission control and reconciliation, media asset normalization, media-ingest expansion, subtitle timing contracts, and chart/graph assetization |
| **7** | Ship FFmpeg capabilities on top of that runtime: browser-local WASM for simple bounded transforms and deferred server fallback for heavier media jobs |
| **8** | Close with release gates, observability, browser verification, and governed QA for cards, progress UX, transcript replay, and media routing |

### 6.1 Why this order

1. The platform needs a presentation contract before it needs more custom cards.
2. The card system should be shared before more families are migrated onto it.
3. Job phase projection and payload-first durability should land before the
   global progress strip depends on them.
4. The composer and header chrome should be simplified only after the progress
   surface has real normalized job data to read from.
5. Browser capability runtime and media asset normalization should arrive
   before FFmpeg-specific workflows claim them.

### 6.2 Family rollout priority inside Phase 5

1. editorial and journal workflows
2. search and retrieval surfaces
3. artifact viewers for audio, chart, graph, and future documents
4. theme, profile, and operator utilities
5. media and FFmpeg once the substrate from Phase 6 exists

---

## 7. Future Considerations

The following are explicitly out of scope for this package:

1. Multi-thread or multi-active conversation UX inside the main chat surface.
2. Replacing Ordo's theme runtime with the external design-system repo.
3. A full nonlinear editor or arbitrary timeline authoring environment.
4. Browser-only media processing with no server fallback path.
5. Any model-accessible raw FFmpeg command surface.

---

## 8. Done Criteria

1. Every chat-exposed capability has one presentation descriptor, one result
   envelope strategy, one declared history mode, one audit-matrix entry, and a
   bounded replay-snapshot strategy.
2. All major tool families render through a shared card system with consistent
   semantic surfaces and family tones, and all fallback/error/compatibility
   states route through first-class system surfaces.
3. The progress strip above the composer truthfully summarizes active or
   attention-requiring jobs, supports whole-job retry where allowed, and
   handles ordering, overflow, accessibility, and coalesced updates
   correctly.
4. Conversation data actions live in a header user-data menu instead of the
   composer row.
5. The single active conversation model remains intact and is supported by
   archive, import, export, and summarization rather than replaced.
6. Reusable browser-side WASM or worker execution runs through one governed
   capability runtime with explicit probes, limits, progress, cancellation,
   fallback policy, admission control, and interruption reconciliation.
7. Historical replay remains readable from compact snapshots even when
   heavyweight payloads or artifacts are pruned.
8. FFmpeg and media generation run through that runtime and the same
   capability system as the rest of the platform.
9. Browser-local FFmpeg WASM handles simple bounded local transforms, and the
   system falls back to deferred server execution for heavier jobs.
10. V1 media outputs support image/chart/graph plus TTS clip renders,
   multi-video composition, subtitles as both burned and sidecar outputs, and
   subtle pan-and-zoom motion only.
11. No chat-exposed MCP tool or deferred job family remains unclassified
    between custom card, system card, compatibility renderer, or non-chat
    surface.
12. Contract, UI, transcript, browser-runtime, and media verification block
    release when the system drifts from these rules.
