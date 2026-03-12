# Tool Enhancement Specs

> **7 specifications** covering the full transformation of the tool system from
> basic stubs to a production-quality, AI-native learning platform.

---

## Spec Index

| # | Spec | Priority | Key Features | New Deps |
|---|------|----------|-------------|----------|
| 01 | [Vector Search & Embedding Infrastructure](01-vector-search-engine.md) | **Critical** | BM25+vector hybrid via RRF, markdown-aware chunking, SQLite BLOB storage, source-agnostic pipeline, MCP embedding server, on-demand indexing | `@huggingface/transformers` |
| 02 | [Knowledge Graph](02-knowledge-graph.md) | **High** | Curated practitioner registry, relationships, co-occurrence graph, BFS path finding | — |
| 03 | [Smart Content Delivery](03-smart-content-delivery.md) | **High** | Chapter pagination, heading-aware chunking, extractive summaries, checklist progress tracking | — |
| 04 | [Advanced Calculator](04-advanced-calculator.md) | **Medium** | Expression evaluator, unit conversion, statistics, WCAG contrast ratio | `mathjs` |
| 05 | [Intelligent UI Tools](05-intelligent-ui-tools.md) | **Medium** | Theme intelligence, accessibility persistence, semantic route navigation | — |
| 06 | [Media Generation](06-media-generation.md) | **Medium** | Mermaid validation + templates, server-side TTS, chapter narration | `mermaid`, `edge-tts` |
| 07 | [Cross-Cutting Platform](07-cross-cutting-platform.md) | **Medium** | Conversation awareness, tool chaining hints, analytics, rate limiting | — |

---

## Implementation Order

### Phase 1 — Foundation (Specs 01, 03)

Vector search and content delivery are the core experience. Every user
interaction starts with search or reading — these must be excellent first.

```text
01 Vector Search Engine    ← highest-impact single change
03 Smart Content Delivery  ← chapters+checklists become interactive
```

### Phase 2 — Enrichment (Specs 02, 07)

Knowledge graph gives depth to practitioner data. Cross-cutting platform
improves every tool through shared infrastructure.

```text
02 Knowledge Graph         ← practitioner intelligence
07 Cross-Cutting Platform  ← analytics, rate limiting, error recovery
```

### Phase 3 — Enhancement (Specs 04, 05, 06)

Calculator, UI, and media tools become genuinely useful instead of
demonstrative.

```text
04 Advanced Calculator     ← expression evaluation, units, stats
05 Intelligent UI Tools    ← theme registry, nav validation, persistence
06 Media Generation        ← chart validation, real TTS audio
```

---

## Requirement Count

| Spec | Requirements | Test Scenarios |
|------|-------------|---------------|
| 01 — Vector Search & Embedding Infrastructure | 53 | 60 |
| 02 — Knowledge Graph | 14 | 12 |
| 03 — Smart Content Delivery | 18 | 16 |
| 04 — Advanced Calculator | 10 | 15 |
| 05 — Intelligent UI Tools | 15 | 10 |
| 06 — Media Generation | 15 | 12 |
| 07 — Cross-Cutting Platform | 19 | 20 |
| **Total** | **144** | **145** |

---

## Architecture Principles

All specs follow the existing Clean Architecture established in the
[Tool Architecture Spec](../tool-architecture-spec.md):

- **Dependency Rule:** Core entities have zero external imports
- **Adapter Pattern:** External services (TTS, vector DB, SQLite) are wrapped
  in interfaces defined in core, implemented in adapters
- **Middleware Chain:** New middleware (rate limiting, analytics) slots into
  the existing `ToolMiddleware` pipeline
- **SRP Commands:** Each tool is a single `ToolCommand` with one responsibility
- **Testability:** All dependencies are injected. Tests use mocks at the adapter
  boundary.

---

## New Dependencies Summary

| Package | Spec | Size | License | Purpose |
|---------|------|------|---------|---------|
| `@huggingface/transformers` | 01 | ~25MB (ONNX model) | Apache 2.0 | Local sentence embeddings |
| `mathjs` | 04 | ~180KB | Apache 2.0 | Safe expression evaluation |
| `mermaid` | 06 | ~2MB | MIT | Server-side syntax validation |
| `edge-tts` | 06 | ~50KB | MIT | Free TTS via Microsoft Edge |

Total new dependency footprint: ~27MB (dominated by the ONNX model, which is
a build-time artifact stored in `.data/`, not shipped to the client).
