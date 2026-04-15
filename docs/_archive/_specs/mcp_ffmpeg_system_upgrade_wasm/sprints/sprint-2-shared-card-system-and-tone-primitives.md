# Sprint 2 - Shared Card System And Tone Primitives

> **Status:** Implemented
> **Goal:** Build the shared capability card shell, semantic tone contract, system-card family, and payload-first detail surfaces on top of the Sprint 1 descriptor and result-envelope layer, with explicit cleanliness, compositionality, and runtime-smoothness rules, without yet attempting full family rollout or global progress-strip wiring.
> **Spec refs:** `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md` §2.7, §3.5, §3.6, §3.10, §5, §6, §8
> **Prerequisite:** Sprint 1 complete

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md` | Canonical shared-card, tone, and system-surface contract |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/sprint-0-contract-freeze-and-inventory.md` | Fixed audit matrix, browser-runtime defaults, and replay-budget rules that Sprint 2 must respect |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/sprint-1-presentation-manifest-and-result-envelope.md` | The implemented descriptor and result-envelope layer that Sprint 2 must consume instead of bypassing |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/README.md` | Current roadmap sequencing and the rule that family rollout waits until Sprint 5 |
| `src/frameworks/ui/chat/registry/types.ts` | Current `ToolPluginProps` contract already carries `descriptor` and `resultEnvelope` |
| `src/frameworks/ui/chat/ToolPluginPartRenderer.tsx` | Current renderer bridge already resolves descriptors, envelopes, and the failure-card path |
| `src/frameworks/ui/chat/plugins/system/JobStatusFallbackCard.tsx` | Current generic fallback card with ad hoc shell and tone logic |
| `src/frameworks/ui/chat/plugins/system/ErrorCard.tsx` | Current failed and canceled state card with duplicated shell and tone markup |
| `src/frameworks/ui/chat/plugins/custom/EditorialWorkflowCard.tsx` | Rich custom card with duplicated shell, action, and detail-grid helpers that makes a good reference adopter |
| `src/frameworks/ui/chat/plugins/custom/JournalWorkflowCard.tsx` | Current structured custom card that still hand-rolls its own layout rather than using shared primitives |
| `src/frameworks/ui/chat/plugins/custom/WebSearchCard.tsx` | Delegates into `WebSearchResultCard`, which is useful for defining what Sprint 2 should not force into the shared shell yet |
| `src/frameworks/ui/chat/plugins/custom/CustomToolCardCompliance.test.tsx` | Current compliance surface for custom-card fallback behavior |
| `src/components/ThemeProvider.tsx` | Current theme runtime authority, including reduced-motion and view-transition constraints |
| `src/app/styles/chat.css` | Current chat-surface token usage and the right place to add shared capability-card selectors |
| `src/components/ContentModal.tsx` | Existing Radix dialog pattern that can inform a payload-first detail surface without copying its refetch behavior |

---

## Cross-Layer Constraints

1. Sprint 2 builds shared card primitives and system surfaces only. It must not introduce the global progress-strip aggregator, the header data menu, or any `ChatContentSurface.tsx` wiring that belongs to Sprints 3 and 4.
2. Sprint 2 must consume the Sprint 1 descriptor and result-envelope contracts. It must not reintroduce tool-specific chrome decisions through handwritten `toolName` switches or card-local routing rules.
3. Theme runtime stays authoritative. Shared card tones must resolve from existing CSS variables set by `ThemeProvider`, not from imported fixed palettes or copied design-system tokens.
4. Existing custom cards must keep working through the compatibility path while shared primitives land. Sprint 2 may use one representative custom card as a reference adopter, but full family rollout remains Sprint 5.
5. Shared system cards must preserve current import stability. Existing callers of `JobStatusFallbackCard` and `ErrorCard` should not break because Sprint 2 moved the real implementation into deeper shared surfaces.
6. Capability detail surfaces must stay payload-first. Existing dialog infrastructure is an implementation reference, not permission to add live refetch behavior for transcript cards.
7. `ProgressStripBubble` may be created as an isolated presentational component in Sprint 2, but it must not claim global strip behavior until Sprint 4 wires real normalized job state into the surface.

