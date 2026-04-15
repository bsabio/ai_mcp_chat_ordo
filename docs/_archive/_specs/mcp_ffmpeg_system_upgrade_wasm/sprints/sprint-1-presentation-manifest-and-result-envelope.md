# Sprint 1 - Presentation Manifest And Result Envelope

> **Status:** Implemented
> **Goal:** Introduce the canonical capability presentation manifest and unified result-envelope contract, then thread both through the current presenter and plugin-renderer path without breaking existing custom cards or stored transcript records.
> **Spec refs:** `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md` §3.3, §3.4, §3.10, §5, §6, §8
> **Prerequisite:** Sprint 0 complete

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md` | Canonical contract for the presentation registry, unified result envelope, and payload-first transcript replay |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/sprint-0-contract-freeze-and-inventory.md` | First-pass chat-surface inventory and the locked browser-runtime and replay-budget defaults |
| `src/frameworks/ui/chat/registry/default-tool-registry.ts` | Current renderer selection is still a handwritten `toolName -> React component` map |
| `src/frameworks/ui/chat/registry/ToolPluginContext.tsx` | Current plugin registry only exposes `getRenderer(toolName)` |
| `src/frameworks/ui/chat/registry/types.ts` | Current plugin props only carry raw `toolCall`, `part`, and computed actions |
| `src/frameworks/ui/chat/ToolPluginPartRenderer.tsx` | Current renderer resolves a component by tool name and synthesizes a `toolCall.result` from `part.resultPayload` |
| `src/frameworks/ui/MessageList.tsx` | Current assistant tool-render entries are threaded into `ToolPluginPartRenderer` here |
| `src/adapters/ChatPresenter.ts` | Current presenter builds `toolRenderEntries`, derives computed actions, and still uses tool-specific payload guards |
| `src/lib/jobs/job-status.ts` | Current job projection still infers titles and summaries heuristically from `requestPayload` and `resultPayload` |
| `src/lib/jobs/deferred-job-result.ts` | Current deferred-job result wrapper is job-shaped and not yet aligned to a platform-wide capability result contract |
| `src/core/entities/message-parts.ts` | Current `JobStatusMessagePart` carries `resultPayload` but no explicit capability result envelope |
| `src/frameworks/ui/chat/plugins/custom/AudioPlayerCard.tsx` | Representative current custom card that reads raw `toolCall.result` and falls back to `toolCall.args` |
| `src/frameworks/ui/chat/plugins/custom/JournalWorkflowCard.tsx` | Representative current custom card that branches on raw action payloads |
| `src/frameworks/ui/chat/plugins/custom/WebSearchCard.tsx` | Representative current custom card that validates a typed payload guard against raw tool results |
| `src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx` | Current focused regression surface for card routing and error-card behavior |
| `src/adapters/ChatPresenter.test.ts` | Current regression surface for job-derived actions and tool-render entry generation |
| `tests/tool-plugin-registry.test.tsx` | Existing top-level registry and plugin-renderer regression surface |
| `tests/full-registry-coverage.test.ts` | Existing renderer coverage test that Sprint 1 should extend rather than replace |
| `tests/plugin-integration.test.tsx` | Existing plugin integration test surface that can validate compatibility during the transition |

---

## Cross-Layer Constraints

1. `ToolDescriptor` remains the execution registry, and `JOB_CAPABILITY_REGISTRY` remains the governance registry. Sprint 1 must not move execution or authorization truth into the presentation layer.
2. Sprint 1 is additive and compatibility-first. Existing raw tool outputs, stored transcript records, and current custom cards must continue to render while the new manifest and envelope are introduced.
3. Non-chat tools classified in Sprint 0 remain outside the conversation presentation manifest by default. Sprint 1 must not quietly pull jobs/admin/operator tools back into chat.
4. This sprint does not introduce the shared card shell, tone system, or progress strip UI. It prepares the data and registry layer that later sprints will consume.
5. The outer `DeferredJobResultPayload.deferred_job` wrapper remains intact in Sprint 1 so stream/event and route behavior stay backward-compatible while the new envelope is threaded in.

---

## QA Findings Before Implementation

