# Spacing Refactor Census: Current State Authority Map

**Audit Date:** 2026-03-27
**Sprint:** 3 — component sweep and strict enforcement
**Audit command:** `npm run spacing:audit`

## 1. Current Ownership Layers

| Authority layer | Current owner | Verified notes |
| --- | --- | --- |
| Global modular ladder | `src/app/styles/foundation.css` | Owns `@property` registration for `--space-1` through `--space-16`, plus the semantic role families and the neutral reset token `--space-0`. |
| Shell and chat surface spacing | `src/app/styles/foundation.css` | `--container-padding`, `--input-padding`, `--chat-fold-gutter`, `--chat-composer-gap`, and the chat inset tokens now resolve from the global role layer instead of free-floating phi literals. |
| Runtime density ownership | `data-density` in `foundation.css` | `compact`, `default`, and `relaxed` now shift semantic role families first, then the shell/chat consumer tokens derived from them. |
| Semantic shell consumers | `src/components/SiteNav.tsx`, `src/components/AccountMenu.tsx` | These files already consume semantic rail and inset tokens and now avoid undeclared half-step spacing tokens. |
| Semantic chat consumers | `src/frameworks/ui/ChatHeader.tsx`, `src/frameworks/ui/ChatInput.tsx`, `src/frameworks/ui/ChatMessageViewport.tsx`, `src/frameworks/ui/MessageList.tsx` | The target shell/chat stack now stays inside the declared ladder for its baseline spacing values. |

## 2. File-Level Migration Status

| File | Status | Verified condition |
| --- | --- | --- |
| `src/app/styles/foundation.css` | Governing authority | Canonical ladder, semantic role tokens, shell/chat spacing consumers, and density mappings live here. |
| `src/components/SiteNav.tsx` | Governed | Uses rail tokens and safe-area padding without undeclared spacing variables. |
| `src/components/AccountMenu.tsx` | Governed | Uses semantic inset and rail tokens; prior `--space-1.5` drift removed from the shell control cluster. |
| `src/frameworks/ui/ChatHeader.tsx` | Governed | Search control padding now resolves to declared ladder steps only. |
| `src/frameworks/ui/ChatInput.tsx` | Governed | Composer, file pills, and send loading state stay within declared ladder steps. |
| `src/frameworks/ui/ChatMessageViewport.tsx` | Governed | Viewport frame uses governed chat spacing consumers; no new literal spacing added in Sprint 0. |
| `src/frameworks/ui/MessageList.tsx` | Governed with residual macro exceptions | Uses semantic stack and inset tokens; undeclared half-step tokens removed from action and typing states. |
| `src/components/jobs/JobsPagePanel.tsx` | Deferred | Still heavy literal-spacing debt; held for later panel/card migration. |
| `src/components/journal/JournalLayout.tsx` | Deferred | Editorial rhythm remains outside the shell/chat-first migration scope. |
| `src/app/admin/journal/page.tsx` | Deferred | Admin spacing remains intentionally out of Sprint 0 and Sprint 1 scope. |
| `src/app/admin/journal/[id]/page.tsx` | Deferred | Same as above. |
| `src/frameworks/ui/RichContentRenderer.tsx` | Deferred | Shared content rendering remains excluded until the panel/menu sweep. |

## 3. Current Governed Scope

The enforced audit now covers 25 implemented targets:

1. `src/components/SiteNav.tsx`
2. `src/components/AccountMenu.tsx`
3. `src/components/AudioPlayer.tsx`
4. `src/components/BookSidebar.tsx`
5. `src/components/ContentModal.tsx`
6. `src/components/GraphRenderer.tsx`
7. `src/components/MarkdownProse.tsx`
8. `src/components/ThemeSwitcher.tsx`
9. `src/components/WebSearchResultCard.tsx`
10. `src/components/journal/PublicJournalPages.tsx`
11. `src/frameworks/ui/ChatHeader.tsx`
12. `src/frameworks/ui/ChatInput.tsx`
13. `src/frameworks/ui/ChatMarkdown.tsx`
14. `src/frameworks/ui/ChatMessageViewport.tsx`
15. `src/frameworks/ui/MessageList.tsx`
16. `src/app/admin/journal/page.tsx`
17. `src/app/admin/journal/[id]/page.tsx`
18. `src/app/library/page.tsx`
19. `src/app/library/[document]/[section]/page.tsx`
20. `src/components/jobs/JobsPagePanel.tsx`
21. `src/components/journal/JournalLayout.tsx`
22. `src/frameworks/ui/RichContentRenderer.tsx`
23. `src/components/profile/ProfileSettingsPanel.tsx`
24. `src/components/MentionsMenu.tsx`
25. `src/components/ToolCard.tsx`

## 4. Final Audit State

`npm run spacing:audit` is now enforced by default with a threshold of `0`, and `npm run spacing:audit:report` preserves the old report-only mode for manual inspection.

Final report delta:

1. Sprint 0 baseline: report-only audit over 6 shell/chat files
2. Sprint 2 baseline: report-only audit over 14 shell/chat, admin, jobs, editorial, and shared panel files
3. Sprint 3 final state: enforced audit over 25 shell, chat, library, admin, jobs, editorial, and shared component files
4. Final governed result: `0` literal spacing matches in the enforced scope

Enforcement note:

1. this repository does not currently use `eslint-plugin-tailwindcss`, so strict regression protection lives in the governed spacing audit rather than an added Tailwind ESLint rule layer
2. `quality` now includes `npm run spacing:audit`, which makes spacing drift a first-class CI failure in the same path as typecheck and lint
