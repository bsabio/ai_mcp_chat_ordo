# Specifications & Process Guide

> This document explains the end-to-end process for specifying, planning,
> implementing, and QA-ing features in this project. It is written so that
> **any LLM agent** — not just the one that created these docs — can read it,
> understand the workflow, and execute it faithfully.

---

## 1. Directory Layout

```text
docs/_specs/
├── README.md                     ← this file (process guide)
├── {feature}/
│   ├── spec.md                   ← system specification
│   └── sprints/
│       ├── sprint-0-*.md         ← implementation sprint doc
│       ├── sprint-1-*.md
│       └── ...
├── tool-roadmap/                 ← unimplemented future specs
└── archive/                      ← historical planning docs
```

**Convention:** Every feature gets exactly one folder. Inside it: `spec.md`
(the what and why) and `sprints/` (the how, broken into ordered increments).

---

## 2. Feature Specs

| Feature | Status | Sprints | Description |
| --- | --- | --- | --- |
| [RBAC](rbac/) | **Complete** | 6 (0–5) | Multi-user auth, RBAC, chat persistence, role-aware LLM |
| [Tool Architecture](tool-architecture/) | **Complete** | 5 (0–4) | Registry-based tool system with SOLID/GoF alignment |
| [Vector Search](vector-search/) | **Complete** | 6 (0–5) | BM25+vector hybrid search, embedding pipeline, MCP server |
| [Platform V0](platform-v0/) | **Draft** | 4 (0–3) | Foundational prompt, preference, conversation, and chat-surface refactors that Platform V1 builds on |
| [Librarian](librarian/) | **Draft** | 2 (0–1) | `_corpus/` auto-discovery, MCP librarian tools, zip import |
| [Web Search](web-search/) | **Complete** | 1 (0) | Admin web search via OpenAI GPT-5, rich UI, citations |
| [Conversation Memory](conversation-memory/) | **Draft** | 3 (0–2) | Anonymous persistence, auto-resume, rolling summaries, conversation search |
| [Browser UI Hardening](browser-ui-hardening/) | **Draft** | 7 (0–6) | Cross-browser shell, overlay, motion, media, and regression hardening for Safari, Chrome, Firefox, and mobile browsers |
| [Homepage Chat Shell](homepage-chat-shell/) | **Draft** | 4 (0–3) | Homepage-first chat stage architecture with below-the-fold footer, exclusive message scrolling, and pinned composer behavior |
| [Chat Experience](chat-experience/) | **In Progress** | 3 (0–2) | Message semantics, inline navigation, composer ergonomics, scroll intent, and calmer conversation presentation |
| [Interactive Chat Actions](interactive-chat-actions/) | **Draft** | 0 planned | Inline action links, per-message chips, and shorter action-oriented assistant replies inside the chat surface |
| [Chat Runtime Hardening](chat-runtime-hardening/) | **Complete** | 4 (0–3) | Documentation alignment, local command dependencies, stale attachment reaping, and failed-send regression coverage for the chat runtime |
| [Shell Navigation And Design System](shell-navigation-and-design-system/) | **Complete** | 5 (0–4) | Canonical shell route truth, shared brand/navigation primitives, command-surface unification, shell token discipline, and final QA evidence |
| [Footer Information Architecture](footer-information-architecture/) | **Draft** | 0 planned | Footer-only informational navigation contract, command-surface parity, and truthful page inventory rules for chat-first UX |
| [Conversation Lane Routing](conversation-lane-routing/) | **Draft** | 0 planned | Durable organization-vs-individual routing state for prompts, analytics, and next-step recommendation |
| [Progressive Contact Capture](progressive-contact-capture/) | **Draft** | 0 planned | In-thread, lane-aware contact capture with structured persistence and event telemetry |
| [FAB Shell Refactor](fab-shell-refactor/) | **Draft** | 4 planned (0–3) | Floating chat FAB refactor with explicit shell ownership, command-driven theme controls, styling contract cleanup, and stable browser verification |
| [Floating Chat Visual Authority](floating-chat-visual-authority/) | **Draft** | 4 planned (0–3) | Floating chat shell refinement for stronger hierarchy, action priority, composer anchoring, and a calmer but more decisive visual contract |
| [Customer Workflow And Deal Flow](customer-workflow-and-deal-flow/) | **Draft** | 5 planned (0–4) | Unified runtime contract for organization, individual, and development workflows from routing through qualification, founder review, and downstream deal or training handling |
| [Live Eval And Funnel Validation](live-eval-and-funnel-validation/) | **In Progress** | 4 planned (0–3) | Real-model, seeded-data, tool-aware evaluation program for MCP reliability, customer funnel completion, and anonymous-to-signed-in continuity |
| [Flexible Graphing System](flexible-graphing-system/) | **Draft** | 3 planned (0–2) | Quantitative graph generation for time series, comparisons, distributions, and arbitrary structured data, separate from Mermaid diagrams |
| [Platform Convergence And Spec Rationalization](platform-convergence-and-spec-rationalization/) | **Draft** | 5 planned (0–4) | Consolidate Platform V1 into a coherent active spec set, preserve the content/knowledge substrate, retire dashboard-first legacy modality, and archive superseded specs without losing historical context |

