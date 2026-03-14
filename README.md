# Ordo — AI Chat Console with MCP Tool Orchestration

<div align="center">

**A production-grade AI chat system built on Next.js, Anthropic Claude, and the Model Context Protocol — with hybrid search, RBAC, and a 10-book knowledge corpus.**

[Getting Started](#getting-started) · [Architecture](#architecture) · [Features](#features) · [The Corpus](#the-corpus) · [Development](#development)

</div>

---

## What Is Ordo

Ordo is an AI-powered product development advisor delivered as a chat-first web application. It connects Anthropic Claude to a **104-chapter knowledge corpus** via a **registry-based tool system** and a **hybrid BM25 + vector search engine**, giving the LLM grounded, citation-backed answers instead of hallucinated ones.

The chat interface is the entire application — there are no separate pages to navigate. The AI uses tools to search the library, render diagrams, generate audio, switch themes, and navigate the user to content. Users register, log in, and interact through a single streaming conversation with full RBAC controlling which tools and content each role can access.

### Key Capabilities

- **Streaming AI Chat** — SSE-based conversation with Claude, multi-round tool use (up to 4 rounds per message), rich content rendering (Markdown, Mermaid diagrams, code blocks)
- **Hybrid Search Engine** — BM25 keyword scoring + all-MiniLM-L6-v2 vector embeddings fused via Reciprocal Rank Fusion, with query processing pipeline (stopwords, synonyms, lowercasing)
- **15 Registry-Based Tools** — Calculator, book search, chapter retrieval, chart generation, TTS audio, UI theme control, navigation, web search — all with RBAC guards and middleware chains
- **Role-Based Access Control** — Three roles (ANONYMOUS, AUTHENTICATED, ADMIN) with role-aware tool visibility, content gating, and system prompt directives
- **10-Book Knowledge Corpus** — 104 chapters across software engineering, design, UX, product management, accessibility, entrepreneurship, marketing, content strategy, and data analytics
- **MCP Servers** — Calculator and embedding servers using the Model Context Protocol SDK
- **Conversation Persistence** — Per-user server-side conversation storage with SQLite
- **Text-to-Speech** — OpenAI TTS-1 integration for audio generation from chat
- **Admin Web Search** — Live web search via OpenAI GPT-5 with rich citation cards (admin-only)
- **Theming** — Five switchable design themes (Bauhaus, Swiss, Postmodern, Skeuomorphic, Fluid) controllable via chat commands

---

## Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| Framework | Next.js 16 (App Router, Turbopack) | Fullstack React framework |
| Language | TypeScript 5 (strict mode) | Type safety |
| LLM | Anthropic Claude (`@anthropic-ai/sdk`) | Chat + agentic tool use |
| LLM (search) | OpenAI GPT-5 (`openai`) | Web search + TTS |
| Embeddings | `@huggingface/transformers` | Local all-MiniLM-L6-v2 (384 dims) |
| MCP | `@modelcontextprotocol/sdk` | Tool server protocol |
| Database | `better-sqlite3` | Users, sessions, conversations, embeddings, BM25 indexes |
| Auth | `bcryptjs` | Password hashing |
| Styling | Tailwind CSS 4 | Utility-first CSS |
| Testing | Vitest 4 + Testing Library | 376+ tests across 65 files |
| Quality | ESLint 9 + Lighthouse CI | Zero-warning lint + performance auditing |

---

## Getting Started

```bash
# 1. Clone
git clone git@github.com:kaw393939/ai_mcp_chat_ordo.git
cd ai_mcp_chat_ordo

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Edit .env — at minimum set ANTHROPIC_API_KEY
export ANTHROPIC_API_KEY="your-key"

# 4. Run
npm run dev

# 5. Verify
npm run quality          # typecheck + lint:strict + test

# 6. Production (optional)
docker compose up --build
```

### Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `ANTHROPIC_API_KEY` | **Yes** | — | Claude API access |
| `ANTHROPIC_MODEL` | No | `claude-haiku-4-5` | Model selection |
| `OPENAI_API_KEY` | No | — | TTS + web search (features disabled without it) |
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `3000` | Server port |

---

## Architecture

Ordo follows **Clean Architecture** with strict dependency inversion. The domain core has zero framework dependencies.

```
src/
├── core/                        ← Domain layer (framework-free)
│   ├── entities/                ← 15 entity types (User, Conversation, Message, Theme, etc.)
│   ├── use-cases/               ← ~20 interactors (Auth, Chat, Book, Conversation, Tool)
│   │   └── tools/               ← 15 tool descriptors with RBAC metadata
│   ├── tool-registry/           ← Registry + middleware chain (RBAC guard, logging)
│   ├── search/                  ← Hybrid search engine (BM25 + Vector + RRF)
│   │   ├── ports/               ← Embedder, VectorStore, BM25IndexStore, Chunker, etc.
│   │   └── query-steps/         ← Query processing pipeline
│   ├── commands/                ← Command pattern (navigation, theme)
│   └── common/                  ← UseCase interface, LoggingDecorator
├── adapters/                    ← Interface adapters (Ports & Adapters)
│   ├── *DataMapper.ts           ← SQLite data mappers (User, Session, Conversation, Message)
│   ├── *Repository.ts           ← FileSystem + Cached book repositories
│   ├── *Store.ts                ← SQLite vector/BM25 stores
│   └── LocalEmbedder.ts         ← HuggingFace transformer embedder
├── frameworks/ui/               ← React chat components
├── components/                  ← 18 shared UI components
├── hooks/                       ← 6 React hooks (chat, auth, commands, etc.)
├── lib/                         ← Infrastructure (DB, auth, streaming, observability)
└── app/                         ← Next.js App Router (pages + 13 API routes)
```

### API Surface

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat/stream` | POST | SSE streaming chat with tool use |
| `/api/conversations` | GET/POST | List / create conversations |
| `/api/conversations/[id]` | GET/DELETE | Get / delete conversation |
| `/api/auth/login` | POST | Login |
| `/api/auth/register` | POST | Register |
| `/api/auth/logout` | POST | Logout |
| `/api/auth/me` | GET | Current user |
| `/api/tts` | POST | Text-to-speech generation |
| `/api/web-search` | POST | Admin web search |
| `/api/health/live` | GET | Liveness probe |
| `/api/health/ready` | GET | Readiness probe |

---

## Features

### Tool System

15 tools registered with RBAC guards. The AI selects tools autonomously based on conversation context.

| Tool | Access | Description |
|------|--------|-------------|
| `calculator` | All | Math calculations |
| `search_books` | All | Hybrid BM25 + vector corpus search |
| `get_chapter` | All | Full chapter content retrieval |
| `get_checklist` | All | Chapter checklists |
| `list_practitioners` | All | Key people from chapters |
| `get_book_summary` | All | Book overviews |
| `set_theme` | All | Switch UI design theme |
| `adjust_ui` | All | UI adjustments |
| `navigate` | All | Client-side navigation |
| `generate_chart` | All | Mermaid diagram generation |
| `generate_audio` | Authenticated+ | TTS audio generation |
| `admin_web_search` | Admin | Live web search with citations |

### Search Engine

The hybrid search engine combines two ranking strategies:

1. **BM25** — keyword-level scoring with tf-idf weighting, built at `npm run build:search-index`
2. **Vector** — semantic similarity via `all-MiniLM-L6-v2` embeddings (384 dimensions, local inference)
3. **Fusion** — Reciprocal Rank Fusion merges both ranked lists into a single result set

Query processing pipeline: lowercasing → stopword removal → synonym expansion.

### Auth & RBAC

- Cookie-based sessions with `bcryptjs` password hashing
- Three roles: **ANONYMOUS** (demo mode, limited tools), **AUTHENTICATED** (full access), **ADMIN** (web search, corpus management)
- Role-aware system prompt directives — the AI adjusts its behavior and tool recommendations per role
- Edge middleware for route protection

---

## The Corpus

Ten books, 104 chapters covering the full product development lifecycle. Each chapter follows: **Practitioner Story → Principle → Engineering Connection → Checklist.**

| Book | Topic | Chapters |
|------|-------|:--------:|
| I | Software Engineering | 14 |
| II | Design History | 10 |
| III | UI Design | 10 |
| IV | UX Design | 10 |
| V | Product Management | 10 |
| VI | Accessibility | 10 |
| VII | Entrepreneurship | 10 |
| VIII | Marketing & Branding | 10 |
| IX | Content Strategy | 10 |
| X | Data & Analytics | 10 |

Book I includes **14 prompt companion documents** (71 prompt pairs) with good/bad examples and "Behind the Curtain" model commentary.

Books are auto-discovered via `book.json` manifests in `docs/_corpus/`. The search index is built at build time via `npm run build:search-index`.

---

## Development

### Quality Gates

Enforced on every commit via `npm run quality`:

| Gate | Command | Target |
|------|---------|--------|
| TypeScript strict | `npm run typecheck` | 0 errors |
| ESLint zero-warnings | `npm run lint:strict` | 0 warnings |
| Test suite | `npm test` | 376+ passing |
| Lighthouse | `npm run lhci:dev` | 98+ perf, 100 a11y/bp/seo |

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build (includes search index) |
| `npm run quality` | Typecheck + lint + test |
| `npm run build:search-index` | Rebuild BM25 + vector indexes |
| `npm run admin:health` | Health endpoint sweep |
| `npm run admin:diagnostics` | Full system diagnostic |
| `npm run scan:secrets` | Secret detection scan |
| `npm run check:stateless` | 12-factor stateless verification |
| `npm run release:prepare` | Build + generate release manifest |

### Testing

376+ tests across 65 files using Vitest 4 + Testing Library:

- **Unit tests** — Entities, interactors, tools, search engine, query processing, data mappers
- **Integration tests** — API routes, streaming, auth flows, conversation CRUD
- **Policy tests** — RBAC enforcement, system prompt directives, tool visibility

### Docker

Multi-stage Dockerfile (`deps` → `builder` → `runner`) on `node:22-alpine`. Kubernetes-ready with liveness/readiness probes.

```bash
docker compose up --build
```

### Feature Specs

Development follows a four-phase process: **Spec → Sprint Doc → Implementation → QA**. All specs live in [`docs/_specs/`](docs/_specs/).

| Feature | Status | Sprints |
|---------|--------|---------|
| RBAC | Complete | 6 |
| Tool Architecture | Complete | 5 |
| Vector Search | Complete | 6 |
| Web Search | Complete | 1 |
| Librarian (corpus management) | Complete | 3 |
| Conversation Memory | Draft | 3 |

### Sprint Archive

24 sprint artifacts documenting the project's evolution in [`sprints/completed/`](sprints/completed/).

---

## License

See repository for license details.
