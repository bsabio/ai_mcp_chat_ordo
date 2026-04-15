# Sprint 5 - Current Capability Family Rollout

> **Status:** Draft
> **Goal:** Move the current chat-exposed editorial, search, artifact, theme, profile, and journal families onto the shared card system, retire silent fallback coverage for those families, and keep system and compatibility routing explicit, honest, and test-backed.
> **Spec refs:** `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md` §3.2, §3.3, §3.5, §3.6, §3.10, §5, §6.2, §8
> **Prerequisite:** Sprint 4 complete

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md` | Canonical capability-audit, presentation-registry, shared-card, compatibility, transcript-durability, testing, and done-criteria contract |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/README.md` | Roadmap sequencing and the exact Sprint 5 filename plus goal |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/sprint-2-shared-card-system-and-tone-primitives.md` | Shared card shell, header, action rail, context, disclosure, metric, artifact, and timeline primitives already available for reuse |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/sprint-3-job-phase-model-and-transcript-durability.md` | Payload-first transcript and compatibility expectations that Sprint 5 must consume rather than reinterpret |
| `src/frameworks/ui/chat/registry/capability-presentation-registry.ts` | Live chat manifest with 45 current descriptors across artifact, search, theme, profile, editorial, journal, and system families |
| `src/frameworks/ui/chat/registry/default-tool-registry.ts` | Current renderer map showing 18 custom renderers and 27 remaining fallback renderers |
| `src/frameworks/ui/chat/ToolPluginPartRenderer.tsx` | Routing seam that already distinguishes custom cards, shared system cards, compatibility snapshots, and fallback status rendering |
| `src/frameworks/ui/chat/plugins/custom/EditorialWorkflowCard.tsx` | Existing shared-shell editorial reference implementation with multiple payload branches already covered |
| `src/frameworks/ui/chat/plugins/custom/WebSearchCard.tsx` | Current search-family renderer that only handles `admin_web_search` structured payloads |
| `src/frameworks/ui/chat/plugins/custom/InspectThemeCard.tsx` | Current theme-family renderer that still uses local table and list markup rather than shared primitives |
| `src/frameworks/ui/chat/plugins/custom/ProfileCard.tsx` | Current profile-family renderer for only `get_my_profile` and `update_my_profile`, also still table-driven |
| `src/frameworks/ui/chat/plugins/custom/ReferralQrCard.tsx` | Current profile-family renderer for referral QR output with ad hoc list and table markup |
| `src/frameworks/ui/chat/plugins/custom/JournalWorkflowCard.tsx` | Partial journal-family renderer covering only workflow summary and publish readiness |
| `src/frameworks/ui/chat/plugins/custom/ChartRendererCard.tsx` | Artifact renderer that currently bypasses the shared card shell entirely |
| `src/frameworks/ui/chat/plugins/custom/GraphRendererCard.tsx` | Artifact renderer that currently bypasses the shared card shell entirely |
| `src/frameworks/ui/chat/plugins/custom/AudioPlayerCard.tsx` | Artifact renderer that currently bypasses the shared card shell entirely |
| `src/frameworks/ui/chat/plugins/system/CompatibilitySnapshotCard.tsx` | Explicit historical-degradation surface that Sprint 5 must preserve |
| `src/frameworks/ui/chat/plugins/custom/CustomToolCardCompliance.test.tsx` | Existing malformed-payload safety tests for several custom cards |
| `src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx` | Existing routing tests for custom, compatibility, failed, canceled, and fallback flows |
| `tests/full-registry-coverage.test.ts` | Current source of truth for which chat tools are custom-rendered versus still fallback |
| `tests/tool-plugin-registry.test.tsx` | Registry-provider and default-registry contract tests that will drift if Sprint 5 does not update them intentionally |

---

## Cross-Layer Constraints

