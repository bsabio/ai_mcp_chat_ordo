# Browser UI Test Suite

This directory is the discovery entry point for the browser-focused regression suite introduced during browser UI hardening.

## Coverage Map

### Shell and layout invariants

- `tests/browser-support.test.ts`
  - shared browser support helpers
  - viewport and safe-area helper behavior
  - motion and blur capability checks

### Overlays and popovers

- `tests/browser-overlays.test.tsx`
  - command palette open/close behavior
  - account menu pointer dismissal
  - mentions menu listbox semantics and selection

### Motion and reduced-motion

- `tests/browser-motion.test.tsx`
  - reduced-motion branching in theme updates
  - additive view-transition behavior in chat shell
  - blur-independent shell layering checks

### Browser API fallbacks

- `tests/browser-api-fallbacks.test.ts`
  - color-scheme fallback behavior
  - stream-reader and intersection-observer guards
  - audio constructor fallback
  - requestAnimationFrame and scroll helper fallbacks

- `src/components/AudioPlayer.test.tsx`
  - stream-reader fallback path
  - manual-play versus auto-play distinction
  - observer absence safety
  - fetch and playback failure handling

### Floating chat regressions

- `tests/browser-fab-chat-flow.test.tsx`
  - seeded FAB open and first-send flow in jsdom
  - follow-up chip continuity after the first turn
- `tests/browser-fab-scroll-recovery.test.tsx`
  - scroll recovery CTA behavior when follow-up chips land below the fold
- `tests/browser-fab-mobile-density.test.tsx`
  - compact-density mobile shell hooks for the floating composer
  - helper-text contract needed by the mobile FAB CSS overrides

### Live browser smoke

- `tests/browser-ui/fab-live-smoke.spec.ts`
  - real browser smoke against `/library`
  - launcher open, helper-text visibility, initial chip send, and follow-up suggestion survival
  - stable visible outcomes instead of prompt-variant-specific assistant wording
- `tests/browser-ui/jobs-page.spec.ts`
  - signed-in `/jobs` page smoke
  - active/recent job rendering, detail panel loading, and conversation link-back
- `tests/browser-ui/admin-jobs.spec.ts`
  - admin `/admin/jobs` smoke
  - anonymous redirect, capability-filtered row visibility, status-driven detail actions, and mobile card-stack bulk selection
- `tests/browser-ui/admin-shell-responsive.spec.ts`
  - signed-in admin shell smoke in desktop and mobile viewports
  - desktop sidebar coverage for the live admin route set
  - grouped mobile admin drawer coverage with route parity and route-change close behavior
- `tests/browser-ui/mobile-workspace-admin-lists.spec.ts`
  - Sprint 3 mobile coverage for signed-in workspace and admin list routes
  - no-overflow checks plus above-the-fold assertions for `/jobs`, `/profile`, `/referrals`, `/admin`, `/admin/leads`, `/admin/jobs`, `/admin/system`, and `/admin/affiliates?view=leaderboard`
  - compact summary-strip, filter-bar, and governed overflow-shell coverage for the new mobile-first admin/workspace patterns
- `tests/browser-ui/home-shell-header.spec.ts`
  - homepage shell smoke in desktop and mobile viewports
  - unified right-side notification plus workspace trigger coverage, no split nav surfaces, and route-change close behavior from the shared workspace sheet
- `tests/browser-ui/deferred-blog-jobs.spec.ts`
  - deferred blog job transcript behaviors in a real browser
  - draft, publish, and article-production job-state survivability
  - runs against the Playwright-managed production server unless `PLAYWRIGHT_BASE_URL` overrides it

## Verification Commands

- `npm run browser:verify`
  - runs the focused browser regression suite
- `npm run browser:smoke`
  - runs the live Playwright smoke and browser specs against the Playwright-managed production server
- `npm run test:browser-live:worker`
  - runs the worker-enabled deferred-job browser proof against the Playwright-managed production server
  - seeds a real queued job into the Playwright SQLite database and waits for the live deferred worker to complete it
- `npm run browser:verify:quality`
  - runs browser-focused tests, a production build, and Lighthouse CI guidance
- `npm run lhci`
  - runs Lighthouse CI against the configured production target

## Notes

- These tests are intentionally focused. They protect browser-sensitive behavior without duplicating broader application tests.
- Set `PLAYWRIGHT_BASE_URL` if the live smoke target is not `http://127.0.0.1:3000`.
- Set `PLAYWRIGHT_BASE_URL` to target an existing deployed or already-running environment instead of the default Playwright-managed server.
- Set `PLAYWRIGHT_ENABLE_DEFERRED_JOB_WORKER=1` when you need the Playwright-managed server to run the real deferred worker instead of the default worker-disabled smoke mode.
- Manual evidence and per-browser acceptance criteria live in `docs/_specs/browser-ui-hardening/artifacts/browser-ui-verification-matrix.md`.
- Baseline comparison notes live in `docs/_specs/browser-ui-hardening/artifacts/browser-ui-baseline.md`.
