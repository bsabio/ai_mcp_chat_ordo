# Specifications & Process Guide

> This document explains the end-to-end process for specifying, planning,
> implementing, and QA-ing features in this project. It is written so that
> **any LLM agent** — not just the one that created these docs — can read it,
> understand the workflow, and execute it faithfully.

---

## 1. Directory Layout

```
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
|---------|--------|---------|-------------|
| [RBAC](rbac/) | **Complete** | 6 (0–5) | Multi-user auth, RBAC, chat persistence, role-aware LLM |
| [Tool Architecture](tool-architecture/) | **Complete** | 5 (0–4) | Registry-based tool system with SOLID/GoF alignment |
| [Vector Search](vector-search/) | **Complete** | 6 (0–5) | BM25+vector hybrid search, embedding pipeline, MCP server |
| [Librarian](librarian/) | **Draft** | 2 (0–1) | `_corpus/` auto-discovery, MCP librarian tools, zip import |
| [Web Search](web-search/) | **Complete** | 1 (0) | Admin web search via OpenAI GPT-5, rich UI, citations |
| [Conversation Memory](conversation-memory/) | **Draft** | 3 (0–2) | Anonymous persistence, auto-resume, rolling summaries, conversation search |

### Roadmap

Future tool specs not yet scheduled for implementation:

| # | Spec | Priority |
|---|------|----------|
| 02 | [Knowledge Graph](tool-roadmap/02-knowledge-graph.md) | High |
| 03 | [Smart Content Delivery](tool-roadmap/03-smart-content-delivery.md) | High |
| 04 | [Advanced Calculator](tool-roadmap/04-advanced-calculator.md) | Medium |
| 05 | [Intelligent UI Tools](tool-roadmap/05-intelligent-ui-tools.md) | Medium |
| 06 | [Media Generation](tool-roadmap/06-media-generation.md) | Medium |
| 07 | [Cross-Cutting Platform](tool-roadmap/07-cross-cutting-platform.md) | Medium |

### Archive

Historical planning documents: [archive/](archive/)

---

## 3. The Process (Lifecycle of a Feature)

Every feature flows through four phases. Each phase produces a specific
artifact. **Do not skip phases or combine them.**

### Phase 1 — Spec (`spec.md`)

**Input:** A problem statement or user request.
**Output:** `{feature}/spec.md`

The spec defines **what** the system should do and **why**. It does not
prescribe implementation details like variable names or exact file contents —
that belongs in sprint docs.

A spec must include:

| Section | Purpose |
|---------|---------|
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
|---------|---------|
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
**Output:** Working code, passing tests, clean build.

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
6. **Stage, commit, and push.** Use a descriptive commit message with the
   sprint number and a summary of what was built.

**Implementation rules:**

- Follow existing patterns in the codebase. If there's a calculator MCP tool
  pattern, the embedding MCP tool follows the same structure.
- Do not add features, refactor adjacent code, or "improve" things not in the
  sprint doc. Scope discipline is critical.
- Do not add dependencies unless the sprint doc explicitly calls for them.
- All new code must type-check. All new tests must pass. The full suite must
  remain green. The build must be clean.

### Phase 4 — QA

**Input:** Completed implementation (committed code).
**Output:** QA report — either "PASS (0 issues)" or a list of fixes applied.

QA is a **separate pass** performed after implementation, ideally by a fresh
agent context. The QA agent:

1. **Reads the spec** (`spec.md`) — understands the requirements.
2. **Reads the sprint doc** — understands the implementation plan.
3. **Reads every file created or modified** in the implementation.
4. **Audits each item against the spec and sprint doc:**

   | Check | What to verify |
   |-------|----------------|
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

7. **If issues are found:** fix them, run verification again, commit with a
   message like `fix: Sprint N QA — {description of fixes}`.

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
6. If issues are found, fix the sprint doc, commit, and note the fixes.

---

## 5. Commit Conventions

| Type | When |
|------|------|
| `feat: implement Sprint N — {summary}` | Sprint implementation complete |
| `fix: Sprint N QA — {description}` | QA fixes after implementation |
| `docs: Sprint N doc QA — {description}` | Fixing the sprint doc itself |
| `chore: {description}` | Reorganization, cleanup, non-functional changes |

Commit messages should include:
- Which files were created/modified
- How many tests were added
- The verification result (e.g., "307 tests / 59 files all passing, build clean")

---

## 6. Architecture Principles

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

## 7. Quick Reference: Running the Process

### Starting a new feature

```
1. Discuss requirements with the user
2. Write spec.md → commit
3. QA spec against codebase → fix issues → commit
4. Write sprint-0 doc → commit
5. QA sprint-0 doc against spec + codebase → fix issues → commit
6. Implement sprint-0 → commit
7. QA sprint-0 implementation → fix issues → commit
8. Repeat steps 4–7 for each subsequent sprint
```

### Picking up an existing feature

```
1. Read the spec.md
2. Read all completed sprint docs (in order) to understand what's built
3. Read the next sprint doc to implement
4. Check the QA Deviations sections for any changes from the original plan
5. Verify the prerequisite commit exists and the test count matches
6. Proceed with implementation (Phase 3)
```

### QA-ing someone else's implementation

```
1. Read spec.md
2. Read the sprint doc that was implemented
3. Read every new/modified file
4. Audit signatures, imports, types, coverage, wiring, security
5. Run verification suite
6. Produce QA report with PASS/FAIL + fix list
```

---

## 8. What NOT To Do

- **Don't guess API signatures.** Read the actual source file.
- **Don't skip the QA phase.** Every sprint gets QA'd after implementation.
- **Don't add scope.** If it's not in the sprint doc, it doesn't get built.
- **Don't refactor adjacent code.** A sprint touches only what the doc says.
- **Don't skip verification steps.** Every task has a verify command. Run it.
- **Don't commit with failing tests.** The full suite must be green.
- **Don't hardcode** where convention-based discovery is possible.
- **Don't create new markdown docs** summarizing work unless the user asks.
  The sprint doc + commit message + QA report are the record.
