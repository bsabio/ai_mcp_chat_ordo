# Sprint 6 - Browser Runtime And Media Asset Substrate

> **Status:** Draft
> **Goal:** Add one governed media-asset substrate plus one reusable browser capability runtime for bounded local execution, without shipping FFmpeg-specific workflows early, fragmenting transcript state, or regressing the current chat and jobs surfaces.
> **Spec refs:** `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md` §3.4, §3.10 through §3.14, §4, §5, §6, §8
> **Prerequisite:** Sprint 5 complete

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md` | Canonical media-asset, browser-runtime, hybrid-routing, transcript-durability, and release-gate contract |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/README.md` | Roadmap sequencing and the exact Sprint 6 filename plus goal |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/sprint-3-job-phase-model-and-transcript-durability.md` | Normalized `job_status`, envelope-first replay, and whole-job retry rules that local browser execution must reuse rather than bypass |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/sprint-4-progress-strip-and-chat-chrome-simplification.md` | The current progress-strip contract that browser-local capability execution must feed through the same job-status path |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/sprint-5-current-capability-family-rollout.md` | The current family-card baseline and the explicit rule that media-family chat descriptors remain out of scope until the substrate exists |
| `src/core/entities/capability-presentation.ts` | The chat presentation contract already includes `family: "media"` plus browser and hybrid execution modes even though no live media descriptors exist yet |
| `src/frameworks/ui/chat/registry/capability-presentation-registry.ts` | The current chat manifest has no media descriptors yet and still classifies `generate_audio`, `generate_chart`, and `generate_graph` under the artifact family |
| `src/core/entities/capability-result.ts` | Shared `CapabilityResultEnvelope`, artifact refs, phased progress, and replay-snapshot contract that media and browser runtime work must extend rather than replace |
| `src/lib/capabilities/capability-result-envelope.ts` | The current envelope projector already supports hybrid execution modes and artifact refs, but only a minimal artifact projection for audio and image payloads |
| `src/core/entities/message-parts.ts` | Current `attachment`, `imported_attachment`, and `job_status` message-part contracts that need additive media/runtime metadata rather than a second transcript surface |
| `src/core/entities/user-file.ts` | Current user-file entity still restricts `fileType` to `audio`, `chart`, or `document` |
| `src/core/use-cases/UserFileRepository.ts` | Persistence contract for current user-file lookup, assignment, and cleanup |
| `src/lib/db/tables.ts` | SQLite schema for `user_files`, currently limited to file identity plus MIME and byte size with no media metadata or provenance beyond `conversation_id` |
| `src/lib/user-files.ts` | Shared user-file storage path, binary hashing, conversation assignment, and unattached-file cleanup seam that media normalization should extend instead of bypass |
| `src/adapters/UserFileDataMapper.ts` | SQLite-backed mapper for `user_files`, the clean place to carry additive media metadata into persistence |
| `src/lib/chat/file-validation.ts` | Current upload allowlist and byte-size cap, limited to PDF, plain text, and images |
| `src/app/api/chat/uploads/route.ts` | Current governed chat upload route, which still stores every accepted upload as `fileType: "document"` |
| `src/app/api/chat/uploads/route.test.ts` | Existing upload-route regression surface proving attachment storage and cleanup behavior |
| `src/lib/chat/message-attachments.ts` | Current attachment helpers and context-text builder, still generic and media-agnostic |
| `src/hooks/chat/chatAttachmentApi.ts` | Current client upload and cleanup bridge, still typed around the minimal attachment payload |
| `src/hooks/chat/useChatSend.ts` | Current message-send orchestration that uploads attachments first and preserves them for retry |
| `src/frameworks/ui/MessageList.tsx` | Current transcript attachment rendering seam, including imported-attachment placeholders |
| `src/app/api/tts/route.ts` | Current TTS route that already stores generated MP3 data into `user_files` and returns `X-User-File-Id` |
| `src/core/use-cases/tools/generate-audio.tool.ts` | Current `generate_audio` tool descriptor |
| `src/core/use-cases/tools/UiTools.ts` | Current `GenerateAudioCommand`, `GenerateChartCommand`, and `GenerateGraphCommand` result contracts |
| `src/core/use-cases/tools/chart-payload.ts` | Current chart payload builder that resolves Mermaid-ready render payloads but not stable derived assets |
| `src/core/use-cases/tools/graph-payload.ts` | Current graph payload builder that resolves chart data and previews but not durable exported assets |
| `src/frameworks/ui/chat/plugins/custom/AudioPlayerCard.tsx` | Current audio card that renders `generate_audio` payloads inside the shared shell but still treats them as client-fetch state rather than normalized media assets |
| `src/frameworks/ui/chat/plugins/custom/ChartRendererCard.tsx` | Current chart card that renders Mermaid payloads through the shared shell but has no stable asset descriptor path |
| `src/frameworks/ui/chat/plugins/custom/GraphRendererCard.tsx` | Current graph card that renders structured graph payloads through the shared shell but has no stable asset descriptor path |
| `src/hooks/chat/useChatJobEvents.ts` | Current deferred-job snapshot plus SSE reconciliation hook, which only knows how to restore server-side job state |
| `src/hooks/useGlobalChat.tsx` | Current chat-shell owner where any local browser-runtime stream must integrate if it is to affect transcript state and the progress strip |
| `src/core/services/ConversationMessages.ts` | Current merge boundary for `UPSERT_JOB_STATUS`, already sequence-aware and therefore the right place to preserve richer local-runtime parts |
| `src/frameworks/ui/chat/plugins/system/resolve-progress-strip.ts` | Current strip selector that already consumes normalized `job_status` parts and should not learn a second local-runtime state model |
| `src/lib/jobs/deferred-job-worker.ts` | Current server-side deferred worker contract with progress, artifacts, replay snapshots, and result envelopes, which server fallback should reuse |
| `src/app/api/chat/jobs/[jobId]/route.ts` | Current chat job action route for cancel and whole-job retry, already carrying result envelopes and progress state through the server path |

---

## Cross-Layer Constraints

1. Sprint 6 is a substrate sprint. It must not ship FFmpeg composition plans, media-family chat cards, or browser-only editing workflows. Those belong to Sprint 7.
2. `CapabilityResultEnvelope` remains the transcript and replay contract. `MediaAssetDescriptor` and browser-runtime state must project into that contract rather than inventing a second payload format.
3. `capability-presentation-registry.ts` remains the chat presentation registry. Any new browser capability registry is runtime-only and may not become a competing renderer registry.
4. Browser-local execution must surface through normalized `job_status` parts and the existing `UPSERT_JOB_STATUS` reducer path. The progress strip, transcript, and `/jobs` surfaces must not each learn different local-runtime models.
5. Storage and retention must extend the current `user_files` infrastructure and cleanup rules instead of creating a second blob store or a card-local cache with no ownership model.
6. Media ingest must preserve the current conversation-assignment, retry, and unattached-upload cleanup semantics. Supporting audio and video is not permission to weaken those guarantees.
7. Subtitle timing, media descriptors, and later FFmpeg plans must use structured fields and asset identifiers only. No raw shell paths, blob URLs, or model-authored CLI fragments may enter persisted payloads.
8. The browser-runtime defaults frozen in Sprint 0 remain in force here: one active local execution by default, at most two queued local executions per tab beyond that slot, server fallback by default when a valid server route exists, and explicit interruption reconciliation.
9. Current artifact-family adopters such as `generate_audio`, `generate_chart`, and `generate_graph` must remain payload-first and history-safe while gaining normalized media assets. Sprint 6 may not make them depend on refetch just to recover asset metadata.
10. If a browser-local execution cannot start, cannot continue, or cannot reconcile on startup, the user must see an explicit `failed`, `fallback_required`, or `interrupted` outcome. Silent abandonment and ghost progress states are failures.

---

## Engineering Quality Bar

Sprint 6 is not complete because media uploads start working or because browser-local work exists somewhere in the repo. It is complete only if media identity, local execution, and transcript projection become more explicit, more deterministic, and easier to test than the current ad hoc chart or audio paths.

### Knuth bar - explicit invariants and bounded state

1. Define one explicit browser-runtime state machine with additive terminal states: `queued -> running -> succeeded | failed | fallback_required | interrupted | canceled`. Do not let hooks, workers, and cards each invent slightly different status names.
2. Define one pure asset-normalization helper that maps persisted user-file records, generated media outputs, and derived subtitle or waveform records into one `MediaAssetDescriptor`. Route handlers and cards may consume it, but they may not each hand-roll asset objects.
3. Admission control, fallback routing, and startup reconciliation must be centralized. There should be one authoritative queue and one authoritative rule for overflow and interruption behavior.
4. Media metadata and replay data must stay compact and explicit. Persisted descriptors may not smuggle raw binary, giant SVG blobs, or full subtitle documents into transcript envelopes.

### Martin bar - narrow responsibilities and stable seams

1. Route handlers should validate, authorize, and orchestrate. Metadata extraction, upload policy, media normalization, and browser-runtime state should live in focused helpers or services rather than growing inside `route.ts` files.
2. `UserFileSystem` and `UserFileRepository` should remain the persistence and cleanup boundary. Browser runtime and chat cards may reference stored assets, but they should not start managing file retention directly.
3. `useGlobalChat.tsx` should compose runtime hooks and dispatch normalized events. It should not become the browser capability runtime itself.
4. `ConversationMessages.upsertJobStatusMessage()` should remain the merge boundary for richer local and server job parts. Sprint 6 should feed it better normalized data, not bypass it with component-local progress state.

### GoF bar - pragmatic patterns, not decorative ones

1. Use a Strategy-style browser capability registry for capability limits, supported input kinds, and fallback policy rather than scattering capability checks through cards and hooks.
2. Use Adapter helpers to map `UserFile`, upload payloads, and tool outputs into `MediaAssetDescriptor` and `CapabilityArtifactRef` shapes. Do not let UI components parse raw repository records.
3. Favor composition of small helpers for upload policy, runtime state, and subtitle timing over a giant media manager or a giant browser-runtime service object.
4. Every new abstraction must remove branching from a consumer. If Sprint 6 leaves `route.ts`, `useGlobalChat.tsx`, or the artifact cards longer and more special-cased than they are now, the design is failing.

---

## Pragmatic Test Standard

1. Add direct unit coverage for asset normalization, upload classification, duration and byte-budget guards, subtitle timing normalization, and browser-runtime admission-control logic. These seams are deterministic and should not be tested only through browser fixtures.
2. Add focused route tests for `POST /api/chat/uploads` and `POST /api/tts` that prove authorization, MIME handling, metadata persistence, cleanup behavior, and stable asset identity.
3. Add hook or reducer coverage for local browser-runtime projection into `UPSERT_JOB_STATUS` so local executions and server jobs share the same merge and ordering rules.
4. Add direct card tests proving that audio, chart, and graph cards prefer normalized asset descriptors when available and fall back honestly when only legacy payloads remain.
5. Add focused browser coverage for media upload affordances, local-runtime interruption or reroute behavior, and progress-strip truthfulness. Sprint 6 should not depend on screenshots or broad end-to-end suites to catch substrate regressions.
6. Add round-trip durability checks for replay-safe media descriptors through transcript export or import and through any running or completed `job_status` part that now carries local-runtime results.
7. Keep the verification bundle focused on the changed boundaries. Sprint 6 should not widen into unrelated chat rendering or admin suites unless those surfaces truly consume the new media/runtime contracts.

---

## Runtime And UX Guardrails

1. Heavy browser-local execution must never run on the main UI thread. The browser runtime may orchestrate from React, but actual bounded compute must stay in workers.
2. The progress strip must not show a browser-local capability as active until startup reconciliation has confirmed that the local execution still exists, has rerouted, or has been closed out as interrupted.
3. Upload validation should fail fast and readably. Unsupported media or oversize inputs must be rejected before the chat send flow commits a transcript message that implies the upload succeeded.
4. Media attachments in the transcript should stay compact and legible on mobile. Sprint 6 is about normalized substrate, not about embedding a full editing surface inside every attachment card.
5. Generated and cached media should resolve to the same descriptor shape and the same card semantics. A replayed transcript should not look like a different product surface because the asset came from cache.
6. Local runtime interruption, cancellation, and server fallback should produce stable, user-visible status text and history-safe envelopes. They must not rely on console warnings or temporary toast messages as the only signal.
7. Uploaded and generated media descriptors must remain ownership-checked and conversation-scoped. Any asset that cannot be safely restored must degrade to an explicit imported or unavailable placeholder rather than a broken link.
8. Cleanup remains part of the product contract. Unattached uploads, temporary staged browser assets, and interrupted local-runtime scratch data must have explicit reaping rules instead of accumulating indefinitely.

---

## QA Findings Before Implementation

1. `src/core/entities/user-file.ts` still restricts `fileType` to `audio`, `chart`, or `document`, which is too narrow for image, graph, video, subtitle, and waveform assets.
2. `src/lib/db/tables.ts` defines `user_files` with identity, MIME, and byte-size columns only. There is no current metadata column for duration, dimensions, derivation, retention, or originating tool.
3. `src/app/api/chat/uploads/route.ts` still accepts only PDF, plain text, and image MIME types through `src/lib/chat/file-validation.ts`, and it stores every accepted upload as `fileType: "document"`.
4. `src/core/entities/message-parts.ts`, `src/lib/chat/message-attachments.ts`, and `src/hooks/chat/chatAttachmentApi.ts` still model attachments as `assetId`, `fileName`, `mimeType`, and `fileSize` only, with no asset kind or media metadata.
5. `src/hooks/chat/useChatSend.ts` already preserves uploaded attachments for retry, which is useful, but it currently assumes the minimal attachment shape and therefore has no way to preserve richer media metadata.
6. `src/app/api/tts/route.ts` already stores generated MP3 files and returns `X-User-File-Id`, but its contract is still binary-audio HTTP plus headers rather than a normalized media descriptor surface.
7. `GenerateAudioCommand` in `src/core/use-cases/tools/UiTools.ts` still returns a `client_fetch_pending` or `cached_asset` payload with estimates, not a first-class `MediaAssetDescriptor` or subtitle timing contract.
8. `GenerateChartCommand` and `resolveGenerateChartPayload()` are still render-first. `MermaidRenderer` can download PNG or SVG client-side, but no stable asset descriptor or persisted derived asset is produced for transcript replay.
9. `resolveGenerateGraphPayload()` produces a structured graph spec and preview rows, but it does not emit a durable exported asset or normalized media descriptor.
10. `CapabilityFamily` already includes `media`, and `CapabilityExecutionMode` already includes `browser` and `hybrid`, but `capability-presentation-registry.ts` currently declares no media-family chat descriptors at all.
11. `CapabilityResultEnvelope` and `projectCapabilityResultEnvelope()` already support artifact refs and hybrid execution modes, which means Sprint 6 has a solid transcript contract to extend rather than a reason to start over.
12. `useChatJobEvents.ts` only reconciles `/api/chat/jobs` snapshots and `/api/chat/events` SSE payloads, so browser-local capability execution currently has no normalized transcript or progress-strip path.
13. `ConversationMessages.upsertJobStatusMessage()` already merges newer, richer `job_status` parts by sequence, which is the correct convergence seam for local browser-runtime updates.
14. `resolve-progress-strip.ts` already consumes normalized `job_status` parts and descriptor policy. Browser-local execution should feed that selector with the same part shape rather than teaching the strip about a new state model.
15. `deferred-job-worker.ts` and `/api/chat/jobs/[jobId]` already preserve phases, result envelopes, replay snapshots, and artifact refs. Server fallback therefore has a mature durability path ready for reuse.
16. There is no current dedicated `src/app/api/tts/route.test.ts`, so Sprint 6 must add that route-level regression surface instead of assuming TTS route coverage already exists.

---

## Task 6.1 - Normalize media asset and browser capability contracts

**What:** Add one canonical media-asset descriptor plus one browser capability descriptor, then extend the current user-file storage contract and artifact projection seams so the rest of Sprint 6 can build on typed substrate instead of free-form payloads.

| Item | Detail |
| --- | --- |
| **Create** | `src/core/entities/media-asset.ts` |
| **Create** | `src/core/entities/browser-capability.ts` |
| **Create** | `src/lib/media/media-asset-projection.ts` |
| **Create** | `src/lib/media/media-asset-projection.test.ts` |
| **Modify** | `src/core/entities/user-file.ts` |
| **Modify** | `src/core/use-cases/UserFileRepository.ts` |
| **Modify** | `src/lib/db/tables.ts` |
| **Modify** | `src/lib/user-files.ts` |
| **Modify** | `src/adapters/UserFileDataMapper.ts` |
| **Modify as needed** | `src/core/entities/capability-result.ts` |
| **Modify as needed** | `src/lib/capabilities/capability-result-envelope.ts` |
| **Modify** | `src/lib/user-files.test.ts` |
| **Modify** | `src/adapters/UserFileDataMapper.test.ts` |
| **Spec** | §3.11, §3.12, §3.13, §4, §5 |

### Task 6.1 outcomes

1. Introduce one canonical `MediaAssetDescriptor` that covers `image`, `chart`, `graph`, `audio`, `video`, `subtitle`, and `waveform` assets with stable IDs, source classification, MIME type, duration or dimensions when known, conversation provenance, originating tool, and retention class.
2. Introduce one canonical `BrowserCapabilityDescriptor` for client-executable capabilities with runtime kind, input-kind support, byte and duration limits, concurrency limits, fallback policy, and interruption-recovery policy.
3. Extend `UserFile` and `user_files` persistence additively so current `audio`, `chart`, and `document` records keep working while the substrate can represent `graph`, `image`, `video`, `subtitle`, and `waveform` assets plus typed metadata.
4. Add one pure projector from stored media assets into transcript-safe `CapabilityArtifactRef` and replay-safe summary metadata so cards and history playback consume stable projections rather than repository rows.
5. Keep `CapabilityResultEnvelope` as the transcript contract. Media descriptors become inputs to envelopes and artifact refs; they do not replace the envelope layer.
6. Persisted media descriptors may never store raw blob URLs, absolute disk paths, or transient worker handles. Stable asset identity and provenance must survive replay and import.

### Task 6.1 notes

1. Prefer additive schema evolution. Existing `user_files` records should remain readable even if their typed media metadata is sparse.
2. If metadata storage uses a JSON column, pair it with typed mapper helpers and typed entity fields. Route handlers and cards must not pass untyped JSON through the system.
3. Storage identity and transcript identity are related but not identical. `MediaAssetDescriptor` is the substrate truth; `CapabilityArtifactRef` remains the transcript-facing projection.

### Verify Task 6.1

```bash
npx vitest run src/lib/media/media-asset-projection.test.ts src/lib/user-files.test.ts src/adapters/UserFileDataMapper.test.ts
```

---

## Task 6.2 - Expand governed media ingest and attachment plumbing

**What:** Extend the current chat upload flow so audio and video media can enter the conversation through the same owned, cleaned-up attachment path, with typed media metadata and bounded validation rather than ad hoc file handling.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/media/media-upload-policy.ts` |
| **Create** | `src/lib/media/media-upload-policy.test.ts` |
| **Create** | `src/lib/media/media-metadata.ts` |
| **Create** | `src/lib/media/media-metadata.test.ts` |
| **Modify** | `src/lib/chat/file-validation.ts` |
| **Modify** | `src/app/api/chat/uploads/route.ts` |
| **Modify** | `src/app/api/chat/uploads/route.test.ts` |
| **Modify** | `src/core/entities/message-parts.ts` |
| **Modify** | `src/lib/chat/message-attachments.ts` |
| **Modify** | `src/hooks/chat/chatAttachmentApi.ts` |
| **Modify** | `src/hooks/chat/useChatSend.ts` |
| **Modify** | `src/hooks/chat/useChatSend.test.tsx` |
| **Modify as needed** | `src/lib/chat/stream-pipeline.ts` |
| **Modify as needed** | `src/frameworks/ui/MessageList.tsx` |
| **Modify as needed** | `src/frameworks/ui/MessageList.test.tsx` |
| **Spec** | §3.11, §4, §5, §8 |