---

## Engineering Quality Bar

Sprint 2 is not complete because the markup looks more consistent. It is complete only if the shared-card layer is materially cleaner, easier to extend, and less error-prone than the current per-card duplication.

### Knuth bar - correctness and explicit invariants

1. Shared primitives must be deterministic and side-effect-free. Given the same props, they render the same DOM and perform no hidden fetch, mutation, time-based branching, or direct environment probing.
2. Tone resolution, card-state resolution, and any other repeated lookup logic must live in pure helpers with module-scope tables or pure functions. Do not recreate static lookup objects inside React render paths.
3. Shared primitives must encode explicit invariants instead of relying on call-site convention. If a header, action rail, or disclosure block requires payload-specific parsing to stay correct, it belongs one layer higher.
4. Any new conditional in the primitive layer must pay for itself. Nested branch growth inside shared primitives is a regression, not an abstraction win.

### Martin bar - single responsibility and stable interfaces

1. Every primitive should have one reason to change. `CapabilityCardShell` owns outer frame semantics, not header composition, action parsing, or artifact policy.
2. Prefer small, slot-oriented interfaces to broad prop bags. If a primitive starts collecting tool-specific booleans or payload-specific fields, split the responsibility instead of growing the component.
3. Keep dependency direction clean: cards may depend on primitives, but primitives may not depend on tool-name knowledge, payload guards, or registry policy.
4. Representative adoption in Sprint 2 must reduce duplication. If the editorial card still contains local shell/action/detail helpers after migration, Sprint 2 has not extracted enough value.

### GoF bar - the right patterns, used pragmatically

1. Use Strategy-style pure resolvers for tone and system-surface selection instead of scattering inline conditionals across cards and renderer bridges.
2. Keep `ToolPluginPartRenderer` as the adapter boundary. Shared system-surface selection should be delegated to pure helpers or dedicated components, not turned into a new God component.
3. Favor composition over inheritance. The shell, header, metrics, action rail, disclosure, and detail surface should compose into cards; Sprint 2 should not introduce a class hierarchy or deep wrapper chain.
4. Factories or resolvers are acceptable where they reduce branching and make tests sharper. They are not acceptable if they merely rename ad hoc conditionals without simplifying the design.

---

## Pragmatic Test Standard

1. Sprint 2 tests must prove behavior and invariants, not just snapshots. Use attribute assertions, interaction assertions, and resolver-unit tests ahead of broad snapshot files.
2. Every pure resolver added for tone or system-surface selection should have direct unit coverage independent of the React tree.
3. Primitive tests should assert semantic hooks such as `data-capability-*`, ARIA labels, disclosure behavior, and slot rendering rather than low-signal HTML snapshots.
4. System-card tests should prove degraded, failed, and normal fallback states from real `ToolPluginProps`-shaped inputs.
5. Representative adopter tests should prove that existing editorial actions, findings, and compatibility fallbacks still work after the shell migration.
6. The verification bundle should keep build and targeted integration tests green, but Sprint 2 should not broaden into an indiscriminate full-suite rewrite unless the primitive layer genuinely forces it.

---

## Runtime And UX Guardrails

1. Sprint 2 must not add new network fetches, transcript refetches, or server actions to render shared capability chrome.
2. Shared primitives should avoid unnecessary wrapper depth. If a primitive can render `null` or a fragment safely for empty content, it should do that rather than emit inert containers.
3. Shared-card styling should stay CSS-first and token-driven. Do not add runtime animation dependencies or JavaScript layout measurement for shell transitions.
4. New disclosures and detail surfaces must respect reduced-motion settings and preserve keyboard focus management.
5. Detail surfaces must not create nested scrolling or viewport traps by default. The default reading experience should remain calm and predictable on both desktop and mobile.

---

## QA Findings Before Implementation