1. Renderer selection is still a handwritten map in `default-tool-registry.ts`. There is no descriptor layer describing family, card kind, history mode, retry support, or default surface.
2. `ToolPluginContext.tsx` only exposes `getRenderer(toolName)`, so cards cannot currently access descriptor metadata even when the repo already knows that information from Sprint 0.
3. `ToolPluginProps` carries only raw `toolCall`, `part`, and `computedActions`, so there is no canonical place to pass a typed descriptor or unified result envelope into a card.
4. `ChatPresenter.ts` still derives actions from tool-specific payload guards for editorial and journal results. Those actions work today, but the logic is coupled to raw payload shapes rather than a shared capability contract.
5. `buildJobStatusPartFromProjection()` in `src/lib/jobs/job-status.ts` still depends on heuristic title/subtitle and summary inference from `requestPayload` and `resultPayload`.
6. `deferred-job-result.ts` currently wraps job state in `DeferredJobEnvelope`, but it does not expose the cross-capability envelope described in the parent spec.
7. Representative custom cards such as `AudioPlayerCard`, `JournalWorkflowCard`, and `WebSearchCard` all inspect raw `toolCall.result`, proving the migration has to be compatibility-first rather than a big-bang payload rewrite.

---

## Task 1.1 - Create the core presentation and envelope contracts

**What:** Add core types for the capability presentation manifest and unified result envelope so all later registry, presenter, and job projection work shares one contract.

| Item | Detail |
| --- | --- |
| **Create** | `src/core/entities/capability-presentation.ts` |
| **Create** | `src/core/entities/capability-result.ts` |
| **Modify** | `src/core/entities/message-parts.ts` |
| **Spec** | §3.3, §3.4, §3.10 |

### Task 1.1 outcomes

1. Define `CapabilityFamily`, `CapabilityCardKind`, `CapabilityProgressMode`, `CapabilityDefaultSurface`, and `CapabilityPresentationDescriptor` in one core entity module.
2. Define `CapabilityProgressPhase`, `CapabilityArtifactRef`, and `CapabilityResultEnvelope` in one core entity module.
3. Extend `JobStatusMessagePart` with an additive `resultEnvelope?: CapabilityResultEnvelope | null` field.
4. Keep existing `resultPayload`, `actions`, and legacy fields on `JobStatusMessagePart` unchanged in Sprint 1 so historical records and current tests stay backward-compatible.
5. Do not move renderer components, React types, or UI-specific registry code into the core layer.

### Task 1.1 notes

1. Keep these files type-only in Sprint 1. Runtime projection and registry logic belong to later tasks in this sprint.
2. `CapabilityArtifactRef` should align with the Sprint 0 replay-budget rules and the future media-asset model, but this sprint does not yet introduce the full media asset descriptor.
3. The additive `resultEnvelope` field exists to let the platform migrate without breaking `resultPayload` consumers all at once.

### Verify Task 1.1

```bash
npm run build
```

---

## Task 1.2 - Create the capability presentation registry and registry-backed renderer adapter

**What:** Replace the ad hoc renderer map with a real presentation registry that can expose both descriptor metadata and renderer resolution for chat-exposed capabilities.

| Item | Detail |
| --- | --- |
| **Create** | `src/frameworks/ui/chat/registry/capability-presentation-registry.ts` |
| **Create** | `src/frameworks/ui/chat/registry/capability-presentation-registry.test.ts` |
| **Modify** | `src/frameworks/ui/chat/registry/ToolPluginContext.tsx` |
| **Modify** | `src/frameworks/ui/chat/registry/types.ts` |
| **Modify** | `src/frameworks/ui/chat/registry/default-tool-registry.ts` |
| **Modify as needed** | `tests/tool-plugin-registry.test.tsx` |
| **Spec** | §3.2, §3.3, §5 contract tests |

### Task 1.2 outcomes

1. Create one registry module that exports the Sprint 1 descriptor set for all Sprint 0 `chatExposed = true` conversation surfaces.
2. The registry entries must at minimum cover the currently mapped custom-card tools and the current fallback-only chat tools listed in Sprint 0.
3. The registry must exclude Sprint 0 non-chat defaults such as `get_deferred_job_status`, `list_deferred_jobs`, `get_my_job_status`, `list_my_jobs`, and the admin/operator-only tools.
4. `ToolPluginRegistry` must become descriptor-aware by exposing `getDescriptor(toolName)` alongside `getRenderer(toolName)`.
5. `createDefaultToolRegistry()` should become a thin adapter over the canonical descriptor registry plus the current component mapping, not a hand-maintained standalone source of truth.
6. `ToolPluginProps` should gain additive `descriptor?: CapabilityPresentationDescriptor` and `resultEnvelope?: CapabilityResultEnvelope | null` fields.

### Task 1.2 notes

