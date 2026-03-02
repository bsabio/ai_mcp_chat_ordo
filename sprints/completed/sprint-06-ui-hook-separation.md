# Sprint 06 - UI Hook Separation and UX Stability

## Goal
Separate chat transport/state logic from presentation for maintainability and testability.

## Problems Addressed
- `page.tsx` mixes stream IO mechanics and rendering.

## TDD Cycle
### Red
- Add failing tests for a custom hook (`useChatStream`):
  - appends user message
  - streams assistant chunks incrementally
  - handles stream error replacement
  - handles empty reply fallback

### Green
- Extract hook to `src/hooks/useChatStream.ts`.
- Keep `page.tsx` mostly declarative UI.

### Refactor
- Create small presentational components if needed (`ChatMessageList`, `ChatComposer`).

## Deliverables
- Hook tests with mocked `fetch` stream reader.
- Cleaner page component with reduced cognitive load.

## Acceptance Criteria
- UI file has no low-level stream reader loop logic.
- UX behavior remains unchanged and verified by tests.

## Risks
- Mocking streams can be tricky; mitigate with reusable stream test utility.
