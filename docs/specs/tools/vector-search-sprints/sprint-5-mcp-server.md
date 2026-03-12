# Sprint 5 — MCP Server

> **Goal:** Create the MCP embedding server that exposes embedding operations
> over stdio transport — matching the existing `mcp/calculator-server.ts` pattern.
> This gives CLI access, external tool access, and decoupled embedding for
> CPU-intensive operations.
> **Spec ref:** §11.1–11.4, Phase 6 steps 24–26
> **Prerequisite:** Sprint 4 complete (full hybrid search wired into
> `search_books` tool — committed `109bfa9`)

---

## Available Assets (from Sprints 0–4)

All ports, adapters, engines, and wiring listed below already exist and are
**imported, not created**, by Sprint 5.

### Existing MCP Pattern (`mcp/`)

| File | Purpose |
| --- | --- |
| `mcp/calculator-server.ts` | Reference MCP server — stdio transport, `ListToolsRequestSchema`, `CallToolRequestSchema` |
| `mcp/calculator-tool.ts` | Extracted tool logic — thin function that delegates to `@/lib/calculator` |
| `tests/calculator-mcp-contract.test.ts` | Parity test pattern — verifies MCP tool matches domain logic |

The pattern: **server** handles MCP protocol, **tool module** holds testable
logic that delegates to core. Tests exercise the tool module without launching
the server.

### Composition Root Exports (`src/lib/chat/tool-composition-root.ts`)

| Export | Returns | Sprint 5 Use |
| --- | --- | --- |
| `getEmbeddingPipelineFactory()` | `EmbeddingPipelineFactory` singleton (LocalEmbedder + SQLiteVectorStore) | `embed_document`, `rebuild_index` |
| `getBookPipeline()` | `EmbeddingPipeline` for `book_chunk` source | `embed_document`, `rebuild_index` |
| `getSearchHandler()` | Full chain: Hybrid → BM25 → Legacy → Empty | `search_similar` |

### Key Core APIs

| Method | Signature | Tool |
| --- | --- | --- |
| `Embedder.embed(text)` | `(string) → Promise<Float32Array>` | `embed_text` |
| `Embedder.dimensions()` | `() → number` (384) | `embed_text` |
| `Embedder.isReady()` | `() → boolean` | `get_index_stats` |
| `EmbeddingPipeline.indexDocument(params)` | `({sourceType, sourceId, content, contentHash, metadata}) → Promise<IndexResult>` | `embed_document` |
| `EmbeddingPipeline.rebuildAll(sourceType, docs)` | `(string, DocumentInput[]) → Promise<RebuildResult>` | `rebuild_index` |
| `SearchHandler.search(query, filters?)` | `(string, VectorQuery?) → Promise<HybridSearchResult[]>` | `search_similar` |
| `VectorStore.count(sourceType?)` | `(string?) → number` | `get_index_stats` |
| `VectorStore.delete(sourceId)` | `(string) → void` | `delete_embeddings` |
| `BM25IndexStore.getIndex(sourceType)` | `(string) → BM25Index \| null` | `get_index_stats` |
| `BM25IndexStore.isStale(sourceType)` | `(string) → boolean` | `get_index_stats` |

### Key Types (from `src/core/search/types.ts`)

| Type | Key fields |
| --- | --- |
| `IndexResult` | `sourceId, status ("created"\|"updated"\|"unchanged"), chunksUpserted` |
| `RebuildResult` | `created, updated, unchanged, orphansDeleted, totalChunks` |
| `HybridSearchResult` | 14 fields: identity (5), scoring (4), passage context (4), offset (1) |
| `DocumentInput` | `sourceId, content, contentHash, metadata: ChunkMetadata` |
| `VectorQuery` | `sourceType?, chunkLevel?, limit?` |
| `BookChunkMetadata` | `sourceType: "book_chunk", bookSlug, chapterSlug, bookTitle, chapterTitle, chapterFirstSentence` |

