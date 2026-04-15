# Swiss Layout Precision - Architecture Spec

> **Status:** Draft v1.0
> **Date:** 2026-03-16
> **Scope:** Audit and remediate the homepage hero composition, top shell/header rhythm, authenticated and anonymous account controls, and shared typography/spacing tokens so the product presents a disciplined Swiss-inspired layout system rather than a collection of ad hoc UI fragments.
> **Affects:** `src/app/globals.css`, `src/components/SiteNav.tsx`, `src/components/SiteFooter.tsx`, `src/components/AccountMenu.tsx`, `src/components/shell/ShellBrand.tsx`, `src/components/AppShell.tsx`, `src/components/home/HomepageChatStage.tsx`, `src/frameworks/ui/ChatContainer.tsx`, `src/frameworks/ui/ChatMessageViewport.tsx`, `src/frameworks/ui/MessageList.tsx`, `src/frameworks/ui/ChatInput.tsx`, `src/frameworks/ui/ChatHeader.tsx`, `src/hooks/chat/chatState.ts`, and targeted shell/homepage regression tests.
> **Motivation:** The shell architecture is now functionally coherent, but the visual system is still not disciplined enough. The current homepage can still read like a chat prototype instead of a finished editorial workspace, the top navigation lacks typographic authority and vertical calibration, and account controls feel attached rather than integrated. These are not isolated polish requests. They are symptoms of an incomplete visual contract.
> **Requirement IDs:** `SLP-XXX`

---

## 1. Problem Statement

### 1.1 Audit Scope

This spec covers three audited refinement areas:

1. **Top shell and header rail**: brand, primary nav, auth/account affordances, spacing, and typography. `[SLP-010]`
2. **Homepage hero stage**: initial message composition, default welcome state, suggestion-chip positioning, and fold behavior. `[SLP-011]`
3. **Account rail discipline**: anonymous login/register state and authenticated account menu state as part of the same shell language. `[SLP-012]`

### 1.2 Verified Audit Findings

#### Audit Area 1: Top shell and header rail

The current shell still exhibits the following verified weaknesses:

1. The top navigation uses shared route truth correctly, but the visual hierarchy is still too weak for a Swiss-inspired product shell. `SiteNav` renders small capsule links that can read as lightweight controls instead of primary IA. `[SLP-020]`
2. The shell brand, nav links, and account controls do not yet share a strong enough single-line typographic rhythm. The header can look underscaled or visually fragmented, especially on wider screens. `[SLP-021]`
3. `SiteNav` and the anonymous account state use similar pill treatments but not a sufficiently explicit role hierarchy, so the header rail can feel like unrelated UI fragments placed on one line. `[SLP-022]`

#### Audit Area 2: Homepage hero stage

The homepage chat shell now honors bounded-stage architecture, but the initial composition still needs a stronger landing-state contract:

1. The first assistant message and hero headline share space correctly, but the composition is still governed primarily by chat-thread behavior rather than by an intentional homepage hero layout system. `[SLP-030]`
2. Suggestion chips are better positioned than before, but they still need explicit rules for centering, wrapping, and proximity to the introductory message so they behave like part of the hero stack instead of a temporary thread affordance. `[SLP-031]`
3. The default welcome content is functional, but it still reads like a generic capability summary rather than a precise “intelligence console” entry point with editorial clarity. `[SLP-032]`
4. The embedded composer row is structurally correct, but its visual relationship to the hero stack and the message viewport is not yet formalized by a spec-level rhythm contract. `[SLP-033]`

#### Audit Area 3: Account rail discipline

The navigation duplication issue has been removed, but the account rail still lacks complete visual integration:

1. The anonymous state (`Sign In`, `Register`) and authenticated state (`AccountMenu`) do not yet feel like two variants of the same system-level control rail. `[SLP-040]`
2. The account menu dropdown still leans on local spacing and control density rather than a clearly authored “menu precision” contract derived from shell roles. `[SLP-041]`
3. The account trigger, user metadata, and panel header need clearer typographic hierarchy so the menu reads like a controlled extension of the shell rather than a utility popover. `[SLP-042]`

