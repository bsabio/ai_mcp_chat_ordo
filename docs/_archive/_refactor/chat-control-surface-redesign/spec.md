# Chat Control Surface Redesign — Refactor Spec

> **Status:** Completed
> **Date:** 2026-03-27
> **Scope:** Redesign the chat control surface so the composer, primary action, attachment affordance, helper copy, and floating conversation seam read as one authored interaction object instead of a layered utility tray.
> **Affects:** `src/frameworks/ui/ChatInput.tsx`, `src/frameworks/ui/ChatContentSurface.tsx`, `src/frameworks/ui/FloatingChatLauncher.tsx`, `src/frameworks/ui/ChatSurfaceHeader.tsx`, `src/app/styles/chat.css`, `src/app/styles/foundation.css`, floating-chat regression tests, browser FAB tests, and any design-system docs that describe composer hierarchy or floating-shell visual authority.
> **Motivation:** The chat input is architecturally solid and meaningfully tokenized, but its current visual hierarchy is too soft, too explained, and too dependent on atmospheric layering. The surface is large without feeling authoritative. The redesign should make the composer feel precise, inevitable, and product-defining.
> **Requirement IDs:** `CCR-XXX`

---

## 1. Problem Statement

### 1.1 Verified current defect

The current chat control surface is functional but visually unresolved. `[CCR-010]`

Verified issues:

1. `src/frameworks/ui/ChatInput.tsx` makes the text field visually dominant while the send action reads as a small tracked label, which weakens the primary action hierarchy. `[CCR-011]`
2. `src/frameworks/ui/ChatContentSurface.tsx` and `src/app/styles/chat.css` stack multiple translucent gradients, blurs, and softened seams around the composer, which makes the surface feel layered rather than decisive. `[CCR-012]`
3. The placeholder copy in `src/frameworks/ui/ChatInput.tsx` carries too much of the surface's intent, meaning the control feels less purposeful when stripped of explanatory prose. `[CCR-013]`
4. The helper copy currently uses two simultaneous instructional sentences, which creates a second low-value interface underneath the primary one. `[CCR-014]`
5. The attachment affordance exists, but it reads as a detached perimeter icon rather than an intentional part of the composer object. `[CCR-015]`
6. The current geometry and softness bias the surface toward generic premium SaaS chrome instead of the sharper authored instrument this product needs. `[CCR-016]`

This is not a runtime or accessibility failure. It is a hierarchy, restraint, and authorship failure. `[CCR-017]`

### 1.2 Root cause

The system already has tokens and semantic hooks, but the visual contract remains split across:

1. token-backed surfaces in `src/app/styles/chat.css`
2. component-local visual composition in `src/frameworks/ui/ChatInput.tsx`
3. one-off inline atmosphere work in `src/frameworks/ui/ChatContentSurface.tsx`

That split leads to a surface that is technically styled but not compositionally governed from one design intention. `[CCR-020]`

### 1.3 Why this matters

The chat control surface is the product's handshake. If the composer feels hesitant, ornamental, or over-explained, the entire system feels less intelligent than the underlying runtime actually is. `[CCR-021]`

The redesign matters because:

1. the composer is one of the highest-frequency interactions in the app
2. the floating shell depends on clean visual hierarchy to feel trustworthy under repeated use
3. a chat-first product should express confidence through control surfaces, not just through responses

[CCR-022]

---

## 2. Governing Constraints

### 2.1 Product and system boundaries

This refactor must preserve the working interaction model. `[CCR-030]`

It must not:

1. change Enter or Shift+Enter behavior
2. change mention, attachment, or send semantics
3. reduce attach or send tap targets below the current usable footprint
4. reopen floating-shell ownership, transcript state management, or theme runtime behavior

[CCR-031]

### 2.2 Design-system boundaries

This work extends the existing token and semantic-surface system. It must not replace it with component-local art direction. `[CCR-032]`

Rules:

1. visual changes should land through `src/app/styles/chat.css` and `src/app/styles/foundation.css` wherever possible
2. inline visual gradients in `src/frameworks/ui/ChatContentSurface.tsx` should be treated as debt, not the future model
3. any new semantic hooks must be stable and testable

[CCR-033]

### 2.3 Surface scope

This refactor focuses on the chat control surface, defined as:

1. the composer plane in floating mode
2. the composer frame and field
3. the attachment and send affordances
4. helper copy and empty-state guidance
5. the seam between transcript plane and composer plane

It does not include transcript bubble content redesign, shell navigation redesign, or launcher-brand overhaul beyond what is necessary to keep the composer family visually consistent. `[CCR-034]`

---

## 3. Design Goals

