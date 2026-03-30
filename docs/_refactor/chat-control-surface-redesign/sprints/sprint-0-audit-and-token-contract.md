# Sprint 0 - Audit And Token Contract

> **Status:** Completed
> **Goal:** Freeze the current chat control-surface authority map, enumerate the remaining visual-authority debt, and define the exact semantic token contract that Sprint 1 will implement without changing runtime behavior.
> **Spec ref:** `CCR-010` through `CCR-017`, `CCR-030` through `CCR-034`, `CCR-060` through `CCR-068`
> **Prerequisite:** None

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_refactor/chat-control-surface-redesign/spec.md` | governing redesign contract for the chat control surface |
| `src/frameworks/ui/ChatInput.tsx` | structural owner of the composer, field, attach button, send button, file pill preview, and helper copy |
| `src/frameworks/ui/ChatContentSurface.tsx` | structural owner of the composer row, transcript-to-composer seam, floating-only plane wrapper, and shell-width behavior |
| `src/app/styles/chat.css` | current selector authority for chat surfaces, including floating-shell composer plane, form, field, helper, and send ready-state rules |
| `src/app/styles/foundation.css` | current token authority for `--fva-*` floating-shell surfaces, radii, helper tone, send tone, and density-modulated spacing variables |
| `src/frameworks/ui/ChatInput.test.tsx` | current isolated composer behavior and semantic-hook coverage |
| `tests/chat-surface.test.tsx` | current chat header and shell-level floating-surface structure coverage |
| `tests/shell-visual-system.test.tsx` | current shell-level assertions proving floating header ownership and non-theme leakage |
| `tests/browser-fab-chat-flow.test.tsx` | browser-style end-to-end FAB flow coverage that touches composer, shell chrome, and post-send interaction state |
| `tests/browser-fab-mobile-density.test.tsx` | browser-style compact/mobile coverage for composer helper copy and floating header composition |

---

## Task 0.1 - Freeze The Current Authority Map

**What:** Record the exact pre-redesign ownership model so Sprint 1 moves visual authority deliberately instead of guessing where it currently lives.

| Concern | Current owner | Verified detail |
| --- | --- | --- |
| Composer structure and behavior | `src/frameworks/ui/ChatInput.tsx` | owns textarea sizing, Enter and Shift+Enter behavior, mention navigation, attach button, send button, helper band, and file preview structure |
| Floating composer-row wrapper | `src/frameworks/ui/ChatContentSurface.tsx` | owns the transcript/composer boundary, floating-only row surface, safe-area behavior, and the top seam rule |
| Generic composer utility surfaces | `src/app/styles/chat.css` | owns `.ui-chat-composer-frame`, `.ui-chat-composer-field`, `.ui-chat-attach-button`, `.ui-chat-send-*`, and `.ui-chat-helper-copy` |
| Floating-shell composer override layer | `src/app/styles/chat.css` | owns `[data-chat-shell-kind="floating"]` selectors for `data-chat-composer-plane`, `data-chat-composer-form`, `data-chat-composer-field`, helper, and ready-state send behavior |
| Floating-shell composer tokens | `src/app/styles/foundation.css` | owns `--fva-shell-composer-surface`, `--fva-shell-composer-plane-surface`, `--fva-shell-composer-field-surface`, `--fva-shell-helper-muted`, `--fva-shell-send-ready`, and `--fva-shell-radius-composer` |
| Density-sensitive composer spacing | `src/app/styles/foundation.css` | owns `--input-padding`, `--chat-composer-button-padding-*`, `--space-stack-*`, `--space-frame-default`, and related density overrides |
| Stable semantic hooks | `src/frameworks/ui/ChatInput.tsx`, `src/frameworks/ui/ChatContentSurface.tsx` | emit `data-chat-composer-form`, `data-chat-composer-state`, `data-chat-composer-field`, `data-chat-send-state`, `data-chat-composer-helper`, `data-chat-composer-plane`, and `data-chat-composer-shell` |

### Current ownership conclusions

1. The repo already has a meaningful separation between structure and selectors.
2. The main remaining authority leak is not missing CSS. It is component-local visual posture inside `ChatInput.tsx` and `ChatContentSurface.tsx`.
3. The floating shell already has a valid token family, but the composer subset is too coarse and still depends on inline and component-local tuning.
4. Sprint 1 does not need to invent a system from scratch. It needs to tighten the existing one and remove the ad hoc escape hatches.

---

## Task 0.2 - Enumerate Inline And Component-Local Visual Debt

**What:** Identify every live visual decision that should move into token or selector authority before the redesign lands.

### Verified debt inventory

| File | Current debt | Why it is debt | Sprint 1 action |
| --- | --- | --- | --- |
| `src/frameworks/ui/ChatContentSurface.tsx` | inline `bg-[linear-gradient(...)]`, `shadow-[...]`, and `backdrop-blur-sm` on the floating composer row | floating composer-plane hierarchy is encoded in TSX instead of the semantic style layer | move the plane treatment fully into `chat.css` selectors backed by explicit tokens |
| `src/frameworks/ui/ChatContentSurface.tsx` | inline seam rule `via-foreground/8` rendered directly in markup | seam tone cannot be tuned from token authority alone | replace with token-backed selector or semantic utility class |
| `src/frameworks/ui/ChatInput.tsx` | send button class string mixes typography, hover lift, active scale, and ready-state visual posture | primary-action styling is partly selector-owned and partly hard-coded in component markup | move hierarchy and state posture into semantic classes and leave only structural layout in TSX |
| `src/frameworks/ui/ChatInput.tsx` | attach button uses local `hover:bg-background/80` and `hover:text-foreground/60` tuning | attach control tone is not part of a shared affordance grammar | replace with token-backed attach idle, hover, and disabled roles |
| `src/frameworks/ui/ChatInput.tsx` | field wrapper uses `rounded-[calc(...)]` and local transition posture while selector authority only sets background | field geometry and emphasis are split between TSX and CSS | formalize frame-field radius relationship and active emphasis in tokens/selectors |
| `src/frameworks/ui/ChatInput.tsx` | textarea placeholder tone and spacing rely on local utility composition including hero-prefixed padding vars | text field still inherits naming and spacing from an earlier hero grammar instead of a dedicated control-surface contract | rename or alias toward composer-specific spacing and tone roles in Sprint 1 |
| `src/frameworks/ui/ChatInput.tsx` | file-preview remove button uses local `hover:text-red-500` | destructive accent escapes the semantic control-surface grammar | decide whether file-pill removal stays destructive or becomes neutral utility chrome |

### Debt conclusions

1. The floating composer seam is the single clearest inline-authority problem.
2. The send button is the single clearest component-local hierarchy problem.
3. The attach button and field geometry are the main grammar-consistency problems.
4. The current token layer is not wrong. It is simply not granular enough to absorb these responsibilities cleanly.

---

## Task 0.3 - Define The Minimum Semantic Token Contract

**What:** Establish the exact token vocabulary Sprint 1 should implement so the redesign is governed before code changes begin.

### Required token roles

| Token role | Current closest owner | Gap to close in Sprint 1 |
| --- | --- | --- |
| Composer plane surface | `--fva-shell-composer-plane-surface` | split surface tone from seam tone so the transcript boundary can be tuned independently |
| Composer seam tone | implicit inline seam rule in `ChatContentSurface.tsx` | create an explicit seam token and selector |
| Composer frame surface | `--fva-shell-composer-surface` | keep but tighten its job to outer object ownership only |
| Composer frame border emphasis | `--fva-shell-border-strong` | separate generic shell border from composer-specific emphasis if needed |
| Composer field surface | `--fva-shell-composer-field-surface` | keep but define active emphasis and edge relationship explicitly |
| Composer field active emphasis | partial use of `--fva-shell-border-strong` and `--fva-shell-border-soft` | formalize a dedicated active ring or active-field emphasis role |
| Attach idle tone | `.ui-chat-attach-button` color rule | move hover and disabled posture into token-backed control roles |
| Attach active or hover tone | local TSX hover utilities | create explicit attach state tokens or semantic selectors |
| Send idle tone | `.ui-chat-send-idle` | keep but shift toward clearer secondary-action posture |
| Send ready tone | `--fva-shell-send-ready` | keep but pair with stronger text and elevation authority |
| Send disabled tone | `.ui-chat-send-disabled` | keep as a semantic role and stop relying on drained local styling |
| Helper text tone | `--fva-shell-helper-muted` | keep, but ensure it serves one quieter support tier |
| Composer radius scale | `--fva-shell-radius-composer` | add or formalize frame-field-control radius relationships instead of one broad radius token |

### Token contract decisions

1. Sprint 1 should extend the existing `--fva-*` family rather than invent a separate naming system.
2. The new contract should distinguish plane, frame, and field roles rather than treating the whole composer as one surface.
3. Send and attach need sibling control roles, not one-off component tuning.
4. The seam deserves its own token because it currently exists only as inline decoration but materially affects hierarchy.
5. Density-sensitive spacing should remain in `foundation.css`; Sprint 1 does not need to redesign density, only apply it through clearer composer roles.

---

## Task 0.4 - Freeze Stable Hooks And Verification Targets

**What:** Record the exact tests and semantic hooks the redesign must preserve so Sprint 1 can change visuals without destabilizing the regression surface.

### Stable semantic hooks

1. `data-chat-composer-form`
2. `data-chat-composer-state`
3. `data-chat-composer-field`
4. `data-chat-send-state`
5. `data-chat-composer-helper`
6. `data-chat-composer-plane`
7. `data-chat-composer-shell`
8. `data-chat-floating-header`
9. `data-chat-floating-header-chrome`

### Required verification files for later sprints

| File | Why it must stay green |
| --- | --- |
| `src/frameworks/ui/ChatInput.test.tsx` | proves composer keyboard behavior, textarea presence, helper copy, and semantic hook continuity |
| `tests/chat-surface.test.tsx` | proves floating header structure and shell-level chat chrome attributes |
| `tests/shell-visual-system.test.tsx` | proves the floating header remains shell-owned and does not accidentally consume unrelated theme controls |
| `tests/browser-fab-chat-flow.test.tsx` | proves the FAB shell still opens, sends, and exposes post-send shell outcomes |
| `tests/browser-fab-mobile-density.test.tsx` | proves compact and mobile rendering still preserves helper copy and shell structure |
| `tests/browser-ui/fab-live-smoke.spec.ts` | proves the redesign still works in a real browser after visual authority shifts |

### Verification conclusions

1. Sprint 1 should stop at component and browser-style coverage plus typecheck.
2. Sprint 2 owns real-browser and full closeout evidence.
3. No sprint should rename the stable hooks above unless the tests are intentionally migrated in the same change.

---

## Task 0.5 - Name Exact Sprint 1 Implementation Targets

**What:** Convert the audit into a specific handoff so Sprint 1 can execute without reopening scope.

### Sprint 1 file targets

1. `src/app/styles/foundation.css`
   Add or refine the composer-specific `--fva-*` roles for plane, seam, frame, field emphasis, attach, send, helper, and radius relationships.
2. `src/app/styles/chat.css`
   Move the floating composer-plane and seam hierarchy out of inline TSX, and make the ready or idle control hierarchy selector-owned.
3. `src/frameworks/ui/ChatContentSurface.tsx`
   Remove inline composer-plane background and shadow composition in favor of semantic class or attribute hooks.
4. `src/frameworks/ui/ChatInput.tsx`
   Reduce component-local hover, shadow, and state posture; preserve structure and behavior.
5. `src/frameworks/ui/ChatInput.test.tsx`
   Extend only if stable semantic assertions are needed for the redesigned hierarchy.

### Explicit Sprint 1 non-goals

1. Do not change placeholder or helper wording beyond what is structurally necessary.
2. Do not change Enter, Shift+Enter, mention, or attachment behavior.
3. Do not redesign transcript bubbles, launcher branding, or shell navigation chrome.
4. Do not reopen density architecture beyond applying it through clearer composer roles.

---

## QA Deviations

None.

## Verification Results

Sprint 0 was implemented as documentation and authority mapping only.

Verified outcomes:

1. the authority map is now explicit in this sprint doc
2. the inline and component-local debt inventory is enumerated concretely enough to guide Sprint 1
3. the required token contract, stable hooks, and verification files are frozen in writing
4. no runtime code, selectors, or tests were changed as part of Sprint 0

Command execution:

1. no runtime verification commands were required because this sprint intentionally shipped no code changes
2. Sprint 1 inherits the concrete verification set recorded in this document and the parent spec

## Completion Checklist

- [x] the current control-surface authority map is documented concretely enough to drive Sprint 1
- [x] inline and component-local visual debt is explicitly enumerated
- [x] the minimum semantic token family is defined in implementation-ready terms
- [x] the stable semantic hooks and regression files are frozen in writing
- [x] Sprint 1 implementation targets and non-goals are explicit
- [x] Sprint 0 leaves the runtime untouched and removes ambiguity rather than shipping partial visual changes

## Verification

- Documentation audit only; no runtime verification commands were required for Sprint 0