### Infrastructure

| Package | Version | Already Installed |
| --- | --- | --- |
| `@modelcontextprotocol/sdk` | ^1.27.1 | Yes — used by calculator server |
| `tsx` | ^4.21.0 | Yes — dev dependency |
| `@huggingface/transformers` | ^3.8.1 | Yes — Sprint 1 |
| `better-sqlite3` | ^12.6.2 | Yes — Sprint 0 |

No new dependencies required.

---

## Task 5.1 — Extract embedding tool logic (`mcp/embedding-tool.ts`)

**What:** Create the testable tool logic module following the calculator pattern.
Each function validates input, delegates to core, and returns a plain result
object. The MCP server (Task 5.2) is a thin transport wrapper.

| Item | Detail |
| --- | --- |
| **Create** | `mcp/embedding-tool.ts` |
| **Spec** | §11.2 |
| **Reqs** | VSEARCH-30, VSEARCH-31, VSEARCH-32, VSEARCH-33, VSEARCH-34 |

### Tool functions

```typescript
import { createHash } from "crypto";
import type { Embedder } from "@/core/search/ports/Embedder";
import type { VectorStore, VectorQuery } from "@/core/search/ports/VectorStore";
import type { BM25IndexStore } from "@/core/search/ports/BM25IndexStore";
import type { SearchHandler } from "@/core/search/ports/SearchHandler";
import type { EmbeddingPipelineFactory } from "@/core/search/EmbeddingPipelineFactory";
import type { BookChunkMetadata } from "@/core/search/ports/Chunker";
import type { BookRepository } from "@/core/use-cases/BookRepository";

export interface EmbeddingToolDeps {
  embedder: Embedder;
  vectorStore: VectorStore;
  bm25IndexStore: BM25IndexStore;
  searchHandler: SearchHandler;
  pipelineFactory: EmbeddingPipelineFactory;
  bookRepo: BookRepository;
}

// --- embed_text (VSEARCH-30) ---
export async function embedText(
  deps: EmbeddingToolDeps,
  args: { text: string },
) {
  if (!args.text || typeof args.text !== "string") {
    throw new Error("embed_text requires a non-empty 'text' string.");
  }
  const embedding = await deps.embedder.embed(args.text);
  return {
    dimensions: deps.embedder.dimensions(),
    embeddingPreview: Array.from(embedding.slice(0, 5)),
  };
}

// --- embed_document (VSEARCH-31) ---
export async function embedDocument(
  deps: EmbeddingToolDeps,
  args: { source_type: string; source_id: string; content: string },
) {
  if (!args.source_type || !args.source_id || !args.content) {
    throw new Error("embed_document requires source_type, source_id, and content.");
  }
  const pipeline = deps.pipelineFactory.createForSource(
    args.source_type as "book_chunk",
  );
  // For book_chunk, extract metadata from source_id (bookSlug/chapterSlug)
  const [bookSlug, chapterSlug] = args.source_id.split("/");
  const metadata: BookChunkMetadata = {
    sourceType: "book_chunk",
    bookSlug: bookSlug ?? args.source_id,
    chapterSlug: chapterSlug ?? "",
    bookTitle: bookSlug ?? "",
    chapterTitle: chapterSlug ?? "",
    chapterFirstSentence: args.content.split(/[.!?]\s/)[0]?.slice(0, 200) ?? "",
  };
  const contentHash = createHash("sha256").update(args.content).digest("hex");
  const result = await pipeline.indexDocument({
    sourceType: args.source_type,
    sourceId: args.source_id,
    content: args.content,
    contentHash,
    metadata,
  });
  return result;
}

// --- search_similar (VSEARCH-32) ---
export async function searchSimilar(
  deps: EmbeddingToolDeps,
  args: { query: string; source_type?: string; limit?: number },
) {
  if (!args.query || typeof args.query !== "string") {
    throw new Error("search_similar requires a non-empty 'query' string.");
  }
  const filters: VectorQuery = {};
  if (args.source_type) filters.sourceType = args.source_type;
  if (args.limit) filters.limit = args.limit;
  const results = await deps.searchHandler.search(args.query, filters);
  return results;
}

// --- rebuild_index (VSEARCH-33) ---
export async function rebuildIndex(
  deps: EmbeddingToolDeps,
  args: { source_type: string; force?: boolean },
) {
  if (!args.source_type) {
    throw new Error("rebuild_index requires a source_type.");
  }
  // Only book_chunk is currently supported
  if (args.source_type !== "book_chunk") {
    throw new Error(`Unsupported source_type: ${args.source_type}. Only "book_chunk" is supported.`);
  }

  const pipeline = deps.pipelineFactory.createForSource("book_chunk");
  const [books, chapters] = await Promise.all([
    deps.bookRepo.getAllBooks(),
    deps.bookRepo.getAllChapters(),
  ]);
  const bookTitleMap = new Map(books.map((b) => [b.slug, b.title]));

  if (args.force) {
    for (const ch of chapters) {
      deps.vectorStore.delete(`${ch.bookSlug}/${ch.chapterSlug}`);
    }
  }

  const documents = chapters.map((ch) => ({
    sourceId: `${ch.bookSlug}/${ch.chapterSlug}`,
    content: ch.content,
    contentHash: createHash("sha256").update(ch.content).digest("hex"),
    metadata: {
      sourceType: "book_chunk" as const,
      bookSlug: ch.bookSlug,
      chapterSlug: ch.chapterSlug,
      bookTitle: bookTitleMap.get(ch.bookSlug) ?? ch.bookSlug,
      chapterTitle: ch.title,
      chapterFirstSentence: ch.content.split(/[.!?]\s/)[0]?.slice(0, 200) ?? "",
    } satisfies BookChunkMetadata,
  }));

  const result = await pipeline.rebuildAll("book_chunk", documents);
  return result;
}

// --- get_index_stats (VSEARCH-34) ---
export function getIndexStats(
  deps: EmbeddingToolDeps,
  args: { source_type?: string },
) {
  const sourceType = args.source_type ?? "book_chunk";
  const embeddingCount = deps.vectorStore.count(sourceType);
  const bm25Index = deps.bm25IndexStore.getIndex(sourceType);
  return {
    sourceType,
    embeddingCount,
    bm25DocCount: bm25Index?.docCount ?? 0,
    bm25AvgDocLength: bm25Index?.avgDocLength ?? 0,
    bm25Stale: deps.bm25IndexStore.isStale(sourceType),
    embedderReady: deps.embedder.isReady(),
    dimensions: deps.embedder.dimensions(),
  };
}

// --- delete_embeddings (bonus — not in spec reqs) ---
export function deleteEmbeddings(
  deps: EmbeddingToolDeps,
  args: { source_id: string },
) {
  if (!args.source_id || typeof args.source_id !== "string") {
    throw new Error("delete_embeddings requires a non-empty 'source_id' string.");
  }
  const before = deps.vectorStore.count();
  deps.vectorStore.delete(args.source_id);
  const after = deps.vectorStore.count();
  return { deleted: before - after, source_id: args.source_id };
}
```