### Roadmap

Future tool specs not yet scheduled for implementation:

| # | Spec | Priority |
| --- | --- | --- |
| 02 | [Knowledge Graph](tool-roadmap/02-knowledge-graph.md) | High |
| 03 | [Smart Content Delivery](tool-roadmap/03-smart-content-delivery.md) | High |
| 04 | [Advanced Calculator](tool-roadmap/04-advanced-calculator.md) | Medium |
| 05 | [Intelligent UI Tools](tool-roadmap/05-intelligent-ui-tools.md) | Medium |
| 06 | [Media Generation](tool-roadmap/06-media-generation.md) | Medium |
| 07 | [Cross-Cutting Platform](tool-roadmap/07-cross-cutting-platform.md) | Medium |

### Archive

Historical planning documents and superseded feature batches: [archive/](archive/)

Current archive batch:

1. [2026-platform-v1-superseded](archive/2026-platform-v1-superseded/)

---

## 3. The Process (Lifecycle of a Feature)

Every feature flows through four phases. Each phase produces a specific
artifact. **Do not skip phases or combine them.**

This process exists to control predictable LLM failure modes:

- hallucination about files, signatures, or architecture
- drift away from the real scope
- context loss during long sessions
- false confidence from incomplete verification

### Phase 1 — Spec (`spec.md`)

**Input:** A problem statement or user request.
**Output:** `{feature}/spec.md`

The spec defines **what** the system should do and **why**. It does not
prescribe implementation details like variable names or exact file contents —
that belongs in sprint docs.

A spec must include:

| Section | Purpose |
| --- | --- |
| Problem Statement | What's broken or missing — with concrete evidence |
| Design Goals | Numbered principles guiding all decisions |
| Architecture | Interfaces, data flow, key types, directory conventions |
| Security | RBAC, input validation, path safety — whatever applies |
| Testing Strategy | Test categories, approximate counts, what's mocked |
| Sprint Plan | Table of sprints with one-line goals — the roadmap |
| Future Considerations | Out-of-scope items explicitly deferred |

**Rules:**

