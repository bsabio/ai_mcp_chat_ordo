# Sprint 2 - Message Stage, Action Ladder, And Composer Anchoring

> **Goal:** Rework the floating transcript, follow-up action cluster, and composer so the opened shell has one clear focal order: the active assistant response leads, follow-up actions read as a ranked decision surface, and the composer feels anchored to the same conversational plane instead of a detached utility tray.
> **Spec Sections:** `FVA-040` through `FVA-046`, `FVA-080` through `FVA-104`, `FVA-110` through `FVA-115`, `FVA-130` through `FVA-137`
> **Prerequisite:** Sprint 1 implemented and QA-passed

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/frameworks/ui/ChatContentSurface.tsx` | `ChatContentSurface({ activeTrigger, canSend, dynamicSuggestions, input, inputRef, isEmbedded, isFullScreen, isHeroState, isLoadingMessages, isSending, mentionIndex, messages, onFileRemove, onFileSelect, onInputChange, onLinkClick, onMentionIndexChange, onSend, onSuggestionClick, onSuggestionSelect, pendingFiles, scrollDependency, searchQuery, suggestions })` currently composes `ChatMessageViewport` above the composer row and owns the floating-only composer backdrop seam |
| `src/frameworks/ui/ChatMessageViewport.tsx` | `ChatMessageViewport({ dynamicSuggestions, isEmbedded, isHeroState, isFullScreen, isLoadingMessages, isSending, messages, onLinkClick, onSuggestionClick, scrollDependency, searchQuery })` owns the transcript region, top ambient glow, scroll container, and scroll CTA for floating mode |
| `src/frameworks/ui/MessageList.tsx` | `MessageList({ messages, isSending, dynamicSuggestions, isHeroState, isSuggestionDisabled, onSuggestionClick, onLinkClick, searchQuery, isEmbedded })` currently renders assistant/user bubbles, follow-up chips, and hero intro, and already emits `data-chat-suggestion-group`, `data-chat-suggestion-priority`, and `data-chat-suggestion-rank` |
| `src/frameworks/ui/ChatInput.tsx` | `ChatInput({ inputRef, value, onChange, onSend, isSending, canSend, onArrowUp, activeTrigger, suggestions, mentionIndex, onMentionIndexChange, onSuggestionSelect, pendingFiles, onFileSelect, onFileRemove })` already emits `data-chat-composer-form`, `data-chat-composer-state`, `data-chat-composer-field`, and `data-chat-send-state` |
| `src/app/globals.css` | Sprint 0 and Sprint 1 already established the floating-only `--fva-*` token layer plus header-specific selectors, so Sprint 2 should extend those tokens for message-stage surfaces, chip hierarchy, and composer anchoring instead of hardcoding new visual values inline |
| `src/frameworks/ui/MessageList.test.tsx` | Existing message-list coverage already protects hero vs. conversation state, search behavior, hero chips, follow-up chip groups, and suggestion rank semantics, so Sprint 2 can extend this file for transcript and action-ladder structure |
| `src/frameworks/ui/ChatInput.test.tsx` | Existing composer tests already verify Enter submit behavior, Shift+Enter newline behavior, textarea rendering, and helper copy, making this the right place to add isolated composer-state assertions instead of inventing a new harness |
| `src/components/FloatingChatShell.test.tsx` | Current shell coverage already protects floating shell ownership, left-vs-right header rail behavior, and floating composer state, so Sprint 2 can extend it only where shell-level hierarchy hooks need to stay stable |
| `tests/browser-fab-chat-flow.test.tsx` | Browser-style FAB coverage already proves the first chip send, follow-up chip state, and reset-confirmation path, making it the primary end-to-end harness for ranked actions and anchored composer behavior |
| `tests/browser-fab-mobile-density.test.tsx` | Mobile/browser-style coverage already protects the opened shell on compact layouts, including composer helper copy and header rails, so Sprint 2 can extend it for composer anchoring and follow-up hierarchy without adding a new viewport harness |
| `tests/browser-fab-scroll-recovery.test.tsx` | Existing scroll recovery coverage proves follow-up actions remain recoverable below the fold and must stay green because Sprint 2 will tighten transcript and composer spacing |
| `tests/browser-ui/fab-live-smoke.spec.ts` | Real-browser smoke already proves launcher open, helper copy, first workflow-chip send, reset affordance visibility, and post-send follow-up action availability on a real route |

## Tasks

1. Raise the message stage above the surrounding shell chrome so the assistant response becomes the clear focal anchor.

   The implementation should tighten the floating transcript hierarchy without reopening message semantics.

   Minimum scope:

   - make the active assistant bubble read as a stronger conversational plane than the shell background and header chrome
   - reduce the feeling of a white-on-white stack by adjusting floating-only transcript surfaces, edge contrast, and ambient glow
   - keep user bubbles quieter than the active assistant response while preserving readable contrast
   - add stable semantic hooks where later QA needs to distinguish assistant anchor, user reply, and transcript plane without using brittle class snapshots

   Suggested implementation path:

   - extend `--fva-*` tokens for transcript surface, assistant anchor, muted user response, and transcript backdrop roles
   - add floating-only semantic hooks on assistant and user bubble containers where needed, for example assistant anchor vs. supporting reply roles
   - keep homepage hero styling intact; Sprint 2 applies to the opened floating shell only

   Constraints:

   - Do not change assistant/user message content, typing behavior, or restore/runtime semantics.
   - Do not remove or rename existing hooks used by Sprint 0 and Sprint 1 regressions.
   - Do not restyle the embedded homepage transcript under the guise of floating hierarchy work.

   Verify:

   - `npm exec vitest run src/frameworks/ui/MessageList.test.tsx src/components/FloatingChatShell.test.tsx`

2. Turn the follow-up chip tray into a real action ladder instead of a neutral pill cluster.

   The implementation should visually differentiate recommended, secondary, and optional follow-up actions using the Sprint 0 semantic rank hooks.

   Minimum scope:

   - the first follow-up action in floating conversation state should read as the clearly recommended next action
   - secondary actions should remain discoverable but visually subordinate
   - hero-state chips should remain balanced rather than inheriting the floating follow-up action ladder
   - the chip group should feel attached to the active assistant response rather than like a separate white module

   Suggested implementation path:

   - use the existing `data-chat-suggestion-priority` and `data-chat-suggestion-rank` hooks to drive ranked styling through `globals.css`
   - refine group spacing, chip density, and token-backed borders/backgrounds so the primary action and the supporting actions no longer share identical weight
   - add any missing semantic hook only if the current rank/group hooks prove insufficient

   Constraints:

   - Keep the current prompt-tolerant action assertions; do not regress into wording-specific chip tests.
   - Do not alter the underlying dynamic suggestion ordering logic in this sprint.
   - Do not collapse hero chips into the floating conversation treatment.

   Verify:

   - `npm exec vitest run src/frameworks/ui/MessageList.test.tsx tests/browser-fab-chat-flow.test.tsx tests/browser-fab-scroll-recovery.test.tsx`

3. Anchor the composer to the conversation plane and strengthen ready-state affordances.

   The implementation should make the composer feel like the next step in the same interaction instead of a detached tray below it.

   Minimum scope:

   - bring the composer shell visually closer to the transcript plane through floating-only surface, spacing, and separator work
   - make the composer field more legible as an active input surface
   - make the send button read clearly ready when input exists and clearly secondary when it does not
   - keep helper copy readable but visually subordinate to the field and send affordance

   Suggested implementation path:

   - refine the floating composer-row surface in `ChatContentSurface` and `ChatInput` using `--fva-*` tokens instead of ad hoc inline gradients
   - add stable semantic hooks if later QA must distinguish the anchored composer shell from the transcript plane
   - extend `ChatInput.test.tsx` to assert composer/send ready-state semantics in isolation

   Constraints:

   - Do not change Enter/Shift+Enter behavior, mention behavior, or attachment behavior.
   - Do not reduce tap targets for attach/send actions below the current usable size.
   - Keep embedded-only `data-chat-composer-row="true"` behavior embedded-only.

   Verify:

   - `npm exec vitest run src/frameworks/ui/ChatInput.test.tsx tests/browser-fab-mobile-density.test.tsx src/components/FloatingChatShell.test.tsx`

4. Lock the Sprint 2 hierarchy contract with component, browser-style, and live-browser evidence.

   The implementation should add or update tests that prove:

   - the active assistant message remains the visual anchor of the floating conversation stage
   - follow-up actions preserve their ranked hierarchy in floating conversation mode
   - hero-state chips remain balanced rather than promoted
   - the composer visibly transitions between idle and ready semantics without changing behavior
   - compact/mobile layouts still preserve helper copy, send availability, and scroll recovery after the hierarchy changes
   - the live-browser smoke still reaches visible post-send actions and the reset affordance on a real route

   Constraints:

   - Prefer semantic DOM assertions and stable data hooks over brittle style snapshots.
   - Keep the live-browser smoke prompt-tolerant and route-realistic.
   - Do not let Sprint 2 consume Sprint 3 responsive calibration and browser-polish scope.

   Verify:

   - `npm run test:browser-ui`
   - `npm run test:browser-live`
   - `npm run typecheck`
   - `npm run build`

## Test Matrix

### Positive Tests

1. Verify the latest assistant bubble in floating conversation state exposes the semantic anchor hook and remains the strongest transcript plane.
2. Verify user bubbles remain visually subordinate to the active assistant response while preserving readable text contrast.
3. Verify the follow-up chip group still renders in floating conversation mode and the first chip remains the primary-ranked action.
4. Verify hero-state chips remain balanced and neutral rather than inheriting the promoted follow-up treatment.
5. Verify the composer shell still exposes `data-chat-composer-form`, `data-chat-composer-state`, `data-chat-composer-field`, and `data-chat-send-state`, with ready state visible once input exists.
6. Verify mobile-sized floating rendering still shows helper copy, send affordance, and ranked follow-up actions after Sprint 2 hierarchy changes.
7. Verify the live-browser FAB smoke still opens, sends the first workflow chip, exposes the reset affordance, and eventually shows post-send follow-up actions.
8. Verify scroll recovery still restores the viewport after transcript/composer spacing changes.

### Negative Tests

1. Verify Sprint 2 does not change message semantics, assistant naming in transcript content, or restore/runtime behavior.
2. Verify the embedded homepage hero intro and hero chip treatment do not inherit floating follow-up hierarchy styling.
3. Verify the composer does not lose helper copy, attachment affordance, or idle/ready semantics while being visually anchored.
4. Verify the primary follow-up action does not move into the header or composer; it remains attached to the assistant response region.
5. Verify Sprint 2 does not rename or remove the existing Sprint 0 and Sprint 1 semantic hooks used by current regressions.
6. Verify the scroll CTA remains reachable and functional after transcript/composer hierarchy changes.

### Edge-Case Tests

1. Verify repeated follow-up sends preserve a single ranked action group and do not duplicate transcript hierarchy hooks.
2. Verify the reset-confirmation state from Sprint 1 remains usable after Sprint 2 composer and transcript changes.
3. Verify ready-state send styling appears only when input exists and does not falsely appear while the composer is empty.
4. Verify compact/mobile layouts keep the composer anchored without clipping follow-up actions or helper text.
5. Verify live-browser runs remain tolerant of assistant wording variation while the stable shell-level outcomes stay intact.

## Completion Checklist

- [x] Floating transcript hierarchy makes the active assistant response the clear anchor
- [x] Follow-up chips now read as a ranked action ladder in floating conversation mode
- [x] Hero chips remain balanced and are not pulled into the follow-up action ladder
- [x] Floating composer shell is visually anchored to the transcript plane
- [x] Composer ready-state and send affordance hierarchy are strengthened through the `--fva-*` token layer
- [x] Stable semantic hooks exist for any new transcript or composer hierarchy assertions added in Sprint 2
- [x] Structural, browser-style, scroll-recovery, and live-browser tests cover the Sprint 2 hierarchy contract
- [x] Sprint 2 remains scoped to message-stage, chip, and composer hierarchy and does not consume Sprint 3 responsive calibration work

## QA Deviations

None.

## Verification Results

- Focused Sprint 2 FAB regressions passed: `npm exec vitest run src/frameworks/ui/MessageList.test.tsx src/frameworks/ui/ChatInput.test.tsx src/components/FloatingChatShell.test.tsx tests/browser-fab-chat-flow.test.tsx tests/browser-fab-mobile-density.test.tsx tests/browser-fab-scroll-recovery.test.tsx`
- Browser-style FAB suite passed: `npm run test:browser-ui`
- Live-browser smoke passed: `npm run test:browser-live`
- Static typecheck passed: `npm run typecheck`
- Production build passed: `npm run build`

## Verification

- `npm exec vitest run src/frameworks/ui/MessageList.test.tsx src/frameworks/ui/ChatInput.test.tsx src/components/FloatingChatShell.test.tsx tests/browser-fab-chat-flow.test.tsx tests/browser-fab-mobile-density.test.tsx tests/browser-fab-scroll-recovery.test.tsx`
- `npm run test:browser-ui`
- `npm run test:browser-live`
- `npm run typecheck`
- `npm run build`