> **Note on `delete_embeddings`:** The spec (§11.2) lists 5 tools and VSEARCH
> requirements cover 5 tools (30–34). `delete_embeddings` is added as a useful
> operational tool that delegates to `VectorStore.delete()`. It has no VSEARCH
> requirement ID.

### Verify

```bash
npm run build   # type-checks
```

---

## Task 5.2 — MCP embedding server scaffold (`mcp/embedding-server.ts`)

**What:** Create the MCP server entry point following the calculator server
pattern. Thin transport layer — all logic lives in `embedding-tool.ts`.

| Item | Detail |
| --- | --- |
| **Create** | `mcp/embedding-server.ts` |
| **Modify** | `package.json` — add `mcp:embeddings` script |
| **Spec** | §11.1, §11.3, §11.4 |

### Server structure

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getDb } from "../src/lib/db";
import { getBookRepository } from "../src/adapters/RepositoryFactory";
import { LocalEmbedder } from "../src/adapters/LocalEmbedder";
import { SQLiteVectorStore } from "../src/adapters/SQLiteVectorStore";
import { SQLiteBM25IndexStore } from "../src/adapters/SQLiteBM25IndexStore";
import { getEmbeddingPipelineFactory, getSearchHandler } from "../src/lib/chat/tool-composition-root";
import type { EmbeddingToolDeps } from "./embedding-tool";
import {
  embedText,
  embedDocument,
  searchSimilar,
  rebuildIndex,
  getIndexStats,
  deleteEmbeddings,
} from "./embedding-tool";

