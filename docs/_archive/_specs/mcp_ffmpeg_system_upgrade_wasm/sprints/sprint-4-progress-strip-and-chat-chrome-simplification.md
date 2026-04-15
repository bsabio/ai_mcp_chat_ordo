# Sprint 4 - Progress Strip And Chat Chrome Simplification

> **Status:** Draft
> **Goal:** Ship the global progress strip above the composer and move transcript data actions into header-level chrome without reopening Sprint 3 job-state work, regressing the single-active-conversation model, or bloating the input surface again.
> **Spec refs:** `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md` §3.7, §3.8, §3.9, §3.10, §5, §6, §8
> **Prerequisite:** Sprint 3 complete

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md` | Canonical global-progress-strip, chat-chrome, single-active-conversation, and release-gate contract |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/README.md` | Roadmap sequencing and the exact Sprint 4 filename plus goal |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/sprint-2-shared-card-system-and-tone-primitives.md` | Shared system-card family and the already-created `ProgressStripBubble` presentational surface |
| `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/sprint-3-job-phase-model-and-transcript-durability.md` | The normalized job-state and transcript-durability substrate that Sprint 4 must consume rather than rediscover |
| `src/core/entities/capability-presentation.ts` | Descriptor contract already includes `progressMode`, `supportsRetry`, and `defaultSurface: "global_strip"` as valid UI policy fields |
| `src/frameworks/ui/chat/registry/capability-presentation-registry.ts` | Current presentation registry already marks deferred capabilities with `progressMode` and `supportsRetry`, so strip eligibility can stay descriptor-owned |
| `src/frameworks/ui/ChatContentSurface.tsx` | Current message-viewport plus composer seam and the exact place where the progress strip must land |
| `src/frameworks/ui/ChatConversationToolbar.tsx` | Current copy, export, and import controls that still consume composer space and browser test selectors |
| `src/frameworks/ui/ChatSurfaceHeader.tsx` | Current floating-header seam that only exposes fullscreen and minimize controls |
| `src/frameworks/ui/ChatSurface.tsx` | Current embedded versus floating composition seam and the cleanest place to add equivalent top chrome for embedded chat |
| `src/frameworks/ui/useChatSurfaceState.tsx` | Existing copy, export, and import handlers plus the current `contentProps` prop bag that still mixes header and composer responsibilities |
| `src/frameworks/ui/useChatSurfaceState.test.tsx` | Direct state-hook regression surface for action handling and prop-shape drift |
| `src/frameworks/ui/ChatMessageViewport.tsx` | Current transcript viewport, scroll-CTA, and layout boundary that must remain stable when the strip appears or disappears |
| `src/frameworks/ui/chat/plugins/system/ProgressStripBubble.tsx` | Existing progress bubble that is intentionally presentational and ready to be wrapped by a real strip component |
| `src/frameworks/ui/chat/plugins/system/system-card-family.test.tsx` | Existing proof that the bubble is presentational and should not absorb strip state or menu logic |
| `src/frameworks/ui/ChatContentSurface.test.tsx` | Current component coverage for the content surface and registry-provider seam |
| `src/frameworks/ui/ChatSurface.test.tsx` | Current floating and embedded shell coverage for header and content composition |
| `tests/browser-ui/conversation-portability.spec.ts` | Current browser proof that copy, export, and import work from the chat shell and currently depend on the composer toolbar DOM |
| `tests/browser-ui/deferred-blog-jobs.spec.ts` | Existing browser fixtures for queued, running, and succeeded deferred jobs that Sprint 4 can reuse for strip behavior |
| `tests/browser-ui/jobs-page.spec.ts` | Existing browser proof that the dedicated jobs workspace remains usable and must stay complementary to the new strip rather than being displaced by it |
| `src/hooks/useGlobalChat.tsx` | Current single-active-conversation owner that Sprint 4 must preserve while moving chrome |

---

## Cross-Layer Constraints

1. Sprint 4 is a strip-and-chrome sprint. It must consume the normalized `job_status` truth from Sprint 3 and must not reopen worker progress emission, renderable-event selection, transcript import fidelity, or retry lineage semantics.
2. `capability-presentation-registry.ts` remains the chat source of truth for `progressMode` and `supportsRetry`. Sprint 4 must not introduce a new per-tool strip allowlist inside surface components.
3. The progress strip is a summary surface only. It complements transcript cards, `/jobs`, and `/admin/jobs`; it does not replace them or turn chat into the only job-management interface.
4. The single active conversation model remains intact. Copy, export, import, and future archive or summarize actions stay scoped to the active `conversationId` and must not introduce tabbed or concurrent active chat lanes.
5. Composer space reclaimed from the toolbar belongs to the progress strip, attachment state, message entry, and send or stop controls. Sprint 4 must not remove one toolbar only to add a second one in different markup.
6. Floating chat should anchor the data menu from `ChatSurfaceHeader`. Embedded chat must expose the same affordance in equivalent top chrome within the chat shell, never by falling back to the composer row.
7. Strip state must be family-agnostic. Ranking, labeling, retry eligibility, and overflow behavior should derive from normalized job parts plus descriptors, not from editorial-only or tool-name-specific branches.
8. Strip and menu work must not add new fetches, polling loops, or transcript refetch behavior. All required state already exists in the presented conversation messages and current surface-state handlers.
9. Browser tests that currently target `[data-chat-conversation-toolbar="true"]` are part of the contract. Sprint 4 must migrate them to the new menu surface rather than deleting the user-visible behavior they cover.
10. `ProgressStripBubble.tsx` is intentionally presentational. Open state, focus management, overflow state, and selected-item behavior belong in a wrapper strip component, not inside the primitive bubble.

---

## Engineering Quality Bar

Sprint 4 is not complete because the chat shell looks cleaner. It is complete only if strip state, header chrome, and surface composition become easier to reason about and harder to regress than the current composer-toolbar layout.

### Knuth bar - explicit invariants and bounded work

1. Define one pure strip selector that accepts presented messages plus descriptor lookup and returns the exact tracked items, ordering, overflow groups, and retry eligibility needed by the UI. Do not recompute those rules ad hoc in three components.
2. Ranking and overflow rules must live in module-scope tables or pure helpers. The strip may not recreate priority maps, status buckets, or cap constants inside React render paths.
3. The selector should prefer the newest normalized `job_status` part per `jobId` and should not devolve into nested scans per item. One linear pass over the presented messages plus one deterministic sort is the target complexity.
4. Open-strip state must be explicit. If the selected item disappears, is superseded, or becomes ineligible, the strip should close or retarget predictably rather than leaving stale popover state attached to a dead job.

### Martin bar - narrow responsibilities and stable seams

1. `useChatSurfaceState.tsx` should own action handlers and high-level surface state, but it should stop acting as a dumping ground for both header and composer props. Header-scoped controls and composer-scoped controls need separate prop surfaces.
2. `ChatContentSurface.tsx` should compose viewport, strip, and composer regions. It should not own copy, export, import, or menu behavior once those move to top chrome.
3. `ChatSurfaceHeader.tsx` should own header composition, not file-import side effects or conversation serialization logic. Those behaviors should remain delegated from surface state into a focused menu component.
4. If embedded and floating chat need the same menu affordance, share a small data-menu component rather than duplicating action buttons and hidden file inputs across two branches.

### GoF bar - pragmatic patterns, not decorative ones

1. Use a small Strategy-style resolver for strip item ranking and status normalization rather than scattering inline ternaries across `ChatContentSurface`, `ProgressStripBubble`, and tests.
2. Treat the header data menu as an Adapter over the existing copy, export, and import handlers. The menu changes the chrome surface, not the underlying conversation-action semantics.
3. Favor composition over inheritance. The progress strip should compose `ProgressStripBubble`, existing action handling, and small popover state; Sprint 4 should not introduce a deep shell class hierarchy or an oversized chat-shell controller.
4. Introduce a helper only if it reduces branch count in the surface components. If a new abstraction merely renames existing clutter while leaving business rules inline, it does not meet the bar.

---

## Pragmatic Test Standard

1. Add direct unit coverage for the pure strip selector and ranking logic. Browser tests alone are too expensive and too indirect for ordering, overflow, and retry-eligibility regressions.
2. Add focused component tests for the strip surface and the header data menu. Assert accessible names, keyboard behavior, busy-state handling, file-input wiring, and selected-item bubble content rather than broad snapshots.
3. Extend `useChatSurfaceState.test.tsx` so the header-versus-content prop split is guarded at the state seam, not only through mounted shell components.
4. Preserve and migrate the browser portability proof. Copy transcript, export JSON, and import degraded attachment state must still work after the toolbar moves.
5. Add browser coverage for progress strip visibility, ordering, overflow, and retry affordances using realistic deferred-job fixtures instead of toy mocked markup.
6. Add a direct regression that proves strip-only state changes do not force transcript-card rerenders when the presented message list is unchanged.
7. Keep verification focused. Sprint 4 should tighten the shell contract, not broaden into unrelated chat rendering, routing, or transcript-replay cleanup.

---

## Runtime And UX Guardrails

1. The strip must be hidden when there are no active or attention-requiring jobs. An empty placeholder band is a regression in input rhythm, not an affordance.
2. Color cannot be the only signal. Every visible item and overflow trigger needs readable status text or assistive labeling that communicates queued, running, or attention state.
3. Keyboard navigation and focus return are mandatory. Opening and dismissing strip bubbles or the data menu must work without pointer input and must return focus predictably to the triggering control.
4. Reduced-motion mode should remove nonessential strip and menu animation. If the choice is between a pretty transition and stable scroll position, stability wins.
5. Progress updates should be coalesced enough that rapid SSE ticks do not create visible jitter or repeatedly reopen, close, or resize the strip surface.
6. Showing or hiding the strip must not yank transcript scroll position, collapse the scroll-to-bottom CTA into unusable space, or break attachment and send-control layout on mobile.
7. Menu relocation must not change behavior: filenames, clipboard payloads, import flow, and busy-state disabling should remain identical after the move.
8. Embedded and floating chat should feel like the same product surface. The location of the menu affordance may differ, but the available actions and accessibility semantics should not.

---

## QA Findings Before Implementation

1. `ChatContentSurface.tsx` still mounts `ChatConversationToolbar` directly inside the composer plane, so conversation operations currently consume the exact space Sprint 4 needs for the strip and cleaner input rhythm.
2. `ChatConversationToolbar.tsx` is a button row, not a menu, and it owns the only current file-input path for import. Moving it without preserving that wiring will break real user behavior and the portability browser spec.
3. `ChatSurfaceHeader.tsx` only renders fullscreen and minimize controls in floating mode and returns `null` for embedded mode, so there is currently no top-chrome home for conversation data actions in embedded chat.
4. `ChatSurface.tsx` already owns the embedded versus floating composition split, making it the cleanest seam for introducing equivalent top chrome without route-specific hacks or shell leakage into the composer.
5. `ProgressStripBubble.tsx` already exists and is tested as presentational, which is good for reuse but also proves that Sprint 4 still lacks a real strip wrapper, state model, overflow behavior, and keyboard contract.
6. `useChatSurfaceState.tsx` already centralizes copy, export, and import handlers plus busy state, so Sprint 4 should reuse those behaviors instead of reimplementing them in header components.
7. `ChatContentSurface.test.tsx` still mocks `ChatConversationToolbar`, so current component tests do not fail if the composer keeps the wrong chrome or if the progress strip never appears.
8. `tests/browser-ui/conversation-portability.spec.ts` targets `[data-chat-conversation-toolbar="true"]`, which proves the browser contract currently depends on the composer toolbar DOM and needs an intentional selector migration.
9. `tests/browser-ui/deferred-blog-jobs.spec.ts` already exercises queued, running, and terminal job states in the conversation surface, making it the most realistic browser fixture source for strip visibility and retry behavior.
10. `useGlobalChat.tsx` still owns one active `conversationId` at a time, so Sprint 4 has no excuse to introduce a multi-thread shell just to relocate export or import chrome.

---

## Task 4.1 - Create the pure progress-strip selector and keep eligibility descriptor-owned

**What:** Add one pure projection seam that derives tracked strip items from the presented conversation messages, using descriptor policy instead of tool-name branching.

| Item | Detail |
| --- | --- |
| **Create** | `src/frameworks/ui/chat/plugins/system/resolve-progress-strip.ts` |
| **Create** | `src/frameworks/ui/chat/plugins/system/resolve-progress-strip.test.ts` |
| **Modify** | `src/frameworks/ui/useChatSurfaceState.tsx` |
| **Modify** | `src/frameworks/ui/useChatSurfaceState.test.tsx` |
| **Modify as needed** | `src/frameworks/ui/chat/registry/capability-presentation-registry.ts` |
| **Spec** | §3.7, §3.8, §5 contract tests |

### Task 4.1 outcomes

1. Add one pure selector that reduces presented messages to the latest eligible `job_status` item per `jobId`, preserving label, title, subtitle, active phase, percent, updated time, and retry-eligibility data needed by the strip.
2. The selector must derive strip eligibility from descriptor policy such as `progressMode`, `executionMode`, and `supportsRetry`. It must not introduce a local tool-name allowlist inside the surface layer.
3. Ranking must be deterministic and centralized: attention or failed first, then running, then queued, with most recently updated winning inside each bucket.
4. Overflow grouping rules and visible-item caps must be defined in one module-scope seam so desktop and mobile behavior can be tested directly rather than inferred from CSS accidents.
5. `useChatSurfaceState.tsx` should expose strip data separately from transcript messages so header and content consumers receive a narrow, already-normalized surface contract instead of rebuilding strip logic downstream.
6. The selector must remain family-agnostic. Editorial, journal, or future media jobs may differ in payload, but the strip should only care about normalized job parts plus descriptor-owned policy.

### Task 4.1 notes

1. Prefer the latest sequence-bearing part per `jobId`, not the last rendered card region in DOM order.
2. If Sprint 4 needs an additive descriptor hint, use existing presentation-registry fields or a narrowly-scoped extension there. Do not create a fourth registry or a component-local policy map.
3. Keep the selector JSON-serializable and side-effect-free so tests can probe ordering and overflow without mounting React.
4. Hidden-strip behavior should come from zero eligible items, not from CSS-only hiding layered on top of a permanently mounted empty component.

### Verify Task 4.1

```bash
npx vitest run src/frameworks/ui/chat/plugins/system/resolve-progress-strip.test.ts src/frameworks/ui/useChatSurfaceState.test.tsx
```

---

## Task 4.2 - Wire the global progress strip into the chat surface without destabilizing the viewport

**What:** Build the actual strip component, mount it between transcript and composer, and make the strip interaction accessible, overflow-safe, and layout-stable.

| Item | Detail |
| --- | --- |
| **Create** | `src/frameworks/ui/chat/plugins/system/ChatProgressStrip.tsx` |
| **Create** | `src/frameworks/ui/chat/plugins/system/ChatProgressStrip.test.tsx` |
| **Modify** | `src/frameworks/ui/chat/plugins/system/ProgressStripBubble.tsx` |
| **Modify** | `src/frameworks/ui/chat/plugins/system/system-card-family.test.tsx` |
| **Modify** | `src/frameworks/ui/ChatContentSurface.tsx` |
| **Modify** | `src/frameworks/ui/ChatContentSurface.test.tsx` |
| **Modify as needed** | `src/frameworks/ui/ChatMessageViewport.tsx` |
| **Modify as needed** | `src/frameworks/ui/ChatMessageViewport.test.tsx` |
| **Modify as needed** | `src/frameworks/ui/MessageList.tsx` |
| **Modify as needed** | `src/frameworks/ui/MessageList.test.tsx` |
| **Modify** | `src/app/styles/chat.css` |
| **Create** | `tests/browser-ui/chat-progress-strip.spec.ts` |
| **Spec** | §3.7, §5 browser and chrome tests |

### Task 4.2 outcomes

1. Mount the strip between `ChatMessageViewport` and the composer shell in `ChatContentSurface.tsx`, with no fallback toolbar region left behind in that slot.
2. `ChatProgressStrip.tsx` must own selected-item state, anchored bubble rendering, overflow behavior, and focus management, while `ProgressStripBubble.tsx` stays presentational.
3. Clicking or keyboard-activating a strip item must open an anchored status bubble that shows capability label, title or subtitle when available, active phase plus percent, updated time, and `Retry whole job` only when descriptor policy and terminal job state allow it.
4. The strip must hide entirely when there are no eligible items and must collapse overflow behind a readable summary control on smaller widths.
5. Desktop and mobile visible-item caps should be explicit constants and browser-tested. Mobile must show fewer visible items than desktop.
6. Strip appearance and dismissal must preserve transcript scroll behavior, scroll-to-bottom CTA placement, and composer usability on both embedded and floating surfaces.
7. Strip-only state changes must not force `ChatMessageViewport` or `MessageList` to rerender when the presented message list is stable. Memoize or split boundaries as needed, but keep the invariant explicit and test-backed.
8. Browser coverage must prove queued, running, attention, and overflow states, plus retry affordance routing through the existing action-handling path rather than a new job-control surface.

### Task 4.2 notes

1. If a height transition causes transcript jumpiness, remove or simplify the animation. Smoothness means steady reading and input behavior, not ornamental motion.
2. Bubble semantics should be button or popover driven and fully labeled. Do not rely on color dots plus title text alone.
3. Keep retry routing on the current action path. The strip may surface a retry control, but it should not invent a second job-action transport.
4. If the selected job disappears or becomes ineligible while its bubble is open, close the bubble cleanly instead of leaving orphaned UI state.
5. If render-stability is hard to guarantee at `ChatContentSurface.tsx`, stabilize the `ChatMessageViewport` or `MessageList` boundary rather than letting progress-strip churn cascade through transcript children.

### Verify Task 4.2

```bash
npx vitest run src/frameworks/ui/chat/plugins/system/ChatProgressStrip.test.tsx src/frameworks/ui/chat/plugins/system/system-card-family.test.tsx src/frameworks/ui/ChatContentSurface.test.tsx src/frameworks/ui/ChatMessageViewport.test.tsx src/frameworks/ui/MessageList.test.tsx
npx playwright test tests/browser-ui/chat-progress-strip.spec.ts
```

---

## Task 4.3 - Replace the composer toolbar with a header-level conversation data menu

**What:** Move copy, export, and import actions into top chrome, split header and content responsibilities in surface state, and preserve behavior across embedded and floating chat.

| Item | Detail |
| --- | --- |
| **Create** | `src/frameworks/ui/ChatConversationDataMenu.tsx` |
| **Create** | `src/frameworks/ui/ChatConversationDataMenu.test.tsx` |
| **Modify** | `src/frameworks/ui/ChatSurfaceHeader.tsx` |
| **Modify** | `src/frameworks/ui/ChatSurface.tsx` |
| **Modify** | `src/frameworks/ui/useChatSurfaceState.tsx` |
| **Modify** | `src/frameworks/ui/useChatSurfaceState.test.tsx` |
| **Modify** | `src/frameworks/ui/ChatContentSurface.tsx` |
| **Modify** | `src/frameworks/ui/ChatSurface.test.tsx` |
| **Delete or retire** | `src/frameworks/ui/ChatConversationToolbar.tsx` |
| **Modify** | `tests/browser-ui/conversation-portability.spec.ts` |
| **Spec** | §3.8, §3.9, §5 browser and chrome tests |

### Task 4.3 outcomes

1. `useChatSurfaceState.tsx` should return separate header-scoped and content-scoped props so copy, export, and import behavior no longer rides inside the composer prop bag.
2. Add a focused conversation data menu component that adapts the existing copy, export, and import handlers, including the hidden file-input bridge for JSON import.
3. Floating chat should anchor the menu from `ChatSurfaceHeader`. Embedded chat should expose the same menu in equivalent top chrome within `ChatSurface`, not by restoring toolbar buttons to the composer plane.
4. `ChatContentSurface.tsx` must stop importing and rendering `ChatConversationToolbar`. After Sprint 4, the composer region should be strip plus attachment or input controls only.
5. Existing behavior must remain stable: copy transcript still uses the same clipboard payload, export still downloads the same filename format, import still hydrates degraded attachments into the active conversation.
6. The move must not disturb the single-active-conversation model. Menu actions still target the current `conversationId` and must not spawn secondary session shells or concurrent threads.
7. Browser portability coverage must be migrated to the new menu selectors and still prove transcript copy, JSON export, and degraded-attachment import end to end.

### Task 4.3 notes

1. The menu is shell chrome, not business logic. Keep serialization, clipboard, and import side effects in `useChatSurfaceState.tsx` and pass them down as callbacks.
2. Do not hide menu behavior behind floating-only assumptions. Embedded chat needs the same user capability even if the header chrome is more compact.
3. If `ChatSurfaceHeader.tsx` starts accumulating file-input or conversation-portability logic, stop and split more aggressively. The header should compose the menu, not become the menu.
4. Retiring `ChatConversationToolbar.tsx` is preferable to leaving an unused duplicate chrome component in the repo after the migration.

### Verify Task 4.3

```bash
npx vitest run src/frameworks/ui/ChatConversationDataMenu.test.tsx src/frameworks/ui/ChatSurface.test.tsx src/frameworks/ui/useChatSurfaceState.test.tsx
npx playwright test tests/browser-ui/conversation-portability.spec.ts
```

---

## Task 4.4 - Add drift guards and focused QA for strip plus menu behavior

**What:** Lock the new shell contract in place so the toolbar does not drift back into the composer and the strip does not regress into a decorative, inaccessible surface.

| Item | Detail |
| --- | --- |
| **Modify** | `src/frameworks/ui/ChatContentSurface.test.tsx` |
| **Modify** | `src/frameworks/ui/ChatSurface.test.tsx` |
| **Modify** | `src/frameworks/ui/useChatSurfaceState.test.tsx` |
| **Modify** | `src/frameworks/ui/chat/plugins/system/system-card-family.test.tsx` |
| **Modify** | `tests/browser-ui/conversation-portability.spec.ts` |
| **Modify** | `tests/browser-ui/deferred-blog-jobs.spec.ts` |
| **Modify** | `tests/browser-ui/jobs-page.spec.ts` |
| **Modify or create** | `tests/browser-ui/chat-progress-strip.spec.ts` |
| **Spec** | §5, §8 release-gate tests |

### Task 4.4 outcomes

1. Regression coverage must fail if conversation copy, export, or import actions reappear in the composer region or disappear from top chrome.
2. Regression coverage must fail if the strip shows capabilities that are descriptor-ineligible, loses whole-job retry affordance for eligible terminal jobs, or stays visible with zero eligible items.
3. Browser coverage must fail if strip ordering, overflow grouping, keyboard activation, or assistive labels drift from the Sprint 4 contract.
4. Browser coverage must fail if the relocated data menu no longer supports transcript copy, JSON export, or degraded-attachment import.
5. Browser coverage must fail if `/jobs` behavior regresses or becomes inconsistent with the chat strip's summary role.
6. Component and hook coverage must fail if header and content props collapse back into one broad prop bag or if strip behavior starts depending on card-local state.
7. Focused verification should keep `npm run build` green after the shell move so new chrome structure does not quietly break the embedded and floating chat surfaces.

### Task 4.4 notes

1. Reuse existing deferred-job and portability fixtures where possible. Sprint 4 needs realistic shell proof, not a new suite of toy DOM mocks that miss actual transcript behavior.
2. Prefer invariant assertions over screenshots. The real risks are lost affordances, wrong ordering, hidden import controls, and inaccessible strip interactions.
3. Keep QA narrow and truthful. If the shell contract changes, the focused Sprint 4 bundle should catch it before a broader product suite does.

### Verify Task 4.4

```bash
npx vitest run src/frameworks/ui/chat/plugins/system/resolve-progress-strip.test.ts src/frameworks/ui/chat/plugins/system/ChatProgressStrip.test.tsx src/frameworks/ui/ChatConversationDataMenu.test.tsx src/frameworks/ui/ChatContentSurface.test.tsx src/frameworks/ui/ChatSurface.test.tsx src/frameworks/ui/useChatSurfaceState.test.tsx src/frameworks/ui/chat/plugins/system/system-card-family.test.tsx src/frameworks/ui/MessageList.test.tsx
npx playwright test tests/browser-ui/chat-progress-strip.spec.ts tests/browser-ui/conversation-portability.spec.ts tests/browser-ui/deferred-blog-jobs.spec.ts tests/browser-ui/jobs-page.spec.ts
npm run build
```

---

## Sprint 4 Verification Bundle

Before marking Sprint 4 complete, run:

```bash
npx vitest run src/frameworks/ui/chat/plugins/system/resolve-progress-strip.test.ts src/frameworks/ui/chat/plugins/system/ChatProgressStrip.test.tsx src/frameworks/ui/ChatConversationDataMenu.test.tsx src/frameworks/ui/ChatContentSurface.test.tsx src/frameworks/ui/ChatSurface.test.tsx src/frameworks/ui/useChatSurfaceState.test.tsx src/frameworks/ui/chat/plugins/system/system-card-family.test.tsx src/frameworks/ui/MessageList.test.tsx
npx playwright test tests/browser-ui/chat-progress-strip.spec.ts tests/browser-ui/conversation-portability.spec.ts tests/browser-ui/deferred-blog-jobs.spec.ts tests/browser-ui/jobs-page.spec.ts
npm run build
```

And keep markdown diagnostics clean in:

1. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md`
2. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/README.md`
3. `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/sprints/sprint-4-progress-strip-and-chat-chrome-simplification.md`

---

## Completion Checklist

- [ ] one pure strip selector exists and owns eligibility, ordering, and overflow rules instead of duplicating them across shell components
- [ ] `ChatContentSurface.tsx` mounts the progress strip between transcript and composer and no longer renders conversation data controls in the composer plane
- [ ] the progress strip is hidden when there are no eligible jobs and remains accessible, keyboard-navigable, and non-color-only when visible
- [ ] `ProgressStripBubble.tsx` stays presentational while a wrapper component owns selected-item and overflow interaction state
- [ ] strip-only state updates do not force transcript rerenders when the presented message list is unchanged
- [ ] copy transcript, export JSON, and import JSON live in top chrome for both floating and embedded chat without changing their behavior
- [ ] header-scoped and content-scoped surface props are separated cleanly in `useChatSurfaceState.tsx`
- [ ] the single active conversation model remains intact after the chrome move
- [ ] browser QA still proves degraded-attachment import, realistic deferred-job strip behavior, and `/jobs` surface stability end to end
- [ ] markdown diagnostics are clean in all touched docs

---

## Sprint 4 Exit Criteria

Sprint 4 is complete only when the repository has one trustworthy answer to all of the following:

1. how the current conversation's normalized `job_status` parts become one ordered, overflow-safe progress strip without per-tool branching
2. how strip interactions stay accessible, keyboard-usable, and visually calm on both desktop and mobile surfaces
3. how copy, export, and import actions move out of the composer while preserving the same single-active-conversation behavior and file-transfer semantics
4. how floating and embedded chat expose the same conversation-data affordances in top chrome rather than reintroducing composer clutter
5. how strip updates stay independent enough from transcript rendering that frequent job ticks do not degrade the reading surface
6. how focused browser and component QA fail immediately if the toolbar returns, the strip drifts from descriptor policy, the relocated menu loses conversation-portability behavior, or `/jobs` stops behaving as the complementary detailed workspace

If Sprint 5 still needs to rediscover any of those answers while rolling more capability families onto the shared card system, Sprint 4 is not complete.
