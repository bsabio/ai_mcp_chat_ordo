# Floating Chat Visual Authority - Architecture Spec

> **Status:** Draft v1.0
> **Date:** 2026-03-21
> **Scope:** Re-articulate the floating chat shell so it reads as a calm, decisive operational surface rather than a soft generic premium card. This feature covers floating-shell visual hierarchy only: shell chrome, message-stage emphasis, suggestion priority, composer anchoring, and the token contract that governs them.
> **Dependencies:** FAB Shell Refactor (implemented), Chat Experience (implemented), Shell Navigation And Design System (implemented), Browser UI Hardening (browser verification assets available)
> **Affects:** `src/app/globals.css`, `src/frameworks/ui/FloatingChatFrame.tsx`, `src/frameworks/ui/FloatingChatHeader.tsx`, `src/frameworks/ui/ChatContentSurface.tsx`, `src/frameworks/ui/ChatMessageViewport.tsx`, `src/frameworks/ui/MessageList.tsx`, `src/frameworks/ui/ChatInput.tsx`, `src/components/FloatingChatShell.tsx`, `src/components/FloatingChatShell.test.tsx`, `src/frameworks/ui/MessageList.test.tsx`, `tests/browser-fab-chat-flow.test.tsx`, `tests/browser-fab-mobile-density.test.tsx`, and `tests/browser-fab-scroll-recovery.test.tsx`.
> **Motivation:** The floating shell is now structurally correct, but its visual language still over-indexes on softness. The current shell presents too many elements in the same tonal register, treats actions with insufficient priority contrast, and leaves the composer visually detached from the conversation. The result is a polished shell with too little authority.
> **Requirement IDs:** `FVA-XXX`

---

## 1. Problem Statement

### 1.1 Audit Scope

This spec covers the floating chat shell in its opened FAB state only.

Audited areas:

1. Header chrome and brand/status treatment. `[FVA-010]`
2. Message-stage hierarchy and bubble emphasis. `[FVA-011]`
3. Suggestion-chip action hierarchy and grouping. `[FVA-012]`
4. Composer anchoring, contrast, and readiness cues. `[FVA-013]`
5. Shared token and selector contract for floating-mode surfaces. `[FVA-014]`

### 1.2 Verified Visual Failures

The current floating shell has the following verified weaknesses:

1. The shell relies on a low-contrast white-on-white stack across the frame, message area, chips, and composer, so the eye does not get a clear focal order. `[FVA-020]`
2. The shell chrome, assistant message, suggestion group, and composer all occupy a similar visual weight band, which causes hierarchy collapse. `[FVA-021]`
3. The current radius language is too uniformly soft. The outer shell, bubbles, chips, and composer all lean toward the same rounded mood, which weakens the sense of operational precision. `[FVA-022]`
4. Suggestion chips are styled too uniformly, even when their semantic urgency differs. The shell does not currently express one clearly recommended action versus secondary or exploratory actions. `[FVA-023]`
5. The header subtitle and green status dot read as decorative rather than informational because the shell does not define a strong metadata hierarchy or status truth contract for floating mode. `[FVA-024]`
6. The composer surface is visually separated from the active conversation, making it feel like another card below the thread rather than the next step in the same interaction. `[FVA-025]`
7. The send affordance is too faint relative to the decision weight of the shell, so the composer reads passive even when it is ready. `[FVA-026]`
8. The current header gives too much space to product branding that does not help the operator act, while the `New Chat` action sits in a weaker position than it should for an always-available reset path. `[FVA-027]`
9. The current opened-shell header still spends vertical space on the `Current thread` / `Continue or reset the workflow` copy, even though that text adds little operational value and forces the reset control into its own separate rail. `[FVA-028]`

### 1.3 Root Cause

The floating-shell refactor solved ownership and lifecycle boundaries, but it did not yet codify a dedicated visual-authority contract for floating mode.

The current implementation gets these things right:

1. shell presence and lifecycle ownership
2. floating-vs-embedded separation
3. stable browser hooks for frame, viewport, and composer

It does not yet fully solve these things:

1. a tonal hierarchy for floating-only surfaces
2. a shape hierarchy that distinguishes container, conversation, actions, and composer
3. a priority model for follow-up actions
4. a composer anchoring model that visually ties input to the active thread `[FVA-030]`

### 1.4 Why This Matters

This shell is not a decorative overlay. It is an operational assistant surface used for triage, advisory work, and workflow handoff. If the interface reads as soft luxury rather than calm authority, it reduces trust in the system’s judgment even when the underlying runtime is correct. `[FVA-031]`

---

## 2. Design Goals

