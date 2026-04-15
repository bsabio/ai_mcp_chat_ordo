# Sprint 7 - Hybrid FFmpeg Browser And Server Execution

> **Status:** Draft
> **Goal:** Ship the first governed FFmpeg capability family on top of the Sprint 6 media substrate, with bounded browser-local WASM execution for simple transforms, deferred server fallback for heavier work, structured composition plans, and transcript-safe media result envelopes.
> **Spec refs:** `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md` §3.12 through §3.14, §4, §5, §6, §8
> **Prerequisite:** Sprint 6 complete

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md` | Canonical browser-runtime, hybrid routing, FFmpeg family, security, testing, and done-criteria contract |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/README.md` | Roadmap sequencing and the exact Sprint 7 filename plus goal |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/sprint-6-browser-runtime-and-media-asset-substrate.md` | The substrate Sprint 7 builds on: typed media assets, governed ingest, browser-runtime projection, subtitle timing, and descriptor-backed chart or graph persistence |
| `src/core/entities/media-asset.ts` | Live `MediaAssetDescriptor` substrate for `image`, `chart`, `graph`, `audio`, `video`, `subtitle`, and `waveform` assets |
| `src/core/entities/user-file.ts` | Persisted user-file metadata already supports `video`, `subtitle`, `waveform`, provenance, retention class, and derivative references |
| `src/core/entities/browser-capability.ts` | Shared browser capability contract already supports `runtimeKind: "wasm_worker"`, fallback policy, recovery policy, and explicit interruption states |
| `src/core/entities/capability-presentation.ts` | Presentation contract already supports `family: "media"`, `cardKind: "media_render"`, and `executionMode: "hybrid"` |
| `src/core/entities/capability-result.ts` | Unified result-envelope and artifact-ref contract that both browser and server FFmpeg paths must share |
| `src/lib/media/media-asset-projection.ts` | Stable projector from stored media assets into transcript-safe artifact refs |
| `src/lib/media/subtitle-timing.ts` | Deterministic subtitle timing substrate ready for burn-in or sidecar packaging |
| `src/lib/media/browser-runtime/browser-capability-registry.ts` | Current browser registry only contains `generate_audio`, `generate_chart`, and `generate_graph`, all `worker_only` and non-FFmpeg |
| `src/lib/media/browser-runtime/job-snapshots.ts` | Existing normalized `job_status` projection seam already used by the transcript and progress strip |
| `src/hooks/chat/useBrowserCapabilityRuntime.ts` | Current browser-runtime hook persists chart or graph assets and materializes TTS audio, but it is still specialized rather than a generic FFmpeg runtime |
| `src/frameworks/ui/chat/registry/capability-presentation-registry.ts` | Live manifest still contains no `media` family descriptors and no FFmpeg capability entries |
| `src/core/tool-registry/ToolDescriptor.ts` | Core execution registry still models only inline or deferred execution, so Sprint 7 must keep hybrid routing explicit rather than accidental |
| `src/core/use-cases/tools/generate-audio.tool.ts` | Existing media-adjacent tool descriptor pattern for browser-managed output |
| `src/core/use-cases/tools/generate-chart.tool.ts` | Existing structured visual tool descriptor pattern |
| `src/core/use-cases/tools/generate-graph.tool.ts` | Existing structured graph tool descriptor pattern |
| `src/core/use-cases/tools/UiTools.ts` | Current command home for browser-rendered audio, chart, and graph payloads |
| `src/lib/jobs/deferred-job-handler-names.ts` | Live deferred handler set contains editorial jobs only; no media or FFmpeg handlers exist yet |
| `src/lib/jobs/deferred-job-handlers.ts` | Current server worker registration seam Sprint 7 must extend for deferred media fallback |
| `src/lib/jobs/job-capability-registry.ts` | Governance seam for server fallback, retry, retention, and artifact policy |
| `src/lib/jobs/job-progress-state.ts` | Current phased-progress registry, which media jobs should extend rather than bypass |
| `src/lib/jobs/deferred-job-worker.ts` | Mature server-side progress, artifact, replay, and terminal result projection path for heavy media work |
| `src/app/api/chat/jobs/route.ts` | Existing conversation job collection route that can list job snapshots and is the cleanest additive seam for media-job enqueueing |
| `src/app/api/chat/jobs/[jobId]/route.ts` | Existing cancel and retry route that hybrid media jobs must reuse unchanged in user experience |
| `src/app/api/chat/uploads/route.ts` | Governed upload route already accepts typed media attachments and derived browser-runtime assets, providing the owned asset-input seam for composition work |
| `src/app/api/user-files/[id]/route.ts` | Stable owned asset-serving route for persisted video, subtitle, waveform, and auxiliary outputs |
| `src/frameworks/ui/chat/plugins/custom/AudioPlayerCard.tsx` | Current descriptor-backed media-adjacent card reference |
| `src/frameworks/ui/chat/plugins/system/resolve-progress-strip.ts` | Existing global strip selector that hybrid media jobs must feed through the same normalized `job_status` path |
| `tests/browser-ui/chat-progress-strip.spec.ts` | Current browser coverage for strip truthfulness that Sprint 7 should extend |
| `package.json` | No FFmpeg or FFprobe dependency and no `qa:sprint-7` script currently exist |
| `next.config.ts` | Current Next config has redirects only and no COOP or COEP or other browser-WASM isolation headers |

---

## Cross-Layer Constraints

1. Sprint 7 ships FFmpeg on top of the Sprint 6 substrate. It must not replace `user_files`, `MediaAssetDescriptor`, `CapabilityResultEnvelope`, or the normalized `job_status` path with a second media-only execution model.
2. All FFmpeg and media-composition capabilities must consume structured composition plans and stable asset IDs only. Raw FFmpeg CLI strings, shell fragments, or model-authored filter graphs are out of scope.
3. Browser-local FFmpeg work must execute through a governed worker runtime and project through the same `job_status`, progress-strip, and transcript machinery used by current browser-managed and deferred job flows.
4. Server fallback must reuse the existing deferred-job worker, capability registry, job read model, and `/api/chat/jobs` plus `/api/chat/jobs/[jobId]` surfaces. Sprint 7 must not invent a second server job console.
5. Asset inputs must be ownership-checked, MIME-validated, and descriptor-backed before browser or server execution begins. Media plans may never point at raw disk paths, ambient URLs, or opaque temporary handles.
6. Browser and server FFmpeg outputs must persist through the same `user_files` seam and project back into the same transcript artifact model. The card system must not need a browser-only or server-only render path.
7. Cross-origin isolation, worker boot prerequisites, and browser capability probes must be explicit. If the browser path cannot run, the user must see a deterministic `fallback_required`, `failed`, or deferred reroute outcome.
8. Existing `generate_audio`, `generate_chart`, and `generate_graph` flows remain valid source-asset producers and artifact-family cards. Sprint 7 should add the first media-family renderers rather than destabilizing those current artifact-family surfaces.
9. Replay-safe envelopes stay compact. Video outputs, subtitle sidecars, waveform data, and auxiliary manifests belong in governed asset storage, not inside unbounded transcript payloads.
10. V1 media scope remains bounded to the product needs named in the spec: simple image or chart or graph plus TTS clip renders, bounded multi-clip composition, combining existing videos, subtitle generation or muxing, and waveform generation. Sprint 7 is not a general timeline editor.
11. Sprint 7 should start with one new chat-exposed media capability, `compose_media`. Subtitle packaging and waveform generation should begin as structured plan options and auxiliary outputs behind that capability, not as separate first-pass chat tools.

---

## Engineering Quality Bar

Sprint 7 is not complete because FFmpeg runs somewhere. It is complete only if route selection, worker execution, deferred fallback, and media output packaging become explicit, auditable, and materially easier to test than the current specialized browser-runtime branches.

### Knuth bar - explicit invariants and bounded routing

1. Define one explicit composition-plan contract and one explicit routing function. The same plan must deterministically choose `browser_wasm` or `deferred_server` from validated inputs, capability probes, and bounded limits.
2. Define one explicit FFmpeg result model with a primary output plus optional subtitle and waveform artifacts. Browser and server paths may differ operationally, but they must converge on the same envelope and artifact projection.
3. Define one bounded set of browser-eligible transforms. If a transform exceeds byte, duration, clip-count, or feature limits, routing must fail closed into explicit server fallback or explicit user-visible failure.
4. Keep plan and replay metadata compact. Transcript envelopes may store route decisions, summary data, and stable artifact identifiers, but they may not store generated binary payloads, giant SVG or waveform arrays, or full subtitle documents.

### Martin bar - narrow responsibilities and stable seams

1. Browser capability probing, worker execution, output packaging, and route selection must live in focused helpers. `useBrowserCapabilityRuntime.ts` should compose those seams rather than becoming a giant FFmpeg coordinator.
2. Server route handlers should validate, authorize, and enqueue or serve. Media composition and FFmpeg execution belong in use-case or media-service modules, not inside `route.ts` files.
3. The deferred-job runtime should stay the server execution boundary. Sprint 7 may extend handler names, progress phases, and capability policy, but it should not smuggle media work around the worker.
4. The chat renderer should stay payload-first. Media cards should consume normalized envelopes and artifact refs, not parse repository records or browser-worker internals.

### GoF bar - pragmatic patterns, not decorative ones

1. Use a Strategy-style router for `browser_wasm` versus `deferred_server`. Capability probes, plan budgets, and recovery policy should choose the route, not scattered `if` trees in hooks and cards.
2. Use Adapter helpers to map FFmpeg execution results into `MediaAssetDescriptor`, `CapabilityArtifactRef`, and `CapabilityResultEnvelope` shapes. UI components and job projectors should not hand-roll those translations.
3. Use a Factory-style registration seam for the first media-family capability descriptors instead of adding another ad hoc renderer map.
4. Favor composition of small helpers over a monolithic FFmpeg manager. If Sprint 7 leaves the runtime hook, job registry, or media card with more open-coded special cases than they have today, the design is failing.

---

## Pragmatic Test Standard

1. Add direct unit coverage for composition-plan validation, asset-kind admission, route selection, browser capability probing, output packaging, and replay-safe artifact projection. These are deterministic seams and should not rely on browser tests to stay correct.
2. Add focused browser-runtime tests proving FFmpeg probe failure, local worker success, explicit fallback-required results, cancellation, and interruption recovery all project through normalized `job_status` parts.
3. Add focused deferred-job tests proving server media handlers register in the live job registry, emit phased progress, persist artifact refs, and remain cancelable or retryable through the existing job action surfaces.
4. Add direct card tests proving media-family renderers behave the same whether the result came from browser WASM or the server worker and fall back honestly when payloads are incomplete.
5. Add route coverage for additive `POST /api/chat/jobs` media enqueueing and for serving persisted video, subtitle, and waveform assets through `/api/user-files/[id]` with ownership checks intact.
6. Add browser coverage for one successful browser-local FFmpeg path, one explicit reroute to deferred server, and one progress-strip continuity scenario that spans the reroute without duplicate or ghost entries.
7. Add a focused Sprint 7 QA script and keep `npm run build` green. Hybrid media touches runtime, jobs, uploads, storage, and client rendering all at once; a production build and a governed QA entry point are part of the contract.

---

## Runtime And UX Guardrails

1. FFmpeg work must never run on the main UI thread. Browser-local transforms may be orchestrated from React, but actual media processing must stay in workers.
2. The user must be able to tell whether work stayed local or rerouted to the server without learning infrastructure terms. Route summaries and progress labels should be explicit and compact.
3. Browser capability probes must finish before the progress strip represents a browser-local media task as active. Unknown is not the same thing as running.
4. Media cards must remain readable on mobile. A succeeded composition card should show the primary output, route summary, and optional subtitle or waveform artifacts without becoming a miniature editing timeline.
5. Browser fallback should not duplicate transcript entries. The same logical media request should evolve through one normalized `job_status` history rather than spawning unrelated browser and server cards.
6. Subtitle, waveform, and MP4 outputs must share the same ownership, retention, and cleanup guarantees as other `user_files` assets. Temporary staging data must have explicit cleanup rules.
7. The first media-family cards should preserve payload-first replay. If an artifact is no longer available, the historical record should degrade honestly rather than rendering a broken or empty player.
8. Bounded local transforms must stay bounded in practice. Sprint 7 should reject unsupported multi-clip or oversize plans early rather than attempting work the browser cannot finish safely.

---

## QA Findings Before Implementation

1. `package.json` currently contains no FFmpeg dependency, FFprobe wrapper, or Sprint 7 QA command. The project cannot execute browser or server FFmpeg work today without explicit dependency and script changes.
2. `next.config.ts` currently defines redirects only. There is no COOP or COEP or other cross-origin-isolation configuration even though `BrowserCapabilityDescriptor` already supports `requiresCrossOriginIsolation`.
3. `src/lib/media/browser-runtime/browser-capability-registry.ts` currently registers only `generate_audio`, `generate_chart`, and `generate_graph`, all with `runtimeKind: "worker_only"`. There are no `wasm_worker` descriptors yet.
4. `src/hooks/chat/useBrowserCapabilityRuntime.ts` currently orchestrates specialized audio, chart, and graph follow-up work directly from the hook. There is no generic browser worker executor or hybrid media router yet.
5. `src/frameworks/ui/chat/registry/capability-presentation-registry.ts` currently contains no `media` family descriptors. The live chat manifest still treats current media-adjacent outputs as artifact-family cards only.
6. `src/core/use-cases/tools` currently contains `generate-audio`, `generate-chart`, and `generate-graph` tool descriptors but no FFmpeg, composition, subtitle-packaging, or waveform-generation tools.
7. `src/lib/jobs/deferred-job-handler-names.ts` and `src/lib/jobs/job-capability-registry.ts` currently advertise editorial handlers only. There is no server fallback path for media work yet.
8. `src/app/api/chat/jobs/route.ts` currently supports `GET` listing only. There is no additive route for client-triggered media-job enqueueing when the hybrid router selects `deferred_server`.
9. `src/lib/media/subtitle-timing.ts` now exists and is deterministic, but no current tool or worker consumes it for sidecar or burned subtitle packaging.
10. `src/core/entities/media-asset.ts`, `src/core/entities/user-file.ts`, and `src/lib/media/media-asset-projection.ts` already support `video`, `subtitle`, and `waveform` outputs, so the storage and transcript substrate is ready even though no FFmpeg producer uses it yet.
11. `src/core/tool-registry/ToolDescriptor.ts` still models only `inline | deferred`. Hybrid routing therefore needs to remain an explicit runtime or presentation-layer bridge unless Sprint 7 proves that widening the core execution type materially simplifies the system.
12. `tests/browser-ui` currently includes progress-strip, jobs-page, and capability-family rollout coverage, but no FFmpeg-specific browser specs exist yet for local success, reroute, or media-card continuity.

---

## Sprint 7 Tool-Set Freeze

Sprint 7 should narrow the first FFmpeg surface to one primary chat-exposed capability and two implementation-only helper seams.

### Chat-exposed capability

1. `compose_media`: owns the structured composition request, covers the V1 product scope named in the spec, carries subtitle policy as an option (`none`, `burned`, `sidecar`, or `both`), carries waveform output as an option rather than a separate top-level user intent, and returns one primary media result envelope plus auxiliary subtitle or waveform artifacts when requested.

### Internal helper seams, not first-pass chat tools

1. Subtitle packaging or muxing: begins as helper logic under the composition pipeline, may persist subtitle assets and artifact refs, and should not be a separate chat tool in Sprint 7.
2. Waveform generation: begins as an auxiliary artifact step behind `compose_media`, may be implemented as a helper or executor module, and should not be a separate chat tool in Sprint 7.

### Why this tighter split is the right v1

1. The spec names subtitle and waveform work as supported outputs, not as mandatory standalone user-facing capabilities.
2. The current repo already has a strong artifact and transcript substrate but no live media-family cards or FFmpeg handlers. Starting with one primary capability reduces routing, card, and governance drift.
3. A single `compose_media` capability keeps browser and server parity simpler because both paths can converge on one composition plan, one result envelope shape, and one media-family card.
4. If later user research or production usage proves subtitle packaging or waveform export need direct invocation, they can graduate into standalone tools in a later sprint with real evidence instead of speculative taxonomy.

---

## Task 7.1 - Freeze composition-plan and hybrid routing contracts

**What:** Define the structured media-composition plan, route-selection contract, and replay-safe output model that both browser and server FFmpeg paths will share.

| Item | Detail |
| --- | --- |
| **Create** | `src/core/entities/media-composition.ts` |
| **Create** | `src/lib/media/ffmpeg/media-composition-plan.ts` |
| **Create** | `src/lib/media/ffmpeg/media-composition-plan.test.ts` |
| **Create** | `src/lib/media/ffmpeg/media-execution-router.ts` |
| **Create** | `src/lib/media/ffmpeg/media-execution-router.test.ts` |
| **Modify as needed** | `src/core/entities/browser-capability.ts` |
| **Modify as needed** | `src/core/entities/capability-result.ts` |
| **Modify as needed** | `src/lib/media/media-asset-projection.ts` |
| **Modify as needed** | `src/lib/media/subtitle-timing.ts` |
| **Spec** | §3.13, §3.14, §4, §5, §8 |

### Task 7.1 outcomes

1. Introduce one canonical `VideoCompositionPlan` or equivalent structured media-plan contract covering visual or audio inputs, subtitle policy, motion policy, bounded duration, and output format without admitting raw command strings.
2. Introduce one pure media execution router that returns `browser_wasm` or `deferred_server` from validated plan shape, asset metadata, capability probes, and explicit size or duration limits.
3. Keep asset inputs descriptor-backed. Plans should reference stable asset IDs plus structured options, not raw URLs, shell paths, or browser blob handles.
4. Extend replay-safe result metadata so the eventual primary video, optional subtitle sidecar, and optional waveform artifact can all project into compact artifact refs without path-specific card logic.
5. Keep the current `ToolDescriptor` split honest. If tool execution stays `inline | deferred`, the hybrid router must become the explicit bridge rather than an undocumented side effect.
6. Reject impossible or unsafe plans early, including unsupported asset-kind combinations, missing ownership context, invalid subtitle policies, and local-only transforms that exceed the browser limits.

### Task 7.1 notes

1. Separate plan normalization from route selection. Validation should answer “is this plan structurally legal,” and routing should answer “where should it run.”
2. Keep route selection deterministic and pure. Browser probe inputs can be passed in as data; the router itself should not reach into React or the DOM.
3. Persisted output metadata should stay additive. A future richer media editor should not require reopening the Sprint 7 plan contract.

### Verify Task 7.1

```bash
npx vitest run src/lib/media/ffmpeg/media-composition-plan.test.ts src/lib/media/ffmpeg/media-execution-router.test.ts src/lib/media/media-asset-projection.test.ts src/lib/media/subtitle-timing.test.ts
```

---

## Task 7.2 - Add the browser FFmpeg WASM path and governed output persistence

**What:** Add the first `wasm_worker` media capability path for bounded local transforms, including browser capability probing, worker execution, and persisted output packaging through the existing media substrate.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/media/browser-runtime/ffmpeg-capability-probe.ts` |
| **Create** | `src/lib/media/browser-runtime/ffmpeg-capability-probe.test.ts` |
| **Create** | `src/lib/media/browser-runtime/ffmpeg-browser-executor.ts` |
| **Create** | `src/lib/media/browser-runtime/ffmpeg-browser-executor.test.ts` |
| **Create** | `src/lib/media/browser-runtime/ffmpeg.worker.ts` |
| **Create as needed** | `src/lib/media/ffmpeg/ffmpeg-output-metadata.ts` |
| **Modify** | `src/lib/media/browser-runtime/browser-capability-registry.ts` |
| **Modify** | `src/lib/media/browser-runtime/job-snapshots.ts` |
| **Modify** | `src/hooks/chat/useBrowserCapabilityRuntime.ts` |
| **Modify as needed** | `src/lib/media/media-upload-policy.ts` |
| **Modify as needed** | `src/app/api/chat/uploads/route.ts` |
| **Modify as needed** | `src/app/api/chat/uploads/route.test.ts` |
| **Modify** | `next.config.ts` |
| **Modify** | `package.json` |
| **Spec** | §3.12, §3.13, §4, §5 browser-runtime tests, §8 |

