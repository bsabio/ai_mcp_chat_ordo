# Implementation Plan - Browser UI Hardening

> **Status:** Ready for implementation
> **Source:** `docs/_specs/browser-ui-hardening/spec.md` (v1.0)
> **Baseline validation:** `npm run lint`, `npm run test`, `npm run build`,
> existing Lighthouse baseline in `lighthouse-prod.json`
> **Convention:** Each sprint should stay independently reviewable and ship a
> measurable reduction in browser-specific UI risk.

## Sprint Files

| Sprint | File | Tasks | Description |
| --- | --- | --- | --- |
| **0** | [sprint-0-browser-matrix-and-support-layer.md](sprint-0-browser-matrix-and-support-layer.md) | 4 | Browser matrix, support helpers, CSS fallback primitives, acceptance checklist |
| **1** | [sprint-1-shell-viewport-and-safe-area.md](sprint-1-shell-viewport-and-safe-area.md) | 4 | Root shell, floating chat layout, viewport sizing, single scroll-owner cleanup |
| **2** | [sprint-2-overlays-popovers-and-touch.md](sprint-2-overlays-popovers-and-touch.md) | 4 | Dialog positioning, menu anchoring, outside-click handling, touch parity |
| **3** | [sprint-3-motion-blur-and-progressive-enhancement.md](sprint-3-motion-blur-and-progressive-enhancement.md) | 4 | Reduced motion, blur fallback, view-transition containment, animation budget |
| **4** | [sprint-4-media-scroll-and-browser-apis.md](sprint-4-media-scroll-and-browser-apis.md) | 4 | Audio and scroll fallback rules, API guards, helper adoption |
| **5** | [sprint-5-browser-regression-coverage.md](sprint-5-browser-regression-coverage.md) | 4 | Component/browser tests, validation commands, runtime verification docs |
| **6** | [sprint-6-qa-hardening-and-release-gate.md](sprint-6-qa-hardening-and-release-gate.md) | 3 | Final QA, cross-browser acceptance review, release checklist |

## Dependency Graph

```text
Sprint 0 (browser matrix + support layer)
  -> Sprint 1 (shell + viewport)
     -> Sprint 2 (overlays + touch)
        -> Sprint 3 (motion + enhancement)
           -> Sprint 4 (media + browser APIs)
              -> Sprint 5 (regression coverage)
                 -> Sprint 6 (QA + release gate)
```

## Summary

| Sprint | Primary Risk Removed |
| --- | --- |
| **0** | Ad hoc browser decisions with no shared support contract |
| **1** | Safari/mobile viewport breakage and nested scroll-owner ambiguity |
| **2** | Dialog and popover instability on touch devices and mobile keyboards |
| **3** | Motion-heavy UI with no reduced-motion or blur fallback strategy |
| **4** | Inline browser API usage with inconsistent fallback behavior |
| **5** | Lack of browser-focused regression tests and verification tooling |
| **6** | No explicit acceptance gate for browser readiness |

## Requirement Mapping

| Requirement Group | Covered In |
| --- | --- |
| `BUI-010` through `BUI-090` | Sprints 0-4 |
| `BUI-100`, `BUI-170`, `BUI-250` through `BUI-255` | Sprint 5 |
| `BUI-110` through `BUI-160` | Sprints 0-4 |
| `BUI-200` through `BUI-232` | Sprints 0-4 |
| `BUI-240` through `BUI-265` | Sprints 0, 5, and 6 |
