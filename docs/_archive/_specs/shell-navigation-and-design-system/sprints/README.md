# Implementation Plan - Shell Navigation And Design System

> **Status:** Implemented
> **Source:** `docs/_specs/shell-navigation-and-design-system/spec.md` (v1.0)
> **Baseline validation:** `npm run test`, `npm run build`, `npm run quality`
> **Current suite baseline:** 592 passing tests at last validated checkpoint
> **Convention:** Each sprint must reduce shell drift, not just restyle the UI.

## Sprint Files

| Sprint | File | Tasks | Description |
| --- | --- | --- | --- |
| **0** | [sprint-0-route-truth-and-shell-model.md](sprint-0-route-truth-and-shell-model.md) | 4 | Establish canonical shell route truth, grouped navigation metadata, and brand metadata |
| **1** | [sprint-1-header-footer-composition.md](sprint-1-header-footer-composition.md) | 4 | Refactor header and footer to consume shared brand and navigation primitives |
| **2** | [sprint-2-command-surface-unification.md](sprint-2-command-surface-unification.md) | 4 | Unify command palette and slash-command registry with canonical navigation and theme command data |
| **3** | [sprint-3-shell-visual-system-hardening.md](sprint-3-shell-visual-system-hardening.md) | 4 | Replace shell-specific arbitrary spacing/type chrome with shared shell tokens and truthful status treatment |
| **4** | [sprint-4-regression-coverage-and-qa.md](sprint-4-regression-coverage-and-qa.md) | 4 | Add route-drift regression tests, shell acceptance coverage, and final QA evidence |

## Dependency Graph

```text
Sprint 0 (route truth + shell model)
  -> Sprint 1 (header/footer composition)
     -> Sprint 2 (command surface unification)
        -> Sprint 3 (visual-system hardening)
           -> Sprint 4 (regression coverage + QA)
```

## Summary

| Sprint | Primary Risk Removed |
| --- | --- |
| **0** | Shell routes and labels remain duplicated with no canonical source |
| **1** | Header/footer continue to duplicate brand and navigation markup |
| **2** | Command palette and slash-command registry keep drifting from real navigation truth |
| **3** | Shell chrome stays visually inconsistent despite existing token infrastructure |
| **4** | Route drift and shell regressions remain undetectable without explicit tests and QA artifacts |

## Requirement Mapping

| Requirement Group | Covered In |
| --- | --- |
| `SND-010` through `SND-021` | Sprint 0 |
| `SND-030` through `SND-072` | Sprints 0-2 |
| `SND-080` through `SND-083` | Sprint 3 |
| `SND-090` through `SND-093` | Sprint 2 |
| `SND-100` through `SND-103` | Sprints 0-3 |
| `SND-110` through `SND-116` | Sprint 4 |

## Verification

- Sprint 4 targeted shell/browser suite: passing (`9` files, `42` tests)
- `npm run quality`: passing (`103` files, `592` tests)
