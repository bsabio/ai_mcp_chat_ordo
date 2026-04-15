# Implementation Roadmap

> **Status:** Ready for sprint authoring after spec approval
> **Source:** `docs/_specs/mcp_ffmpeg_system_upgrade_wasm/spec.md`
> **Focus:** One converged roadmap for capability audit closure, capability
> presentation, shared cards, system surfaces, progress UX, chat chrome
> simplification, transcript durability, reusable browser capability runtime,
> and hybrid FFmpeg media execution.

## Why this package exists

This feature is not just an FFmpeg note and not just a card-system cleanup. It
is the convergence layer for the product decisions already made:

1. payload-first chat capabilities
2. elite card presentation with shared primitives
3. a global progress strip above the composer
4. a header-level user-data menu instead of composer toolbar clutter
5. preservation of the single active conversation model
6. a reusable browser-side capability runtime for bounded local WASM work
7. browser-local first media transforms with deferred server fallback
8. explicit audit closure for every chat-exposed MCP tool and deferred job

## Planned sprint docs

Sprint 0 is drafted, Sprint 1 is implemented, Sprint 2 is implemented, Sprint
3 is drafted, Sprint 4 is drafted, Sprint 5 is drafted, Sprint 6 is drafted,
and Sprint 7 is now drafted. Together they freeze inventory, lock
browser-runtime and replay-budget defaults, define the presentation-manifest
plus result-envelope layer, land the shared card-system foundation, specify
phased job progress plus payload-first transcript durability, pin the global
progress strip plus header-level conversation data menu contract that consumes
that normalized state, define the current capability-family rollout needed to
retire silent fallback coverage across the current non-system chat families,
establish the browser-runtime plus media-asset substrate required before
FFmpeg-specific execution work can land cleanly, and now define the hybrid
FFmpeg browser plus server execution layer that uses that substrate. Sprint 8
should still be authored only after the spec is accepted. The intended
sequence is:

| Sprint | Planned file | Goal |
| --- | --- | --- |
| 0 | `sprint-0-contract-freeze-and-inventory.md` | Freeze the converged architecture contract and inventory every chat-exposed MCP tool, deferred job family, renderer mode, and payload shape |
| 1 | `sprint-1-presentation-manifest-and-result-envelope.md` | Introduce the capability presentation registry and unified result envelope |
| 2 | `sprint-2-shared-card-system-and-tone-primitives.md` | Build the shared card shell, semantic tone model, system-card family, and disclosure/action primitives |
| 3 | `sprint-3-job-phase-model-and-transcript-durability.md` | Extend job projection for phased progress, whole-job retry, replay snapshots, and payload-first history rendering |
| 4 | `sprint-4-progress-strip-and-chat-chrome-simplification.md` | Ship the global progress strip and move conversation data actions into the header menu once normalized job state exists |
| 5 | `sprint-5-current-capability-family-rollout.md` | Migrate editorial, search/retrieval, artifact, theme, profile, and journal families onto the shared card system and close uncovered capability gaps |
| 6 | `sprint-6-browser-runtime-and-media-asset-substrate.md` | Add the reusable browser capability runtime, admission control, interruption reconciliation, normalize generated and uploaded media assets, expand governed media ingest, subtitle timing, and chart/graph assetization |
| 7 | `sprint-7-hybrid-ffmpeg-browser-and-server-execution.md` | Add FFmpeg on top of that runtime, with browser WASM execution, deferred server fallback, media routing, and FFmpeg capability cards |
| 8 | `sprint-8-qa-release-gates-and-operational-closeout.md` | Add browser verification, observability, governed release gates, and final audit closeout for cards, jobs, and media |

## Dependency graph

```text
Sprint 0 (contract freeze + audit matrix)
  -> Sprint 1 (presentation manifest + envelope)
     -> Sprint 2 (shared card + system surfaces)
        -> Sprint 3 (job phases + transcript durability)
           -> Sprint 4 (progress strip + header data menu)
              -> Sprint 5 (existing family rollout + gap closure)
                 -> Sprint 6 (browser runtime + media asset substrate + ingest)
                    -> Sprint 7 (hybrid FFmpeg execution)
                       -> Sprint 8 (QA + release gates + audit closeout)
```

## Authoring rule

The sprint docs that follow this README should stay implementation-precise and
should only be written against verified code and actual file signatures in the
repo at that time. This README is the roadmap, not the implementation detail.