### Task 7.2 outcomes

1. Register the first `wasm_worker` browser capability descriptor for `compose_media` and declare its supported input kinds, byte budgets, duration budgets, fallback policy, and isolation requirements explicitly.
2. Add one browser capability probe that checks worker availability, WASM package readiness, isolation prerequisites when required, and the bounded transform class requested by the plan.
3. Add one worker-backed browser executor for the V1 local transforms named in the spec: a single visual plus audio clip to MP4, bounded subtitle burn-in or sidecar packaging, and other short deterministic transforms that stay under the browser limits.
4. Persist browser-generated MP4, subtitle, and waveform outputs through the existing governed asset path so local execution still yields stable `user_files` identities and transcript-safe artifact refs.
5. Emit `succeeded`, `failed`, and `fallback_required` results through normalized `job_status` parts and the existing browser job-snapshot path. The browser path must never rely on private component state for user-visible progress.
6. Make dependency and runtime-prerequisite changes explicit. If FFmpeg WASM requires package additions, worker bundling, or response headers, Sprint 7 must add them deliberately and test them directly.

### Task 7.2 notes

1. Keep heavy work off the main thread. The hook should orchestrate, not transcode.
2. Avoid teaching the upload route a second asset model. Derived browser outputs should reuse the typed asset substrate established in Sprint 6.
3. If the chosen FFmpeg WASM package requires COOP or COEP, scope the config change intentionally and verify the browser path degrades honestly when those headers are absent.