### Task 6.2 outcomes

1. Extend the governed chat upload path so supported audio and video files can be attached to a conversation with the same ownership, conversation assignment, retry, and cleanup semantics as current document and image uploads.
2. Promote `attachment` message parts from the current minimal shape to an additive typed-media shape that can carry `assetKind`, duration, width, height, and other replay-safe media metadata when known.
3. Centralize MIME classification and upload admission in one policy seam so route handlers and client hooks do not diverge on what counts as an allowed media upload.
4. Keep byte-size validation explicit and additive to any media-duration or runtime-admission checks. Upload acceptance and browser-runtime admission are related but not interchangeable.
5. Preserve current retry behavior in `useChatSend.ts` so richer media attachments survive failed streams and restored retries without forcing duplicate uploads.
6. Keep transcript attachment rendering honest and compact. If imported or restored media metadata is incomplete, the UI should surface that clearly rather than guessing.

### Task 6.2 notes

1. The upload route should remain orchestration code. MIME-to-kind mapping and media metadata extraction belong in helper modules.
2. If exact duration or dimension probing cannot be made authoritative on the server in Sprint 6, persist only bounded, validated metadata and let browser-runtime admission apply stricter execution caps later.
3. Do not fork the attachment pipeline into document and media variants unless the shared route proves technically impossible. Reusing the current attachment lifecycle is the cleaner default.

