# Implementation Plan - Chat Experience

> **Status:** Implemented
> **Source:** `docs/_specs/chat-experience/spec.md`
> **Baseline validation:** `npm run typecheck`, focused Vitest runs, `npm run build`
> **Convention:** This feature does not reopen homepage-shell ownership. It only changes the behavior and presentation inside the chat workspace.

## Sprint Files

| Sprint | File | Tasks | Description |
| --- | --- | --- | --- |
| **0** | [sprint-0-identity-navigation-and-filtering.md](sprint-0-identity-navigation-and-filtering.md) | 4 | Stabilize rendered message ids, make inline links navigate, and repair filtered-list semantics |
| **1** | [sprint-1-composer-and-scroll-intent.md](sprint-1-composer-and-scroll-intent.md) | 4 | Replace the single-line composer with a real textarea and move scroll behavior to an explicit pin/detach model |
| **2** | [sprint-2-visual-hierarchy-and-qa.md](sprint-2-visual-hierarchy-and-qa.md) | 4 | Calm the message stage, align bubble treatments, expand regressions, and record verification |

## Dependency Graph

```text
Sprint 0 (identity + navigation + filtering)
  -> Sprint 1 (composer + scroll intent)
     -> Sprint 2 (visual hierarchy + QA)
```

## Summary

| Sprint | Primary Risk Removed |
| --- | --- |
| **0** | Message rendering and inline navigation are visually plausible but semantically wrong |
| **1** | The composer and scroll system still feel prototype-grade under real usage |
| **2** | The chat stage still competes with itself visually and lacks durable regression evidence |

## Verification

- Focused sprint regressions: passing
- Adjacent browser/chat regressions: passing
- `npm run typecheck`: passing
- `npm run build`: passing