### Verify Task 7.2

```bash
npx vitest run src/lib/media/browser-runtime/ffmpeg-capability-probe.test.ts src/lib/media/browser-runtime/ffmpeg-browser-executor.test.ts src/hooks/chat/useBrowserCapabilityRuntime.test.tsx src/lib/media/browser-runtime/job-snapshots.test.ts src/app/api/chat/uploads/route.test.ts
```

---

## Task 7.3 - Add deferred server fallback, `compose_media`, and phased media handlers

**What:** Extend the existing deferred-job system so heavy or rerouted `compose_media` plans can execute on the server with the same governance, progress, and replay contracts as current deferred jobs, while subtitle packaging and waveform generation remain internal auxiliary steps.

| Item | Detail |
| --- | --- |
| **Create** | `src/core/use-cases/tools/compose-media.tool.ts` |
| **Create** | `src/core/use-cases/tools/compose-media.tool.test.ts` |
| **Create** | `src/lib/media/ffmpeg/server/ffmpeg-server-executor.ts` |
| **Create** | `src/lib/media/ffmpeg/server/ffmpeg-server-executor.test.ts` |
| **Create as needed** | `src/lib/media/ffmpeg/subtitle-packager.ts` |
| **Create as needed** | `src/lib/media/ffmpeg/subtitle-packager.test.ts` |
| **Create as needed** | `src/lib/media/ffmpeg/waveform-artifact.ts` |
| **Create as needed** | `src/lib/media/ffmpeg/waveform-artifact.test.ts` |
| **Modify as needed** | `src/core/use-cases/tools/UiTools.ts` |
| **Modify** | `src/lib/jobs/deferred-job-handler-names.ts` |
| **Modify** | `src/lib/jobs/deferred-job-handlers.ts` |
| **Modify** | `src/lib/jobs/job-capability-registry.ts` |
| **Modify** | `src/lib/jobs/job-progress-state.ts` |
| **Modify** | `src/app/api/chat/jobs/route.ts` |
| **Modify** | `src/app/api/chat/jobs/route.test.ts` |
| **Modify** | `src/lib/jobs/deferred-job-runtime.test.ts` |
| **Modify** | `src/lib/jobs/job-capability-registry.test.ts` |
| **Spec** | §3.13, §3.14, §4, §5, §8 |