1. Sprint 1 is not the shared-card sprint. `cardKind` is contract data here, not a command to replace the current component set.
2. Registry tests should assert inclusion for the current custom-card surfaces and explicit exclusion for Sprint 0 non-chat defaults.
3. Fallback-only chat tools still need a descriptor row even if they continue to resolve to `JobStatusFallbackCard` or compatibility rendering for now.

### Verify Task 1.2

```bash
npx vitest run src/frameworks/ui/chat/registry/capability-presentation-registry.test.ts src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx tests/tool-plugin-registry.test.tsx
```

---

## Task 1.3 - Add shared envelope projection helpers for current raw results

**What:** Introduce projection helpers that can wrap current inline-tool and deferred-job payloads into `CapabilityResultEnvelope` without forcing every tool producer to emit native envelopes immediately.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/capabilities/capability-result-envelope.ts` |
| **Create** | `src/lib/capabilities/capability-result-envelope.test.ts` |
| **Create** | `src/lib/jobs/job-status.test.ts` |
| **Create** | `src/lib/jobs/deferred-job-result.test.ts` |
| **Modify** | `src/lib/jobs/deferred-job-result.ts` |
| **Modify** | `src/lib/jobs/job-status.ts` |
| **Spec** | §3.4, §3.10, §5 contract and transcript tests |

### Task 1.3 outcomes

1. Add `isCapabilityResultEnvelope(value)` and `projectCapabilityResultEnvelope(...)` helpers in a shared non-UI library module.
2. Sprint 1 is adapter-first: it may project current raw payloads into envelopes instead of rewriting every tool command to emit native envelopes immediately.
3. `projectCapabilityResultEnvelope(...)` must support the current editorial, journal, chart, graph, audio, theme, profile, referral, and web-search conversation surfaces from Sprint 0.
4. `buildJobStatusPartFromProjection()` must prefer envelope summary, subtitle, progress, and replay-snapshot fields when an envelope is present, then fall back to the current heuristics only when needed.
5. `DeferredJobEnvelope` must gain an additive `resultEnvelope?: CapabilityResultEnvelope | null` field while preserving the existing outer `deferred_job` wrapper and current `resultPayload` behavior.
6. Sprint 1 must not require native envelope output from every existing tool command. Projected envelopes are acceptable as long as transcript playback and renderer inputs become consistent.

### Task 1.3 notes

1. Keep the current blog and journal payload guard helpers as legacy compatibility adapters in Sprint 1. Do not delete them yet.
2. Envelope projection should enforce the Sprint 0 replay-snapshot budget rules. Any over-budget case needs an explicit test and exception path.
3. Unknown or unmapped raw payloads should not produce fabricated detail. It is better to return `null` and let compatibility rendering continue than to invent an incorrect envelope.

### Verify Task 1.3

```bash
npx vitest run src/lib/capabilities/capability-result-envelope.test.ts src/lib/jobs/job-status.test.ts src/lib/jobs/deferred-job-result.test.ts
```

---

## Task 1.4 - Thread descriptor and envelope data through the current presenter and plugin path

**What:** Make the presenter, message list, and plugin renderer descriptor-aware and envelope-aware while preserving current raw payload behavior for compatibility.

| Item | Detail |
| --- | --- |
| **Modify** | `src/adapters/ChatPresenter.ts` |
| **Modify** | `src/frameworks/ui/MessageList.tsx` |
| **Modify** | `src/frameworks/ui/chat/ToolPluginPartRenderer.tsx` |
| **Modify as needed** | current custom cards under `src/frameworks/ui/chat/plugins/custom/**` |
| **Modify** | `src/adapters/ChatPresenter.test.ts` |
| **Modify** | `src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx` |
| **Spec** | §3.3, §3.4, §3.10, §5 transcript durability tests |

### Task 1.4 outcomes

1. `PresentedMessage.toolRenderEntries` must carry descriptor and result-envelope data for both `tool-call` and `job-status` entries.
2. `MessageList.tsx` must thread `descriptor` and `resultEnvelope` into `ToolPluginPartRenderer`.
3. `ToolPluginPartRenderer.tsx` must resolve the descriptor first, then the renderer, and pass both the descriptor and projected envelope to the card.
4. `ToolPluginPartRenderer.tsx` must continue synthesizing `toolCall.result` from `part.resultPayload` for backward compatibility in Sprint 1.
5. Current custom cards should prefer `props.resultEnvelope?.payload` when present and fall back to their existing raw `toolCall.result` guards when the envelope is absent.
6. `ChatPresenter.ts` may keep the current computed-action logic in Sprint 1, but where an envelope is present it should read envelope payload first instead of bypassing the new contract.

### Task 1.4 notes

1. Do not attempt to extract a generic cross-family action-manifest system in Sprint 1. Keep current editorial and journal action derivation intact, but make it envelope-aware.
2. Representative cards that must remain working through the transition include `AudioPlayerCard`, `WebSearchCard`, `InspectThemeCard`, `ProfileCard`, `ReferralQrCard`, `EditorialWorkflowCard`, `JournalWorkflowCard`, `ChartRendererCard`, and `GraphRendererCard`.
3. `RichContentRenderer.tsx` and its legacy `job-status` block should remain untouched except for any minimal type updates required by additive `message-parts` changes.

### Verify Task 1.4

```bash
npx vitest run src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx src/adapters/ChatPresenter.test.ts src/frameworks/ui/RichContentRenderer.test.tsx
```

---

## Task 1.5 - Add drift guards for descriptor and envelope coverage

**What:** Add focused tests that fail when the new manifest or envelope projection layer drifts away from the audited chat surface.

| Item | Detail |
| --- | --- |
| **Modify** | `tests/full-registry-coverage.test.ts` |
| **Modify as needed** | `src/frameworks/ui/chat/registry/capability-presentation-registry.test.ts` |
| **Modify as needed** | `src/adapters/ChatPresenter.test.ts` |
| **Modify as needed** | `tests/tool-plugin-registry.test.tsx` |
| **Spec** | §5 contract tests, transcript durability tests |

### Task 1.5 outcomes

1. Tests fail if any Sprint 0 `chatExposed = true` capability lacks a descriptor entry.
2. Tests fail if any Sprint 0 `chatExposed = false` default is accidentally registered as a conversation presentation descriptor.
3. Tests prove `ToolPluginPartRenderer` can render a completed job-status payload via the new envelope path without breaking current cards.
4. Tests prove `ChatPresenter` still derives the current editorial and journal actions through the new envelope-aware path.
5. Tests prove legacy records without an envelope still fall back to the current compatibility behavior.
6. Extend the existing registry coverage tests so they assert descriptor inclusion and exclusion, not only component fallback behavior.

### Verify Task 1.5

```bash
npx vitest run tests/full-registry-coverage.test.ts tests/tool-plugin-registry.test.tsx src/frameworks/ui/chat/registry/capability-presentation-registry.test.ts src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx src/adapters/ChatPresenter.test.ts
```

---

## Sprint 1 Verification Bundle

Before marking Sprint 1 complete, run:

```bash
npx vitest run src/lib/capabilities/capability-result-envelope.test.ts src/lib/jobs/job-status.test.ts src/lib/jobs/deferred-job-result.test.ts src/frameworks/ui/chat/registry/capability-presentation-registry.test.ts src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx src/adapters/ChatPresenter.test.ts tests/full-registry-coverage.test.ts tests/tool-plugin-registry.test.tsx
npm run build
```

And keep markdown diagnostics clean in:

1. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md`
2. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/README.md`
3. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/sprint-1-presentation-manifest-and-result-envelope.md`

---

## Completion Checklist

- [x] core capability presentation and result-envelope types exist
- [x] `JobStatusMessagePart` carries additive envelope data without breaking legacy payload fields
- [x] the capability presentation registry covers every Sprint 0 chat-exposed conversation surface
- [x] Sprint 0 non-chat defaults remain outside the conversation presentation registry
- [x] deferred-job and inline-tool payloads can be projected into a shared result envelope
- [x] presenter and plugin-renderer paths pass descriptor and envelope data into cards
- [x] current custom cards still render through the compatibility path when no envelope is present
- [x] focused drift guards fail when descriptor coverage or envelope projection falls out of sync

---

## Sprint 1 Exit Criteria

Sprint 1 is complete only when the repository has one authoritative answer to all of the following:

1. which chat-exposed capabilities exist as presentation descriptors
2. which renderer each descriptor resolves to
3. how an inline tool result or deferred job result becomes a shared capability envelope
4. how cards receive both descriptor metadata and result-envelope data without breaking legacy payload consumers
5. which tests fail when the audited chat surface drifts from the manifest or envelope layer

If the codebase still answers any of those questions through handwritten renderer maps, tool-by-tool presenter guesses, or payload-specific conditionals with no shared contract, Sprint 1 is not complete.