1. Sprint 5 is a rollout sprint, not a new-primitives sprint. `CapabilityCardShell`, `CapabilityCardHeader`, `CapabilityActionRail`, `CapabilityContextPanel`, `CapabilityMetricStrip`, `CapabilityDisclosure`, `CapabilityArtifactRail`, and `CapabilityTimeline` already exist and should be reused instead of replaced.
2. `capability-presentation-registry.ts` remains the chat source of truth for the current manifest. Sprint 5 must not introduce component-local tool allowlists or a second registry for family coverage.
3. `default-tool-registry.ts` may become denser, but it must remain a thin renderer map. Routing for failed, canceled, compatibility, and generic in-progress states stays in `ToolPluginPartRenderer.tsx` plus the shared system-card seams.
4. `CompatibilitySnapshotCard.tsx` and `CapabilityErrorCard.tsx` remain part of the product contract. Sprint 5 reduces silent fallback for current payloads; it does not pretend degraded historical transcript records are suddenly rich custom cards.
5. The system family remains intentionally fallback-driven in Sprint 5. `get_checklist`, `list_available_pages`, `get_current_page`, `navigate`, `navigate_to_page`, `calculator`, and `inspect_runtime_context` should keep honest system or fallback surfaces unless product requirements explicitly change.
6. Media-family descriptors remain out of scope until Sprint 6. Sprint 5 may harden reusable family-card patterns, but it must not start browser-runtime, FFmpeg, or media-routing work early.
7. Family cards must render from `resultEnvelope`, `resultPayload`, or the already-projected tool result only. Transcript playback must remain payload-first and must not refetch server data just to fill a nicer card.
8. Artifact viewers must adopt shared shell semantics without sacrificing the embedded specialized renderer. Mermaid, graph, and audio runtime components remain leaf renderers inside a shared capability frame rather than becoming top-level ad hoc surfaces.
9. The shared card system is a consistency tool, not a forcing function. If a capability only needs summary, context, and actions, Sprint 5 should not invent decorative empty metric strips or disclosures to make cards look busier.
10. Any tool promoted from fallback to custom must update its registry coverage tests in the same change. The release gate is intentional coverage, not accidental renderer drift.

---

## Engineering Quality Bar

Sprint 5 is not complete because the chat transcript has fewer generic cards. It is complete only if family coverage becomes explicit, renderer behavior becomes easier to reason about, and remaining fallback usage is reduced to the system family plus honest historical compatibility snapshots.

### Knuth bar - explicit invariants and bounded branching

1. Start from the live manifest, not memory. The current state is 45 chat-exposed descriptors, 18 custom renderers, and 27 fallback renderers. Sprint 5 should land at 38 custom renderers and 7 intentional system-family fallbacks.
2. Coverage expectations should live in one auditable seam. If a helper or fixture is needed so tests stop duplicating custom-versus-fallback tool lists across files, add it once and consume it consistently.
3. Each family card should have bounded branching. If `WebSearchCard.tsx`, `JournalWorkflowCard.tsx`, `InspectThemeCard.tsx`, or `ProfileCard.tsx` starts turning into a 300-line inline decision tree, extract pure payload guards or normalization helpers instead of stacking more JSX conditionals.
4. Payload normalization should be linear and side-effect-free. Cards must derive titles, summaries, context items, metrics, artifacts, and actions from the already-available payload rather than layering nested lookups or opportunistic fetches.

### Martin bar - narrow responsibilities and stable seams

1. `ToolPluginPartRenderer.tsx` owns routing. Family cards own family presentation. Shared primitives own layout semantics. Sprint 5 should not mix those responsibilities just to reduce file count.
2. `default-tool-registry.ts` should not become a policy engine. Descriptor lookup stays in the registry layer; family-specific payload understanding belongs in the corresponding card or helper.
3. Theme, profile, search, and journal cards should normalize domain payloads in small helpers when needed, then hand clean display data to shared primitives. Presentational components should not become parsers.
4. `EditorialWorkflowCard.tsx` is already the closest reference implementation. Only refactor it further if doing so materially reduces branch count or duplication; Sprint 5 should not churn the editorial family for style points.

### GoF bar - pragmatic patterns, not decorative ones

1. Treat the presentation registry plus default tool registry as a small Factory seam. It should deterministically pick the family renderer and then get out of the way.
2. Use Strategy-style payload normalizers where a family has multiple tool-specific shapes. Search, profile, and journal families already justify this approach.
3. Treat `CompatibilitySnapshotCard.tsx` as an Adapter over degraded historical transcript records. It exists to keep history honest, not to become a second generic renderer for live capabilities.
4. Favor composition over a giant universal card component. The right outcome is several coherent family cards sharing the same primitives, not one omnivorous card that understands all 45 tools.