### Task 7.3 outcomes

1. Introduce `compose_media` as the first FFmpeg-backed chat capability and keep it a structured-plan producer rather than a byte emitter. Its transcript-safe payload should describe the request, selected route, and final artifact identity without embedding media blobs.
2. Extend `POST /api/chat/jobs` additively so the browser runtime can enqueue deferred media jobs when the router selects `deferred_server` or when a local attempt falls back.
3. Extend the deferred-job handler registry and capability governance so server media work inherits explicit retry, retention, and artifact policy from the same system used by editorial jobs.
4. Add phased media progress definitions for staging assets, rendering media, packaging subtitle or waveform outputs when requested, and persisting artifacts so the strip and transcript can represent server media work precisely.
5. Persist server-generated MP4, subtitle, and waveform outputs through `user_files` and project them back into the same `CapabilityResultEnvelope` and artifact-ref shape used by the browser path.
6. Keep authorization and ownership checks intact. No server media execution may begin until the plan’s input assets have been validated against the requesting user and conversation scope.

### Task 7.3 notes

1. Prefer extending the existing jobs collection route over inventing a media-only enqueue endpoint unless the current route truly cannot carry the needed request contract.
2. Keep the server executor behind a provider boundary. Route handlers and deferred-job registration code should never compose raw shell commands from model-authored strings.
3. Subtitle packaging and waveform generation should begin as internal executor helpers or optional post-processing stages, not as separate top-level job families.
4. If server fallback uses a different FFmpeg provider than the browser path, the difference should stop at the executor boundary. The envelope, artifact, and progress contract must still converge.

