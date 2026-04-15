# Architecture Unification And Open-Source Release Preparation — Refactor Spec

> **Status:** Active — Phase 1 (Sprints 0–8) and Phase 2 (Sprints 9–14) are finished, Sprints 15–19 are complete, Sprint 20's schema-derivation foundation is landed with broader consumer migration still partial, and Sprints 21–25 are landed, including Sprint 25's elite-ops drift, RBAC, latency, and degraded-path release gates. See `docs/_refactor/unification/sprints/README.md` for the maintained full sprint sequence.
> **Date:** 2026-04-11
> **Scope:** Turn the current unification research into an executable program that
> takes Studio Ordo from its current split architecture to a public,
> open-source-ready target state with unified runtime contracts, thin protocol
> boundaries, explicit release gates, and durable sprint documentation.
> **Builds on:** `docs/_refactor/unification/01-current-state-architecture.md`
> through `docs/_refactor/unification/15-ranked-gap-matrix.md`
> **Canonical post-program architecture:** `docs/_refactor/unification/04-fully-unified-architecture.md`
> **Affects:** `src/lib/chat/*`, `src/core/tool-registry/*`,
> `src/core/use-cases/tools/*`, `src/lib/admin/prompts/*`, `src/lib/jobs/*`,
> `src/adapters/*`, `mcp/*`, `src/lib/evals/*`, release evidence scripts,
> contributor-facing docs, and operational architecture docs.

---

## 1. Program Statement

The unification workstream is no longer only a research effort.

It is now the program that should carry Studio Ordo from:

- overlapping prompt, provider, tool, job, and MCP systems
- high local quality but inconsistent cross-seam contracts
- internal delivery assumptions that still leak into architecture choices

to a state where the repository can be published and maintained as a public,
governed framework without hidden architectural drift.

The target is not a prettier diagram.

The target is a repository where an outside reader can inspect the system and
see one authoritative answer for each major concern:

- what capabilities exist
- how prompts are assembled
- how providers are selected and governed
- how deferred state is published
- how admin and MCP control planes mutate runtime truth
- how release readiness is proven

---

## 2. Why This Package Exists

The research set in this folder established the current and target shapes.

What it does not yet provide on its own is a full execution package that makes
it difficult to forget lower-priority but still necessary work.

This spec and sprint package exists so the workstream can be executed as a
program rather than as a sequence of ad hoc local fixes.

That matters more because the repository is being prepared for a public release.

Public release changes the bar:

1. the architecture must be explainable, not just operable
2. boundaries must be cleaner because outside readers will inspect them
3. release gates must be documented and reproducible
4. contributor-facing docs must match the actual runtime and governance model
5. no important behavior should depend on private tribal knowledge

---

## 3. Relation To The Research Set

The numbered unification docs remain the source of truth for analysis.

This package is the execution layer that builds on them.

### Research docs answer

- what currently exists
- where it drifts
- what the ideal target should look like
- how the gaps rank by value and risk

### This spec package answers

- what workstreams need to be executed
- in what order they should land
- what each sprint is responsible for
- what artifacts and tests must exist before the program is considered complete

---

## 4. Current Baseline Summary

The current repository already has strong components, but their ownership is
split.

### 4.1 Prompt baseline

- runtime prompt assembly uses `DefaultingSystemPromptRepository`,
  `ConfigIdentitySource`, and section-based builder logic
- admin and MCP prompt mutation surfaces operate on raw prompt rows
- effective runtime prompt truth is not equivalent to stored prompt version

### 4.2 Provider baseline

- the main chat route uses a dedicated Anthropic streaming path
- direct-turn chat uses a separate provider abstraction and orchestration loop
- summarization, blog, web search, image, and TTS flows each solve provider
  policy locally

### 4.3 Capability baseline

- capability metadata is split across tool descriptors, prompt manifests, job
  metadata, UI presentation metadata, and MCP tool surfaces

### 4.4 Deferred-state baseline

