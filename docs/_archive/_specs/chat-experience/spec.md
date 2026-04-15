# Chat Experience - Message, Scroll, and Composer Spec

> **Status:** Implemented
> **Date:** 2026-03-15
> **Scope:** Repair the chat experience itself after homepage-shell ownership was restored. This feature covers message identity, inline content navigation, filtered-list behavior, composer ergonomics, scroll intent, and message-stage visual hierarchy.
> **Affects:** `src/frameworks/ui/ChatContainer.tsx`, `src/frameworks/ui/MessageList.tsx`, `src/frameworks/ui/ChatInput.tsx`, `src/hooks/useChatScroll.ts`, `src/adapters/ChatPresenter.ts`, `src/hooks/useMentions.ts`, legacy chapter redirect routes, and focused chat UX tests.
> **Motivation:** The homepage stage now owns the shell correctly, but the conversation surface still behaves like a stitched-together prototype in several key ways. The defects are not all visual. They span rendering identity, navigation semantics, filter correctness, input capability, and scroll-policy assumptions.
> **Requirement IDs:** `CUX-XXX`

---

## 1. Problem Statement

### 1.1 Verified UX Failures

The current chat experience has the following verified problems:

1. Rendered message identity is unstable because the container reassigns ids from array position rather than preserving the underlying message id. This risks remounts, lost transient UI state, and scroll jitter during streaming or restore. `[CUX-010]`
2. Inline content links are visually presented as actionable but currently do not navigate anywhere. The click handler only logs the slug. `[CUX-011]`
3. Message filtering uses `JSON.stringify` on content blocks and still computes “latest message” state against the unfiltered array, so filtered views can attach streaming affordances and suggestion chips to the wrong message. `[CUX-012]`
4. The composer is implemented as a single-line text input despite behaviors and product use cases that require multiline drafting, revision, and mention insertion. `[CUX-013]`
5. Scroll behavior is based on local heuristics rather than explicit user intent. The current hook infers detachment from scroll deltas and uses a very loose bottom threshold. `[CUX-014]`
6. The message stage is over-branded: a giant watermark, a grand in-body hero header, and strongly asymmetric assistant/user treatments compete with the actual content. `[CUX-015]`

### 1.2 Root Cause

The homepage shell and the conversation surface are now split correctly, but the conversation surface still mixes concerns across three different layers:

1. Chat state and message identity
2. View-model transformation and filtered presentation
3. Visual rhythm and scroll affordance behavior

Because those concerns are blurred, simple UX defects propagate across multiple features. A scroll bug is tied to render identity. A presentation bug becomes a filter bug. A navigation affordance is visually present without a real route contract. `[CUX-020]`

---

## 2. Design Goals

1. **Stable message identity.** Every rendered message must preserve a stable id from the source message model. `[CUX-030]`
2. **Truthful affordances.** Any visible navigation affordance in a message must actually navigate. `[CUX-031]`
3. **Filtered-view correctness.** Search mode must compute latest-message state, typing affordances, and suggestion chips from the rendered list, not the hidden list. `[CUX-032]`
4. **Real composer ergonomics.** The chat composer must support multiline drafting, mention insertion, and keyboard behavior expected in a serious chat tool. `[CUX-033]`
5. **Intent-based scrolling.** Auto-scroll must follow a simple contract: stay pinned when the user is pinned, stop when the user intentionally detaches, and reattach when they explicitly return to the bottom. `[CUX-034]`
6. **Calmer message stage.** Branding should frame the conversation, not dominate it. The message content must be the primary focal point. `[CUX-035]`
7. **Compatibility with corpus routes.** Legacy chapter-only links may remain as compatibility entry points, but they must resolve to canonical corpus routes. `[CUX-036]`

---

## 3. Architecture Direction

### 3.1 Message Identity Contract

The message model already includes a required `id`. The presenter and container must preserve that identity directly.

Rules:

1. `ChatContainer` must stop synthesizing `id: String(index)` when preparing rendered messages. `[CUX-040]`
2. `ChatPresenter` must not generate random fallback ids for normal rendering flow. `[CUX-041]`
3. Any UI logic keyed to “first”, “last”, or “streaming” message state must use stable ids or filtered-list-relative position, never hidden-array position mixed with visible-array rendering. `[CUX-042]`

### 3.2 Inline Navigation Contract

Inline library links use the `[[slug]]` syntax and are rendered as click targets. They must resolve to a real route.

Rules:

1. The chat container must route inline link clicks to a real page instead of logging them. `[CUX-043]`
2. The legacy chapter-only route must resolve a section slug across the corpus and redirect to the canonical `/corpus/{document}/{section}` route. `[CUX-044]`
3. Failure to resolve a slug must degrade safely to `notFound()` rather than redirecting to an unrelated document. `[CUX-045]`

### 3.3 Filtered Presentation Contract

Search mode is a presentation layer, not a serialization layer.

Rules:

