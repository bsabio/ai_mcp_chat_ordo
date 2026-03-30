# Sprint 2 Completion Note

- Date: 2026-03-27
- Scope: semantic chat and shell surface extraction
- Status: complete

## Implemented Outcomes

1. Moved repeated chat surface formulas out of TSX and into shared semantic chat primitives for header chrome, transcript framing, user and assistant bubbles, attachment cards, action chips, suggestion frames, suggestion chips, file pills, composer chrome, and helper copy.
2. Moved repeated shell and account chrome formulas out of TSX and into shared semantic shell primitives for the nav rail, nav-link cluster, active and idle nav items, account triggers, dropdown framing, accordion state, setting rows, setting options, dividers, and simulation-active state.
3. Replaced the highest-value visual template-literal branches with small explicit variant ownership where it materially clarified state, including chat density state, send-button readiness, nav-item active and idle state, and shell setting control state.
4. Preserved route tone, density, dark mode, accessibility, overlay, and motion behavior across the extracted chat and shell surfaces.
5. Resolved Sprint 2 integration issues exposed during QA by converting the new semantic selectors to build-safe utility-layer classes, inlining glass styling where `@apply` to plain class selectors was invalid, and retaining the nav rail legacy marker classes required by the existing browser motion suite.

## Files Landed In Sprint 2

1. `docs/_refactor/visual-theme-runtime-and-semantic-surface-architecture/sprints/README.md`
2. `docs/_refactor/visual-theme-runtime-and-semantic-surface-architecture/sprints/sprint-1-theme-manifest-extraction-and-contract-unification.md`
3. `docs/_refactor/visual-theme-runtime-and-semantic-surface-architecture/sprints/sprint-2-semantic-chat-and-shell-surface-extraction.md`
4. `src/app/styles/chat.css`
5. `src/app/styles/shell.css`
6. `src/frameworks/ui/ChatHeader.tsx`
7. `src/frameworks/ui/ChatInput.tsx`
8. `src/frameworks/ui/ChatMessageViewport.tsx`
9. `src/frameworks/ui/MessageList.tsx`
10. `src/frameworks/ui/ChatInput.test.tsx`
11. `src/frameworks/ui/MessageList.test.tsx`
12. `src/components/SiteNav.tsx`
13. `src/components/SiteNav.test.tsx`
14. `src/components/AccountMenu.tsx`

## Verification

```bash
npm run typecheck
npm run lint:css
npm exec vitest run src/frameworks/ui/MessageList.test.tsx src/frameworks/ui/ChatInput.test.tsx src/frameworks/ui/ChatMessageViewport.test.tsx src/components/SiteNav.test.tsx src/components/AccountMenu.test.tsx src/components/AppShell.test.tsx src/hooks/useUICommands.test.tsx tests/browser-fab-chat-flow.test.tsx tests/browser-fab-mobile-density.test.tsx tests/browser-fab-scroll-recovery.test.tsx tests/browser-overlays.test.tsx tests/browser-motion.test.tsx
npm run build
```

Observed result:

1. `npm run typecheck` passed.
2. `npm run lint:css` passed.
3. The focused chat and shell component suite passed.
4. The browser-facing chat, density, scroll-recovery, overlay, and motion suites passed.
5. `npm run build` passed after the semantic selectors were converted to the utility-layer form this repo's Tailwind and Turbopack path accepts.

## QA Assessment

No new Sprint 2 defects were found in the follow-up QA review after the green verification bundle.

Follow-up closure on 2026-03-27 migrated the browser motion expectation to the semantic nav-rail contract and removed the temporary legacy `glass-surface` and shadow marker compatibility shim from `SiteNav`.

## Exit Assessment

Sprint 2 now has a single practical answer for the chat and shell surface questions that mattered:

1. shared chat and shell chrome patterns are owned by named semantic CSS surfaces rather than repeated TSX-local visual formulas
2. the remaining stateful styling branches are expressed through small local variant decisions instead of large template-literal styling blocks
3. route tone, density, dark mode, and accessibility behavior still flow through the same extracted surfaces and remain covered by tests and browser QA
4. the build path accepts the extracted surface layer without relying on unsupported nested `@utility` usage or `@apply` against plain class selectors

Sprint 3 can now focus on the remaining jobs, journal, and broader shell polish surfaces from a chat and shell authority baseline that is build-safe, browser-verified, and documented.
