# Sprint 0 Vocabulary And Boundary Glossary

> **Status:** Frozen on 2026-04-11

This glossary freezes the core terms used by the unification program so later
sprints do not quietly redefine the architecture while they implement it.

## Core Terms

| Term | Frozen meaning in this workstream |
| --- | --- |
| Capability catalog | the authoritative definition set for capability existence, role scope, execution mode, prompt-visible description, UI metadata, deferred-job metadata, and protocol export intent |
| Effective prompt | the actual prompt text sent to a model for a given use case after slot resolution, fallback behavior, config overlays, and runtime section assembly |
| Prompt provenance | the structured explanation of where each part of the effective prompt came from, including DB slots, fallback content, config overlays, runtime sections, and capability manifest inputs |
| Prompt control plane | the domain surface that governs prompt version mutation, activation, rollback, diff, audit behavior, and prompt-version side effects across admin, MCP, and scripts |
| Provider runtime | the shared runtime contract that owns provider target selection, timeout and retry policy, model fallback, normalized error mapping, and provider observability |
| Provider policy | the subset of provider runtime behavior that defines timeout, retry, retry delay, fallback model candidates, and other execution-governing settings for a use case |
| Deferred-state projection | the server-side contract that shapes deferred job and capability state into the UI-facing state model consumed by streams, routes, presenter logic, and repair paths |
| MCP export layer | the protocol-facing wrapper layer that exposes shared domain capabilities or services over MCP without becoming a parallel source of domain truth |
| Request-scoped service | a service or interactor created for a route or request lifecycle and not intended to survive as a process singleton |
| Process-cached service | a repository, query object, or helper cached in module scope and effectively reused for the life of the current process |
| Process-memory coordination state | non-durable in-memory runtime state used to coordinate current-process behavior, such as active stream ownership |
| Release gate | the reproducible command set plus artifact checks that block or allow closeout based on real evidence rather than narrative confidence |

## Boundary Rules

1. MCP servers are not assumed to be the primary application runtime boundary unless a sprint explicitly makes them so.
2. Prompt slot versions are not assumed to equal effective prompt truth.
3. Passing route tests are not assumed to prove integrated runtime behavior when critical seams are mocked away.
4. Process-cached behavior is not assumed to be equivalent to explicit service ownership.
