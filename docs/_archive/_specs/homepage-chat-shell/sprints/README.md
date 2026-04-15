# Implementation Plan - Homepage Chat Shell

> **Status:** Ready for implementation
> **Source:** `docs/_specs/homepage-chat-shell/spec.md` (v1.0)
> **Baseline validation:** `npm run typecheck`, `npm run test`, `npm run build`
> **Current test baseline:** 501 existing test cases across `tests/` and `src/` test files
> **Convention:** Each sprint must preserve the real footer, remove route-level workarounds, and keep homepage behavior testable through concrete shell and interaction assertions.

## Sprint Files

| Sprint | File | Tasks | Description |
| --- | --- | --- | --- |
| **0** | [sprint-0-shell-ownership-reset.md](sprint-0-shell-ownership-reset.md) | 4 | Remove homepage-specific footer substitutes and restore clean ownership boundaries across shell, route, and chat container |
| **1** | [sprint-1-home-stage-and-chat-layout.md](sprint-1-home-stage-and-chat-layout.md) | 4 | Implement the dedicated homepage stage, two-row embedded chat workspace, and stable composer pinning |
| **2** | [sprint-2-scroll-boundary-lock-and-browser-coverage.md](sprint-2-scroll-boundary-lock-and-browser-coverage.md) | 4 | Add boundary-lock behavior, browser-focused interaction coverage, and mobile viewport handling |
| **3** | [sprint-3-qa-acceptance-and-polish.md](sprint-3-qa-acceptance-and-polish.md) | 4 | Finalize acceptance coverage, browser verification evidence, and small UX polish within spec boundaries |
| **4** | [sprint-4-chat-first-restoration-and-eval-harness.md](sprint-4-chat-first-restoration-and-eval-harness.md) | 4 | Remove the route-level hero wrapper, migrate hero content into the chat intro, and add a reusable homepage eval harness |

## Dependency Graph

```text
Sprint 0 (ownership reset)
  -> Sprint 1 (homepage stage + two-row chat layout)
     -> Sprint 2 (scroll boundary lock + browser interaction coverage)
        -> Sprint 3 (QA, acceptance evidence, and polish)
           -> Sprint 4 (chat-first restoration + eval harness)
```

## Summary

| Sprint | Primary Risk Removed |
| --- | --- |
| **0** | Existing workaround code keeps footer behavior and shell ownership ambiguous |
| **1** | Homepage still behaves like a flex-derived page instead of a dedicated chat stage |
| **2** | Safari/mobile scroll chaining and keyboard viewport changes can still break the interaction contract |
| **3** | Architecture lands without durable acceptance evidence or final homepage rhythm tuning |
| **4** | Route-level hero composition can still bypass the chat scroll contract unless intro content is owned by the message viewport and checked by a reusable eval harness |

## Requirement Mapping

| Requirement Group | Covered In |
| --- | --- |
| `HCS-010` through `HCS-024` | Sprint 0 |
| `HCS-030` through `HCS-045` | Sprints 0-2 |
| `HCS-046` through `HCS-049A` | Sprints 1-2 |
| `HCS-050` through `HCS-054B` | Sprints 0-2 |
| `HCS-060` through `HCS-069` | Sprints 2-3 |
| `HCS-070` through `HCS-088` | Sprints 1-3 |
| `HCS-077` through `HCS-079`, `HCS-089` | Sprint 4 |