# Implementation Plan - Chat Runtime Hardening

> **Status:** Implemented
> **Source:** `docs/_specs/chat-runtime-hardening/spec.md`
> **Baseline validation:** focused Vitest runs, `npm run quality`

## Sprint Files

| Sprint | File | Tasks | Description |
| --- | --- | --- | --- |
| **0** | [sprint-0-tracking-and-scope-alignment.md](sprint-0-tracking-and-scope-alignment.md) | 3 | Record the verified runtime hardening scope and align feature tracking |
| **1** | [sprint-1-command-dependency-removal.md](sprint-1-command-dependency-removal.md) | 3 | Replace the ambient command registry path with a local command catalog |
| **2** | [sprint-2-attachment-lifecycle-reaper.md](sprint-2-attachment-lifecycle-reaper.md) | 4 | Add stale unattached upload reaping in the file layer and operator tooling |
| **3** | [sprint-3-failure-regression-and-qa.md](sprint-3-failure-regression-and-qa.md) | 3 | Add failed-send UI regression coverage and record final verification |

## Verification

- Focused runtime hardening tests: passing
- `npm run quality`: passing