### Verify Task 7.3

```bash
npx vitest run src/core/use-cases/tools/compose-media.tool.test.ts src/lib/media/ffmpeg/subtitle-packager.test.ts src/lib/media/ffmpeg/waveform-artifact.test.ts src/lib/media/ffmpeg/server/ffmpeg-server-executor.test.ts src/app/api/chat/jobs/route.test.ts src/lib/jobs/deferred-job-runtime.test.ts src/lib/jobs/job-capability-registry.test.ts
```

---

## Task 7.4 - Add media-family cards and hybrid transcript rendering

**What:** Introduce the first live `media` family transcript surfaces so browser and server FFmpeg outputs render through one shared card language with stable artifact rails and honest fallback states.

| Item | Detail |
| --- | --- |
| **Create** | `src/frameworks/ui/chat/plugins/custom/MediaRenderCard.tsx` |
| **Create** | `src/frameworks/ui/chat/plugins/custom/MediaRenderCard.test.tsx` |
| **Modify** | `src/frameworks/ui/chat/registry/capability-presentation-registry.ts` |
| **Modify** | `src/frameworks/ui/chat/registry/default-tool-registry.ts` |
| **Modify** | `src/frameworks/ui/chat/ToolPluginPartRenderer.tsx` |
| **Modify** | `src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx` |
| **Modify as needed** | `src/frameworks/ui/chat/plugins/system/resolve-progress-strip.ts` |
| **Modify as needed** | `src/frameworks/ui/chat/plugins/system/resolve-progress-strip.test.ts` |
| **Modify as needed** | `src/frameworks/ui/chat/plugins/system/ChatProgressStrip.test.tsx` |
| **Spec** | §3.3, §3.5, §3.13, §3.14, §5 |