1. Filtering must inspect meaningful text content extracted from rich content blocks rather than stringifying the block object. `[CUX-046]`
2. “Latest assistant message” affordances such as chips or streaming cursor state must be attached only when the relevant message is visible in the filtered list. `[CUX-047]`
3. The first-message hero behavior must apply only to the real first conversation message, not whichever item happens to be first in a filtered subset. `[CUX-048]`

### 3.4 Composer Contract

The composer must be a textarea-based input surface.

Rules:

1. The primary input control must be a multiline textarea. `[CUX-049]`
2. `Enter` without `Shift` submits when composition is not active. `[CUX-050]`
3. `Shift+Enter` inserts a newline. `[CUX-051]`
4. The mentions hook must receive a real textarea ref owned by the rendered composer control. `[CUX-052]`
5. The textarea should auto-grow within a bounded maximum height so the composer stays readable without overtaking the stage. `[CUX-053]`

### 3.5 Scroll Intent Contract

The scroll hook must model whether the user is pinned to the bottom.

Rules:

1. The bottom check should use a tighter threshold than the current 150px heuristic. `[CUX-054]`
2. User detachment is defined by “not near bottom after a scroll event”, not by comparing consecutive `scrollTop` deltas alone. `[CUX-055]`
3. Auto-scroll on content changes should run only while pinned. `[CUX-056]`
4. Explicit “scroll to bottom” actions re-pin the view. `[CUX-057]`

### 3.6 Visual Hierarchy Contract

The message stage must be visually calmer.

Rules:

1. The oversized watermark should not dominate active conversations. `[CUX-058]`
2. The in-body header should act as a quiet onboarding cue, not a second hero section. `[CUX-059]`
3. Assistant and user messages should both feel like conversation units, not like one side is content and the other side is chrome. `[CUX-060]`

---

## 4. Testing Strategy

The implementation must add or update tests for the following:

1. Presenter identity preservation and suggestion stripping. `[CUX-070]`
2. Message-list filtered rendering behavior, including chips and initial-greeting logic. `[CUX-071]`
3. Composer keyboard behavior for `Enter` and `Shift+Enter`. `[CUX-072]`
4. Scroll hook pin/detach behavior. `[CUX-073]`
5. Inline chat link navigation wiring. `[CUX-074]`
6. Legacy chapter redirect resolution to canonical corpus routes. `[CUX-075]`

---

## 5. Sprint Plan

| Sprint | Goal |
| --- | --- |
| 0 | Repair message identity, inline link routing, and filtered-list correctness |
| 1 | Replace the composer with a real textarea and refactor scroll behavior around explicit pin state |
| 2 | Calm the message-stage presentation, complete QA coverage, and record verification |

---

## 6. Implementation Update

This feature folder was created as the planning and execution home for the March 15, 2026 chat message and scroll audit. It is intended to sit beside the homepage-shell spec: homepage-shell owns the workspace boundary; chat-experience owns the conversation surface inside that boundary.

Implementation completed on 2026-03-15 with the following outcomes:

1. Stable source message ids now flow through the chat presenter and container without index-based rewriting.
2. Inline message links now navigate through the legacy chapter resolver, and the legacy chapter route now resolves to canonical corpus routes instead of hardcoding a single document.
3. Filtered message views now search meaningful rendered text and only attach latest-message affordances to visible messages.
4. The composer now uses a multiline textarea with a real ref shared with the mentions hook.
5. Scroll behavior now follows a pinned-to-bottom model instead of direction-only heuristics.
6. The embedded chat stage now uses calmer branding and more balanced message surfaces.
7. Conversation presentation is now split out of `ChatContainer` into `usePresentedChatMessages` and `ChatMessageViewport`, so message derivation and viewport behavior no longer live inside the shell component.
8. Chat runtime responsibilities inside `useGlobalChat` are now separated into dedicated reducer/state, restore, and send/stream hooks so conversation bootstrap and streaming transport are not fused into one provider file.
9. The embedded stage now uses explicit composer-gap and CTA-clearance tokens so suggestion chips, composer, and scroll affordances can be tuned together across density modes and device classes.
10. Conversation lifecycle is now split behind `chatConversationApi` and `useChatConversationSession`, so restore/archive persistence and session identity are no longer managed inline inside the provider.
11. Streaming transport and SSE event application are now split out behind `useChatStreamRuntime`, leaving `useChatSend` responsible for optimistic message mutation rather than transport orchestration.
12. Composer draft state is now local to the chat surface via `useChatComposerState`, so draft text, mention selection, and pending files are no longer stored in the global conversation provider.
13. Message persistence and model-context projection are now separated again: user messages remain canonical in conversation storage, while attachment summaries are only projected when building LLM context windows.
14. Composer send now returns an explicit success/failure result, so failed uploads or stream errors no longer clear the user draft or queued files, and in-flight sends are rejected at the send boundary instead of only at the button state.

Verification completed against the implementation:

- Focused chat and homepage-shell regressions: 24 passing tests
- Adjacent browser/chat regressions: 19 passing tests
- `npm run typecheck`
- `npm run build`
- `npm run quality`