### Verify Task 6.2

```bash
npx vitest run src/lib/media/media-upload-policy.test.ts src/lib/media/media-metadata.test.ts src/app/api/chat/uploads/route.test.ts src/hooks/chat/useChatSend.test.tsx src/frameworks/ui/MessageList.test.tsx
```

---

## Task 6.3 - Add browser capability runtime, admission control, and interruption reconciliation

**What:** Build one browser capability runtime for bounded local worker execution, with deterministic queueing, explicit fallback and interruption states, and direct projection into the existing `job_status` pathway.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/media/browser-runtime/browser-capability-registry.ts` |
| **Create** | `src/lib/media/browser-runtime/browser-capability-registry.test.ts` |
| **Create** | `src/lib/media/browser-runtime/browser-capability-runtime.ts` |
| **Create** | `src/lib/media/browser-runtime/browser-capability-runtime.test.ts` |
| **Create** | `src/lib/media/browser-runtime/browser-runtime-state.ts` |
| **Create** | `src/lib/media/browser-runtime/browser-runtime-reconciliation.ts` |
| **Create as needed** | `src/lib/media/browser-runtime/browser-capability.worker.ts` |
| **Create** | `src/hooks/chat/useChatBrowserCapabilityRuntime.ts` |
| **Create** | `src/hooks/chat/useChatBrowserCapabilityRuntime.test.tsx` |
| **Modify** | `src/hooks/useGlobalChat.tsx` |
| **Modify** | `src/core/services/ConversationMessages.ts` |
| **Modify as needed** | `src/core/entities/message-parts.ts` |
| **Modify as needed** | `src/lib/capabilities/capability-result-envelope.ts` |
| **Modify as needed** | `src/hooks/chat/useChatJobEvents.ts` |
| **Spec** | §3.12, §3.13, §5 browser-runtime tests, §8 |

### Task 6.3 outcomes

1. Add one browser capability registry that declares local-executable capabilities, supported input kinds, worker module, byte and duration limits, concurrency limits, and fallback or interruption policy.
2. Add one browser runtime state machine that owns probe, enqueue, start, progress, cancel, cleanup, overflow, fallback-required, and interrupted outcomes instead of distributing that logic across hooks and components.
3. Enforce the Sprint 0 defaults centrally: one active local execution per tab by default, at most two queued local executions beyond that slot, FIFO ordering, and deterministic reroute to server when a valid server route exists.
4. Project browser-local execution into normalized `job_status` parts with `resultEnvelope`, progress, replay snapshot, and artifacts so the transcript and progress strip stay path-independent.
5. Add startup reconciliation for reload, tab close, worker crash, and interrupted execution so stale local work becomes an explicit terminal or rerouted state before the UI shows it as active.
6. Keep local-runtime state tab-bound and conversation-scoped in v1, using compact session-scoped persistence or equivalent same-tab storage rather than pretending browser work is durable across devices.

### Task 6.3 notes

1. Use an explicit local job ID namespace such as `local_...` so browser-runtime items never collide with server deferred-job IDs.
2. Local browser-runtime projection should dispatch normalized parts directly. It should not fake SSE traffic or teach the parser layer about local events.
3. `ConversationMessages.upsertJobStatusMessage()` already has sequence-aware merge logic. Prefer feeding it richer parts over introducing a second merge path.
4. Startup reconciliation should finish before the strip treats a local execution as active. The absence of reconciliation is not evidence that the job still exists.

### Verify Task 6.3

```bash
npx vitest run src/lib/media/browser-runtime/browser-capability-registry.test.ts src/lib/media/browser-runtime/browser-capability-runtime.test.ts src/hooks/chat/useChatBrowserCapabilityRuntime.test.tsx src/hooks/chat/useChatJobEvents.test.tsx
```

---

## Task 6.4 - Lift current audio, chart, and graph outputs onto the media asset substrate

**What:** Make the current artifact-family media producers emit or promote normalized media assets, add the subtitle timing substrate needed by later composition work, and keep existing cards payload-first while improving replay-safe artifact identity.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/media/subtitle-timing.ts` |
| **Create** | `src/lib/media/subtitle-timing.test.ts` |
| **Modify** | `src/app/api/tts/route.ts` |
| **Create or modify as needed** | `src/app/api/tts/route.test.ts` |
| **Modify** | `src/core/use-cases/tools/generate-audio.tool.ts` |
| **Modify** | `src/core/use-cases/tools/UiTools.ts` |
| **Modify** | `src/core/use-cases/tools/chart-payload.ts` |
| **Modify** | `src/core/use-cases/tools/graph-payload.ts` |
| **Modify as needed** | `src/components/AudioPlayer.tsx` |
| **Modify as needed** | `src/components/MermaidRenderer.tsx` |
| **Modify** | `src/frameworks/ui/chat/plugins/custom/AudioPlayerCard.tsx` |
| **Modify** | `src/frameworks/ui/chat/plugins/custom/ChartRendererCard.tsx` |
| **Modify** | `src/frameworks/ui/chat/plugins/custom/GraphRendererCard.tsx` |
| **Modify** | `src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx` |
| **Modify** | `src/frameworks/ui/chat/plugins/custom/AudioPlayerCard.test.tsx` |
| **Modify** | `src/frameworks/ui/chat/plugins/custom/ChartRendererCard.test.tsx` |
| **Modify** | `src/frameworks/ui/chat/plugins/custom/GraphRendererCard.test.tsx` |
| **Modify** | `src/lib/capabilities/capability-result-envelope.test.ts` |
| **Spec** | §3.11, §3.13, §3.14, §5, §8 |

