# Studio Ordo: A Governed AI Operator Environment

Studio Ordo is a solo-built, open-source framework for governed AI operator environments. It is a working Next.js and TypeScript product, but it is also a proof story: agentic software can move fast without surrendering RBAC, runtime truth, retrieval discipline, or release evidence.

The point of this repository is not unrestricted agent autonomy. The point is that the model operates inside explicit contracts that are visible in code, tests, runtime inventories, and release artifacts.

## Proof Story

- Solo agentic build: the repository shows how one builder can ship a serious AI system without hiding the engineering substrate.
- Governed runtime: tool access, current-page truth, routing state, corpus grounding, and UI side effects all come from explicit server-owned or registry-owned sources.
- Real QA loop: focused regression suites, live runner fixtures, release evidence, and structured issue intake all exist to catch integrity drift before it ships.
- Open contribution surface: the repo exposes the actual contracts for prompts, tools, retrieval, output rendering, and release gates instead of burying them in proprietary glue.

The repository centers on four ideas:

- Chat is the primary interface, but not the only interface.
- Tools are explicit, typed, and strictly role-scoped.
- MCP is part of the system boundary, not the whole system.
- Specs, QA bundles, generated inventories, and release checks are first-class artifacts.

## The Enterprise Value Proposition (Why This Exists)

Building an AI Agent that can hit an API is easy. Building a scalable system where agents run 10-minute jobs, securely gate vector search results based on the human user's clearance level, and dynamically adjust UI accessibility—all while preventing streaming layout drift—is incredibly difficult. Ordo solves these "Day 2" integration problems out of the box.

### 1. Enterprise-Grade RBAC by Default

Your typical AI agent has zero concept of a human user. In Ordo, tool execution and database retrieval are fundamentally coupled to the requesting user's identity. If a junior employee and an admin ask the exact same question, the system dynamically trims the execution paths and vector context chunks strictly to what each role is cleared to access.

### 2. Batteries-Included Hybrid RAG (with RRF)

Instead of relying on expensive managed vector databases to get started, Ordo ships with a self-sufficient, local-first RAG engine. It utilizes an internal `SQLiteVectorStore` (for semantic similarity) and an `SQLiteBM25IndexStore` (for exact keyword/jargon matching). These pipelines are merged using Reciprocal Rank Fusion (RRF), delivering state-of-the-art retrieval completely within `better-sqlite3`.

### 3. Distributed AI Job Orchestration

Serverless environments have 30-to-60-second timeouts. Ordo transcends this by shipping a transactional, lease-locking Deferred Job Worker natively. When an agent kicks off a massive analysis task, it drops it into the SQLite queue. Background workers pick it up, process it safely, and emit real-time progress events back through a Projector to the Next.js user interface, solving the hardest UX challenge in asynchronous AI.

### 4. AI-Controlled UI Physics & Accessibility

Through tools like `adjust_ui`, the LLM is given physical control over the application's React context. If a user says "I am colorblind" or "this is hard to read", the agent safely maps the request to strict presets (e.g., `elderly`, `color-blind-protanopia`), immediately overriding CSS tokens and persisting the dual-write preference to the datastore.

### 5. Pure Hexagonal Architecture (Portability)

The core business logic (`src/core`) contains over 70 pure-TypeScript interactors. The AI domain (Interactors, ToolRegistry, Hybrid Search) is entirely decoupled from the Next.js delivery layer, allowing it to be ported effortlessly to different runtime environments (Node workers, AWS Lambdas, etc.).

---

## What The System Does

Studio Ordo combines a user-facing chat application with a structured backend for retrieval, prompt management, analytics, and admin workflows.

### Core product capabilities

- Embedded homepage chat with streaming AI responses
- Corpus-grounded answers over a structured library of 10 books and 87 chapters
- Role-aware tool access for anonymous, authenticated, apprentice, staff, and admin users
- Conversation history and conversation search for signed-in roles
- User preference persistence for tone, response style, business context, and preferred name
- Blog publishing pipeline with draft and publish tooling
- Consultation request and downstream deal workflow support
- Training-path APIs and role-restricted review/edit flows
- Referral capture from landing routes via `?ref=`
- Web search and admin operator workflows for internal users

### Engineering and teaching capabilities

- Registry-based tool orchestration with RBAC middleware
- Prompt composition with base identity, role directives, user preferences, routing context, summaries, and a dynamic tool manifest
- Standalone MCP servers for calculator and embeddings workflows, plus app-local `@mcp/*` modules
- Deterministic QA via Vitest, Playwright, env validation, release verification, and secret scanning
- Spec-driven delivery under `docs/_specs/`