1. `JobStatusFallbackCard.tsx` and `ErrorCard.tsx` each define their own rounded shell, border, background, shadow, and spacing classes. They are already a de facto system-card family, but they do not share a system-card base.
2. `EditorialWorkflowCard.tsx` contains local `ActionButtons`, `DetailGrid`, and `ResultCardShell` helpers, which proves the repo already wants shared primitives but currently reimplements them inside each card.
3. `JournalWorkflowCard.tsx` and `WebSearchCard.tsx` are structurally unrelated even though both now receive the same `descriptor` and `resultEnvelope` inputs from Sprint 1.
4. `ToolPluginPartRenderer.tsx` still hardcodes the failure path to `ErrorCard`, which means failed or canceled rendering is not yet represented as a first-class shared system-surface contract.
5. `chat.css` already exposes theme-driven chat surfaces, but it does not yet contain capability-card semantic hooks such as tone, card state, metric strip, disclosure region, or system-card section selectors.
6. `ThemeProvider.tsx` already owns reduced-motion, view-transition, and CSS-variable application. Current card code ignores that layer and reaches directly for one-off `var(--danger)` and `var(--accent)` mixes instead of a shared tone contract.
7. Existing card tests validate fallback and payload behavior, but there is no primitive-level test surface that would fail if shell semantics, tone mapping, or system-card consistency drift.

---

## Task 2.1 - Create the shared capability card primitives and semantic tone contract

**What:** Add the reusable primitives that define shell, header, metrics, actions, disclosure, and semantic tone behavior for capability cards.

| Item | Detail |
| --- | --- |
| **Create** | `src/frameworks/ui/chat/primitives/capability-card-tone.ts` |
| **Create** | `src/frameworks/ui/chat/primitives/CapabilityCardShell.tsx` |
| **Create** | `src/frameworks/ui/chat/primitives/CapabilityCardHeader.tsx` |
| **Create** | `src/frameworks/ui/chat/primitives/CapabilityMetricStrip.tsx` |
| **Create** | `src/frameworks/ui/chat/primitives/CapabilityArtifactRail.tsx` |
| **Create** | `src/frameworks/ui/chat/primitives/CapabilityTimeline.tsx` |
| **Create** | `src/frameworks/ui/chat/primitives/CapabilityDisclosure.tsx` |
| **Create** | `src/frameworks/ui/chat/primitives/CapabilityContextPanel.tsx` |
| **Create** | `src/frameworks/ui/chat/primitives/CapabilityActionRail.tsx` |
| **Create** | `src/frameworks/ui/chat/primitives/capability-card-tone.test.ts` |
| **Create** | `src/frameworks/ui/chat/primitives/capability-card-primitives.test.tsx` |
| **Modify** | `src/app/styles/chat.css` |
| **Spec** | §3.5, §5 contract tests |

### Task 2.1 outcomes

1. Define one `CapabilityTone` union covering `neutral`, `accent`, `success`, `warning`, `danger`, `editorial`, and `media`.
2. Add a pure tone-resolution helper that takes explicit tone override first, then descriptor family and card kind, then terminal state, so cards stop hardcoding tone branches inline.
3. Build `CapabilityCardShell` as the one shared outer container for capability cards and expose stable attributes such as `data-capability-card`, `data-capability-tone`, `data-capability-kind`, and `data-capability-state`.
4. Build `CapabilityCardHeader` for eyebrow, title, subtitle, and status cluster instead of letting each card hand-roll its own heading block.
5. Build `CapabilityMetricStrip`, `CapabilityArtifactRail`, `CapabilityTimeline`, `CapabilityDisclosure`, `CapabilityContextPanel`, and `CapabilityActionRail` as payload-agnostic primitives that receive already-normalized data and render no tool-specific parsing logic.
6. Add capability-card selectors to `chat.css` keyed off the new data attributes and resolve every tone from existing theme CSS variables such as `--surface`, `--foreground`, `--accent`, `--danger`, `--warning`, `--shadow-base`, and related tokenized mixes.
7. Keep all primitives side-effect-free and transcript-local. No primitive may fetch, mutate, or infer missing payload detail from the network.
8. Keep any tone maps, state maps, and resolver lookup tables at module scope so shared-card adoption does not add per-render allocation churn.
9. Primitive interfaces must stay slot-oriented and narrow. Tool-specific parsing, routing, or payload cleanup is an explicit non-goal for this layer.

### Task 2.1 notes

