# Sprint 2 - Copy Reduction, Mobile Calibration, And Closeout

> **Status:** Completed
> **Source:** `docs/_refactor/chat-control-surface-redesign/spec.md`

## Objective

Finish the redesign by reducing explanatory drag, tuning compact/mobile behavior, and locking the contract with regression evidence. `[CCR-S2-010]`

## Tasks

1. Decide the final placeholder posture for the redesigned composer and implement the shortest wording that still sets expectations for workflow, use-case, or handoff input. `[CCR-S2-011]`
2. Reduce helper copy from a dual-message explanatory band to the minimum support language that preserves keyboard guidance and attachment discoverability without captioning the whole object. `[CCR-S2-012]`
3. Calibrate compact and mobile layouts so the redesigned field, attach control, send control, and helper line maintain hierarchy without clipping, crowding, or target-size regressions. `[CCR-S2-013]`
4. Extend or adjust tests only where stable semantic assertions are needed for helper posture, compact layout behavior, or closeout regressions. `[CCR-S2-014]`
5. Close the redesign with component, browser-style, real-browser, typecheck, and production-build evidence. `[CCR-S2-015]`

## Deliverables

1. Final placeholder and helper-copy decisions reflected in `src/frameworks/ui/ChatInput.tsx`.
2. Final compact/mobile selector calibration in `src/app/styles/chat.css`.
3. Updated regression assertions only where the redesign adds stable evidence value.
4. Closeout evidence recorded in the sprint file.

## Verification Focus

This sprint is responsible for copy posture, responsive calibration, and end-to-end proof. Sprint 1 should not be forced to answer those questions.

## Verify

```bash
npm run lint:css
npm exec vitest run src/frameworks/ui/ChatInput.test.tsx tests/browser-fab-mobile-density.test.tsx tests/browser-fab-chat-flow.test.tsx
npm run test:browser-ui
npm run test:browser-live
npm run typecheck
npm run build
```

## Exit Criteria

1. Helper and placeholder copy are subordinate.
2. Compact/mobile behavior remains coherent.
3. Browser-style and real-browser evidence both support the redesign.
4. The redesign is verified and handoff-ready.

## QA Deviations

None.

## Verification Results

Completed implementation:

1. shortened the textarea placeholder in `src/frameworks/ui/ChatInput.tsx` to `Paste the workflow, brief, or handoff...`
2. reduced the helper band to one quieter supporting sentence in `src/frameworks/ui/ChatInput.tsx`
3. tightened composer spacing for compact/mobile usage by standardizing composer gap and control padding in `src/frameworks/ui/ChatInput.tsx`
4. added compact-width helper and send-button calibration in `src/app/styles/chat.css`
5. removed the residual `ThemeProvider` `act(...)` warnings from `tests/shell-visual-system.test.tsx` by awaiting hydration in the shell test harness

Verified commands:

1. `npm run lint:css` passed
2. `npm run typecheck` passed
3. `npm exec vitest run tests/shell-visual-system.test.tsx src/frameworks/ui/ChatInput.test.tsx tests/browser-fab-mobile-density.test.tsx tests/browser-fab-chat-flow.test.tsx` passed
4. `npm run test:browser-ui` passed
5. `npm run test:browser-live` passed
6. `npm run build` passed

## Completion Checklist

- [x] final placeholder copy is shorter and subordinate
- [x] helper guidance is reduced to one quiet supporting line
- [x] compact/mobile composer spacing is calibrated without target-size regressions
- [x] browser-style regression coverage is updated for the new helper posture
- [x] real-browser smoke coverage passes with the new copy and layout
- [x] typecheck and production build are green