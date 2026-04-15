# Agent Runtime Hardening — Development Program

> **Status:** Active
> **Date:** 2026-04-08
> **Owner:** OrdoSite Core Platform
> **Scope:** Ten prioritized architectural upgrades derived from deep analysis of two reference codebases — `claw-code` (Claude Code harness port) and `openclaw` (production multi-channel AI platform) — mapped against OrdoSite's formation platform requirements.
> **Execution model:** Specs are numbered in dependency and priority order. Each spec is self-contained and implementation-ready for autonomous agent execution. Work within a spec proceeds sprint-by-sprint. Specs without a `sprints/` child are complete at the spec level only.

---

## Why This Program Exists

OrdoSite is preparing to serve hundreds to thousands of students through a formation-based curriculum. Once selling begins at scale:

- There is no time to revisit foundational infrastructure decisions
- Student experience degradations compound faster than they can be fixed
- API costs at scale make token inefficiency a business problem, not just a performance note
- The formation curriculum requires a runtime that can hold long sessions, be precisely controlled by instructors, and generate auditable proof-of-work artifacts

This program hardens the agent runtime **before** scale, using patterns battle-tested in production at OpenClaw and architecturally validated through the Claude Code harness analysis.

---

## Execution Rules For Agents

1. **Work in spec order.** Specs 01 and 02 are foundation — everything else builds on them. Do not start spec 03+ until specs 01 and 02 are complete and verified.
2. **Complete sprints in order within each spec.** Sprint 0 of each spec establishes the foundational contract. Later sprints build on it.
3. **Each sprint has a verification block.** A sprint is not done until its verification passes.
4. **Cross-spec dependencies are documented.** If Spec N depends on Spec M, that dependency is stated at the top of Spec N's `spec.md`.
5. **Do not modify specs during execution without flagging.** If implementation reveals a spec gap, note it in a `DEVIATION.md` inside the spec folder and continue with the closest valid interpretation.
6. **Test counts are targets, not ceilings.** Write more tests if the surface demands it.

---

## Specs — Execution Order

### Foundation Layer
*Must complete before all other specs. These enable the hook surface and eliminate hidden costs.*

| # | Spec | Folder | Priority Signal |
|---|---|---|---|
| **01** | [Hook Pipeline — 3-Tier Lifecycle System](./01-hook-pipeline/spec.md) | `01-hook-pipeline/` | Load-bearing. All other cross-cutting behaviors (corpus injection, analytics, slash command intercept) attach here. Build this first. |
| **02** | [Prompt Cache Stability](./02-prompt-cache-stability/spec.md) | `02-prompt-cache-stability/` | Fast win. Deterministic tool manifest ordering reduces API costs immediately. At student scale, the savings are real. |

### Agent Control Surface
*Gives instructors and power users precise session control. Must be in place before curriculum delivery begins.*

| # | Spec | Folder | Priority Signal |
|---|---|---|---|
| **03** | [Multi-Stage Compaction](./03-multi-stage-compaction/spec.md) | `03-multi-stage-compaction/` | Formation sessions are long. Silent context drift is the worst possible student experience — they get half-answers with no signal that the agent forgot the earlier conversation. |
| **04** | [Slash Command Registry](./04-slash-command-registry/spec.md) | `04-slash-command-registry/` | Instructors need `/clear`, `/compact`, `/export`, `/status` before going live. Depends on 01 (implemented as an `inbound_claim` hook). |
| **05** | [Heuristic Tool Pre-Filter](./05-heuristic-tool-prefilter/spec.md) | `05-heuristic-tool-prefilter/` | Cost + quality. As the tool registry grows, unfiltered manifests degrade both. Fix the architecture before scale, not after. |

### Session Durability and Auditability
*Required for formation curriculum integrity — proof-of-work artifacts, export, and replay.*

| # | Spec | Folder | Priority Signal |
|---|---|---|---|
| **06** | [Transcript Store](./06-transcript-store/spec.md) | `06-transcript-store/` | Full-fidelity session log separate from the context window. Powers `/export`, fine-tuning data, and curriculum proof-of-work. |
| **07** | [Context Window Guard](./07-context-window-guard/spec.md) | `07-context-window-guard/` | Hard limits with warn and block thresholds. Sessions should never silently degrade — students should get a clear signal before hitting the wall. |
| **08** | [Permission Denial Log](./08-permission-denial-log/spec.md) | `08-permission-denial-log/` | Structured denial collection per turn. Tells you which capabilities students are reaching for that they can't access — curriculum gap intelligence. |

### Extensibility Infrastructure
*Ensures the system can grow without core surgery. Required before adding more curriculum tools or specialist agents.*

| # | Spec | Folder | Priority Signal |
|---|---|---|---|
| **09** | [Tool Policy Pipeline](./09-tool-policy-pipeline/spec.md) | `09-tool-policy-pipeline/` | Layered allowlists (global → agent → provider → group). Multi-agent ready. Do before you add a second named agent configuration. |
| **10** | [Extension-Agnostic Composition Root](./10-extension-agnostic-composition/spec.md) | `10-extension-agnostic-composition/` | Makes `tool-composition-root.ts` extension-agnostic. Adding curriculum tools stops requiring core edits. |

---

## Dependency Graph

```
01-hook-pipeline ──────────────────┐
02-prompt-cache-stability          │
                                   ▼
03-multi-stage-compaction    04-slash-command-registry (depends on 01)
05-heuristic-tool-prefilter  (independent, but benefits from 01 hooks)
                                   │
                                   ▼
06-transcript-store          07-context-window-guard
08-permission-denial-log     (all benefit from 01 hooks)
                                   │
                                   ▼
09-tool-policy-pipeline      10-extension-agnostic-composition
```

---

## Source Attribution

All patterns in this program are derived from analysis of:

- **claw-code** (`/Users/kwilliams/Projects/claw-code`) — Python/Rust reverse-engineered port of the Claude Code agent harness. Source of: slash command registry patterns, transcript store model, tool pre-filter scoring, permission denial log.
- **openclaw** (`/Users/kwilliams/Projects/openclaw`) — Production TypeScript multi-channel AI assistant platform. Source of: 3-tier hook runner, adaptive multi-stage compaction, prompt cache stability discipline, context window guard, tool policy pipeline, extension-agnostic architecture boundaries.

Full analysis artifacts:
- [`claw_code_analysis.md`](file:///Users/kwilliams/.gemini/antigravity/brain/a6a59749-1dcb-460f-b24a-aa862ab0d422/claw_code_analysis.md)
- [`openclaw_analysis.md`](file:///Users/kwilliams/.gemini/antigravity/brain/a6a59749-1dcb-460f-b24a-aa862ab0d422/openclaw_analysis.md)

---

## Total Estimated Test Coverage

| Spec | Estimated New Tests |
|---|---|
| 01 Hook Pipeline | +64 |
| 02 Prompt Cache Stability | +22 |
| 03 Multi-Stage Compaction | +48 |
| 04 Slash Command Registry | +68 |
| 05 Heuristic Tool Pre-Filter | +52 |
| 06 Transcript Store | +56 |
| 07 Context Window Guard | +28 |
| 08 Permission Denial Log | +58 |
| 09 Tool Policy Pipeline | +40 |
| 10 Extension-Agnostic Composition | +24 |
| **Total** | **~460 new tests** |