### Task 7.4 outcomes

1. Introduce the first live `family: "media"` capability descriptor for `compose_media` with `cardKind: "media_render"` and explicit `executionMode: "hybrid"` or `deferred` policy as appropriate.
2. Add one shared media-family card that can render the same normalized envelope whether the result came from browser WASM or the deferred worker, including route summary, duration, primary output, and auxiliary subtitle or waveform artifacts.
3. Keep the transcript path-independent. Browser and server FFmpeg outputs must converge before they reach the card so the renderer does not branch by execution backend.
4. Extend the progress-strip and detail surfaces so reroute, interruption, and deferred continuation stay visible without creating duplicate logical jobs.
5. Preserve current artifact-family cards as source and input surfaces. Sprint 7 should add the first media-family result surface, not overload `AudioPlayerCard`, `ChartRendererCard`, or `GraphRendererCard` into general video-composition cards.
6. Historical playback must remain payload-first. If artifact availability changes later, the media card should still present a truthful summary and any surviving artifact metadata rather than collapsing into a blank frame.

### Task 7.4 notes

1. Prefer one coherent media-family renderer over separate browser-only and server-only media cards.
2. Keep mobile readability in scope. Detail drawers and disclosures are preferable to a permanently expanded timeline-like card.
3. Route labels should inform the user without turning the card into infrastructure UI. The product is about the output, not about exposing internal architecture details.