### 1.3 Root Cause

The project has achieved structural shell correctness before fully codifying a visual composition contract.

The existing token layer solves the following well:

1. route truth
2. shell role naming
3. viewport ownership
4. bounded homepage stage behavior

It does not yet fully solve the following:

1. exact typographic scale for shell roles
2. precise horizontal and vertical rhythm across shell surfaces
3. hero-state composition rules distinct from conversation-state rules
4. unified account-rail behavior across anonymous and authenticated states `[SLP-050]`

### 1.4 Why This Matters

Swiss-inspired design is not simply a matter of smaller type and more whitespace. It requires explicit control over hierarchy, baseline rhythm, spacing intervals, and page geometry. If the shell, hero stage, and account rail are not governed by one precise contract, the product will continue to look improvised even when the code is architecturally clean. `[SLP-051]`

---

## 2. Design Goals

1. **Swiss hierarchy, not generic minimalism.** Typography, spacing, and grouping must feel deliberate, editorial, and grid-aware rather than merely reduced. `[SLP-060]`
2. **One-line shell authority.** The header must read as a coherent rail with a strong left-to-right order: brand, primary navigation, account access. `[SLP-061]`
3. **Hero-state intentionality.** The homepage first-load state must feel like a composed landing surface, not a temporarily empty chat transcript. `[SLP-062]`
4. **Conversation-state continuity.** The hero state and the conversation state must transition without layout snap or conflicting spacing systems. `[SLP-063]`
5. **Unified account rail.** Anonymous and authenticated account affordances must feel like two states of the same shell subsystem. `[SLP-064]`
6. **Token-first implementation.** Precision must be encoded in shared shell/homepage tokens and role utilities, not scattered literal class strings. `[SLP-065]`
7. **Browser-safe refinement.** The visual improvements must not break the homepage chat-shell or browser-hardening contracts already established elsewhere. `[SLP-066]`
8. **Regression visibility.** The new visual contract must be test-detectable where practical through role classes, layout attributes, and hero-state assertions. `[SLP-067]`

---

## 3. Architecture Direction

### 3.1 Layer Relationship To Existing Specs

This spec is a refinement layer on top of two existing architecture contracts:

1. [Homepage Chat Shell](../../../homepage-chat-shell/spec.md) owns stage/scroll/composer architecture. `[SLP-070]`
2. [Shell Navigation And Design System](../../../shell-navigation-and-design-system/spec.md) owns route truth, command parity, shell roles, and shell primitives. `[SLP-071]`

This spec must not reopen those responsibilities. It may only refine their visual and compositional expression. `[SLP-072]`

### 3.2 Swiss Precision Token Layer

The current phi-based token work is directionally correct, but it needs a more explicit shell and hero precision contract.

Required additions or refinements:

1. Separate shell-specific type roles for wordmark, nav label, account label, panel heading, supporting copy, and hero title. `[SLP-080]`
2. Explicit shell rail spacing tokens for inter-brand gap, nav-item spacing, auth-rail spacing, and dropdown inset/padding. `[SLP-081]`
3. Explicit hero-stage tokens for intro stack spacing, hero title width, intro message width, composer offset, and suggestion-chip cluster spacing. `[SLP-082]`
4. These tokens must live in `globals.css` alongside the existing shared design system rather than inside individual components. `[SLP-083]`

### 3.3 Header And Rail Contract

The shell header must be treated as a three-part rail:

| Region | Responsibility |
| --- | --- |
| Left | Brand and product identity |
| Center | Primary navigation |
| Right | Anonymous or authenticated account rail |

Rules:

1. Each region must remain visually distinct while sharing one baseline and one vertical center line. `[SLP-090]`
2. Brand and nav labels must be single-line and visually stable across desktop breakpoints. `[SLP-091]`
3. Anonymous auth links and the authenticated account trigger must share a common spacing and height contract. `[SLP-092]`
4. The shell header may remain translucent, but its chrome must read as controlled structure rather than decorative blur. `[SLP-093]`