---

## Pragmatic Test Standard

1. Update registry coverage tests so Sprint 5 has a numeric and family-level definition of done. The expected post-sprint state is all 38 non-system current-family tools custom-rendered and only 7 system-family tools still on fallback.
2. Add or expand direct component tests for each migrated family card. Every family needs at least one succeeded payload case per major branch and at least one malformed-payload case that falls back safely.
3. Extend `ToolPluginPartRenderer.test.tsx` so custom routing from `resultEnvelope` remains covered for representative search, theme, profile, journal, artifact, and editorial payloads.
4. Preserve explicit compatibility tests. Historical transcript records that lack rich payload envelopes must still render `CompatibilitySnapshotCard.tsx`, not silently jump to a misleading custom card.
5. Add targeted browser coverage for representative family cards in realistic transcript flows. One seeded or fixture-backed example each for search, theme, profile, journal, artifact, and editorial is enough; Sprint 5 does not need a giant end-to-end matrix for every tool name.
6. Keep route and send actions truthful. Browser coverage should prove that card actions still route or compose follow-up prompts through the existing action pathways instead of bypassing chat state.
7. Finish with `npm run build` green. Family-rollout work crosses dynamic imports, client-only renderers, and transcript routing, so a build pass is part of the contract.

---

## Runtime And UX Guardrails

1. Shared shell means consistent hierarchy, not identical content. Every family card should expose a readable eyebrow, title or summary, contextual details, and actions when relevant, but not every card needs every primitive.
2. Search results must stay scannable. Summaries, citations, section hits, and practitioner listings should remain structured rather than collapsing into one large paragraph or raw JSON dump.
3. Theme, profile, and journal cards should avoid dense desktop-only tables when the same information is clearer in context panels, metric strips, or disclosures. Mobile readability matters more than preserving a table aesthetic.
4. Artifact cards must retain accessible labels and useful empty or loading states around the specialized renderer. The embedded chart, graph, or audio component cannot become the only semantic wrapper.
5. Route and send affordances should continue to use the existing chat action callbacks or explicit safe links. Sprint 5 should not reintroduce button sprawl or inconsistent action semantics inside cards.
6. Live and historical transcript rendering should be materially consistent when the payload is equivalent. A replayed result should not look like a different product surface unless it is truly in compatibility mode.
7. Completed family cards must not refetch, poll, or depend on ambient route state to finish rendering. If the payload is insufficient, fall back explicitly.
8. System, failed, canceled, and compatibility surfaces must remain visually honest. Sprint 5 improves happy-path family coverage; it must not blur state distinctions for the sake of visual uniformity.

---

## QA Findings Before Implementation

