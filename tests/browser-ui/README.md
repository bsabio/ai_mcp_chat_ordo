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
  - requires a running local app, defaulting to `http://127.0.0.1:3000`

## Verification Commands

- `npm run browser:verify`
  - runs the focused browser regression suite
- `npm run browser:smoke`
  - runs the live Playwright smoke against a running local app
- `npm run browser:verify:quality`
  - runs browser-focused tests, a production build, and Lighthouse CI guidance
- `npm run lhci`
  - runs Lighthouse CI against the configured production target

## Notes

- These tests are intentionally focused. They protect browser-sensitive behavior without duplicating broader application tests.
- Set `PLAYWRIGHT_BASE_URL` if the live smoke target is not `http://127.0.0.1:3000`.
- Manual evidence and per-browser acceptance criteria live in `docs/_specs/browser-ui-hardening/artifacts/browser-ui-verification-matrix.md`.
- Baseline comparison notes live in `docs/_specs/browser-ui-hardening/artifacts/browser-ui-baseline.md`.