- job state converges from main stream promotion, job-event SSE, snapshot
  repair, and browser-side rewrites

### 4.5 Composition baseline

- request-scoped composition, process-cached repositories, and in-memory
  coordination state coexist without one explicit lifetime policy

### 4.6 Public-release baseline

- the repository already has strong runtime-integrity evidence, secret scanning,
  contributor guidance, issue templates, and release artifacts
- the unification program must extend those governance strengths instead of
  bypassing them

---

## 5. Program Goals

1. Establish one authoritative capability definition model for runtime, prompt,
   UI, deferred-job, and MCP metadata.
2. Establish one effective-prompt runtime that produces both final prompt text
   and prompt provenance.
3. Establish one provider-policy runtime that governs retries, timeouts,
   fallback models, error mapping, and observability.
4. Unify admin, MCP, and script prompt mutation through one control-plane
   service.
5. Make deferred job state publish from one authoritative projection model.
6. Make service lifetime policy explicit at the composition-root level.
7. Convert MCP servers from parallel architectural definition sites into thin
   protocol wrappers over shared domain contracts.
8. Add seam-level tests that prove the composed behavior of the real runtime,
   not only mocked local modules.
9. Package the resulting system with public, reproducible release gates and
   contributor-facing documentation that matches the shipped architecture.

---

## 6. Requirement Tracks

| Requirement Range | Track | Description |
| --- | --- | --- |
| `UNI-010` through `UNI-039` | Authority and vocabulary | define one authoritative ownership model for capability, prompt, provider, deferred state, and release-governance concepts |
| `UNI-040` through `UNI-079` | Prompt control plane | unify prompt mutation semantics, slot coverage, audit behavior, revalidation, and prompt-version side effects |
| `UNI-080` through `UNI-119` | Prompt runtime | produce effective prompt text plus provenance for chat and adjacent model-backed flows |
| `UNI-120` through `UNI-159` | Provider runtime | centralize provider policy, target selection, fallback, observability, and error mapping |
| `UNI-160` through `UNI-199` | Capability catalog | derive runtime, prompt, UI, deferred-job, and MCP metadata from one capability definition |
| `UNI-200` through `UNI-229` | Deferred-state publication | replace after-the-fact state convergence with an authoritative projection path where practical |
| `UNI-230` through `UNI-249` | Service lifetime clarity | declare request, process-cache, and process-memory ownership explicitly |
| `UNI-250` through `UNI-279` | MCP boundary hygiene | make MCP servers transport wrappers over shared domain capabilities and services |
| `UNI-280` through `UNI-319` | Integration and verification | add seam-level tests, evals, and release evidence for the unified architecture |
| `UNI-320` through `UNI-359` | Open-source release preparation | ensure docs, commands, artifacts, and governance are safe and truthful for public release |

---

## 7. Public Release Constraints

The unification program is not complete unless the architecture is ready to be
read, run, and governed publicly.

### 7.1 Documentation truthfulness

- contributor docs must match the actual contribution model
- architecture docs must describe the shipped boundaries, not aspirational ones
- setup instructions must be runnable by an outside reader with the repo alone

### 7.2 Secret and environment hygiene

- release artifacts must be safe for source control and CI storage
- no sprint may introduce hardcoded secrets, hidden credentials, or private
  infrastructure assumptions
- environment requirements must be documented through public templates and
  validation commands

### 7.3 Boundary hygiene

- protocol wrappers must not quietly become the place where domain truth lives
- public module names should match behavior closely enough to avoid misleading
  outside readers
- deployment-only workarounds must be documented as operational facts, not left
  as hidden assumptions in the codebase

### 7.4 Release evidence

- release gates must be runnable from the repository
- artifacts must explain what was checked and what blocked release
- unification work must join the existing runtime-integrity governance rather
  than bypass it

---

## 8. Delivery Sequence

The table below records the original phase-one public-release spine for the
program.

