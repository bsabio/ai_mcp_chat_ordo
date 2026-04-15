# Sprint 1 — Response-State Gating And Closure Contract

> **Status:** Implemented
> **Goal:** Replace unconditional follow-up behavior with a governed
> `open / closed / needs_input` response-state model.

## Problem

The current chat surface assumes forward momentum even when the answer is
already complete. That reduces satisfaction and makes suggestion chips feel like
 obligatory padding rather than useful next steps.

## Primary Areas

- `src/lib/corpus-vocabulary.ts`
- `src/adapters/ChatPresenter.ts`
- `src/core/entities/MessageFactory.ts`
- `src/frameworks/ui/MessageList.tsx`
- prompt assembly and relevant prompt tests

## Tasks

1. **Introduce response-state vocabulary**
   - Add a governed runtime concept for `open`, `closed`, and `needs_input`.
   - Ensure the presenter can preserve that state from model output or runtime
     repair.

2. **Replace fixed suggestion mandate**
   - Remove the unconditional “always emit four suggestions” rule from the
     prompt contract.
   - Replace it with state-dependent behavior.

3. **Closure contract**
   - Allow answers to terminate cleanly without chips.
   - Permit a short closure line when the work is complete.

4. **Needs-input contract**
   - Ensure the agent asks one precise blocking question instead of generating
     four option-like suggestions.

5. **UI behavior alignment**
   - Ensure chip containers render only when the message is truly `open`.
   - Prevent closed answers from showing synthetic follow-up chrome.

## Acceptance Criteria

1. Closed answers can ship with zero suggestions.
2. Needs-input answers surface one precise question instead of padded chips.
3. Open answers produce only the number of follow-ups warranted by the content.
4. The presenter and UI agree on when suggestion chrome is absent.

## Verification

- Add regression tests for closed answers with no suggestions.
- Add regression tests for needs-input answers.
- Add deterministic tests proving the chip surface is hidden for `closed`.

## Implementation Notes

- Added an explicit `__response_state__` contract to the base prompt with
   governed `open | closed | needs_input` behavior.
- Updated the presenter to parse explicit response-state tags, preserve
   runtime-generated open hero messages, and fall back to a minimal repair path
   for legacy assistant messages.
- Removed synthetic fallback suggestion generation. Malformed or absent
   suggestion payloads now degrade to no chips unless the assistant explicitly
   emits a valid open-state follow-up set.
- Gated `dynamicSuggestions`, hero-state detection, and transcript chip
   rendering on `responseState === "open"`.
- Aligned the malformed-tag deterministic eval checkpoint with the new contract
   so it verifies suggestion suppression instead of suggestion repair.

## Outputs

- `src/core/entities/chat-message.ts`
- `src/core/entities/MessageFactory.ts`
- `src/adapters/ChatPresenter.ts`
- `src/hooks/usePresentedChatMessages.ts`
- `src/frameworks/ui/useChatSurfaceState.tsx`
- `src/frameworks/ui/MessageList.tsx`
- `src/lib/corpus-vocabulary.ts`
- `src/lib/evals/scenarios.ts`
- `src/lib/evals/runner.ts`
- `src/lib/evals/seeding.ts`

## Validation

```bash
npm exec vitest run src/adapters/ChatPresenter.test.ts src/lib/corpus-vocabulary.test.ts src/core/entities/MessageFactory.test.ts src/hooks/usePresentedChatMessages.test.tsx src/frameworks/ui/MessageList.test.tsx tests/config-bootstrap.test.ts tests/first-message-flow.test.tsx
```

- Result: 7 files passed, 130 tests passed.