1. **Calm authority over generic softness.** The shell must feel precise, legible, and intentional rather than merely premium. `[FVA-040]`
2. **One unmistakable focal order.** The opened shell must clearly communicate reading order: header context, active response, recommended next actions, then input. `[FVA-041]`
3. **Selective softness.** Large radii may remain at the shell perimeter, but internal surfaces must become more disciplined and role-specific. `[FVA-042]`
4. **Action hierarchy, not action equality.** The shell must visually distinguish recommended, secondary, and exploratory suggestions. `[FVA-043]`
5. **Anchored composer.** The composer must read as part of the conversation surface, not as a disconnected utility tray. `[FVA-044]`
6. **Truthful metadata.** Status markers, subtitles, and helper copy must earn their place and not read as decorative premium cues. `[FVA-045]`
7. **Token-first implementation.** Visual authority must be driven through floating-shell tokens and emitted hooks, not scattered one-off class strings. `[FVA-046]`
8. **No regression to shell architecture.** This work must preserve the lifecycle and browser contracts already shipped by the FAB shell refactor. `[FVA-047]`
9. **Action-first header.** Header space should prioritize the operator's next action over product-brand repetition, including placing the `New Chat` control on the left-side action rail instead of burying it in the right-side chrome cluster. `[FVA-048]`
10. **Zero decorative header copy.** If the opened floating shell header cannot justify a title or subtitle with real operator value, that copy should be removed and the reset affordance should take the space instead of introducing a second header row. `[FVA-049]`

---

## 3. Architecture Direction

### 3.1 Relationship To Existing Specs

This feature is a refinement layer on top of already-implemented architecture:

1. [FAB Shell Refactor](../fab-shell-refactor/spec.md) owns lifecycle, presence, and floating-shell boundaries. `[FVA-050]`
2. [Chat Experience](../chat-experience/spec.md) owns message semantics, composer behavior, and scroll-intent behavior. `[FVA-051]`
3. [Shell Navigation And Design System](../shell-navigation-and-design-system/spec.md) owns shared shell roles and token discipline. `[FVA-052]`

This spec may refine the visual expression of those systems, but it must not reopen routing policy, message semantics, or FAB lifecycle ownership. `[FVA-053]`

### 3.2 Floating Visual Token Contract

The floating shell needs a dedicated token layer in `globals.css` for visual emphasis.

Required token categories:

1. Floating shell surface contrast tokens for frame, internal panel, message bubble, chip group, and composer. `[FVA-060]`
2. Floating shell radius tokens for outer frame, bubble, chip, and composer so those roles stop sharing one uniformly soft geometry. `[FVA-061]`
3. Floating shell emphasis tokens for primary text, metadata text, active action, subdued action, and send-button readiness. `[FVA-062]`
4. Floating shell spacing tokens for header block rhythm, message-stage stack rhythm, chip group padding, and composer offset. `[FVA-063]`

These tokens must be floating-mode-specific refinements layered on top of the existing design system, not a parallel theme implementation. `[FVA-064]`

### 3.3 Floating Header Contract

`FloatingChatHeader` already owns the floating header surface and must become a more disciplined context rail.

Rules:

1. The title must remain the strongest element in the left header block. `[FVA-070]`
2. The subtitle must either become legible supporting metadata or be visually reduced to a quiet contextual line; it must not read like decorative premium tracking. `[FVA-071]`
3. The status dot may remain only if it communicates a truthful and visually subordinate state. It must not become a fake “system is healthy” claim. `[FVA-072]`
4. Header controls must remain visually compact and secondary to the conversation content. `[FVA-073]`
5. The header should use stronger structural separation from the message stage so the shell reads as one instrument with two planes, not one continuous white blur. `[FVA-074]`
6. The current `Studio Ordo` lockup should be replaced by concise conversation context or removed entirely when it does not add operator value. `[FVA-075]`
7. The `New Chat` action should move to the left side of the header composition so it reads as a first-class reset affordance adjacent to identity/context, while minimize and fullscreen remain in the compact right-side chrome cluster. `[FVA-076]`
8. If the opened-shell title/subtitle copy is not carrying durable conversational state, Sprint 3 may remove it entirely and let the left header position be owned by the reset affordance instead of a separate identity rail. `[FVA-077]`

### 3.4 Message-Stage Hierarchy Contract

`ChatMessageViewport` and `MessageList` already own the main conversation stage and must express clearer reading order.

Rules:

1. The active assistant message must carry more emphasis than the surrounding shell chrome. `[FVA-080]`
2. The shell should reduce unnecessary ambient glow and use plane separation to clarify content regions. `[FVA-081]`
3. The first visible assistant response in floating mode must read as the current conversational anchor, not as just another pale card in a stack of pale cards. `[FVA-082]`
4. Metadata inside the message stage, including timestamps and speaker labels, should remain legible but quieter than message content. `[FVA-083]`
5. Bubble surfaces must preserve conversation calm while using enough tonal and edge contrast to avoid washed-out blending with the background. `[FVA-084]`