1. The live descriptor registry currently contains 45 chat-exposed tools: 38 in the rollout families and 7 in the system family. No media-family chat descriptors exist yet, which matches the roadmap and should stay true through Sprint 5.
2. `default-tool-registry.ts` currently maps only 18 tools to custom renderers and leaves 27 tools on `JobStatusFallbackCard`. That means the product families still have a large silent-fallback footprint today.
3. Editorial is the only fully custom-covered family today: 8 tools custom, 0 fallback. It already uses shared primitives heavily and should act as the reference standard for the other families.
4. Search has 6 current descriptors but only 1 custom renderer. `search_corpus`, `search_my_conversations`, `get_section`, `get_corpus_summary`, and `list_practitioners` all remain fallback-driven even though the family is explicitly in scope for Sprint 5.
5. Theme has 3 current descriptors but only 1 custom renderer. `set_theme` and `adjust_ui` still render through fallback despite sharing the same `theme_inspection` card kind as `inspect_theme`.
6. Profile has 6 current descriptors but only 3 custom renderers. `set_preference`, `get_my_affiliate_summary`, and `list_my_referral_activity` are still fallback-only.
7. Journal has 12 current descriptors but only 2 custom renderers. `list_journal_posts`, `get_journal_post`, `list_journal_revisions`, `update_journal_metadata`, `update_journal_draft`, `submit_journal_review`, `approve_journal_post`, `publish_journal_post`, `restore_journal_revision`, and `select_journal_hero_image` are still fallback-only.
8. Artifact has full custom coverage for `generate_chart`, `generate_graph`, and `generate_audio`, but those cards currently bypass `CapabilityCardShell` and related primitives, so the family is not yet truly on the shared card system.
9. `InspectThemeCard.tsx`, `ProfileCard.tsx`, `ReferralQrCard.tsx`, and `JournalWorkflowCard.tsx` still render ad hoc tables and list markup rather than the shared capability shell and context primitives.
10. `WebSearchCard.tsx` is narrowly scoped to `admin_web_search` structured payloads and currently provides no shared family rendering path for the broader search and retrieval set.
11. `ToolPluginPartRenderer.tsx` plus `CompatibilitySnapshotCard.tsx` already provide the right routing honesty for failed, canceled, in-progress, and degraded historical cases. Sprint 5 should preserve that seam instead of bypassing it.
12. `tests/full-registry-coverage.test.ts`, `tests/tool-plugin-registry.test.tsx`, and `CustomToolCardCompliance.test.tsx` currently encode the present fallback-heavy world. Sprint 5 must update those tests as part of the rollout, or they will either fail legitimately or continue documenting the wrong product state.

---

## Task 5.1 - Freeze the family rollout matrix and remove registry drift

**What:** Turn the live custom-versus-fallback split into an enforceable Sprint 5 contract so coverage changes are intentional, reviewable, and traceable by family.

| Item | Detail |
| --- | --- |
| **Modify** | `src/frameworks/ui/chat/registry/capability-presentation-registry.ts` |
| **Modify** | `src/frameworks/ui/chat/registry/default-tool-registry.ts` |
| **Modify** | `src/frameworks/ui/chat/registry/capability-presentation-registry.test.ts` |
| **Modify** | `tests/full-registry-coverage.test.ts` |
| **Modify** | `tests/tool-plugin-registry.test.tsx` |
| **Create as needed** | A small shared rollout-matrix or coverage-helper seam if the test suite needs one source of truth for expected family coverage |
| **Spec** | §3.2, §3.3, §6.2, §8 rollout and done criteria |

### Task 5.1 outcomes

1. The rollout contract should explicitly target 38 custom-rendered non-system tools and 7 intentional system-family fallbacks by Sprint 5 completion.
2. Search, theme, profile, journal, artifact, and editorial tools should all be classified as custom-rendered in the coverage tests once Sprint 5 lands. The system family should remain explicitly fallback-driven.
3. If a helper or fixture is introduced for the coverage matrix, it should become the single place the tests read expected custom-versus-fallback state from. Do not maintain the same lists manually in three files.
4. `default-tool-registry.ts` should map every in-scope family tool to a family renderer intentionally rather than relying on accidental fallback.
5. The registry and tests should continue to exclude non-chat tools from the chat manifest entirely. Sprint 5 is about current capability-family rollout, not chat-surfacing more admin utilities.

### Task 5.1 notes

1. Keep the system family explicit. Hitting a larger custom-renderer count by decorating `navigate` or `calculator` would be a fake win.
2. Media-family descriptors should remain absent until Sprint 6. Do not add speculative placeholders just to make the type union feel complete.
3. If a tool truly cannot be custom-rendered in Sprint 5, its reason must be explicit in the doc or tests. Silent fallback is the thing Sprint 5 is meant to remove.

### Verify Task 5.1

```bash
npx vitest run src/frameworks/ui/chat/registry/capability-presentation-registry.test.ts tests/full-registry-coverage.test.ts tests/tool-plugin-registry.test.tsx
```

---

## Task 5.2 - Roll out search, theme, and profile families onto shared shell primitives

**What:** Expand the current narrow custom cards so search, theme, and profile tools all render through family-specific shared-shell cards instead of generic fallback status boxes.