1. Make the composer feel like one intentional interaction object rather than a stack of softened sub-surfaces. `[CCR-040]`
2. Establish an unmistakable primary action hierarchy where send reads as the clear point of completion. `[CCR-041]`
3. Reduce explanatory burden so the surface remains legible and self-possessed even with minimal copy. `[CCR-042]`
4. Integrate the attachment affordance into the composer grammar so it feels authored rather than parked. `[CCR-043]`
5. Sharpen geometry, spacing, and edge definition enough that the surface reads as a precision instrument rather than a plush tray. `[CCR-044]`
6. Move remaining ad hoc visual choices into the token and semantic-surface layer. `[CCR-045]`
7. Keep the surface accessible, testable, and stable across compact and relaxed density modes. `[CCR-046]`

---

## 4. Design Principles

### 4.1 Primary action must close the sentence

The field invites expression. The send affordance completes it. The current surface reverses that hierarchy by giving the field scale and the send action too little weight. `[CCR-050]`

Required result:

1. the input remains calm and legible
2. the send action feels deliberate and unmistakable when enabled
3. idle and ready states should differ by authority, not just by color fill

[CCR-051]

### 4.2 One plane, one job

The composer area should not rely on multiple overlapping frosted layers to feel premium. `[CCR-052]`

Rules:

1. pick one dominant composer plane
2. pick one subordinate input field surface inside it
3. remove any atmospheric layer that does not improve hierarchy

[CCR-053]

### 4.3 Copy is support, not architecture

Placeholder text and helper copy may guide the user, but they must not carry the emotional weight of the interface. `[CCR-054]`

Rules:

1. the placeholder should orient quickly and get out of the way
2. helper text should compress to one quiet supporting idea where possible
3. instructional prose should not compete with the action hierarchy

[CCR-055]

### 4.4 Tools must belong to the object

The attachment affordance should read as part of the same designed system as the text field and send action. `[CCR-056]`

Rules:

1. it should feel intentionally placed, not merely available
2. its idle state should remain discoverable without shouting
3. its active and disabled states should follow the same visual grammar as the rest of the composer

[CCR-057]

### 4.5 Precision over plushness

The redesign should reduce the current marshmallow softness. `[CCR-058]`

This does not mean harsh or minimal for its own sake. It means:

1. slightly firmer edges
2. more disciplined radii relationships
3. less decorative blur
4. clearer hierarchy through proportion and contrast

[CCR-059]

---

## 5. Architecture Direction

### 5.1 Semantic control-surface token layer

The chat control surface needs a dedicated semantic token family rather than a loose collection of related `--fva-*` values. `[CCR-060]`

Minimum token roles:

1. composer plane surface
2. composer frame surface
3. composer field surface
4. composer field active ring or emphasis state
5. attachment affordance idle and active tones
6. send idle, ready, and disabled tones
7. helper text tone
8. composer seam or separator tone
9. control radius scale for frame, field, and controls

[CCR-061]

Recommended ownership:

1. core values in `src/app/styles/foundation.css`
2. selector application in `src/app/styles/chat.css`
3. no new inline visual gradients unless the token layer proves insufficient

[CCR-062]

### 5.2 Component responsibility cleanup

`src/frameworks/ui/ChatInput.tsx` should remain responsible for structure, semantics, and behavior. It should stop carrying aesthetic decisions that belong to the style layer. `[CCR-063]`

Required cleanup targets:

1. reduce long class strings that encode visual posture instead of layout necessity
2. remove remaining local hover or shadow tuning that should be token-owned
3. preserve semantic attributes such as `data-chat-composer-form`, `data-chat-composer-state`, `data-chat-composer-field`, and `data-chat-send-state`

[CCR-064]

### 5.3 Floating seam cleanup

`src/frameworks/ui/ChatContentSurface.tsx` currently owns a substantial amount of floating-only atmosphere through inline background and shadow composition. That should be reduced and formalized. `[CCR-065]`

Target state:

1. the transcript-to-composer transition is driven by semantic selectors in `chat.css`
2. the composer plane reads as attached to the conversation stage
3. the visual seam can be tuned globally without reopening TSX markup

[CCR-066]

### 5.4 Typography and copy hierarchy

The control surface should shift away from micro-label preciousness for the primary action. `[CCR-067]`

Required direction:

1. send label typography should feel firm and product-level, not ornamental
2. placeholder typography should remain subordinate to active text and action weight
3. helper copy should use one quieter tier that does not visually split the surface into a second band of meaning

[CCR-068]

---

## 6. Surface Taxonomy And Required Changes

### 6.1 Composer plane

Required changes:

1. simplify the floating plane beneath the composer
2. reduce foggy gradient buildup
3. make the seam read as structural continuity instead of a decorative fade

[CCR-070]

### 6.2 Composer frame

Required changes:

