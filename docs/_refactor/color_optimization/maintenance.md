# Color Optimization — Maintenance Guide

> **Purpose:** Provide one non-sprint reference for maintaining the completed color optimization workstream without relying on implementation chat history.
>
> **Primary References:** `spec.md`, `cognitive-audit.md`, `sprints/sprint-3-opacity-audit-transition-hardening-and-qa-closeout.md`, `sprints/sprint-4-governance-and-maintenance-follow-through.md`

---

## Maintenance Boundary

Future edits fall into three categories.

### 1. Token-only edits

Examples:

1. changing values in `src/app/styles/foundation.css`
2. adjusting shared status, accent, border, or muted token values
3. modifying the registered `@property` token set

Validation rule:

1. use the focused automated regression bundle by default
2. escalate to browser QA if the change materially affects transition behavior, status contrast, or accent contrast

### 2. Semantic surface edits

Examples:

1. changing shared rules in `src/app/styles/shell.css`
2. changing shared rules in `src/app/styles/chat.css`
3. changing shared rules in `src/app/styles/editorial.css`

Validation rule:

1. use the focused automated regression bundle
2. add targeted browser QA if the edit affects blurred, translucent, or overlay-backed text

### 3. Component-local TSX color edits

Examples:

1. changing class literals in `src/frameworks/ui/ChatInput.tsx`
2. changing class literals in `src/frameworks/ui/MessageList.tsx`
3. changing class literals in `src/components/journal/JournalLayout.tsx`
4. changing class literals in `src/components/journal/PublicJournalPages.tsx`

Validation rule:

1. treat these as highest-risk changes because they can override shared floors
2. always run the focused automated regression bundle
3. run targeted browser QA on the affected surface

---

## Standard Verification Bundle

Run this after color-system changes unless the edit is clearly outside the maintained surface.

```bash
npm run lint:css
npm exec vitest run src/components/ThemeProvider.test.tsx src/components/ThemeSwitcher.test.tsx src/hooks/useUICommands.test.tsx tests/blog-hero-rendering.test.tsx tests/sprint-4-theme-governance-qa.test.ts
```

---

## Required Browser Checks

Run targeted live checks when a change touches blurred, translucent, or overlay-backed text or the theme-transition runtime.

Minimum checks:

1. homepage chat helper copy on the floating or embedded chat surface
2. published journal/article figure captions and archive metadata
3. theme switching on the active public shell

Recommended outcomes to confirm:

1. helper and support text remain above the hardened opacity floor on the live surface
2. figure captions and archive metadata remain readable on the published journal/article surface
3. theme switching preserves the neutral overlay fallback and runtime document attributes without visible flash or layout motion

---

## Governance Guard Scope

The governance test should stay narrow and history-driven.

Current guarded areas:

1. manifest-backed theme authority boundaries
2. semantic surface ownership for the covered hotspot components
3. chat muted-text drift in `ChatInput.tsx`
4. journal/public-journal muted-text drift in `JournalLayout.tsx` and `PublicJournalPages.tsx`
5. shell muted-text floor drift in `shell.css` for quiet-nav and ghost account triggers

Rule for adding new guards:

1. only add a new structural guard when the repo has already shown that a specific literal or pattern regressed in practice
2. do not broaden the guard into a generic ban on all low-opacity classes

---

## Transition Contract

The theme-transition runtime contract includes both of these layers:

1. registered token transitions through `@property` for core color tokens
2. ThemeProvider overlay fallback for durable cross-browser switching behavior

Maintenance rule:

1. do not remove either layer without updating focused tests and the workstream docs intentionally
2. ThemeProvider runtime document attributes are part of the supported contract and should remain observable in tests

---

## Escalation Rule

Escalate a future change for broader review if any of the following becomes true:

1. a proposed fix requires lowering a historically hardened floor on blurred or translucent text
2. a change widens the governance test from targeted regression protection into broad stylistic enforcement
3. a token change affects more than one theme identity axis at once, such as accent, dark background hue, and status palette together
4. a transition change alters both token timing and overlay behavior in the same pass