### Verify Task 7.4

```bash
npx vitest run src/frameworks/ui/chat/plugins/custom/MediaRenderCard.test.tsx src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx src/frameworks/ui/chat/plugins/system/resolve-progress-strip.test.ts src/frameworks/ui/chat/plugins/system/ChatProgressStrip.test.tsx
```

---

## Task 7.5 - Add Sprint 7 QA, browser verification, and release gates

**What:** Lock the hybrid media rollout behind focused QA so route drift, worker regressions, and server fallback inconsistencies fail before release.

| Item | Detail |
| --- | --- |
| **Create** | `tests/browser-ui/chat-ffmpeg-browser-path.spec.ts` |
| **Create** | `tests/browser-ui/chat-ffmpeg-server-fallback.spec.ts` |
| **Modify** | `tests/browser-ui/chat-progress-strip.spec.ts` |
| **Create** | `src/app/api/user-files/[id]/route.test.ts` |
| **Create** | `scripts/run-sprint-7-qa.ts` |
| **Modify** | `package.json` |
| **Modify as needed** | `tests/browser-ui/README.md` |
| **Spec** | §5 browser tests, §5 full verification, §8 release-gate verification |

### Task 7.5 outcomes

1. Browser coverage must prove a representative browser-local FFmpeg success path, including stable transcript rendering and persisted media artifacts.
2. Browser coverage must prove an explicit reroute from browser-local intent to deferred server execution, with progress-strip continuity and no duplicate logical job surfaces.
3. Route coverage must prove owned video, subtitle, and waveform assets can be served through `/api/user-files/[id]` while unauthorized access remains blocked.
4. The Sprint 7 QA script must collect focused evidence across plan validation, browser capability probing, hybrid enqueueing, deferred media execution, transcript rendering, and production build stability.
5. Release gating must fail if browser-local media work bypasses normalized `job_status`, if server fallback loses artifact identity, or if the media card diverges between browser and server outputs.
6. Finish with `npm run build` green so the hybrid media work does not quietly break the shared Next.js application shell.

### Task 7.5 notes

1. Prefer invariant assertions over screenshot churn. The real regressions are wrong route selection, ghost progress, lost artifact identity, missing fallback, and broken ownership.
2. Keep the QA entry point focused. A Sprint 7 QA script should validate hybrid media behavior rather than rerunning the entire repository indiscriminately.
3. Reuse the current browser test style and Playwright-managed production server flow already used by `jobs-page` and deferred-job smoke coverage.