1. Sprint 2 is not a token-rewrite sprint. Reuse the repo's current `color-mix(...)` patterns and semantic variables rather than introducing a second color system.
2. `CapabilityCardShell` should be expressive enough for both system cards and rich family cards, which means it needs slot support rather than tool-specific prop sprawl.
3. Tone is semantic, not brand-specific. `editorial` and `media` should be implemented as semantic aliases over existing theme variables, not as hardcoded new palettes.
4. Motion must degrade gracefully. Any entry, hover, or disclosure transition added in `chat.css` must respect reduced-motion settings and should not depend on `framer-motion` or similar runtime animation libraries.
5. Do not optimize through obscurity. If a primitive needs non-obvious behavior, encode it in a named resolver or helper with direct tests rather than inline JSX cleverness.

### Verify Task 2.1

```bash
npx vitest run src/frameworks/ui/chat/primitives/capability-card-tone.test.ts src/frameworks/ui/chat/primitives/capability-card-primitives.test.tsx
```

---

## Task 2.2 - Build the shared system-card family and payload-first detail surfaces

**What:** Turn fallback, error, compatibility, detail, and future strip-bubble surfaces into first-class shared system components instead of ad hoc one-off cards.

| Item | Detail |
| --- | --- |
| **Create** | `src/frameworks/ui/chat/plugins/system/SystemJobCard.tsx` |
| **Create** | `src/frameworks/ui/chat/plugins/system/CapabilityErrorCard.tsx` |
| **Create** | `src/frameworks/ui/chat/plugins/system/CompatibilitySnapshotCard.tsx` |
| **Create** | `src/frameworks/ui/chat/plugins/system/ProgressStripBubble.tsx` |
| **Create** | `src/frameworks/ui/chat/plugins/system/CapabilityDetailDrawer.tsx` |
| **Create** | `src/frameworks/ui/chat/plugins/system/resolve-system-card.ts` |
| **Create** | `src/frameworks/ui/chat/plugins/system/resolve-system-card.test.ts` |
| **Create** | `src/frameworks/ui/chat/plugins/system/system-card-family.test.tsx` |
| **Modify** | `src/frameworks/ui/chat/plugins/system/JobStatusFallbackCard.tsx` |
| **Modify** | `src/frameworks/ui/chat/plugins/system/ErrorCard.tsx` |
| **Modify as needed** | `src/frameworks/ui/chat/ToolPluginPartRenderer.tsx` |
| **Spec** | §3.6, §3.10, §5 transcript durability tests |

### Task 2.2 outcomes

1. Create `SystemJobCard` as the canonical generic queued, running, and succeeded system surface for tools that do not yet have a family-specific card.
2. Create `CapabilityErrorCard` as the canonical failed and canceled system surface, using the shared shell and action rail rather than bespoke error markup.
3. Create `CompatibilitySnapshotCard` for legacy or degraded historical records where the descriptor exists but only partial or compatibility-level payload detail is still available.
4. Create `CapabilityDetailDrawer` as a payload-first drill-in surface using the repo's existing dialog patterns as a reference, but render all detail from props and never refetch transcript data.
5. Create `ProgressStripBubble` as a pure presentational component with dot state, label, timestamp or percent slot, and optional action slot, but do not wire it into `ChatContentSurface.tsx` in Sprint 2.
6. Keep `JobStatusFallbackCard.tsx` and `ErrorCard.tsx` as thin compatibility adapters or re-exports so current imports stay stable while the real implementation moves into the new system-card family.
7. Add a pure system-surface resolver so failed, canceled, compatibility, and generic fallback routing is testable without booting the React tree.
8. Update `ToolPluginPartRenderer.tsx` only as far as needed to route failed, canceled, or degraded-compatibility transcript states through the new shared system surfaces without changing descriptor lookup or registry ownership.

### Task 2.2 notes