| Item | Detail |
| --- | --- |
| **Modify or replace** | `src/frameworks/ui/chat/plugins/custom/WebSearchCard.tsx` |
| **Modify** | `src/frameworks/ui/chat/plugins/custom/InspectThemeCard.tsx` |
| **Modify** | `src/frameworks/ui/chat/plugins/custom/ProfileCard.tsx` |
| **Modify** | `src/frameworks/ui/chat/plugins/custom/ReferralQrCard.tsx` |
| **Modify** | `src/frameworks/ui/chat/registry/default-tool-registry.ts` |
| **Create as needed** | Small family payload guards or normalization helpers for search, theme, and profile payload shapes |
| **Create or expand** | `src/frameworks/ui/chat/plugins/custom/WebSearchCard.test.tsx` |
| **Create or expand** | `src/frameworks/ui/chat/plugins/custom/InspectThemeCard.test.tsx` |
| **Create or expand** | `src/frameworks/ui/chat/plugins/custom/ProfileCard.test.tsx` |
| **Create or expand** | `src/frameworks/ui/chat/plugins/custom/ReferralQrCard.test.tsx` |
| **Modify** | `src/frameworks/ui/chat/plugins/custom/CustomToolCardCompliance.test.tsx` |
| **Spec** | §3.3, §3.5, §3.10, §5 |

### Task 5.2 outcomes

1. Search family custom coverage should expand from 1 of 6 tools to 6 of 6 tools. `search_corpus`, `search_my_conversations`, `get_section`, `get_corpus_summary`, and `list_practitioners` should stop rendering through the generic fallback card.
2. `WebSearchCard.tsx` should become a real search-family card, whether by expansion or replacement. It must handle structured web-search results, corpus or conversation retrieval summaries, section fetches, and practitioner listings without forcing a refetch.
3. Theme family custom coverage should expand from 1 of 3 tools to 3 of 3 tools. `set_theme` and `adjust_ui` should render through the same shared-shell family surface as `inspect_theme`, with concise change summaries and relevant context.
4. Profile family custom coverage should expand from 3 of 6 tools to 6 of 6 tools. `set_preference`, `get_my_affiliate_summary`, and `list_my_referral_activity` should stop falling back to status-only rendering.
5. Theme and profile cards should move away from table-heavy ad hoc markup and instead use shared shell, header, context, disclosure, metric, and action primitives where they improve clarity.
6. Every promoted renderer must accept `resultEnvelope` payloads first and legacy projected payloads second. If neither is sufficiently structured, it should fail back to `JobStatusFallbackCard` rather than rendering a blank region.

### Task 5.2 notes

1. Search cards should stay information-dense but readable. A context panel plus disclosures is usually a better fit than trying to flatten search hits into a two-column table.
2. Theme mutations and preference updates are state-change summaries, not dashboards. Keep them compact and clear.
3. Referral QR output can keep direct artifact links, but route-style actions should still prefer the existing `onActionClick` pathways.

### Verify Task 5.2

```bash
npx vitest run src/frameworks/ui/chat/plugins/custom/WebSearchCard.test.tsx src/frameworks/ui/chat/plugins/custom/InspectThemeCard.test.tsx src/frameworks/ui/chat/plugins/custom/ProfileCard.test.tsx src/frameworks/ui/chat/plugins/custom/ReferralQrCard.test.tsx src/frameworks/ui/chat/plugins/custom/CustomToolCardCompliance.test.tsx
```

---

## Task 5.3 - Complete journal and artifact family convergence on the shared card system

**What:** Finish the journal family rollout and wrap the already-custom artifact family in the same shared-shell language used elsewhere.

| Item | Detail |
| --- | --- |
| **Modify** | `src/frameworks/ui/chat/plugins/custom/JournalWorkflowCard.tsx` |
| **Modify** | `src/frameworks/ui/chat/plugins/custom/ChartRendererCard.tsx` |
| **Modify** | `src/frameworks/ui/chat/plugins/custom/GraphRendererCard.tsx` |
| **Modify** | `src/frameworks/ui/chat/plugins/custom/AudioPlayerCard.tsx` |
| **Modify** | `src/frameworks/ui/chat/registry/default-tool-registry.ts` |
| **Create as needed** | Small journal-family and artifact-family normalization helpers where branch count warrants extraction |
| **Create or expand** | `src/frameworks/ui/chat/plugins/custom/JournalWorkflowCard.test.tsx` |
| **Create or expand** | `src/frameworks/ui/chat/plugins/custom/ChartRendererCard.test.tsx` |
| **Create or expand** | `src/frameworks/ui/chat/plugins/custom/GraphRendererCard.test.tsx` |
| **Create or expand** | `src/frameworks/ui/chat/plugins/custom/AudioPlayerCard.test.tsx` |
| **Modify** | `src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx` |
| **Spec** | §3.5, §3.6, §3.10, §5 |

