# Sprint 3 - Failure Regression and QA

> **Goal:** Prove the failed-send path preserves visible user work and close the feature with full verification.
> **Spec ref:** `CRH-023`, `CRH-037`, `CRH-038`, `CRH-040`, `CRH-043`, `CRH-044`

## Tasks

1. Add a chat container integration regression that uploads a file, fails the stream, verifies cleanup is requested, and confirms the draft and file chip stay visible.
2. Run the focused runtime hardening suite to confirm the new adapter, route, and UI regressions pass together.
3. Run `npm run quality` and record the complete verification state in the feature package.

## Completion Checklist

- [x] Failed-send UI regression added
- [x] Focused runtime hardening regressions passing
- [x] Full repository quality gate passing

## QA Deviations

None.

## Verification

- `npm exec vitest run src/frameworks/ui/ChatContainer.send-failure.test.tsx src/adapters/UserFileDataMapper.test.ts src/lib/user-files.test.ts src/app/api/chat/uploads/route.test.ts`
- `npm run quality`