### Task 6.4 outcomes

1. `generate_audio` must resolve to a normalized media-asset path so cached and newly generated audio both converge on the same descriptor model instead of remaining permanently split between `cached_asset` and `client_fetch_pending` payload branches.
2. `POST /api/tts` should continue returning audio bytes, but Sprint 6 must make the resulting asset identity and replay-safe metadata available to the rest of the substrate rather than keeping it trapped in response headers and client-local state.
3. Add one bounded subtitle timing contract with stable cue ordering, text normalization, and duration bookkeeping so Sprint 7 can compose burned or sidecar subtitles without reinventing cue semantics.
4. Chart and graph generation must gain stable assetization paths for exported SVG, PNG, or graph payload artifacts so transcript history and later media composition can reference those outputs by descriptor rather than by live renderer state alone.
5. The existing audio, chart, and graph cards should prefer descriptor-backed artifacts when present, continue rendering from payload snapshots when necessary, and fall back honestly when neither path is safe.
6. Replay-safe transcript entries should carry compact media descriptors and preview metadata only. Heavy binary exports, large SVG payloads, and full subtitle documents belong in asset storage, not in envelopes.

### Task 6.4 notes

1. Keep the current artifact family honest. Sprint 6 is about normalized substrate and asset identity, not about prematurely moving these tools into the new media family.
2. If audio generation finishes after the initial tool result is rendered, update the live message state through the existing merge pathway rather than leaving history stuck in a permanent pending-fetch representation.
3. Subtitle timing is a substrate contract, not a product authoring tool. Keep it deterministic and compact.
4. Assetization should preserve the current specialized renderers. `AudioPlayer`, Mermaid, and graph rendering remain leaf concerns inside a descriptor-backed shell.