### Task 5.3 outcomes

1. Journal family custom coverage should expand from 2 of 12 tools to 12 of 12 tools. The remaining 10 journal tools should stop flowing through the generic fallback card.
2. `JournalWorkflowCard.tsx` should cover listing, detail, revision, draft update, metadata update, review, approval, publish, restore, and hero-image selection payloads with a coherent shared-shell structure.
3. `select_journal_hero_image` should surface image and selection details as a first-class journal-card outcome rather than collapsing into generic status text.
4. Artifact family cards should adopt `CapabilityCardShell` and related shared primitives around their specialized visual or audio renderer so artifact transcript entries feel consistent with the rest of the system.
5. Dynamic import boundaries for Mermaid, graph, and audio components should stay as leaf concerns. The shared shell should not interfere with client-only rendering or loading behavior.
6. In-progress, failed, canceled, and degraded historical artifact or journal records must continue to route through shared system and compatibility cards rather than trying to partially render a family card without sufficient payload.

### Task 5.3 notes

1. Editorial is the reference, not the rewrite target. Follow its shared-shell patterns where they fit, but do not force journal or artifact cards to copy its exact disclosure layout.
2. Artifact cards are already custom. Sprint 5 should focus on shell convergence and transcript clarity, not on inventing new artifact-generation behavior.
3. Journal cards should surface route and preview actions consistently through the existing action pathways so browser navigation forwarding remains valid.

### Verify Task 5.3

```bash
npx vitest run src/frameworks/ui/chat/plugins/custom/JournalWorkflowCard.test.tsx src/frameworks/ui/chat/plugins/custom/ChartRendererCard.test.tsx src/frameworks/ui/chat/plugins/custom/GraphRendererCard.test.tsx src/frameworks/ui/chat/plugins/custom/AudioPlayerCard.test.tsx src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx
```

---

## Task 5.4 - Lock routing honesty and add realistic rollout verification

**What:** Back the rollout with targeted routing, compliance, browser, and build verification so family coverage does not regress back into silent fallback.

| Item | Detail |
| --- | --- |
| **Modify** | `src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx` |
| **Modify** | `src/frameworks/ui/chat/plugins/custom/CustomToolCardCompliance.test.tsx` |
| **Modify** | `tests/full-registry-coverage.test.ts` |
| **Modify** | `tests/tool-plugin-registry.test.tsx` |
| **Modify as needed** | `src/frameworks/ui/chat/registry/capability-presentation-registry.test.ts` |
| **Create or expand** | `tests/browser-ui/chat-capability-family-rollout.spec.ts` |
| **Modify as needed** | Existing browser chat specs that prove route forwarding or transcript action behavior for migrated cards |
| **Spec** | §5, §8 release-gate verification |

### Task 5.4 outcomes

1. Post-sprint registry coverage tests should fail if any non-system current-family tool falls back again. The expected state is 38 custom renderers and 7 system-family fallbacks.
2. Routing tests should prove that completed parts with structured envelopes render family cards, degraded historical records render `CompatibilitySnapshotCard.tsx`, and failed or canceled records still render shared error surfaces.
3. Compliance tests should include malformed-payload coverage for representative search, theme, profile, journal, and artifact payloads so renderer promotion does not create blank transcript regions.
4. Browser coverage should verify at least one realistic transcript example each for editorial, search, theme, profile, journal, and artifact families, plus one compatibility-only historical record.
5. Browser coverage should continue to prove that route and send actions from migrated cards still flow through the same chat action pathways the rest of the shell uses.
6. `npm run build` must stay green after the renderer-map expansion, shared-shell convergence, and new client-only card composition.

### Task 5.4 notes

