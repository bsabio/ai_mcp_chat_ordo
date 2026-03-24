# Ordo

Ordo is a production-style Next.js application used to teach AI product engineering with MCP, tool orchestration, specs, sprint delivery, and QA. The codebase is not just a chat app. It is a working example of how to use LLMs aggressively without letting them run the project by vibes.

## What Students Should Learn Here

- How an LLM-backed app stays grounded through tools, retrieval, RBAC, and deterministic checks.
- How MCP servers and application tools fit together in a real Next.js system.
- How to break large work into specs, implementation sprints, QA passes, and runtime verification.
- canonical corpus tools such as `search_corpus`, `get_section`, and `get_corpus_summary`
- How to control common LLM failure modes such as hallucination, drift, false confidence, and context loss.
- How to use automated tests and operational scripts to keep agentic work honest.

## What This Repository Contains

At runtime, Ordo is a chat-first application with tool use, retrieval, streaming responses, role-aware behavior, and MCP-based integrations.

At process level, Ordo is also a teaching repository for:

- Model Context Protocol patterns
- agentic orchestration
- hybrid retrieval and grounding
- role-based tool access
- spec-driven delivery
- sprint-based implementation
- QA against both documents and live behavior

## System Overview

### Application stack

- Next.js 16 App Router
- React 19
- TypeScript strict mode
- Tailwind CSS 4
- Vitest + Testing Library
- SQLite via `better-sqlite3`

### AI and tool stack

- Anthropic for core chat generation
- OpenAI for selected capabilities such as web search and TTS
- local embeddings via Hugging Face Transformers
- MCP servers under `mcp/`
- registry-based application tools with RBAC and middleware

### Architectural intent

- `src/core/` holds domain logic and policies.
- `src/adapters/` and `src/lib/` connect infrastructure to the core.
- `src/app/` exposes the Next.js routes and API surface.
- `mcp/` holds MCP server entrypoints and extracted tool logic.
- `docs/` holds specs, sprint plans, refactor workstreams, operations docs, and corpus content.

## How We Build Here

This repository uses a deliberate delivery loop so agentic work stays reviewable.

1. Write or update a spec that defines the contract.
2. Break the work into sprint docs with verified code references.
3. Implement one sprint at a time.
4. QA the implementation against both the spec and the sprint doc.
5. Run deterministic checks.
6. For UI work, verify the live runtime instead of trusting structural tests alone.
7. Update the docs so the next agent or student inherits the real state, not a guessed one.

The detailed version of that workflow is here:

- [docs/operations/agentic-delivery-playbook.md](docs/operations/agentic-delivery-playbook.md)
- [docs/operations/architecture-diagrams.md](docs/operations/architecture-diagrams.md)
- [docs/_specs/README.md](docs/_specs/README.md)
- [docs/README.md](docs/README.md)

## LLM Failure Modes We Explicitly Design Around

This repo is intended to teach practical AI engineering, so the process is built around predictable failure modes.

### Hallucination

The model invents APIs, behaviors, or files that do not exist.

Countermeasure:

- read the code first
- reference real files and signatures
- prefer deterministic tools over freeform explanation

### Drift

The implementation slowly expands or changes the problem statement.

Countermeasure:

- keep one spec per feature
- lock work into sprint-sized increments
- record deviations instead of silently changing scope

### Context loss

The model forgets key constraints as the task gets longer.

Countermeasure:

- keep artifacts small and ordered
- use sprint docs as local working contracts
- update docs after each meaningful change

### False confidence from passing tests

The code passes unit tests while the user-visible behavior is still wrong.

Countermeasure:

- require targeted QA
- run live browser verification for UI work
- treat runtime evidence as first-class, not optional polish

### Secret leakage

LLM-assisted workflows increase the chance that environment files or logs get copied around carelessly.

Countermeasure:

- keep secrets out of docs and commits
- use `npm run scan:secrets`
- rotate exposed credentials immediately

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run validate:env
npm run dev
```

Open `http://localhost:3000` after the dev server starts.

Minimum useful environment:

- `ANTHROPIC_API_KEY` for core chat
- `ANTHROPIC_REQUEST_TIMEOUT_MS`, `ANTHROPIC_RETRY_ATTEMPTS`, and `ANTHROPIC_RETRY_DELAY_MS` to control provider timeout and retry behavior
- `OPENAI_API_KEY` only if you want web search or text-to-speech features

Recommended production defaults:

- `ANTHROPIC_REQUEST_TIMEOUT_MS=10000`
- `ANTHROPIC_RETRY_ATTEMPTS=2`
- `ANTHROPIC_RETRY_DELAY_MS=150`

## Commands That Matter

### Development

```bash
npm run dev
npm run build
npm run start
```

### Quality

```bash
npm run typecheck
npm run lint:strict
npm run test
npm run quality
npm run browser:verify
npm run browser:smoke
```

### Operations and safety

```bash
npm run validate:env
npm run admin:validate-env
npm run admin:health
npm run admin:diagnostics
npm run parity:env
npm run scan:secrets
npm run check:stateless
```

### MCP and indexing

```bash
npm run mcp:calculator
npm run mcp:embeddings
npm run build:search-index
```

## Documentation Map

- [docs/README.md](docs/README.md): top-level docs map
- [docs/operations/agentic-delivery-playbook.md](docs/operations/agentic-delivery-playbook.md): the main teaching guide for workflow, QA, and LLM guardrails
- [docs/operations/architecture-diagrams.md](docs/operations/architecture-diagrams.md): visual maps for delivery flow, runtime architecture, and tool orchestration
- [docs/_specs/README.md](docs/_specs/README.md): formal spec and sprint process
- [docs/_refactor/README.md](docs/_refactor/README.md): targeted remediation programs
- [docs/operations/process-model.md](docs/operations/process-model.md): runtime process and concurrency model
- [docs/operations/admin-runbook.md](docs/operations/admin-runbook.md): operational commands
- [docs/operations/environment-matrix.md](docs/operations/environment-matrix.md): environment parity rules

## Good First Reading Path

If you are using this repository as a course or self-study resource, read in this order:

1. [README.md](README.md)
2. [docs/operations/agentic-delivery-playbook.md](docs/operations/agentic-delivery-playbook.md)
3. [docs/operations/architecture-diagrams.md](docs/operations/architecture-diagrams.md)
4. [docs/_specs/README.md](docs/_specs/README.md)
5. One complete feature spec such as [docs/_specs/homepage-chat-shell/spec.md](docs/_specs/homepage-chat-shell/spec.md)
6. The corresponding sprint docs under [docs/_specs/homepage-chat-shell/sprints/](docs/_specs/homepage-chat-shell/sprints/)

That sequence shows the repository from strategy down to concrete implementation work.

## Repo Conventions

- Prefer small, reviewable diffs over broad refactors.
- Treat specs and sprint docs as contracts, not decoration.
- Validate with deterministic commands before claiming success.
- For frontend bugs, do not stop at snapshots or static assertions if the live runtime still disagrees.
- Keep the docs tree organized so new contributors can find the current source of truth quickly.

## Notes For Instructors And Students

This repository is intentionally opinionated. The goal is not to demonstrate maximum autonomous freedom. The goal is to demonstrate how to make autonomous systems useful inside strong engineering boundaries.

If you want to teach or learn agentic software delivery, the important lesson here is simple: use the model for speed, but keep contracts, tests, runtime checks, and process ownership in human hands.
