# Sprint 2 - Semantic Chat And Shell Surface Extraction

> **Goal:** Replace repeated visual class composition in the highest-churn chat and shell surfaces with shared semantic primitives and explicit variant ownership, while preserving route tone, density, accessibility, and browser behavior.
> **Spec ref:** §2.2, §5.2, §5.3, §5.4, §5.6, §6.3, §6.3.1, §6.4, §6.5, §7, Done 6, Done 7, Done 8
> **Prerequisite:** Sprint 1 complete

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/frameworks/ui/MessageList.tsx` | high-churn transcript surface with repeated bubble, chip, and stateful chat container styling |
| `src/frameworks/ui/ChatInput.tsx` | composer surface with repeated frame, field, and action-control visual composition |
| `src/frameworks/ui/ChatHeader.tsx` | top-level chat header surface with route-sensitive chrome and repeated elevated panel styling |
| `src/frameworks/ui/ChatMessageViewport.tsx` | viewport and transcript framing layer that currently sits between shell tone and message presentation |
| `src/frameworks/ui/MessageList.test.tsx` | focused transcript regression surface for message-level rendering behavior |
| `src/frameworks/ui/ChatInput.test.tsx` | focused composer regression surface for input and action behavior |
| `src/frameworks/ui/ChatMessageViewport.test.tsx` | focused viewport regression surface that can absorb semantic surface assertions without inventing a new test harness |
| `src/components/AppShell.tsx` | route-aware shell owner already carrying homepage and journal route surface distinctions |
| `src/components/SiteNav.tsx` | persistent navigation chrome whose tone must remain aligned with route context and extracted semantic shell surfaces |
| `src/components/AccountMenu.tsx` | shell-adjacent account affordance with repeated panel, separator, and selected-state treatment |
| `src/components/AppShell.test.tsx` | shell-route test coverage that already guards route-aware shell behavior |
| `src/components/SiteNav.test.tsx` | navigation regression surface for route tone, interaction, and authenticated shell behavior |
| `src/components/AccountMenu.test.tsx` | account surface regression coverage for menu rendering and interactive state |
| `src/app/styles/chat.css` | natural CSS authority home for reusable chat semantic surfaces |
| `src/app/styles/shell.css` | natural CSS authority home for reusable shell and account semantic surfaces |
| `tests/browser-fab-chat-flow.test.tsx` | browser-level guard for the floating chat path and transcript/composer behavior |
| `tests/browser-fab-mobile-density.test.tsx` | browser-level guard for density-sensitive chat layout on mobile |
| `tests/browser-fab-scroll-recovery.test.tsx` | browser-level guard for viewport continuity and transcript scrolling |
| `tests/browser-overlays.test.tsx` | browser-level guard for overlay layering and shell/chrome interactions |
| `tests/browser-motion.test.tsx` | browser-level guard for motion-sensitive UI behavior that semantic extraction must not destabilize |

---

## QA Findings Before Implementation

1. Sprint 1 unified theme authority, but the highest-value visual surfaces still encode gradients, borders, shadows, radii, and selected-state formulas inside TSX string composition rather than through shared semantic surface primitives.
2. The chat stack is the most valuable first extraction target because transcript bubbles, composer framing, chips, and viewport panels repeat the same visual ideas across multiple files while also carrying route, density, and accessibility sensitivity.
3. Shell and account chrome already have route-aware tone behavior, but they still risk drift if panel, separator, and selected-state styling remains component-owned instead of being extracted into shared shell primitives.
4. Sprint 2 must not broaden the theme-control plane again. This sprint is about semantic surface ownership and typed variant composition, not about adding new theme names or new MCP mutation capabilities.
5. Browser verification remains mandatory for the chat and shell bucket because these surfaces combine route tone, floating overlays, viewport recovery, motion, and density behavior that static JSX assertions cannot fully prove.

---

## Task 2.1 - Extract semantic chat surfaces from transcript and composer hotspots

**What:** Move repeated chat-surface visual composition out of component-local class strings and into shared semantic chat primitives that remain driven by the manifest-backed theme tokens.

| Item | Detail |
| --- | --- |
| **Modify** | `src/frameworks/ui/MessageList.tsx` |
| **Modify** | `src/frameworks/ui/ChatInput.tsx` |
| **Modify** | `src/frameworks/ui/ChatHeader.tsx` |
| **Modify** | `src/frameworks/ui/ChatMessageViewport.tsx` |
| **Modify** | `src/app/styles/chat.css` |
| **Modify as needed** | focused chat tests in `src/frameworks/ui/*.test.tsx` |
| **Spec** | §5.2, §5.3, §5.6, §6.3 |

### Required outcomes

1. Shared chat surfaces such as transcript panels, user/assistant bubbles, chips, composer frame, composer field, and elevated chat chrome have one named owner instead of being recopied in TSX.
2. Extracted chat primitives continue to consume manifest-backed theme tokens rather than introducing a second ad hoc styling system.
3. Semantic extraction reduces repeated arbitrary-value class strings instead of wrapping those same strings in another layer of indirection.
4. Route tone, density, dark mode, and accessibility behavior continue to flow through the extracted surfaces without visual regressions.
5. The floating and embedded chat paths remain structurally equivalent where they intentionally share the same surface semantics.

### Implementation notes

1. Prefer a small, explicit surface vocabulary such as `ui-bubble-user`, `ui-bubble-assistant`, `ui-composer-frame`, and `ui-composer-field` over generic utility dumping grounds.
2. Keep layout and structural classes in TSX where they are genuinely local, but move reusable visual formulas into the semantic surface layer.
3. If chat header and viewport layers need route-sensitive variants, make that route context explicit rather than splicing extra visual formulas into template literals.
4. Do not use Sprint 2 to redesign the product. The goal is authority extraction and semantic reuse, not a fresh visual direction.

### Verify Task 2.1

```bash
npm exec vitest run src/frameworks/ui/MessageList.test.tsx src/frameworks/ui/ChatInput.test.tsx src/frameworks/ui/ChatMessageViewport.test.tsx
```

Expected result:

1. chat rendering behavior remains intact
2. extracted semantic surfaces own the repeated visual styling paths instead of TSX-local class strings

---

## Task 2.2 - Extract semantic shell and account chrome surfaces

**What:** Move repeated shell, nav, and account menu chrome into shared semantic shell primitives without disturbing route-aware tone behavior or authenticated navigation flow.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/AppShell.tsx` |
| **Modify** | `src/components/SiteNav.tsx` |
| **Modify** | `src/components/AccountMenu.tsx` |
| **Modify** | `src/app/styles/shell.css` |
| **Modify as needed** | `src/components/AppShell.test.tsx` |
| **Modify as needed** | `src/components/SiteNav.test.tsx` |
| **Modify as needed** | `src/components/AccountMenu.test.tsx` |
| **Spec** | §5.3, §5.4, §5.6, §6.3, §6.3.1 |

### Required outcomes

1. Shared shell surfaces such as quiet panels, floating shell chrome, selected nav states, and account menu framing have a named semantic owner in CSS rather than repeated component-local formulas.
2. Existing route-aware shell tone behavior remains explicit and testable after extraction.
3. Account and nav affordances keep their current interactive semantics, focus states, and authenticated behavior while consuming the shared shell surface layer.
4. Shell extraction does not silently reintroduce heavy chrome on journal routes or destabilize the chat floating overlay relationship.

### Implementation notes

1. Preserve the shell-route and nav-tone hooks already introduced in Sprint 0; Sprint 2 should consume them through better surface ownership, not remove them.
2. If shell surfaces need typed emphasis or tone variants in TSX, make those axes explicit rather than encoding them in long template literals.
3. Keep shell/account extraction scoped to shared chrome. Jobs and journal-specific polished surfaces belong to Sprint 3.

### Verify Task 2.2

```bash
npm exec vitest run src/components/AppShell.test.tsx src/components/SiteNav.test.tsx src/components/AccountMenu.test.tsx
```

---

## Task 2.3 - Replace long visual template literals with explicit variant ownership

**What:** Simplify the most stateful chat and shell components so they compose semantic surfaces through small typed variant maps instead of embedding visual formulas directly in template literals.

| Item | Detail |
| --- | --- |
| **Modify** | state-heavy chat and shell files touched in Tasks 2.1 and 2.2 |
| **Create or Modify** | small local variant helpers only where they reduce repeated visual branching materially |
| **Spec** | §5.4, §6.4 |

### Required outcomes

1. Variant axes such as emphasis, tone, selected state, disabled state, density, and route context are explicit and readable.
2. TSX files stop carrying large embedded visual formulas once a shared semantic surface exists.
3. Variant helpers stay small and local to the component family they serve; Sprint 2 should not introduce a generic styling framework inside TypeScript.
4. The final result is easier to audit for route tone, density, and accessibility behavior than the pre-extraction string composition.

### Implementation notes

1. Typed variant maps are a control surface for component state, not a replacement theme engine.
2. If a branch only changes layout, keep it local. If a branch changes reusable visual styling, route it through the semantic surface layer.
3. Prefer the smallest variant API that makes state readable; do not build an abstraction ladder the repo will not use elsewhere.

### Verify Task 2.3

```bash
npm exec vitest run src/frameworks/ui/MessageList.test.tsx src/frameworks/ui/ChatInput.test.tsx src/components/AppShell.test.tsx src/components/SiteNav.test.tsx
```

---

## Sprint 2 Verification Bundle

Run this bundle before marking Sprint 2 complete:

```bash
npm run typecheck
npm run lint:css
npm exec vitest run src/frameworks/ui/MessageList.test.tsx src/frameworks/ui/ChatInput.test.tsx src/frameworks/ui/ChatMessageViewport.test.tsx src/components/AppShell.test.tsx src/components/SiteNav.test.tsx src/components/AccountMenu.test.tsx src/hooks/useUICommands.test.tsx
npm exec vitest run tests/browser-fab-chat-flow.test.tsx tests/browser-fab-mobile-density.test.tsx tests/browser-fab-scroll-recovery.test.tsx tests/browser-overlays.test.tsx tests/browser-motion.test.tsx
npm run build
```

Sprint 2 should keep `src/hooks/useUICommands.test.tsx` in the verification bundle even though the primary work is visual extraction because the sprint still depends on route tone, density, and accessibility behavior remaining compatible with the manifest-backed runtime command layer.

---

## Completion Checklist

- [x] chat transcript, bubble, chip, and composer surfaces no longer rely on repeated TSX-local visual formulas for shared styling
- [x] shell, nav, and account chrome surfaces consume named semantic surface primitives instead of duplicated panel and selected-state formulas
- [x] route tone, density, dark mode, and accessibility behavior remain explicit and green after semantic extraction
- [x] state-heavy chat and shell components use small typed variant maps where reusable visual branching still exists
- [x] CSS authority remains in shared stylesheet surface primitives rather than drifting back into component-local strings
- [x] focused chat and shell tests are green
- [x] browser chat and shell verification is green
- [x] `npm run build` passes

## QA Result

Verified on 2026-03-26 with:

```bash
npm run typecheck
npm run lint:css
npm exec vitest run src/frameworks/ui/MessageList.test.tsx src/frameworks/ui/ChatInput.test.tsx src/frameworks/ui/ChatMessageViewport.test.tsx src/components/SiteNav.test.tsx src/components/AccountMenu.test.tsx src/components/AppShell.test.tsx src/hooks/useUICommands.test.tsx tests/browser-fab-chat-flow.test.tsx tests/browser-fab-mobile-density.test.tsx tests/browser-fab-scroll-recovery.test.tsx tests/browser-overlays.test.tsx tests/browser-motion.test.tsx
npm run build
```

Observed result:

1. `npm run typecheck` passed.
2. `npm run lint:css` passed.
3. The focused chat and shell suite passed.
4. The browser-facing Sprint 2 chat, overlay, density, scroll-recovery, and motion suites passed.
5. `npm run build` passed.

## Implementation Notes

1. Shared chat surface ownership now lives in semantic classes inside `src/app/styles/chat.css` for header, transcript glow, viewport plane, user and assistant bubbles, attachment cards, action chips, suggestion frames, suggestion chips, file pills, composer frame, composer field, and helper copy.
2. Shared shell chrome ownership now lives in semantic classes inside `src/app/styles/shell.css` for the nav rail, nav links, nav item states, account triggers, dropdown chrome, accordion surfaces, setting rows, and simulation-active state.
3. Hotspot components now consume those semantic surfaces directly instead of repeating visual formulas inline: `MessageList`, `ChatInput`, `ChatMessageViewport`, `ChatHeader`, `SiteNav`, and `AccountMenu`.
4. Small explicit variant ownership replaced some of the larger styling branches, including chat density controls, nav item active/idle state, and shell setting button active/idle state.

## Exit Criteria

Sprint 2 is complete only when the repo has one clear answer to all of the following for chat and shell surfaces:

1. which shared visual patterns are owned by semantic CSS primitives
2. which state changes are owned by explicit TypeScript variants rather than embedded class formulas
3. how route tone and shell quieting remain aligned with those same semantic surfaces
4. how density, dark mode, and accessibility behavior continue to flow through the extracted surfaces without bypassing the manifest-backed theme contract

If chat or shell surfaces still rely on large component-local strings to define shared visual patterns after the extraction pass, Sprint 2 is not complete.