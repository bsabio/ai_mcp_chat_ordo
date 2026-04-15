# Sprint 7 Artifact — MCP Boundary Map

> Classifies every `mcp/` file as domain, transport, or mixed.
> Documents import direction between `src/` and `mcp/`.

## Classification Key

| Label | Meaning |
| --- | --- |
| **Transport** | MCP protocol server, stdin/stdout, tool registration only |
| **Domain** | Core business logic that could be imported by any adapter |
| **Mixed** | Domain logic and transport concerns in one file |

## File Classification

| File | Lines | Classification | Domain Coupling | Notes |
| --- | --- | --- | --- | --- |
| `calculator-server.ts` | 68 | Transport | Via calculator-tool | MCP stdio server wrapping tool |
| `calculator-tool.ts` | ~30 | Domain | `@/lib/calculator` | Pure tool logic, imported by src/ |
| `web-search-tool.ts` | 147 | Domain | None (standalone) | Clean standalone module, imported by `src/` |
| `embedding-server.ts` | 670 | Transport | Via embedding-tool | MCP stdio server wrapping tool |
| `embedding-tool.ts` | ~120 | Domain | `@/core/search/*` | Search ops, imported by embedding-server |
| `librarian-tool.ts` | ~160 | Domain | `@/core/search/*` | Corpus management ops |
| `librarian-safety.ts` | ~50 | Domain | None | Input validation helpers |
| `analytics-tool.ts` | ~700 | **Mixed** | Direct DB queries | Highest-impact separation target |
| `prompt-tool.ts` | ~140 | Domain | Unknown | Prompt management |

## Import Direction

```
src/ → mcp/
═══════════
src/core/use-cases/tools/admin-web-search.tool.ts  →  mcp/web-search-tool.ts
src/lib/evals/workspace.ts                         →  mcp/calculator-tool.ts
src/app/api/admin/routing-review/route.ts           →  @mcp/analytics-tool
src/app/api/web-search/route.ts                     →  mcp/web-search-tool.ts
src/lib/operator/loaders/admin-review-loaders.ts    →  @mcp/analytics-tool
src/lib/operator/loaders/analytics-funnel-loaders.ts →  @mcp/analytics-tool
```

## Assessment

### Already Clean (No Work Needed)

- **calculator-tool/server**: Clean domain/transport separation
- **web-search-tool**: Standalone domain module, `src/` imports from it correctly
- **embedding-tool/server**: Tool logic separated from MCP transport
- **librarian-tool/safety**: Domain-only modules

### Future Separation Target

- **analytics-tool.ts** (700 lines): Mixes direct database queries with
  analytics computation and MCP transport concerns. This is the highest-impact
  candidate for domain/transport separation in a future sprint.

### Sprint 7 Contribution

Sprint 5's catalog declared `mcpExport.sharedModule: "mcp/web-search-tool"` for
`admin_web_search`. Sprint 7 added `projectMcpToolRegistration()` to convert
this catalog facet into a standard `McpToolRegistration` schema, proving the
pattern: catalog metadata → MCP tool registration.
