# Sprint 2 - Visual Hierarchy and QA

> **Goal:** Calm the message stage, reduce visual competition, and leave the feature with durable verification evidence.
> **Spec Sections:** `CUX-058` through `CUX-075`

## Tasks

1. Reduce oversized branding pressure in the embedded chat stage and quiet the in-body brand header.
2. Bring assistant and user message surfaces closer together in visual weight while preserving role distinction.
3. Update or add tests that capture the final stage markers and interaction wiring after the UI changes.
4. Record implementation status and verification results in the feature docs.

## Completion Checklist

- [x] Message stage branding is calmer
- [x] Bubble treatments are more balanced
- [x] Regression coverage updated
- [x] Docs reflect implemented state and verification

## QA Deviations

None.

## Verification

- `npm exec vitest run tests/homepage-shell-layout.test.tsx tests/homepage-shell-ownership.test.tsx tests/browser-motion.test.tsx tests/browser-overlays.test.tsx`
- `npm run typecheck`
- `npm run build`