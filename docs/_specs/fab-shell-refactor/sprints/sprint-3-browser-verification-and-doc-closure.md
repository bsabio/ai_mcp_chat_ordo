# Sprint 3 - Browser Verification and Doc Closure

> **Goal:** Finish the FAB refactor with browser-contract verification, live smoke hardening, and updated planning artifacts that reflect the implemented shell boundaries.
> **Spec Sections:** `FAB-055`, `FAB-108` through `FAB-116`, `FAB-130` through `FAB-143`
> **Status:** Implemented on 2026-03-21

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/components/GlobalChat.tsx` | Sprint 0 completed the route-presence seam so the FAB exists on non-homepage routes only, and `GlobalChat` no longer owns floating-shell internals |
| `src/components/GlobalChat.test.tsx` | Route-policy coverage already verifies homepage suppression and non-homepage FAB presence across route changes |
| `src/components/FloatingChatShell.tsx` | Sprint 0 and Sprint 2 left the floating shell with a dedicated controller boundary for open/minimize/full-screen lifecycle and a stable `OPEN_GLOBAL_CHAT_EVENT` contract |
| `src/components/FloatingChatShell.test.tsx` | Structural coverage verifies launcher/open/minimize/restore behavior, single-shell ownership, fullscreen size-state hooks, and absence of embedded-only controls/hooks |
| `src/frameworks/ui/FloatingChatHeader.tsx` | Sprint 1 isolated the floating header from the embedded header contract so browser coverage can assert floating controls without density/grid/search ambiguity |
| `src/hooks/useUICommands.test.tsx` | Sprint 1 command continuity coverage proves `set_theme` and `adjust_ui` still flow through `ThemeProvider` after FAB-local controls were removed |
| `tests/browser-fab-chat-flow.test.tsx` | Browser-style jsdom coverage protects seeded FAB open, first-send flow, and follow-up continuity without depending on floating implementation details |
| `tests/browser-fab-scroll-recovery.test.tsx` | Browser-style coverage protects the scroll CTA and below-the-fold follow-up recovery contract |
| `tests/browser-fab-mobile-density.test.tsx` | Sprint 2 coverage protects floating-shell state hooks, helper copy, and the absence of embedded-only composer-row hooks in the floating shell |
| `tests/browser-ui/fab-live-smoke.spec.ts` | The live smoke now verifies launcher visibility, shell open, helper text, first chip send, and visible post-send action options on `/library` without depending on one assistant phrasing |
| `playwright.config.ts` | Playwright is already configured with `tests/browser-ui/**/*.spec.ts` and defaults `baseURL` to `http://127.0.0.1:3000` |
| `tests/browser-ui/README.md` | Browser-focused docs already document `npm run browser:verify` and `npm run browser:smoke` |
| `package.json` | Current verification scripts include `test:browser-ui`, `test:browser-live`, `browser:verify`, and `browser:smoke` |
| `docs/_specs/fab-shell-refactor/spec.md` | The feature spec already defines the target architecture, testing contract, sprint plan, and stable live-browser assertions expected by `FAB-111` through `FAB-116` |

## QA Findings

1. Sprint 0 through Sprint 2 already completed the architectural seams Sprint 3 needs to verify: route presence in `GlobalChat`, lifecycle ownership in `FloatingChatShell`, floating-header isolation, command continuity, and shell-state styling hooks.
2. Structural and browser-style jsdom coverage is already aligned with the spec: route presence, shell lifecycle, header-control separation, command continuity, mobile hook alignment, and scroll recovery all have focused regressions.
3. Browser verification docs and package scripts already exist, so Sprint 3 is primarily a closure and hardening sprint rather than a greenfield testing sprint.
4. The live-browser smoke now aligns with `FAB-116` by asserting stable visible outcomes and dynamic post-send action availability rather than one prompt-specific assistant sentence.
5. Sprint 3 now closes the verification stack across structural, browser-style, and live-browser layers while keeping the existing docs and package commands aligned with the shipped shell contract.

## Tasks

