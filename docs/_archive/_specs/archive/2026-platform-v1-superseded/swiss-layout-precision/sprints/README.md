# Implementation Plan - Swiss Layout Precision

> **Status:** Ready for implementation
> **Source:** `docs/_specs/swiss-layout-precision/spec.md` (v1.0)
> **Baseline validation:** `npm run quality`
> **Current test baseline:** 593 passing tests across 103 passing test files
> **Convention:** This package refines visual precision only. It must preserve the route-truth, homepage-stage, and browser-hardening contracts already established elsewhere.

## Sprint Files

| Sprint | File | Tasks | Description |
| --- | --- | --- | --- |
| **0** | [sprint-0-precision-token-and-audit-reset.md](sprint-0-precision-token-and-audit-reset.md) | 4 | Formalize the audit boundaries, refine shell/homepage precision tokens, and make hero-vs-conversation state explicit |
| **1** | [sprint-1-header-and-account-rail.md](sprint-1-header-and-account-rail.md) | 4 | Rebuild the top shell rail, brand/nav relationship, and anonymous/authenticated account variants into one Swiss-inspired system |
| **2** | [sprint-2-homepage-hero-composition.md](sprint-2-homepage-hero-composition.md) | 4 | Compose the homepage intro state as a true hero stack with better copy, chip alignment, and composer relationship |
| **3** | [sprint-3-responsive-continuity-and-qa.md](sprint-3-responsive-continuity-and-qa.md) | 4 | Final responsive pass, footer continuity alignment, and QA/regression evidence |

## Dependency Graph

```text
Sprint 0 (audit boundary + precision tokens)
  -> Sprint 1 (header + account rail)
     -> Sprint 2 (homepage hero composition)
        -> Sprint 3 (responsive continuity + QA)
```

## Summary

| Sprint | Primary Risk Removed |
| --- | --- |
| **0** | Precision work drifts into architecture churn instead of a controlled refinement layer |
| **1** | The shell header remains visually fragmented even though route truth is correct |
| **2** | The homepage still behaves like a chat prototype instead of an intentional landing workspace |
| **3** | Desktop improvements ship without continuity across footer, breakpoints, and regression coverage |

## Requirement Mapping

| Requirement Group | Covered In |
| --- | --- |
| `SLP-010` through `SLP-051` | Sprint 0 |
| `SLP-060` through `SLP-093` | Sprints 0-1 |
| `SLP-100` through `SLP-113` | Sprints 1-2 |
| `SLP-120` through `SLP-144` | Sprints 2-3 |
| `SLP-150` through `SLP-154` | Spec-only future considerations |