### Verify Task 6.4

```bash
npx vitest run src/lib/media/subtitle-timing.test.ts src/app/api/tts/route.test.ts src/frameworks/ui/chat/plugins/custom/AudioPlayerCard.test.tsx src/frameworks/ui/chat/plugins/custom/ChartRendererCard.test.tsx src/frameworks/ui/chat/plugins/custom/GraphRendererCard.test.tsx src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx src/lib/capabilities/capability-result-envelope.test.ts
```

---

## Task 6.5 - Lock drift guards and focused QA for media and runtime parity

**What:** Add the release-gate tests that fail when local runtime, media ingest, or descriptor-backed replay drifts back toward the current ad hoc model.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/api/chat/uploads/route.test.ts` |
| **Create or modify as needed** | `src/app/api/tts/route.test.ts` |
| **Modify** | `src/lib/user-files.test.ts` |
| **Modify** | `src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx` |
| **Modify** | `src/hooks/chat/useChatJobEvents.test.tsx` |
| **Modify as needed** | `src/frameworks/ui/chat/plugins/system/resolve-progress-strip.test.ts` |
| **Create** | `tests/browser-ui/chat-media-attachments.spec.ts` |
| **Create** | `tests/browser-ui/browser-capability-runtime.spec.ts` |
| **Modify as needed** | `tests/browser-ui/chat-progress-strip.spec.ts` |
| **Spec** | §5, §8 release-gate verification |

### Task 6.5 outcomes

1. Regression coverage must fail if media uploads lose ownership or cleanup semantics, if typed media attachments degrade back to untyped document uploads, or if persisted media metadata becomes inconsistent with stored assets.
2. Regression coverage must fail if browser-local capability execution bypasses normalized `job_status` projection or leaves the progress strip showing ghost active work after reload or interruption.
3. Regression coverage must fail if `generate_audio`, `generate_chart`, or `generate_graph` lose descriptor-backed artifact identity and fall back to live-only state for history replay.
4. Browser coverage must prove representative media upload, local-runtime fallback or interruption, and progress-strip truthfulness using realistic fixtures rather than screenshots.
5. Browser coverage must prove that the transcript and strip remain usable while local-runtime state changes. Sprint 6 may not trade substrate correctness for a noisy or unstable reading surface.
6. Finish with `npm run build` green so the new media and browser-runtime substrate does not quietly break the shared chat shell.

### Task 6.5 notes

1. Prefer invariant assertions over screenshot churn. The real regressions are wrong asset identity, wrong fallback behavior, ghost progress, and missing replay data.
2. Reuse the current progress-strip and artifact-card seams where possible. Sprint 6 should extend them, not replace their test strategy wholesale.
3. Keep the QA surface focused and truthful. If the media substrate needs a new test seam, add it deliberately instead of relying on a giant unrelated suite.

### Verify Task 6.5

```bash
npx vitest run src/app/api/chat/uploads/route.test.ts src/app/api/tts/route.test.ts src/lib/user-files.test.ts src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx src/hooks/chat/useChatJobEvents.test.tsx src/frameworks/ui/chat/plugins/system/resolve-progress-strip.test.ts
npx playwright test tests/browser-ui/chat-media-attachments.spec.ts tests/browser-ui/browser-capability-runtime.spec.ts tests/browser-ui/chat-progress-strip.spec.ts
```

---

## Sprint 6 Verification Bundle

Before marking Sprint 6 complete, run:

```bash
npx vitest run src/lib/media/media-asset-projection.test.ts src/lib/media/media-upload-policy.test.ts src/lib/media/media-metadata.test.ts src/lib/media/browser-runtime/browser-capability-registry.test.ts src/lib/media/browser-runtime/browser-capability-runtime.test.ts src/lib/media/subtitle-timing.test.ts src/lib/user-files.test.ts src/adapters/UserFileDataMapper.test.ts src/app/api/chat/uploads/route.test.ts src/app/api/tts/route.test.ts src/hooks/chat/useChatBrowserCapabilityRuntime.test.tsx src/hooks/chat/useChatJobEvents.test.tsx src/hooks/chat/useChatSend.test.tsx src/frameworks/ui/MessageList.test.tsx src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx src/frameworks/ui/chat/plugins/custom/AudioPlayerCard.test.tsx src/frameworks/ui/chat/plugins/custom/ChartRendererCard.test.tsx src/frameworks/ui/chat/plugins/custom/GraphRendererCard.test.tsx src/lib/capabilities/capability-result-envelope.test.ts
npx playwright test tests/browser-ui/chat-media-attachments.spec.ts tests/browser-ui/browser-capability-runtime.spec.ts tests/browser-ui/chat-progress-strip.spec.ts
npm run build
```

And keep markdown diagnostics clean in:

1. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md`
2. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/README.md`
3. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/sprint-6-browser-runtime-and-media-asset-substrate.md`