1. Prefer seeded transcripts or stable fixtures over fragile live-network browser tests. Sprint 5 is about renderer behavior, not external availability.
2. Avoid screenshot-only assertions. The real regressions are wrong card routing, missing summaries, missing actions, or silent fallback.
3. Keep compatibility coverage explicit. A historical card that says it is a historical snapshot is a success case, not a bug.

### Verify Task 5.4

```bash
npx vitest run src/frameworks/ui/chat/registry/capability-presentation-registry.test.ts tests/full-registry-coverage.test.ts tests/tool-plugin-registry.test.tsx src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx src/frameworks/ui/chat/plugins/custom/CustomToolCardCompliance.test.tsx src/frameworks/ui/chat/plugins/custom/WebSearchCard.test.tsx src/frameworks/ui/chat/plugins/custom/InspectThemeCard.test.tsx src/frameworks/ui/chat/plugins/custom/ProfileCard.test.tsx src/frameworks/ui/chat/plugins/custom/ReferralQrCard.test.tsx src/frameworks/ui/chat/plugins/custom/JournalWorkflowCard.test.tsx src/frameworks/ui/chat/plugins/custom/ChartRendererCard.test.tsx src/frameworks/ui/chat/plugins/custom/GraphRendererCard.test.tsx src/frameworks/ui/chat/plugins/custom/AudioPlayerCard.test.tsx
npx playwright test tests/browser-ui/chat-capability-family-rollout.spec.ts tests/browser-ui/chat-navigation-forwarding.spec.ts
npm run build
```

---

## Sprint 5 Verification Bundle

Before marking Sprint 5 complete, run:

```bash
npx vitest run src/frameworks/ui/chat/registry/capability-presentation-registry.test.ts tests/full-registry-coverage.test.ts tests/tool-plugin-registry.test.tsx src/frameworks/ui/chat/ToolPluginPartRenderer.test.tsx src/frameworks/ui/chat/plugins/custom/CustomToolCardCompliance.test.tsx src/frameworks/ui/chat/plugins/custom/WebSearchCard.test.tsx src/frameworks/ui/chat/plugins/custom/InspectThemeCard.test.tsx src/frameworks/ui/chat/plugins/custom/ProfileCard.test.tsx src/frameworks/ui/chat/plugins/custom/ReferralQrCard.test.tsx src/frameworks/ui/chat/plugins/custom/JournalWorkflowCard.test.tsx src/frameworks/ui/chat/plugins/custom/ChartRendererCard.test.tsx src/frameworks/ui/chat/plugins/custom/GraphRendererCard.test.tsx src/frameworks/ui/chat/plugins/custom/AudioPlayerCard.test.tsx
npx playwright test tests/browser-ui/chat-capability-family-rollout.spec.ts tests/browser-ui/chat-navigation-forwarding.spec.ts
npm run build
```

And keep markdown diagnostics clean in:

1. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md`
2. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/README.md`
3. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/sprint-5-current-capability-family-rollout.md`

---

## Completion Checklist

- [ ] the live chat manifest still reflects 45 current descriptors, with 38 non-system tools custom-rendered and only 7 system-family tools intentionally fallback-driven
- [ ] editorial remains fully custom and continues to act as the reference shared-shell family without unnecessary churn
- [ ] search moves from 1 of 6 custom tools to 6 of 6 custom tools without adding refetch behavior
- [ ] theme moves from 1 of 3 custom tools to 3 of 3 custom tools through the shared shell
- [ ] profile moves from 3 of 6 custom tools to 6 of 6 custom tools through the shared shell
- [ ] journal moves from 2 of 12 custom tools to 12 of 12 custom tools through the shared shell
- [ ] artifact cards keep their specialized renderer while adopting shared-shell framing and transcript semantics
- [ ] degraded historical records still render `CompatibilitySnapshotCard.tsx` rather than masquerading as rich live cards
- [ ] failed, canceled, and in-progress records still route through shared system-card behavior instead of partial family-card rendering
- [ ] route and send actions from migrated cards still use the existing chat action pathways
- [ ] registry, routing, compliance, browser, and build verification all pass
- [ ] markdown diagnostics are clean in all touched docs
