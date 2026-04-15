# Sprint 1 - Composer Object And Action Hierarchy

> **Status:** Completed
> **Source:** `docs/_refactor/chat-control-surface-redesign/spec.md`

## Objective

Turn the current composer from a softened tray into one precise interaction object with a clear primary action. `[CCR-S1-010]`

## Tasks

1. Add or rename the semantic token roles required for the composer object in `src/app/styles/foundation.css`, covering plane, frame, field, active field emphasis, attach, send, helper, seam, and radius relationships. `[CCR-S1-011]`
2. Move floating composer-plane atmosphere out of inline `ChatContentSurface` style composition and into token-backed selectors in `src/app/styles/chat.css`. `[CCR-S1-012]`
3. Rebuild the composer frame so one dominant surface owns the object and the field reads as a subordinate input plane rather than as a second competing card. `[CCR-S1-013]`
4. Rewrite send styling so idle, ready, and disabled states differ through hierarchy, contrast, and weight rather than relying mainly on color fill and hover motion. `[CCR-S1-014]`
5. Rework the attachment affordance so it shares the same geometric and tonal grammar as the send control and composer field. `[CCR-S1-015]`
6. Reduce component-local visual tuning in `src/frameworks/ui/ChatInput.tsx` by moving hover, shadow, and state posture into semantic classes or selectors while preserving the existing data attributes. `[CCR-S1-016]`
7. Keep the placeholder text and helper copy wording unchanged in this sprint unless a wording change is strictly required to support the new hierarchy; copy reduction belongs to Sprint 2. `[CCR-S1-017]`

## Deliverables

1. Updated token definitions in `src/app/styles/foundation.css`.
2. Updated floating-composer selectors in `src/app/styles/chat.css`.
3. Reduced visual string debt in `src/frameworks/ui/ChatInput.tsx` and `src/frameworks/ui/ChatContentSurface.tsx`.
4. Stable semantic hooks preserved for `data-chat-composer-form`, `data-chat-composer-state`, `data-chat-composer-field`, and `data-chat-send-state`.

## Verification Focus

This sprint verifies hierarchy, shell integration, and regressions, not final copy posture.

## Verify

```bash
npm run lint:css
npm exec vitest run src/frameworks/ui/ChatInput.test.tsx tests/chat-surface.test.tsx tests/shell-visual-system.test.tsx tests/browser-fab-chat-flow.test.tsx
npm run typecheck
```

## Exit Criteria

1. The composer reads as one object instead of a tray containing multiple competing sub-surfaces.
2. The send action is clearly primary when ready and clearly secondary when idle.
3. Attachment and send controls feel like siblings, not strangers.
4. The floating seam is token-owned rather than primarily inline-authored in `ChatContentSurface`.
5. Existing shell and chat semantic hooks remain stable enough for the current regression suites.

## QA Deviations

None.

## Verification Results

Completed implementation:

1. added composer-specific floating-shell token roles in `src/app/styles/foundation.css`
2. moved the floating composer-plane and seam styling out of inline `ChatContentSurface` class composition and into `src/app/styles/chat.css`
3. reduced component-local visual tuning in `src/frameworks/ui/ChatInput.tsx` by moving attach and send posture into semantic classes
4. preserved the existing `data-chat-composer-*` and `data-chat-send-state` hooks
5. kept placeholder and helper wording unchanged for Sprint 2

Verified commands:

1. `npm run lint:css` passed
2. `npm exec vitest run src/frameworks/ui/ChatInput.test.tsx tests/chat-surface.test.tsx tests/shell-visual-system.test.tsx tests/browser-fab-chat-flow.test.tsx tests/browser-fab-mobile-density.test.tsx` passed
3. `npm run typecheck` passed after removing the unsupported regex `s` flags from `tests/sprint-4-theme-governance-qa.test.ts`

Residual notes:

1. The earlier `ThemeProvider` `act(...)` warnings in `tests/shell-visual-system.test.tsx` were resolved during Sprint 2 closeout, so the shell verification path is now clean.

## Completion Checklist

- [x] composer-specific token roles exist for plane, frame, field emphasis, attach, send, helper, seam, and radius relationships
- [x] floating composer-plane styling is selector-owned rather than primarily inline-authored
- [x] attach and send controls share a more coherent interaction-object grammar
- [x] placeholder and helper copy wording remain unchanged in Sprint 1
- [x] existing shell and chat semantic hooks remain stable in focused regressions
- [x] focused CSS lint and regression coverage passed
- [x] focused typecheck passes