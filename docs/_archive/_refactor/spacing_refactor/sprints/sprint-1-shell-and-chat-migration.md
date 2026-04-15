# Sprint 1 — Shell and Chat Migration

> **Goal:** Migrate the core application frame (SiteNav, AccountMenu) and active conversational stage (chat components) onto the new semantic spacing token ladder, eliminating legacy phi combinations and bridging the first physical components to the new governance.
> **Spec ref:** §3, §4, §5, §6
> **Prerequisite:** Sprint 0 — Authority Map and Token Baseline

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_refactor/spacing_refactor/spec.md` | canonical spacing refactor contract |
| `src/app/styles/foundation.css` | semantic spacing role tokens established in Sprint 0 |
| `src/app/styles/shell.css` | existing shell tokens requiring remediation |
| `src/app/styles/chat.css` | existing chat tokens requiring remediation |
| `src/components/SiteNav.tsx` | primary shell component |
| `src/components/AccountMenu.tsx` | secondary shell component |
| `src/frameworks/ui/ChatInput.tsx` | primary chat component |
| `src/frameworks/ui/ChatMessageViewport.tsx` | primary chat rhythm layout |

---

## Task 1.1 — Delete Legacy Shell Token Definitions

**What:** Rip the legacy shell/chat definitions out of `shell.css` and `foundation.css` and wire components directly to the new semantic system.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/styles/shell.css` |
| **Spec** | §3, §5 |

### Required implementation
1. Delete `--shell-rail-gap` and replace it in the `.tsx` DOM with `--space-2` or equivalent `--layout-cluster` semantic spacing.
2. Replace explicit block paddings with native `--frame-padding-block` or `--surface-inset-normal` class consumers.
3. Completely eliminate obsolete `--phi-*` combinations in the shell.

---

## Task 1.2 — Refactor Core Shell File Markup

**What:** Update the layout wrappers inside `SiteNav.tsx` and `AccountMenu.tsx` to utilize the new layout grammar.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/SiteNav.tsx` |
| **Modify** | `src/components/AccountMenu.tsx` |
| **Spec** | §4, §5 |

### Required implementation
1. Ensure the container `gap` and `padding` mappings reference standard spacing variables if they were using arbitrary Tailwind utilities alongside the custom CSS.
2. Check for arbitrary nudges (`px-[1rem]`, `top-[calc(...)]`) and convert to governed spacing multiples.

---

## Task 1.3 — Migrate Chat Engine Components

**What:** Bring the complex, high-traffic messaging stage into spacing compliance. 

| Item | Detail |
| --- | --- |
| **Modify** | `src/frameworks/ui/ChatHeader.tsx` |
| **Modify** | `src/frameworks/ui/ChatInput.tsx` |
| **Modify** | `src/frameworks/ui/ChatMessageViewport.tsx` |
| **Modify** | `src/frameworks/ui/MessageList.tsx` |
| **Modify** | `src/frameworks/ui/ChatContentSurface.tsx` |
| **Spec** | §4, §5 |

### Required implementation
1. Standardize the gap between consecutive messages using standard stack spacing.
2. Standardize composer input paddings within `ChatContentSurface.tsx` (replacing the literal `0.625rem` optical nudge found there).
3. Remove literal utilities like `p-5`, `gap-3` inside these components in favor of semantic role CSS.

### Sprint 1 implementation closeout

Sprint 1 is complete with the following verified outcomes:

1. shell spacing utilities now own safe-area top padding, nav link cluster insets, and account dropdown anchor spacing in CSS rather than component-local arbitrary values
2. chat spacing utilities now own transcript frame padding, composer plane padding, composer frame padding, follow-up frame insets, hero suggestion frame insets, scroll-CTA dock insets, and promoted suggestion band offset
3. `foundation.css` now owns the remaining chat spacing contracts that were still implicit in markup, including message meta rhythm, composer field insets, promoted bubble block padding, follow-up chip sizing, and conversation indent
4. the six Sprint 1 target surfaces now consume governed shell/chat spacing values without inline spacing styles or undeclared token steps

---

## Completion Checklist

- [x] `shell.css` variables are anchored to the semantic ladder, not isolated math.
- [x] `SiteNav` and `AccountMenu` rely exclusively on governed values.
- [x] All chat flow components use standard governed rhythm properties.
- [x] Visual QA verifies no layout collapse or catastrophic drift.

## Verification Result

Verified on 2026-03-27:

1. `npm run lint:css` passed
2. `npm run spacing:audit` passed with `0` literal spacing matches in the governed Sprint 1 target set
3. `npm exec vitest run src/components/SiteNav.test.tsx src/frameworks/ui/ChatInput.test.tsx src/frameworks/ui/MessageList.test.tsx tests/shell-visual-system.test.tsx tests/chat-surface.test.tsx tests/browser-fab-mobile-density.test.tsx` passed with `68` tests green

## Sprint 1 Exit Criteria

Sprint 1 is complete when the entire global App Shell framing and the Hero Chat Stage are fundamentally decoupled from ad-hoc literal utility spacing and run entirely on the Sprint 0 token authority.