The maintained current execution sequence now continues through Sprint 25 in
`docs/_refactor/unification/sprints/README.md`: Phase 3 remediation landed
through Sprint 19 plus the Sprint 20 schema-derivation foundation, and Phase 4
hardening is landed through Sprint 24 with Sprint 25 reserved for elite-ops
drift, RBAC, latency, and failure-evidence gates.

| Sprint | Goal |
| --- | --- |
| 0 | Freeze the baseline, vocabulary, artifact map, and public-release assumptions |
| 1 | Unify prompt mutation semantics and authoritative prompt slot coverage |
| 2 | Introduce effective prompt runtime and provenance surfaces |
| 3 | Add seam-level integration tests and reduce critical mock blindness |
| 4 | Extract shared provider policy across chat stream and direct-turn paths |
| 5 | Pilot capability catalog derivation for the highest-drift capability family |
| 6 | Introduce authoritative job projection and explicit service-lifetime ownership rules |
| 7 | Expand provider runtime beyond chat and thin the MCP boundary around shared contracts |
| 8 | Close with open-source release gates, governance artifacts, and public-package readiness |

### 8.1 Why This Order

1. prompt truth and prompt side effects must converge before heavier runtime
   refactors can be trusted
2. seam tests must land before critical-path provider changes so the refactor
   can be measured rather than guessed
3. provider-policy convergence should begin in chat before expanding to the
   lower-pressure model-backed surfaces
4. capability derivation should prove itself on a bounded slice before broader
   MCP export cleanup
5. public release closeout should verify the end state rather than attempt to
   define it retroactively

---

## 9. Verification Standard

The program is not complete until all categories below are green.

| Category | Minimum evidence |
| --- | --- |
| Static validation | diagnostics-clean changed files plus updated docs for all boundary shifts |
| Prompt control equivalence | admin, MCP, and script mutation surfaces produce the same slot behavior and side effects |
| Prompt provenance | effective prompt output can explain slot source, config overlays, runtime sections, and manifest inputs |
| Provider policy | stream and direct-turn chat share the same timeout, retry, fallback, and error policy contract |
| Capability derivation | at least one real capability family is derived from a shared catalog across runtime, prompt, UI, and deferred metadata |
| Deferred-state consistency | authoritative job-state projection is documented and verified through real seam tests |
| Release governance | lint, tests, build, secret scan, runtime-integrity evidence, and unification-specific release checks all pass |
| Public package quality | contributor docs, setup docs, architecture docs, and release docs match the shipped system |

---

## 10. Intended Package Outputs

The unification workstream should end with all of the following:

- a maintained research set in this folder
- this program spec
- a complete sprint package under `docs/_refactor/unification/sprints/`
- implementation artifacts and audit evidence produced by the sprints
- updated operations and contributor docs that reflect the shipped architecture
- release-gate documentation that makes the public release defensible

---

## 11. Non-Goals

1. This program does not require one big-bang rewrite.
2. It does not require every model-backed feature to share the exact same low-
   level adapter implementation.
3. It does not require protocol purity where direct domain calls are clearer.
4. It does not aim to remove useful local abstractions in the name of
   theoretical uniformity.
5. It does not relax governance because the repo is going public; it raises the
   bar for explainability and reproducibility.

---

## 12. Done Criteria

1. One authoritative capability definition can drive runtime, prompt, UI,
   deferred-job, and MCP-facing metadata for the intended slice.
2. One prompt runtime can describe the effective prompt for a turn with full
   provenance.
3. One prompt control-plane service governs prompt mutation side effects across
   admin, MCP, and scripts.
4. One provider-policy runtime governs stream and turn behavior in chat, then
   extends to the remaining model-backed surfaces where intended.
5. One documented deferred-state publication model exists for the UI-facing job
   state story.
6. Service lifetime ownership is explicit enough that readers no longer need
   code archaeology to reason about scope.
7. Public release gates prove that the shipped repo is safe, explainable, and
   reproducible.