1. `CompatibilitySnapshotCard` must render honest degraded-fidelity messaging. If the payload is legacy or partial, the UI should say so rather than pretending the card is equivalent to a native envelope-backed result.
2. `CapabilityDetailDrawer` should reuse Radix `Dialog` patterns or the same overlay conventions already proven in `ContentModal.tsx`, but it must not copy `ContentModal`'s fetch-on-open behavior.
3. System surfaces should remain useful even when only `part`, only `toolCall`, or only `resultEnvelope` is present. Sprint 1 made those combinations possible; Sprint 2 needs to respect all of them.
4. `ProgressStripBubble` is intentionally isolated here so Sprint 4 can wire it into real strip state without changing its card semantics again.
5. Resolver helpers should make the renderer bridge simpler than it is now. If `ToolPluginPartRenderer.tsx` gets longer or more branch-heavy after Sprint 2, the system-card abstraction is failing the Martin bar.

### Verify Task 2.2

```bash
npx vitest run src/frameworks/ui/chat/plugins/system/resolve-system-card.test.ts src/frameworks/ui/chat/plugins/system/system-card-family.test.tsx src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx
```

---

## Task 2.3 - Add one representative shared-card adoption path without claiming full family rollout

**What:** Apply the new shared shell and action/disclosure primitives to one rich custom card so the primitive layer is proven against real transcript data before Sprint 5 rolls families over wholesale.

| Item | Detail |
| --- | --- |
| **Modify** | `src/frameworks/ui/chat/plugins/custom/EditorialWorkflowCard.tsx` |
| **Modify** | `src/frameworks/ui/chat/plugins/custom/EditorialWorkflowCard.test.tsx` |
| **Modify as needed** | `src/frameworks/ui/chat/plugins/custom/CustomToolCardCompliance.test.tsx` |
| **Spec** | §3.5, §5 contract tests |

### Task 2.3 outcomes

1. Migrate `EditorialWorkflowCard.tsx` onto `CapabilityCardShell`, `CapabilityCardHeader`, `CapabilityActionRail`, and `CapabilityDisclosure` so Sprint 2 proves the shared layer on a genuinely rich card rather than only on fallbacks.
2. Preserve all existing payload guards and Sprint 1 envelope-first compatibility behavior. Shared primitives change chrome and structure, not tool-result interpretation.
3. Use the editorial card as the reference implementation for future family rollout, especially because it already exercises metrics, summaries, disclosures, findings, and action rails in one place.
4. Do not treat this one reference adopter as full family rollout. Journal, theme, profile, artifact, and search cards remain on their current markup unless a minimal change is required for compile or test health.
5. The editorial-card migration must delete duplicated shell helpers where the primitive layer has replaced them. Sprint 2 should leave that file smaller or flatter, not merely differently abstracted.

### Task 2.3 notes

1. `WebSearchCard.tsx` is not the right Sprint 2 reference adopter because it delegates into `WebSearchResultCard`, which would mix the shared-card sprint with a deeper search-surface redesign.
2. `JournalWorkflowCard.tsx` should wait for later rollout because it is still a better fit for the richer context and timeline work that lands after Sprint 3.
3. If the editorial card still needs a local helper after adopting the shared shell, that helper should be a temporary bridge and not a reason to skip creating the shared primitive.
4. Prefer net branch-count reduction over aesthetic churn. The representative adopter should demonstrate cleaner control flow and easier local reasoning, not just visual consistency.

### Verify Task 2.3

```bash
npx vitest run src/frameworks/ui/chat/plugins/custom/EditorialWorkflowCard.test.tsx src/frameworks/ui/chat/plugins/custom/CustomToolCardCompliance.test.tsx
```

---

## Task 2.4 - Add drift guards for tone, shell, and system-card consistency

**What:** Add the tests that fail when the shared shell, tone mapping, or system-card routing starts drifting back toward ad hoc markup.

| Item | Detail |
| --- | --- |
| **Modify** | `src/frameworks/ui/chat/primitives/capability-card-primitives.test.tsx` |
| **Modify** | `src/frameworks/ui/chat/plugins/system/system-card-family.test.tsx` |
| **Modify** | `src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx` |
| **Modify as needed** | `tests/plugin-integration.test.tsx` |
| **Modify as needed** | `src/frameworks/ui/chat/plugins/custom/EditorialWorkflowCard.test.tsx` |
| **Spec** | §5 contract tests, transcript durability tests |