### 3.5 Suggestion Priority Contract

The suggestion cluster currently behaves like a neutral chip tray. It must become a lightweight decision surface.

Rules:

1. One suggestion may be visually promoted as the recommended next action when the assistant is offering an obvious priority. `[FVA-090]`
2. Secondary suggestions must remain clearly clickable but visually subordinate. `[FVA-091]`
3. Exploratory or low-urgency suggestions must read as optional. `[FVA-092]`
4. Chip sizing should better match information density; large pills should be reserved for genuinely primary actions, not every option. `[FVA-093]`
5. The chip group should feel like a responsive action cluster attached to the active message, not a separate blank-panel module competing with the transcript. `[FVA-094]`

### 3.6 Composer Anchoring Contract

`ChatContentSurface` and `ChatInput` already own the composer row. The visual contract must make the composer feel like the next move in the same conversation.

Rules:

1. The composer row must remain structurally separate enough for usability, but visually closer to the conversation stage. `[FVA-100]`
2. The composer field should gain stronger active-state legibility through contrast and clearer input affordance. `[FVA-101]`
3. The send button must read as ready when input exists and clearly secondary when it does not. `[FVA-102]`
4. Helper copy should remain available without competing with the input field or action affordance. `[FVA-103]`
5. Attachment affordances must stay visible, but they should not dominate the input row. `[FVA-104]`

### 3.7 Hook And Selector Contract

The existing emitted hooks are already strong enough to support this work and should remain the basis of testing.

Relevant existing hooks include:

1. `data-chat-floating-shell` on the frame. `[FVA-110]`
2. `data-chat-floating-header` on the header. `[FVA-111]`
3. `data-chat-message-region` and `data-chat-message-viewport` on the transcript stage. `[FVA-112]`
4. `data-chat-composer-shell`, `data-chat-composer-form`, and `data-chat-composer-helper` on the composer subtree. `[FVA-113]`
5. `data-chat-fab-launcher` on the closed FAB trigger. `[FVA-114]`

Where new hooks are needed for priority-state or floating-only hierarchy assertions, they must be stable and semantic rather than styling-by-test-id. `[FVA-115]`

---

## 4. Security And Safety

This feature is visual, but it still has correctness requirements:

1. No visual treatment may imply fake uptime, queue status, or operational truth not actually derived from runtime state. `[FVA-120]`
2. Contrast improvements must preserve accessible focus rings, readable helper text, and keyboard-visible actions. `[FVA-121]`
3. Tightening radius or spacing must not reduce tap targets for floating controls, chips, or send actions below usable size. `[FVA-122]`
4. Floating-only visual changes must not bleed into the embedded homepage chat surface unless that divergence is explicit and intentional. `[FVA-123]`

---

## 5. Testing Strategy

This feature should extend the existing floating-shell regression suite rather than invent a separate visual-testing framework.

Required coverage:

1. **Floating shell component tests** for stable floating-only hooks, recommended-action semantics where added, and preserved open/minimize behavior. `[FVA-130]`
2. **Message-list tests** for suggestion-priority structure, floating-only hierarchy hooks, and preserved content rendering. `[FVA-131]`
3. **Browser-style FAB regressions** for opened-shell visibility, primary action presence, and composer visibility across default and mobile layouts. `[FVA-132]`
4. **Scroll and restore regressions** ensuring visual refinements do not break viewport behavior or reopen/restore continuity. `[FVA-133]`
5. **Full verification** through targeted FAB/browser tests, `npm run typecheck`, and `npm run build`. `[FVA-134]`

Approximate implementation footprint:

1. 7–10 modified source files `[FVA-135]`
2. 3–5 updated test files `[FVA-136]`
3. no new runtime dependencies `[FVA-137]`

---

## 6. Sprint Plan

| Sprint | Goal |
| --- | --- |
| **0** | Audit reset and floating-token contract: formalize visual-authority goals, selector strategy, and no-regression boundaries |
| **1** | Rebuild the floating header and frame contrast hierarchy, replacing decorative branding and repositioning `New Chat` into the left-side action rail |
| **2** | Rework message-stage, chip, and composer hierarchy so the shell has one clear focal order and a real action ladder |
| **3** | Browser continuity pass, responsive calibration, header simplification, and QA evidence for the shipped visual-authority contract |

---

## 7. Future Considerations

These items are explicitly out of scope for this package:

1. Reopening FAB lifecycle ownership or route presence rules `[FVA-140]`
2. Changing assistant message semantics, restore behavior, or tool execution `[FVA-141]`
3. Rebuilding the embedded homepage chat shell around the floating visual language `[FVA-142]`
4. Global theme-system replacement across the entire product `[FVA-143]`
5. Dashboard information-architecture changes outside the floating shell itself `[FVA-144]`