### 3.4 Homepage Hero Composition Contract

The homepage initial state must be treated as a distinct composition mode.

Rules:

1. When there is only the initial assistant message and no search filter, the message viewport must expose a `hero` composition state. `[SLP-100]`
2. In hero state, the intro badge, hero title, first assistant message, suggestion chips, and composer must participate in one intentional vertical rhythm. `[SLP-101]`
3. Suggestion chips in hero state must center as a cluster and wrap predictably without drifting toward the fold edge. `[SLP-102]`
4. The transition from hero state to conversation state must preserve width and baseline logic while allowing the message stack to resume normal scroll-first behavior. `[SLP-103]`
5. Hero-state copy must present the system as an intelligence/architecture console, not generic promotional copy or unverifiable status language. `[SLP-104]`

### 3.5 Account Rail Contract

The account rail is a shell subsystem with two states:

| State | Surface |
| --- | --- |
| Anonymous | `Sign In` + `Register` |
| Authenticated | user trigger + dropdown menu |

Rules:

1. Both states must align to the same shell rail height and spacing budget. `[SLP-110]`
2. The anonymous state must not look detached or temporary relative to the authenticated state. `[SLP-111]`
3. The authenticated dropdown must use shell roles and precision tokens rather than mixed local sizing heuristics. `[SLP-112]`
4. Dropdown sections, toggles, and route links must read as one authored system rather than multiple nested widgets. `[SLP-113]`

### 3.6 Footer Relationship Contract

The footer is not the primary focus of this spec, but it must stay visually compatible with the new shell direction.

Rules:

1. Footer type and spacing should be updated only as needed to maintain visual continuity with the refined shell/header language. `[SLP-120]`
2. This spec must not introduce new routes, new footer group semantics, or footer-only IA changes. `[SLP-121]`

---

## 4. Security And Safety

This feature is primarily presentational, but it still has constraints:

1. No fake operational status claims may be added to the hero, header, or footer. `[SLP-130]`
2. Layout changes must not break keyboard focus visibility, dropdown dismissal behavior, or composer accessibility. `[SLP-131]`
3. Responsive adjustments must not hide authenticated actions, footer access, or composer controls behind breakpoints. `[SLP-132]`

---

## 5. Testing Strategy

The implementation must extend existing shell/homepage coverage rather than invent an entirely separate test strategy.

Required coverage:

1. **Shell visual-system tests** for role classes, single-line shell brand/nav expectations where feasible, and account-menu role hierarchy. `[SLP-140]`
2. **Homepage message-list and viewport tests** for hero-state attributes, hero-state spacing contract, centered suggestion-chip behavior, and conversation-state fallback. `[SLP-141]`
3. **Acceptance-level shell tests** confirming canonical nav still renders while the refined shell classes remain intact. `[SLP-142]`
4. **Full quality verification** through `npm run quality`. `[SLP-143]`

Approximate implementation footprint:

1. 8–11 modified source files
2. 3–5 updated or new test files
3. no new dependencies `[SLP-144]`

---

## 6. Sprint Plan

| Sprint | Goal |
| --- | --- |
| **0** | Audit reset and token refinement plan: formalize precision token roles and lock the shell/homepage refinement boundaries |
| **1** | Rebuild the header and account rail around a stronger Swiss shell rhythm |
| **2** | Implement hero-state composition, stronger default message/copy, and chip/composer alignment rules |
| **3** | Final continuity pass across footer, responsive breakpoints, and regression/QA evidence |

---

## 7. Future Considerations

These items are explicitly out of scope for this package:

1. Replacing the shell brand identity, product naming, or route map `[SLP-150]`
2. Reworking the command palette information architecture `[SLP-151]`
3. Introducing a new design theme system beyond refinement of existing token roles `[SLP-152]`
4. Changing homepage chat runtime behavior, message semantics, or retrieval logic `[SLP-153]`
5. Converting the product into a content-first editorial site outside the existing chat-home architecture `[SLP-154]`