### Task 2.4 outcomes

1. Primitive tests fail if shared card shells stop emitting their tone, state, and card-kind data attributes.
2. System-card tests fail if fallback, error, or compatibility rendering drops back to bespoke markup or bypasses the shared shell.
3. `ToolPluginPartRenderer` tests prove failed or canceled transcript states route through the shared system-card family without losing descriptor or envelope data.
4. Editorial card tests prove the representative shared-shell adoption does not break current action behavior or compatibility fallback behavior.
5. Progress-bubble and detail-drawer tests stay isolated and payload-first so Sprint 4 can wire them later without redefining the contract.
6. Shared-card tests should prefer invariant and interaction assertions over broad snapshots so failures explain real regressions instead of raw DOM churn.

### Verify Task 2.4

```bash
npx vitest run src/frameworks/ui/chat/primitives/capability-card-tone.test.ts src/frameworks/ui/chat/primitives/capability-card-primitives.test.tsx src/frameworks/ui/chat/plugins/system/resolve-system-card.test.ts src/frameworks/ui/chat/plugins/system/system-card-family.test.tsx src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx tests/plugin-integration.test.tsx src/frameworks/ui/chat/plugins/custom/EditorialWorkflowCard.test.tsx
```

---

## Sprint 2 Verification Bundle

Before marking Sprint 2 complete, run:

```bash
npx vitest run src/frameworks/ui/chat/primitives/capability-card-tone.test.ts src/frameworks/ui/chat/primitives/capability-card-primitives.test.tsx src/frameworks/ui/chat/plugins/system/resolve-system-card.test.ts src/frameworks/ui/chat/plugins/system/system-card-family.test.tsx src/frameworks/ui/chat/plugins/custom/EditorialWorkflowCard.test.tsx src/frameworks/ui/chat/plugins/custom/CustomToolCardCompliance.test.tsx src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx tests/plugin-integration.test.tsx tests/full-registry-coverage.test.ts src/frameworks/ui/RichContentRenderer.test.tsx
npm run build
```

And keep markdown diagnostics clean in:

1. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md`
2. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/README.md`
3. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/sprint-2-shared-card-system-and-tone-primitives.md`

---

## Completion Checklist

- [x] a shared semantic capability tone contract exists
- [x] shared shell, header, metric, action, disclosure, context, artifact, and timeline primitives exist
- [x] capability-card selectors in `chat.css` resolve from existing theme variables instead of fixed palette imports
- [x] tone and system-surface resolution logic is pure, module-scoped, and directly unit-tested
- [x] shared system-job, error, compatibility, progress-bubble, and detail-surface components exist
- [x] `JobStatusFallbackCard` and `ErrorCard` remain stable compatibility adapters
- [x] one representative non-system card renders through the shared shell without breaking payload guards or compatibility behavior
- [x] `ProgressStripBubble` exists as a pure presentational surface and is not yet wired into `ChatContentSurface.tsx`
- [x] `CapabilityDetailDrawer` is payload-first and performs no refetch
- [x] disclosures and detail surfaces preserve focus semantics and respect reduced motion
- [x] shared-card adoption reduces duplication and branch complexity in the representative adopter
- [x] drift guards fail when tone, shell, or system-card consistency regresses

---

## Sprint 2 Exit Criteria

Sprint 2 is complete only when the repository has one authoritative answer to all of the following:

1. which shared primitives own capability-card shell, header, metric, disclosure, context, artifact, timeline, and action chrome
2. how semantic tones are resolved from descriptors and state without hardcoded one-off card branches
3. how generic fallback, error, and compatibility transcript states render through a first-class shared system-card family
4. how one real rich workflow card adopts the shared shell without prematurely treating Sprint 2 as full family rollout
5. which tests fail when card tone, shell, or system-card consistency drifts back toward bespoke per-card markup
6. how Sprint 2 keeps the shared-card layer cleaner, flatter, and more testable than the duplicated helpers it replaces

If the codebase still answers any of those questions through duplicated card wrappers, ad hoc color-mix branches inside every card, or failure surfaces that only exist as bespoke components with no shared contract, Sprint 2 is not complete.