## Architecture At A Glance

### Application stack

- Next.js 16 App Router
- React 19
- TypeScript strict mode
- Tailwind CSS 4
- Vitest plus Testing Library
- SQLite via `better-sqlite3`

### AI and retrieval stack

- Anthropic for core chat generation
- OpenAI for selected capabilities such as admin web search
- Local embeddings via Hugging Face Transformers
- Hybrid search using vector similarity, BM25, and reciprocal rank fusion
- MCP servers under `mcp/`

### Codebase layout

- `src/app/`: Next.js routes, pages, and API endpoints
- `src/core/`: domain entities, use cases, RBAC, and tool contracts
- `src/adapters/`: storage, repositories, embedding adapters, and persistence mappers
- `src/lib/`: composition roots, search pipelines, auth, config, and runtime helpers
- `mcp/`: MCP server entrypoints and tool implementations
- `docs/`: specs, refactors, operations guidance, corpus material, and references

For the deeper architectural walkthrough, see [docs/operations/system-architecture.md](docs/operations/system-architecture.md).

## Role System

The system is explicitly role-aware. Tool availability, prompt wording, and some route/API behavior change by role.

| Role | Purpose | Example access |
| --- | --- | --- |
| `ANONYMOUS` | Demo and first-contact mode | chat, calculator, corpus search, theme/navigation UI tools |
| `AUTHENTICATED` | Signed-in customer/practitioner | full member tool set, saved preferences, conversation history search |
| `APPRENTICE` | Student/apprenticeship-oriented mode | member tools plus role-specific learning/referral framing |
| `STAFF` | Internal staff usage | member tools with staff-oriented directive framing |
| `ADMIN` | System/operator mode | all member tools plus admin search, triage, offer prioritization, prompt and content management |

The current role directives live in `src/core/entities/role-directives.ts`. The runtime tool manifest is built dynamically from the registry, so prompt-visible tool access stays aligned with RBAC.

## Main User-Facing Routes

- `/`: homepage chat shell
- `/library`: corpus/library index
- `/library/[document]`: document detail pages
- `/library/[document]/[section]`: section-level reading routes
- `/blog`: published blog index
- `/blog/[slug]`: published article pages
- `/login`: sign in
- `/register`: account creation
- `/profile`: profile placeholder page

### Important API groups

- `/api/chat/stream`: primary chat streaming route
- `/api/auth/*`: login, register, session switching
- `/api/preferences/*`: preference persistence
- `/api/conversations/*`: conversation workflows and history
- `/api/consultation-requests/*`: consultation conversion flow
- `/api/deals/*`: deal visibility and admin updates
- `/api/training-paths/*`: training recommendation records
- `/api/web-search/*`: web search path used by admin tooling/UI
- `/api/health/*`: health and readiness checks

## Tooling Model

Studio Ordo has two tool layers.

### 1. Application chat tools

These are the tools exposed directly to the chat model through the internal `ToolRegistry`.
The exact manifest is role-scoped and composed at runtime from `src/lib/chat/tool-composition-root.ts`, then filtered by RBAC before it reaches the model.

Treat the registry as the source of truth for exact tool availability.
This README intentionally avoids a hand-maintained exhaustive tool list because it drifts faster than the runtime.

Representative tool groups include:

- math and calculation
- corpus search, summaries, and section retrieval
- navigation and current-page inspection
- theme and UI adaptation
- graph, chart, and audio generation
- conversation, profile, referral, and admin operator workflows

### 2. MCP tools

The repository currently ships two standalone MCP server entrypoints: calculator and embeddings.

- `npm run mcp:calculator`
- `npm run mcp:embeddings`

Analytics, prompt, and related modules under `mcp/` are also reused directly inside the app through local `@mcp/*` imports. They are not separate remote MCP servers in the current runtime.

For the full MCP catalog and usage guidance, see [docs/operations/user-handbook.md](docs/operations/user-handbook.md).

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- Anthropic API key for core chat
- Optional OpenAI API key for admin web-search paths

### Local setup

```bash
npm install
cp .env.example .env.local
npm run validate:env
npm run dev
```

Open `http://localhost:3000` after the dev server starts. The default dev runtime now starts both the Next.js app and the deferred worker together.

### Minimum environment

Required for useful local chat:

- `ANTHROPIC_API_KEY`

Recommended resilience defaults:

- `ANTHROPIC_MODEL=claude-haiku-4-5`
- `ANTHROPIC_REQUEST_TIMEOUT_MS=10000`
- `ANTHROPIC_RETRY_ATTEMPTS=2`
- `ANTHROPIC_RETRY_DELAY_MS=150`

Optional for additional features:

- `OPENAI_API_KEY` for audio generation, admin web search, and related OpenAI-backed operations

Optional for browser push notifications on deferred jobs:

- `WEB_PUSH_VAPID_PUBLIC_KEY`
- `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` set to the same public key value
- `WEB_PUSH_VAPID_PRIVATE_KEY`
- `WEB_PUSH_SUBJECT` such as `mailto:ops@example.com`

See [docs/operations/environment-matrix.md](docs/operations/environment-matrix.md) for environment parity rules.

### Deferred job push setup

Deferred tools like `draft_content` and `publish_content` can notify signed-in users after a background job finishes.

Generate a VAPID keypair locally:

```bash
npm run push:vapid
```

Add the emitted values to your environment:

```bash
WEB_PUSH_VAPID_PUBLIC_KEY=...
NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY=...
WEB_PUSH_VAPID_PRIVATE_KEY=...
WEB_PUSH_SUBJECT=mailto:ops@example.com
```

Run the app normally:

```bash
npm run dev
```

Use `npm run jobs:work` only when you want a dedicated standalone worker process outside the default app runtime.

Signed-in users can then enable or disable deferred job push notifications from `/profile`. If the VAPID keys are absent, the chat app and worker both fail closed and no push registration or delivery happens.

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
npm run build:search-index:force
```

### Release and evidence

```bash
npm run runtime:inventory
npm run qa:runtime-integrity
npm run release:prepare
npm run release:verify
npm run release:evidence
```

`npm run runtime:inventory` writes generated corpus, tool-manifest, and navigation inventories to `release/runtime-inventory.json`.
`npm run qa:runtime-integrity` runs the focused truthfulness and retrieval-integrity bundle and writes `release/runtime-integrity-evidence.json`.
`npm run release:evidence` now blocks if that integrity artifact is missing or failed.

## Runtime Truth Governance

When you change prompt-visible facts, tool manifests, route semantics, or output contracts, keep the runtime and public story aligned:

1. Update the authoritative source, not a duplicate README list.
2. Run `npm run runtime:inventory` if corpus counts, role-visible tools, or navigation inventories changed.
3. Run `npm run qa:runtime-integrity` before treating the change as complete.
4. File regressions with the issue template at `.github/ISSUE_TEMPLATE/agent-runtime-integrity.yml` so manual QA maps back to a durable test or eval surface.

## Reading Path

If you are new to the repository, read these in order:

1. [README.md](README.md)
2. [docs/operations/user-handbook.md](docs/operations/user-handbook.md)
3. [docs/operations/system-architecture.md](docs/operations/system-architecture.md)
4. [docs/operations/architecture-diagrams.md](docs/operations/architecture-diagrams.md)
5. [docs/operations/agentic-delivery-playbook.md](docs/operations/agentic-delivery-playbook.md)
6. [docs/_specs/README.md](docs/_specs/README.md)

## Documentation Map

- [docs/README.md](docs/README.md): top-level docs map
- [docs/operations/user-handbook.md](docs/operations/user-handbook.md): user guide, feature overview, role model, and MCP tool catalog
- [docs/operations/system-architecture.md](docs/operations/system-architecture.md): textual architecture walkthrough for the whole system
- [docs/operations/architecture-diagrams.md](docs/operations/architecture-diagrams.md): diagrams for runtime and delivery flow
- [docs/operations/admin-runbook.md](docs/operations/admin-runbook.md): operational commands and incident usage
- [docs/operations/environment-matrix.md](docs/operations/environment-matrix.md): environment template and parity rules
- [docs/_specs/README.md](docs/_specs/README.md): feature spec and sprint process

## Working Style In This Repo

- prefer small, reviewable diffs
- use specs and sprint docs as contracts
- verify with deterministic commands before claiming completion
- use runtime/browser checks when the UI is part of the behavior
- keep docs current when the architecture, workflow, or tool surface changes

For the runtime truthfulness workstream, see [docs/_refactor/agent-runtime-truthfulness-and-retrieval-integrity/spec.md](docs/_refactor/agent-runtime-truthfulness-and-retrieval-integrity/spec.md).

The point of this repository is not to show maximum autonomous freedom. The point is to show how AI can move quickly inside strong engineering boundaries.