### Verify Task 7.5

```bash
npx vitest run src/app/api/user-files/[id]/route.test.ts
npx playwright test tests/browser-ui/chat-ffmpeg-browser-path.spec.ts tests/browser-ui/chat-ffmpeg-server-fallback.spec.ts tests/browser-ui/chat-progress-strip.spec.ts
npm run qa:sprint-7
```

---

## Sprint 7 Verification Bundle

Before marking Sprint 7 complete, run:

```bash
npx vitest run src/lib/media/ffmpeg/media-composition-plan.test.ts src/lib/media/ffmpeg/media-execution-router.test.ts src/lib/media/browser-runtime/ffmpeg-capability-probe.test.ts src/lib/media/browser-runtime/ffmpeg-browser-executor.test.ts src/lib/media/browser-runtime/job-snapshots.test.ts src/hooks/chat/useBrowserCapabilityRuntime.test.tsx src/core/use-cases/tools/compose-media.tool.test.ts src/lib/media/ffmpeg/subtitle-packager.test.ts src/lib/media/ffmpeg/waveform-artifact.test.ts src/lib/media/ffmpeg/server/ffmpeg-server-executor.test.ts src/app/api/chat/jobs/route.test.ts src/app/api/user-files/[id]/route.test.ts src/lib/jobs/deferred-job-runtime.test.ts src/lib/jobs/job-capability-registry.test.ts src/frameworks/ui/chat/plugins/custom/MediaRenderCard.test.tsx src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx src/frameworks/ui/chat/plugins/system/resolve-progress-strip.test.ts src/frameworks/ui/chat/plugins/system/ChatProgressStrip.test.tsx
npx playwright test tests/browser-ui/chat-ffmpeg-browser-path.spec.ts tests/browser-ui/chat-ffmpeg-server-fallback.spec.ts tests/browser-ui/chat-progress-strip.spec.ts
npm run qa:sprint-7
npm run build
```

And keep markdown diagnostics clean in:

1. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md`
2. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/README.md`
3. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/sprint-7-hybrid-ffmpeg-browser-and-server-execution.md`

---

## Completion Checklist

- [ ] one canonical structured media-composition plan and one deterministic route selector exist for `browser_wasm` versus `deferred_server`
- [ ] the browser runtime contains the first `wasm_worker` FFmpeg capability path with explicit capability probing, bounded limits, and honest fallback behavior
- [ ] browser-local MP4, subtitle, and waveform outputs persist through `user_files` with stable asset IDs and transcript-safe artifact refs
- [ ] server fallback reuses the deferred-job runtime, governance registry, phased progress, cancel, and retry surfaces rather than inventing a second server path
- [ ] additive `POST /api/chat/jobs` media enqueueing exists or an equally clean existing seam has been extended deliberately for deferred media execution
- [ ] the first media-family capability descriptor for `compose_media` and the shared `media_render` card exist without destabilizing current artifact-family source renderers
- [ ] browser and server FFmpeg results converge on the same `CapabilityResultEnvelope` and `job_status` path, so cards and strip selectors remain backend-agnostic
- [ ] cross-origin-isolation and worker prerequisites are explicit, tested, and user-visible when absent rather than silently breaking browser-local execution
- [ ] subtitle sidecars, burned-caption outcomes, and optional waveform artifacts remain compact, owned, and replay-safe
- [ ] focused unit, hook, route, browser, QA-script, and build verification all pass
- [ ] markdown diagnostics are clean in all touched docs

---

## Sprint 7 Exit Criteria

Sprint 7 is complete only when the repository has one trustworthy answer to all of the following:

1. how a structured media-composition request is validated, budgeted, and routed to browser WASM or deferred server execution without raw FFmpeg command access
2. how browser-local FFmpeg work is probed, started, canceled, interrupted, reconciled, and either completed locally or rerouted cleanly to the server
3. how the first server-side media handlers integrate with the existing deferred-job registry, worker, progress model, cancel, and retry surfaces
4. how browser and server media outputs converge on the same persisted asset model, artifact refs, transcript envelopes, and shared media-family card surface
5. how the progress strip and transcript stay truthful when a media request moves from a local attempt to a deferred server job
6. how bounded subtitle and waveform outputs are packaged and retained without turning transcript payloads into a blob store
7. how focused QA fails immediately if hybrid routing, output identity, browser prerequisites, or media-card continuity drift back toward ad hoc special cases

If Sprint 8 still needs to rediscover any of those answers while closing release gates and operational evidence, Sprint 7 is not complete.