1. clarify outer frame authority
2. ensure the frame looks intentional even when the field is empty
3. tighten radius and edge treatment so the object feels less inflated

[CCR-071]

### 6.3 Composer field

Required changes:

1. keep the field calm and generous
2. improve active-state legibility without shouting
3. ensure the empty field does not depend on placeholder prose to feel designed

[CCR-072]

### 6.4 Attachment affordance

Required changes:

1. give the control a clearer relationship to the field
2. align its surface grammar with send and field states
3. ensure disabled states are still visually coherent

[CCR-073]

### 6.5 Send affordance

Required changes:

1. strengthen weight and authority in ready state
2. make idle state clearly secondary without feeling broken
3. keep disabled state visibly intentional rather than merely drained

[CCR-074]

### 6.6 Helper band

Required changes:

1. reduce dual-message explanatory load
2. keep keyboard guidance available but quieter
3. allow compact layouts to preserve clarity without feeling caption-heavy

[CCR-075]

---

## 7. Verification Strategy

| Category | Minimum evidence |
| --- | --- |
| Component behavior | `src/frameworks/ui/ChatInput.test.tsx` remains green and expands to cover any new stable semantic hooks |
| Floating shell structure | `tests/chat-surface.test.tsx` and `tests/shell-visual-system.test.tsx` remain green where header and shell-level chat chrome ownership are asserted |
| Browser layout confidence | FAB browser tests continue to prove helper, send, and opened-shell usability on compact layouts |
| Real-browser evidence | `npm run test:browser-live` passes so the redesign is proven against the live FAB smoke path rather than only component tests |
| CSS safety | `npm run lint:css` passes after token and selector changes |
| Type safety | `npm run typecheck` passes after class, attribute, or prop-surface adjustments |
| Build safety | `npm run build` passes |

Expected baseline verification:

```bash
npm run lint:css
npm exec vitest run src/frameworks/ui/ChatInput.test.tsx tests/chat-surface.test.tsx tests/shell-visual-system.test.tsx tests/browser-fab-mobile-density.test.tsx tests/browser-fab-chat-flow.test.tsx
npm run typecheck
npm run test:browser-live
npm run build
```

---

## 8. Sprint Plan

| Sprint | Goal |
| --- | --- |
| 0 | Audit the current control surface, define the token contract, and enumerate inline visual debt in the floating seam authority map |
| 1 | Redesign the composer plane, frame, field, and action hierarchy in floating mode |
| 2 | Simplify helper and placeholder guidance, reconcile compact/mobile behavior, and close with regression QA |

---

## 9. Done Criteria

1. The composer reads as one designed interaction object instead of layered softened chrome. `[CCR-080]`
2. The send affordance is unmistakably primary when ready and clearly secondary when idle. `[CCR-081]`
3. The attachment affordance feels integrated into the object grammar. `[CCR-082]`
4. Placeholder and helper copy are reduced to support roles rather than carrying the interface. `[CCR-083]`
5. Inline floating-composer atmosphere work is replaced or minimized in favor of token-backed selector authority. `[CCR-084]`
6. Compact and relaxed density modes preserve clarity and usable control targets. `[CCR-085]`
7. Regression tests, CSS lint, and production build all remain green after the redesign lands. `[CCR-086]`

---

## 10. Completion Evidence

This refactor is complete when:

1. the sprint files in this package are marked done with verification results
2. the floating composer no longer depends on ad hoc inline gradients for its main hierarchy
3. `npm run test:browser-live` or an explicitly recorded successor command proves the control surface presents a stronger primary-action posture in a real browser
4. the repo's semantic style system, not component-local ornament, owns the redesign

## 11. Implementation Closeout

The redesign is complete across all planned sprints.

Implemented outcomes:

1. Sprint 0 froze the authority map, token contract, stable hooks, and verification surface.
2. Sprint 1 moved the floating composer plane, seam, frame, attach, and send hierarchy into token-backed selector ownership.
3. Sprint 2 reduced placeholder and helper copy, calibrated compact/mobile behavior, and closed the redesign with browser-style, live-browser, typecheck, and build evidence.

Verified final package state:

1. `docs/_refactor/chat-control-surface-redesign/sprints/sprint-0-audit-and-token-contract.md` is marked complete.
2. `docs/_refactor/chat-control-surface-redesign/sprints/sprint-1-composer-object-and-action-hierarchy.md` is marked complete.
3. `docs/_refactor/chat-control-surface-redesign/sprints/sprint-2-copy-reduction-mobile-calibration-and-closeout.md` is marked complete.
4. The floating composer no longer relies on inline hierarchy styling for its main plane and seam.
5. `npm run test:browser-live` passed as the real-browser proof path.
6. `npm run lint:css`, `npm run typecheck`, and `npm run build` all passed at closeout.