1. Preserve the route-presence, lifecycle, command-continuity, and styling-contract regressions delivered in Sprints 0 through 2 as the stable lower layers for FAB verification.
2. Audit the browser regression suite so FAB assertions continue to target stable shell behavior and visible outcomes rather than incidental implementation details.
3. Harden the Playwright live smoke so it tolerates prompt-variant wording while still protecting launcher visibility, shell open, helper text, first chip send, and visible follow-up actions.
4. Keep browser-test docs and verification commands aligned with the final shell contract and any live-smoke selector or expectation updates.
5. Record the final implemented status, residual live-browser risks, and verification outcomes in the FAB planning artifacts so the spec and sprint docs remain truthful.

## Test Matrix

### Positive Tests

1. Verify `GlobalChat` suppresses the FAB on `/` and renders the floating shell on non-homepage routes.
2. Verify the floating shell opens from the launcher, responds to `OPEN_GLOBAL_CHAT_EVENT`, minimizes cleanly, and restores with a single controller-owned shell instance.
3. Verify the floating header exposes only floating-shell controls while embedded-only search, density, and grid concerns remain outside the floating path.
4. Verify assistant-issued `set_theme` and `adjust_ui` commands still update `ThemeProvider` state after FAB-local controls were removed.
5. Verify the browser-style FAB flow still reaches initial chip send and follow-up chip continuity.
6. Verify browser-style mobile coverage still sees helper copy, viewport/composer hooks, and shell size/state hooks on the floating shell.
7. Verify browser-style scroll recovery still exposes the scroll CTA and restores below-the-fold follow-up actions.
8. Verify live browser smoke shows the launcher on `/library`, opens the shell, keeps helper text visible, sends the initial workflow chip, and renders visible next-step options.
9. Verify browser verification docs and package scripts still point to the correct jsdom browser and live-smoke commands.

### Negative Tests

1. Verify the homepage never renders the floating shell or launcher.
2. Verify repeated open events do not create duplicate floating shells or duplicate minimize controls.
3. Verify the floating shell never renders embedded-only controls or hooks such as density pills, grid toggles, search input, or `data-chat-composer-row="true"`.
4. Verify assistant UI command handling does not regress into FAB-local state mutation or duplicate command execution on rerender.
5. Verify browser-style and live-browser assertions do not depend on one exact assistant sentence when multiple prompt variants are valid.
6. Verify shell verification remains focused on visible actions and stable hooks instead of fragile class-name or prompt-wording details.
7. Verify route-policy tests do not create new undocumented FAB exclusions beyond the homepage rule.

### Edge-Case Tests

1. Verify route changes from a non-homepage route to `/` and back restore the FAB correctly without leaving stale shell state behind.
2. Verify full-screen entry and exit preserve message/composer continuity and restore the default shell-size state.
3. Verify repeated open/minimize/open cycles preserve a single floating shell and a stable launcher handoff.
4. Verify follow-up options remain reachable when they land below the fold and the scroll CTA appears only when needed.
5. Verify mobile-sized live smoke remains robust when assistant wording shifts but visible interaction outcomes still satisfy the workflow.
6. Verify future browser-doc updates remain synchronized with package scripts and selector hooks after shell-contract changes.

## Completion Checklist

- [x] Structural FAB tests cover route presence and shell lifecycle
- [x] Browser regressions assert stable shell contracts
- [x] Live Playwright smoke passes on the refactored shell with prompt-tolerant assertions
- [x] Browser verification docs reflect the final FAB contract
- [x] FAB feature docs reflect final implemented status and end-to-end verification

## QA Deviations

None.

## Verification Log

- `npm run browser:verify` passed on 2026-03-21
- `npm run browser:smoke` passed on 2026-03-21 after hardening the live smoke to assert prompt-tolerant post-send actions
- `npm run typecheck` passed on 2026-03-21
- `npm run build` passed on 2026-03-21

## Verification

- `npm run browser:verify`
- `npm run browser:smoke`
- `npm run typecheck`
- `npm run build`
