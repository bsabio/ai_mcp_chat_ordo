# Studio Ordo

Studio Ordo is a production-style Next.js system for AI-assisted workflow guidance, corpus-grounded chat, role-aware tool orchestration, and MCP-backed operations. It is both a working product and a teaching repository for how to build agentic software without giving up contracts, RBAC, tests, or runtime discipline.

The repository centers on four ideas:

- chat is the primary interface
- tools are explicit, typed, and role-scoped
- MCP is part of the system boundary, not the whole system
- specs, sprints, QA, and runtime checks are first-class artifacts

## What The System Does

Studio Ordo combines a user-facing chat application with a structured backend for retrieval, prompt management, analytics, and admin workflows.

### Core product capabilities

- Embedded homepage chat with streaming AI responses
- Corpus-grounded answers over a structured library of documents and sections
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
- MCP servers for embeddings, corpus management, prompt versioning, analytics, and calculator operations
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

- `calculator`
- `search_corpus`
- `get_corpus_summary`
- `get_section`
- `get_checklist`
- `list_practitioners`
- `set_theme`
- `adjust_ui`
- `navigate`
- `generate_chart`
- `generate_audio`
- `search_my_conversations`
- `set_preference`
- `admin_web_search`
- `admin_prioritize_leads`
- `admin_prioritize_offer`
- `admin_triage_routing_risk`
- `draft_content`
- `publish_content`

These are composed in `src/lib/chat/tool-composition-root.ts` and enforced by RBAC middleware.

### 2. MCP tools

The repository also ships MCP servers for calculator operations and a larger embeddings/corpus/prompts/analytics stack.

- `npm run mcp:calculator`
- `npm run mcp:embeddings`

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

- `OPENAI_API_KEY` for admin web search and related OpenAI-backed operations

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
npm run release:prepare
npm run release:verify
npm run release:evidence
```

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

The point of this repository is not to show maximum autonomous freedom. The point is to show how AI can move quickly inside strong engineering boundaries.