- Reference existing codebase APIs by their actual signatures (read the code
  first, don't guess).
- Every type, interface, and function mentioned must be verified against the
  actual source file before inclusion.
- The spec is a contract. Sprints implement the spec. Deviations are recorded
  in the sprint doc's QA Deviations section.

### Phase 2 — Sprint Doc (`sprints/sprint-N-*.md`)

**Input:** The spec, plus the codebase at its current state.
**Output:** `{feature}/sprints/sprint-N-{short-name}.md`

A sprint doc is a **precise implementation blueprint**. It contains enough
detail that an LLM agent can execute it without asking clarifying questions.

A sprint doc must include:

| Section | Purpose |
| --- | --- |
| Header | Goal, spec section references, prerequisite (prior sprint commit) |
| Available Assets | Table of existing files/APIs that this sprint uses — with actual signatures |
| Tasks (numbered) | One per logical unit of work. Each has: what to create/modify, code snippets, key implementation details, verify steps |
| Completion Checklist | Checkbox list of deliverables — used during QA |
| QA Deviations | Blank section, populated during implementation QA |

**Rules for sprint docs:**

1. **Available Assets must be verified.** Read every file listed. Confirm
   every import path, type signature, constructor argument, and method name
   against the actual source code. If the doc says
   `EmbeddingPipelineFactory(embedder, vectorStore, modelVersion)` then those
   must be the actual constructor parameters.

2. **Code snippets are blueprints, not copy-paste.** They show structure,
   signatures, and key logic. The implementing agent should use them as a
   guide but read the actual codebase for exact details.

3. **Each task ends with a Verify step.** This is a concrete command
   (`npx tsc --noEmit`, `npx vitest run path/to/test`, `npm run build`)
   that confirms the task was completed correctly.

4. **Import paths must use the project's alias convention.** In this project,
   `@/*` maps to `./src/*` (configured in `tsconfig.json`). Files in `mcp/`
   and `tests/` use `@/` for src imports. Test files importing from `mcp/`
   use relative paths (`../../mcp/tool-name`).

5. **Test counts are tracked.** Each sprint doc states the expected test count
   before and after. Example: "307 existing + 14 new = 321 total."

### Phase 3 — Implementation

**Input:** A sprint doc.
**Output:** Working code, passing tests, documented verification.

The implementing agent follows the sprint doc task by task:

1. **Read the sprint doc completely** before writing any code.
2. **Read all Available Assets** listed in the doc — confirm they match.
3. **Work through tasks sequentially.** Mark each as in-progress, then
   completed.
4. **After each task**, run the Verify step from the doc.
5. **After all tasks**, run the full verification:

   ```bash
   npx tsc --noEmit          # type-check (ignore pre-existing test errors)
   npx vitest run             # full test suite — ALL must pass
   npm run build              # production build — must be clean
   ```

6. **Record the result in docs.** Update the sprint checklist, QA Deviations,
   and any feature-owned artifacts needed to preserve the real state.

**Implementation rules:**

- Follow existing patterns in the codebase. If there's a calculator MCP tool
  pattern, the embedding MCP tool follows the same structure.
- Do not add features, refactor adjacent code, or "improve" things not in the
  sprint doc. Scope discipline is critical.
- Do not add dependencies unless the sprint doc explicitly calls for them.
- All new code must type-check. All new tests must pass. The full suite must
  remain green. The build must be clean.
- For UI work, do not stop at structural assertions if the live runtime still
   disagrees with the spec.

### Phase 4 — QA

**Input:** Completed implementation.
**Output:** QA report — either "PASS (0 issues)" or a list of fixes applied.

QA is a **separate pass** performed after implementation, ideally by a fresh
agent context. The QA agent:

1. **Reads the spec** (`spec.md`) — understands the requirements.
2. **Reads the sprint doc** — understands the implementation plan.
3. **Reads every file created or modified** in the implementation.
4. **Audits each item against the spec and sprint doc:**

   | Check | What to verify |
   | --- | --- |
   | **Signatures** | Every function, method, and constructor matches the actual interface/type definitions in the codebase |
   | **Import paths** | Correct alias (`@/`) or relative paths per convention |
   | **Type safety** | No `any` types, no unsafe casts, `satisfies` used where appropriate |
   | **Tool coverage** | Every spec requirement (e.g., VSEARCH-30) has a corresponding implementation |
   | **Test coverage** | Every test scenario listed in the sprint doc has a corresponding test case |
   | **Wiring** | Dependency injection is correct — same singletons shared where the spec requires |
   | **Security** | Input validation, path traversal prevention, RBAC roles — whatever the spec mandates |

5. **Runs the full verification suite:**

   ```bash
   npx vitest run tests/path/to/new-tests   # targeted sprint tests
   npx vitest run                            # full suite
   npm run build                             # production build
   ```

6. **Produces a QA report** with a pass/fail verdict, a table of checks, and
   any issues found with fixes applied.

7. **If issues are found:** fix them, run verification again, and update the
   sprint doc or feature artifacts so the documented state matches reality.

---

## 4. Sprint Doc QA (Pre-Implementation Review)

Before implementing a sprint doc, it should be QA'd against the spec and
codebase. This catches errors in the blueprint before they become errors in
code.

**Process:**

1. Read the sprint doc completely.
2. Read every spec section it references.
3. For every API signature, type, or import path mentioned in the doc:
   - Open the actual source file.
   - Verify the signature matches exactly.
4. For every "Available Asset" listed:
   - Confirm the file exists.
   - Confirm the exports/methods listed are real.
5. Check that the sprint doc's code snippets are consistent with each other
   (e.g., a type defined in one snippet is used correctly in another).
6. If issues are found, fix the sprint doc and note the fixes.

---

## 5. Checkpoint Conventions

| Type | When |
| --- | --- |
| `feat: implement Sprint N — {summary}` | Sprint implementation complete |
| `fix: Sprint N QA — {description}` | QA fixes after implementation |
| `docs: Sprint N doc QA — {description}` | Fixing the sprint doc itself |
| `chore: {description}` | Reorganization, cleanup, non-functional changes |

Commit messages should include:

- Which files were created/modified
- How many tests were added
- The verification result (e.g., "307 tests / 59 files all passing, build clean")

Use these as human git checkpoints when the course workflow or repository
owner wants commits. They are not a substitute for spec updates, sprint-doc QA,
or deterministic verification.

---

## 6. LLM Risk Controls

These controls are mandatory if you want the process to survive real agentic
work.

| Failure Mode | What It Looks Like | Control |
| --- | --- | --- |
| Hallucination | invented APIs, fake imports, imaginary files | read the code first; verify every referenced asset |
| Drift | the sprint quietly grows beyond the original problem | keep one spec per feature and one bounded sprint at a time |
| Context loss | constraints disappear during long sessions | keep artifacts ordered; update docs as soon as the state changes |
| False confidence | tests pass but the feature is still broken for users | run QA and live verification where the interaction matters |
| Documentation rot | repo docs no longer describe the real system | update spec, sprint docs, and artifacts during closeout |

---

## 7. Architecture Principles

These principles govern all specs and implementations in this project:

1. **Clean Architecture** — Domain logic (`src/core/`) has no dependencies on
   frameworks, databases, or transport layers. Adapters (`src/adapters/`) and
   infrastructure (`src/lib/`) depend inward on core interfaces.

2. **Dependency Injection** — Core types define interfaces (ports). Adapters
   implement them. Wiring happens in composition roots
   (`src/lib/chat/tool-composition-root.ts`, `mcp/embedding-server.ts`).

3. **Chain of Responsibility** — Search uses a handler chain
   (Hybrid → BM25 → Legacy → Empty) that degrades gracefully based on system
   readiness.

4. **MCP Tool Pattern** — MCP servers are thin transport wrappers.
   Tool logic lives in extracted modules (`mcp/*-tool.ts`) that are
   dependency-injected and independently testable. Servers
   (`mcp/*-server.ts`) handle protocol only.

5. **Test Strategy** — Unit tests use in-memory stores and mocks. No test
   requires a real database, network access, or model loading. Tests are
   co-located with their feature in `tests/{feature}/` or adjacent to the
   source in `src/`.

6. **Import Convention** — `@/*` maps to `./src/*`. Files inside `src/` use
   `@/` paths. Files outside `src/` (like `mcp/` and `scripts/`) also use
   `@/` paths (resolved by `tsx` at runtime). Test files importing from
   `mcp/` use relative paths.

7. **RBAC** — Four roles: `ANONYMOUS`, `AUTHENTICATED`, `STAFF`, `ADMIN`.
   Tools declare their allowed roles. `RbacGuardMiddleware` enforces access.
   Admin-only operations (like librarian tools) require `ADMIN`.

---

## 8. Quick Reference: Running the Process

### Starting a new feature

```text
1. Discuss requirements with the user
2. Write or update spec.md
3. QA spec against codebase and fix issues
4. Write sprint-0 doc
5. QA sprint-0 doc against spec + codebase and fix issues
6. Implement sprint-0
7. QA sprint-0 implementation and fix issues
8. Repeat steps 4–7 for each subsequent sprint
9. Checkpoint in git when the workflow or repo owner calls for it
```

### Picking up an existing feature

```text
1. Read the spec.md
2. Read all completed sprint docs (in order) to understand what's built
3. Read the next sprint doc to implement
4. Check the QA Deviations sections for any changes from the original plan
5. Verify the prerequisite commit exists and the test count matches
6. Proceed with implementation (Phase 3)
```

### QA-ing someone else's implementation

```text
1. Read spec.md
2. Read the sprint doc that was implemented
3. Read every new/modified file
4. Audit signatures, imports, types, coverage, wiring, security
5. Run verification suite
6. Produce QA report with PASS/FAIL + fix list
```

---

## 9. What NOT To Do

- **Don't guess API signatures.** Read the actual source file.
- **Don't skip the QA phase.** Every sprint gets QA'd after implementation.
- **Don't add scope.** If it's not in the sprint doc, it doesn't get built.
- **Don't refactor adjacent code.** A sprint touches only what the doc says.
- **Don't skip verification steps.** Every task has a verify command. Run it.
- **Don't claim success from tests alone** when the live runtime still disagrees.
- **Don't checkpoint broken work.** The full suite and required QA must be green.
- **Don't hardcode** where convention-based discovery is possible.
- **Don't leave the state only in chat history.** The sprint doc, artifacts, and QA notes are the record.