---

## Completion Checklist

- [ ] one canonical `MediaAssetDescriptor` exists and covers uploaded, generated, and derived media without requiring card-local payload parsing
- [ ] one canonical browser capability descriptor and runtime state machine exist for bounded local execution and explicit server fallback or interruption handling
- [ ] `user_files` storage and persistence have been extended additively for typed media assets and replay-safe metadata
- [ ] the governed chat upload path supports the approved media inputs without losing current ownership, conversation assignment, retry, or cleanup guarantees
- [ ] `attachment` message parts and chat send plumbing preserve typed media metadata instead of collapsing everything into generic document uploads
- [ ] browser-local runtime state projects through normalized `job_status` parts and the existing `UPSERT_JOB_STATUS` merge path rather than a second progress model
- [ ] startup reconciliation closes out, reroutes, or marks interrupted local browser work before the progress strip treats it as active
- [ ] `generate_audio`, `generate_chart`, and `generate_graph` emit or promote normalized media assets and replay-safe artifact identity without breaking current cards
- [ ] the subtitle timing substrate exists and is bounded, deterministic, and ready for later burned or sidecar composition work
- [ ] transcript replay remains payload-first and readable when media artifacts are cached, imported, or only partially retained
- [ ] focused route, unit, browser-runtime, browser, and build verification all pass
- [ ] markdown diagnostics are clean in all touched docs

---

## Sprint 6 Exit Criteria

Sprint 6 is complete only when the repository has one trustworthy answer to all of the following:

1. how uploaded, generated, and derived media assets are identified, typed, retained, and projected into transcript-safe artifact references
2. how the current chat attachment flow accepts governed media inputs without abandoning ownership, retry, cleanup, or imported-attachment degradation rules
3. how browser-local capability execution is admitted, queued, canceled, interrupted, reconciled on startup, and rerouted to the server when policy allows
4. how local browser execution feeds the same normalized `job_status` and progress-strip path used by server deferred jobs instead of inventing a second runtime surface
5. how current audio, chart, and graph producers gain stable media-asset identity and replay-safe transcript behavior without shipping FFmpeg-specific workflows early
6. how subtitle timing, replay budgets, and asset metadata stay compact enough for durable history rather than turning the transcript into a blob store
7. how focused tests fail immediately if media ingest, asset identity, browser-runtime recovery, or transcript replay drift back toward the current ad hoc state

If Sprint 7 still needs to rediscover any of those answers while adding FFmpeg execution or media-family routing, Sprint 6 is not complete.
