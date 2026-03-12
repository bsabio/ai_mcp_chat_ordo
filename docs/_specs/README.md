# Specifications

> All feature specs and their sprint implementation docs live here.
> Each feature gets its own folder containing `spec.md` and a `sprints/`
> subdirectory.

---

## Feature Specs

| Feature | Status | Sprints | Description |
|---------|--------|---------|-------------|
| [RBAC](rbac/) | **Complete** | 6 (0–5) | Multi-user auth, RBAC, chat persistence, role-aware LLM |
| [Tool Architecture](tool-architecture/) | **Complete** | 5 (0–4) | Registry-based tool system with SOLID/GoF alignment |
| [Vector Search](vector-search/) | **Complete** | 6 (0–5) | BM25+vector hybrid search, embedding pipeline, MCP server |
| [Corpus Management](corpus-management/) | **Draft** | 2 (0–1) | `_corpus/` auto-discovery, MCP corpus tools, zip import |

## Roadmap

Future tool specs not yet scheduled for implementation:

| # | Spec | Priority |
|---|------|----------|
| 02 | [Knowledge Graph](tool-roadmap/02-knowledge-graph.md) | High |
| 03 | [Smart Content Delivery](tool-roadmap/03-smart-content-delivery.md) | High |
| 04 | [Advanced Calculator](tool-roadmap/04-advanced-calculator.md) | Medium |
| 05 | [Intelligent UI Tools](tool-roadmap/05-intelligent-ui-tools.md) | Medium |
| 06 | [Media Generation](tool-roadmap/06-media-generation.md) | Medium |
| 07 | [Cross-Cutting Platform](tool-roadmap/07-cross-cutting-platform.md) | Medium |

## Archive

Historical planning documents: [archive/](archive/)

---

## Convention

```
_specs/
├── README.md                     ← this file
├── {feature}/
│   ├── spec.md                   ← system specification
│   └── sprints/
│       ├── sprint-0-*.md         ← implementation sprint doc
│       ├── sprint-1-*.md
│       └── ...
├── tool-roadmap/                 ← unimplemented future specs
└── archive/                      ← historical planning docs
```