function createDeps(): EmbeddingToolDeps {
  const db = getDb();
  return {
    embedder: new LocalEmbedder(),
    vectorStore: new SQLiteVectorStore(db),
    bm25IndexStore: new SQLiteBM25IndexStore(db),
    searchHandler: getSearchHandler(),
    pipelineFactory: getEmbeddingPipelineFactory(),
    bookRepo: getBookRepository(),
  };
}

const server = new Server(
  { name: "embedding-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "embed_text",
      description: "Embed arbitrary text, return vector dimensions and preview.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text to embed." },
        },
        required: ["text"],
        additionalProperties: false,
      },
    },
    {
      name: "embed_document",
      description: "Chunk, embed, and store a document into the vector store.",
      inputSchema: {
        type: "object",
        properties: {
          source_type: { type: "string", description: "Source type (e.g. 'book_chunk')." },
          source_id: { type: "string", description: "Source ID (e.g. 'book-slug/chapter-slug')." },
          content: { type: "string", description: "Document content to embed." },
        },
        required: ["source_type", "source_id", "content"],
        additionalProperties: false,
      },
    },
    {
      name: "search_similar",
      description: "Hybrid similarity search (BM25 + vector + RRF).",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query." },
          source_type: { type: "string", description: "Filter by source type." },
          limit: { type: "number", description: "Max results." },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
    {
      name: "rebuild_index",
      description: "Full or incremental rebuild of embeddings for a source type.",
      inputSchema: {
        type: "object",
        properties: {
          source_type: { type: "string", description: "Source type to rebuild (e.g. 'book_chunk')." },
          force: { type: "boolean", description: "Force full rebuild (delete existing first)." },
        },
        required: ["source_type"],
        additionalProperties: false,
      },
    },
    {
      name: "get_index_stats",
      description: "Embedding counts, BM25 stats, model readiness.",
      inputSchema: {
        type: "object",
        properties: {
          source_type: { type: "string", description: "Source type filter." },
        },
        additionalProperties: false,
      },
    },
    {
      name: "delete_embeddings",
      description: "Remove all embeddings for a specific source ID.",
      inputSchema: {
        type: "object",
        properties: {
          source_id: { type: "string", description: "Source ID to delete." },
        },
        required: ["source_id"],
        additionalProperties: false,
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const deps = createDeps();
  const a = (args ?? {}) as Record<string, unknown>;

  let result: unknown;
  switch (name) {
    case "embed_text":
      result = await embedText(deps, a as { text: string });
      break;
    case "embed_document":
      result = await embedDocument(deps, a as { source_type: string; source_id: string; content: string });
      break;
    case "search_similar":
      result = await searchSimilar(deps, a as { query: string; source_type?: string; limit?: number });
      break;
    case "rebuild_index":
      result = await rebuildIndex(deps, a as { source_type: string; force?: boolean });
      break;
    case "get_index_stats":
      result = getIndexStats(deps, a as { source_type?: string });
      break;
    case "delete_embeddings":
      result = deleteEmbeddings(deps, a as { source_id: string });
      break;
    default:
      throw new Error(`Unknown tool: ${name}`);
  }

  return {
    content: [{ type: "text", text: JSON.stringify(result) }],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Package script

Add to `package.json`:

```json
{
  "scripts": {
    "mcp:embeddings": "tsx mcp/embedding-server.ts"
  }
}
```

### Verify

```bash
npm run build   # type-checks
```

---

## Task 5.3 — MCP embedding tool tests

**What:** Unit tests for the tool logic in `embedding-tool.ts`, following the
calculator MCP contract test pattern. Tests exercise the tool functions with
mock/in-memory dependencies — no real embedder, no DB.

| Item | Detail |
| --- | --- |
| **Create** | `tests/search/mcp-embedding-tool.test.ts` |
| **Spec** | Phase 6.26 |
| **Reqs** | VSEARCH-30 through VSEARCH-34 |

### Test doubles

Use existing in-memory stores (`InMemoryVectorStore`, `InMemoryBM25IndexStore`)
and a mock embedder that returns deterministic vectors. Construct
`EmbeddingToolDeps` with test doubles so tests run without DB or model loading.

```typescript
import { InMemoryVectorStore } from "@/adapters/InMemoryVectorStore";
import { InMemoryBM25IndexStore } from "@/adapters/InMemoryBM25IndexStore";
// MockEmbedder returns deterministic 384-d vectors
// Mock SearchHandler returns canned HybridSearchResult[]
// Mock BookRepository returns canned books/chapters
// Mock EmbeddingPipelineFactory returns a mock pipeline
```

### Tests

| Test ID | Scenario | VSEARCH |
| --- | --- | --- |
| TEST-MCP-01 | `embedText` returns dimensions (384) and embeddingPreview array | VSEARCH-30 |
| TEST-MCP-02 | `embedText` throws on empty text | VSEARCH-30 |
| TEST-MCP-03 | `embedDocument` delegates to pipeline.indexDocument, returns IndexResult | VSEARCH-31 |
| TEST-MCP-04 | `searchSimilar` delegates to searchHandler.search, returns results | VSEARCH-32 |
| TEST-MCP-05 | `searchSimilar` passes source_type and limit as filters | VSEARCH-32 |
| TEST-MCP-06 | `rebuildIndex` delegates to pipeline.rebuildAll, returns RebuildResult | VSEARCH-33 |
| TEST-MCP-07 | `rebuildIndex` throws for unsupported source_type | VSEARCH-33 |
| TEST-MCP-08 | `getIndexStats` returns embeddingCount, bm25 stats, embedder readiness | VSEARCH-34 |
| TEST-MCP-09 | `deleteEmbeddings` removes entries and returns count | — |
| TEST-MCP-10 | `deleteEmbeddings` throws on empty source_id | — |

### Verify

```bash
npx vitest run tests/search/mcp-embedding-tool.test.ts   # ~10 tests pass
npm run build && npm test                                 # all tests green
```

---

## Sprint 5 — Completion Checklist

- [ ] `mcp/embedding-tool.ts` — extracted tool logic (6 functions)
- [ ] `mcp/embedding-server.ts` — thin MCP transport, follows calculator pattern
- [ ] 6 MCP tools: embed_text, embed_document, search_similar, rebuild_index, get_index_stats, delete_embeddings
- [ ] Each tool delegates to core — server is a thin transport layer
- [ ] `npm run mcp:embeddings` script added to package.json
- [ ] ~10 unit tests for tool logic via mock dependencies
- [ ] All tool functions validate input before delegating
- [ ] `npm run build && npm test` — all tests green
- [ ] Total project: 293 + ~10 = ~303 tests passing

---

## QA Deviations

_To be populated during implementation QA. Any deviations from this sprint doc
or the original spec will be documented here with rationale._
