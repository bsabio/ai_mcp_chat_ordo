# Sprint 0 Closeout Category Checklist

> **Status:** Frozen on 2026-04-11

This checklist defines the categories the unification program must close before
the workstream can be considered complete and publicly release-ready.

## Closeout Categories

| Category | Required end-state evidence |
| --- | --- |
| Prompt control-plane equivalence | admin, MCP, and script prompt mutation paths produce the same slot behavior, side effects, and role coverage |
| Effective prompt provenance | the runtime can report the actual prompt sent to the model, including slot source, config overlay, runtime sections, and manifest inputs |
| Shared chat provider policy | stream and direct-turn chat consume one provider-policy contract for timeout, retry, fallback, observability, and error mapping |
| Capability derivation | at least one real capability family is derived from one capability definition into runtime, prompt, UI, deferred, and protocol-facing metadata |
| Deferred-state publication | the UI-facing job-state story is documented and validated as one coherent publication model rather than several unrelated ones |
| Interruption and recovery semantics | stop, reconnect, snapshot repair, and deferred-job continuation semantics are documented truthfully and verified against the shipped runtime contract |
| Service lifetime clarity | request-scoped, process-cached, and process-memory coordination layers have explicit ownership rules and documented composition boundaries |
| MCP boundary hygiene | MCP files are thin protocol wrappers over shared contracts for the intended slice, not parallel sources of domain truth |
| Seam-level verification | the highest-risk seams are verified through reduced-mock or integration tests instead of only local mocked happy paths |
| Public documentation truth | README, contributor docs, architecture docs, and operations docs match the shipped system and governance model |
| Secret and artifact safety | release and QA artifacts are safe for source control and CI storage and pass secret scanning |
| Release evidence | the final unification gate includes reproducible commands and evidence paths for static validation, tests, build, secret scan, runtime integrity, and unification-specific checks |
| Residual-risk disclosure | remaining out-of-scope gaps are documented explicitly instead of hidden behind optimistic release language |

## Usage

Each later sprint should be able to point at one or more of these categories and
state which part of the closeout burden it is reducing.

Sprint 8 should use this checklist as the source for the final unification
release-gate report.
