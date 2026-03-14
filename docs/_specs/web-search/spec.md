# Web Search — System Spec

> **Status:** Implemented v2.0
> **Date:** 2026-03-12
> **Scope:** Add an `admin_web_search` chat tool with rich UI rendering.
>   Admins can search the live web from the chat interface using OpenAI's
>   Responses API with GPT-5 and see real-time progress, sourced answers,
>   citations, and download results as markdown.
> **Dependencies:** Vector Search Sprints 0–5 (complete), Librarian Sprints
>   0–2 (complete), RBAC (complete), Tool Architecture (complete)
> **Affects:** `src/core/use-cases/tools/admin-web-search.tool.ts` (new),
>   `src/app/api/web-search/route.ts` (new API route),
>   `src/components/WebSearchResultCard.tsx` (new UI component),
>   `mcp/web-search-tool.ts` (search logic), `package.json` (`openai` dep)
>
> **Metaphor:** The librarian manages the bookshelf; the **researcher**
> goes out to the world. The admin asks a question, the researcher queries
> the live web via OpenAI's web_search tool, and returns a sourced answer
> with citations. The researcher never modifies the corpus — it reads
> the web, not the shelf.
>
> **Requirement IDs:** Each traceable requirement is tagged `WEBSEARCH-XX`.
> Sprint tasks reference these IDs for traceability.

---

## 1. Problem Statement

### 1.1 No Live Web Access

The current MCP tool surface operates exclusively on local corpus data.
Admins can search embedded book content and manage the corpus, but they
cannot research topics on the live web. Questions about current events,
external documentation, competitor analysis, or rapidly changing technical
topics are unanswerable without leaving the chat interface.

### 1.2 Context Switching Cost

When admins need web-sourced information, they must leave the chat
interface, search manually, copy relevant text, and return to the
conversation. This breaks flow, loses conversational context, and
prevents the LLM from synthesizing web-sourced and corpus-sourced
knowledge in a single response.

### 1.3 No Citation Trail

Manual web research produces no structured citation trail. When an admin
shares findings from a web search, the provenance is lost — there is no
record of which URLs were consulted, which passages were cited, or how
the answer was derived. A tool-mediated search produces a structured,
auditable result.

---

## 2. Design Goals

1. **Admin-only access** — the `admin_web_search` tool requires `ADMIN`
   role, enforced per-invocation by existing RBAC middleware.
   `[WEBSEARCH-010]`
2. **GPT-5 via Responses API** — uses `client.responses.create()` with
   `model: "gpt-5"` and `tools: [{ type: "web_search" }]`. GPT-5 decides
   when to invoke web search based on the query. `[WEBSEARCH-020]`
3. **Structured citations** — every response includes the answer text plus
   an array of `url_citation` annotations with `url`, `title`,
   `start_index`, and `end_index`. `[WEBSEARCH-030]`
4. **Source transparency** — request `include: ["web_search_call.action.sources"]`
   to return the full list of URLs the model consulted, not just those
   cited inline. `[WEBSEARCH-040]`
5. **Domain filtering** — optional `allowed_domains` parameter restricts
   searches to specific sites (e.g., `["en.wikipedia.org"]` for
   Wikipedia research, `["openai.com"]` for API docs).
   `[WEBSEARCH-050]`
6. **Extracted tool logic** — search logic lives in `mcp/web-search-tool.ts`
   with dependency injection. The chat tool command is a no-op; the
   real work happens client-side via `/api/web-search` (matching the
   audio/chart UI pattern). `[WEBSEARCH-060]`
7. **Fail gracefully** — API errors, rate limits, and empty results
   return structured error responses, never crash the server or UI.
   `[WEBSEARCH-070]`
8. **API key from environment** — reads `OPENAI_API_KEY` from
   `process.env`. No hardcoded credentials. Fails at tool invocation
   time (not server startup) if the key is missing. `[WEBSEARCH-080]`
9. **Input constraints** — query must be non-empty and capped at 2000
   characters to prevent abuse and excessive API costs. `[WEBSEARCH-090]`

---

## 3. OpenAI Integration

### 3.1 API Surface

The tool uses the [OpenAI Responses API](https://platform.openai.com/docs/guides/tools-web-search)
with the `web_search` built-in tool.

**Request shape:**

```typescript
import OpenAI from "openai";

const client = new OpenAI(); // reads OPENAI_API_KEY from env

const response = await client.responses.create({
  model: "gpt-5",
  input: query,
  tools: [toolConfig],
  include: ["web_search_call.action.sources"],
});
```

**Tool configuration:**

```typescript
// Minimal (no domain filter)
const toolConfig = { type: "web_search" as const };

// With domain filter [WEBSEARCH-050]
const toolConfig = {
  type: "web_search" as const,
  filters: {
    allowed_domains: ["en.wikipedia.org"],
  },
};
```

### 3.2 Response Parsing

The response `output` array contains:

1. **`web_search_call`** — describes the search actions taken
   (search, open_page, find_in_page). When `include` contains
   `"web_search_call.action.sources"`, each action includes the
   full list of URLs consulted.
2. **`message`** — contains `content[0].type = "output_text"` with
   the answer text and `content[0].annotations` listing each
   `url_citation`.

**Citation shape:**

```typescript
interface UrlCitation {
  type: "url_citation";
  url: string;
  title: string;
  start_index: number;
  end_index: number;
}
```

### 3.3 Model Selection Rationale

| Model | Web Search Support | Notes |
|-------|--------------------|-------|
| **GPT-5** | Yes (Responses API) | Full support; exception: `reasoning.effort = "minimal"` disables it |
| `gpt-4o-search-preview` | Yes (always searches) | Specialized; extra per-call fee; Chat Completions primary |
| `gpt-4.1-nano` | No | Does not support `web_search` tool |

**Decision:** Default to `gpt-5`. It supports on-demand web search (the
model decides when to search), matches the `eai search` CLI tool's
implementation, and avoids the always-search overhead of specialized
models. The model is configurable via the `model` input parameter for
future flexibility.

---

## 4. Module Architecture

### 4.1 File Layout

| File | Purpose |
|------|---------|
| `mcp/web-search-tool.ts` | Pure function `adminWebSearch()` (dependency-injected OpenAI client) |
| `src/core/use-cases/tools/admin-web-search.tool.ts` | No-op ToolDescriptor registered in the chat tool system |
| `src/lib/chat/tool-composition-root.ts` | Registers `admin_web_search` (unconditional, no deps) |
| `src/app/api/web-search/route.ts` | Next.js API route — ADMIN auth + real OpenAI call |
| `src/components/WebSearchResultCard.tsx` | Client-side UI: progress stages, answer, citations, sources, markdown download |
| `src/core/entities/rich-content.ts` | `WEB_SEARCH` block type in BlockNode union |
| `src/adapters/ChatPresenter.ts` | Maps `tool_call` → `web-search` BlockNode |
| `src/frameworks/ui/RichContentRenderer.tsx` | Dispatches `web-search` block to `WebSearchResultCard` |

### 4.2 `WebSearchToolDeps`

```typescript
import type OpenAI from "openai";

export interface WebSearchToolDeps {
  openai: OpenAI;  // pre-configured client instance
}
```

The dependency interface is intentionally minimal. The OpenAI client is
injected rather than constructed inside the tool function, enabling:
- Tests to inject a mock client
- The API route to manage client lifecycle (lazy-cached singleton)
- Future reuse if additional OpenAI-powered tools are added

### 4.3 Architecture: No-Op Tool → API Route → Client UI

The web search tool follows the same **no-op command** pattern used by
the audio and chart tools:

1. **ToolDescriptor (no-op)** — `AdminWebSearchCommand.execute()` returns
   a success string. The real work does **not** happen here.
2. **ChatPresenter** — intercepts the `tool_call` SSE event and maps it
   to a `WEB_SEARCH` BlockNode containing `query`, `allowed_domains`,
   and `model`.
3. **RichContentRenderer** — dispatches the block to
   `WebSearchResultCard` (dynamic import, SSR disabled).
4. **WebSearchResultCard** — auto-fetches `/api/web-search` on mount,
   shows real-time progress stages, then renders the full answer with
   citations, sources, and a markdown download button.
5. **API route** — `/api/web-search` verifies ADMIN role, constructs a
   lazy-cached `OpenAI` client, calls `adminWebSearch()`, and returns
   the result as JSON.

**Lazy initialization note `[WEBSEARCH-080]`:** The `OpenAI` constructor
does not validate the API key — it merely stores it. If `OPENAI_API_KEY`
is unset, the constructor succeeds silently. The API route starts
normally (other routes work fine). The `adminWebSearch` function performs
an explicit pre-flight check for `OPENAI_API_KEY` before calling the
API, returning a clear error message rather than a cryptic SDK failure.

---

## 5. Chat Tool Specification

### 5.1 Tool Surface

One tool added to the chat tool registry via `tool-composition-root.ts`.

| Tool | Description | Input | Sprint |
|------|-------------|-------|--------|
| `admin_web_search` | Search the live web and return a sourced answer with citations | `{query, allowed_domains?, model?}` | 1 |

### 5.2 `admin_web_search`

**Input:**

```json
{
  "query": "history of the transistor",
  "allowed_domains": ["en.wikipedia.org"],
  "model": "gpt-5"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | `string` | Yes | The search query. Must be non-empty, max 2000 characters. `[WEBSEARCH-090]` |
| `allowed_domains` | `string[]` | No | Restrict results to these domains (e.g., `["en.wikipedia.org"]` for Wikipedia). Each must be a valid domain (no protocol, no path). `[WEBSEARCH-050]` |
| `model` | `string` | No | OpenAI model to use. Default: `"gpt-5"`. Must be a model that supports `web_search`. `[WEBSEARCH-020]` |

**Tool Descriptor (for Anthropic tool-use system):**

```typescript
{
  name: "admin_web_search",
  description:
    "Search the live web using OpenAI and return a sourced answer with citations. Use allowed_domains to target specific sites (e.g. en.wikipedia.org for Wikipedia searches). Admin only.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query (max 2000 characters).",
      },
      allowed_domains: {
        type: "array",
        description:
          "Optional list of domains to restrict results to (e.g. ['en.wikipedia.org'] for Wikipedia).",
        items: { type: "string" },
      },
      model: {
        type: "string",
        description:
          'OpenAI model to use. Default: "gpt-5". Must support web_search.',
      },
    },
    required: ["query"],
  },
  roles: ["ADMIN"],
  category: "content",
}
```

**Output:**

```json
{
  "answer": "The OpenAI Responses API supports web search via...",
  "citations": [
    {
      "url": "https://platform.openai.com/docs/guides/tools-web-search",
      "title": "Web Search — OpenAI Platform",
      "start_index": 4,
      "end_index": 52
    }
  ],
  "sources": [
    "https://platform.openai.com/docs/guides/tools-web-search",
    "https://platform.openai.com/docs/api-reference/responses/object"
  ],
  "model": "gpt-5"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `answer` | `string` | The model's synthesized answer text `[WEBSEARCH-030]` |
| `citations` | `UrlCitation[]` | Inline citations with URL, title, and character offsets `[WEBSEARCH-030]` |
| `sources` | `string[]` | All URLs consulted during the search (superset of cited URLs) `[WEBSEARCH-040]` |
| `model` | `string` | The model that was requested (input `model` or default `"gpt-5"`) |

**Behavior:**

1. Validate `query` is non-empty and ≤ 2000 characters `[WEBSEARCH-090]`
2. Build tool configuration: `{ type: "web_search" }` with optional
   `filters.allowed_domains` `[WEBSEARCH-050]`
3. Call `client.responses.create()` with `model`, `input: query`,
   `tools: [toolConfig]`, `include: ["web_search_call.action.sources"]`
   `[WEBSEARCH-020]`
4. Extract `output_text` from the response message item
5. Extract `url_citation` annotations from `content[0].annotations`
   `[WEBSEARCH-030]`
6. Extract sources from `web_search_call` items `[WEBSEARCH-040]`
7. Return structured result
8. On API error, return `{ error: message, code: status }` — never throw
   unhandled `[WEBSEARCH-070]`

### 5.3 UI Rendering (WebSearchResultCard)

The `WebSearchResultCard` component provides rich, progressive feedback:

| Stage | Label | Progress | Description |
|-------|-------|----------|-------------|
| `connecting` | Connecting… | 5% | Initial fetch to `/api/web-search` |
| `searching` | Searching the web… | 20% | API call in progress |
| `reading-sources` | Reading sources… | 50% | Parsing response |
| `composing` | Composing answer… | 75% | Building result |
| `done` | Done | 100% | Answer displayed |
| `error` | Error | 0% | Error message shown |

**Features:**
- **ToolCard wrapper** — shared chrome with title, icon, expandable view
- **Elapsed time** — ticking `Xs` counter during search
- **Progress bar** — animated, asymptotic (caps at 95% over ~12s)
- **Answer display** — full text with inline citation links
- **Sources** — domain-name pills linking to consulted URLs
- **Markdown download** — `buildMarkdown()` generates a `.md` file with
  answer, citations table, and sources list

### 5.4 Acceptance Rules `[WEBSEARCH-090]`

| Rule | Behavior |
|------|----------|
| Empty query | Reject with error: "query is required and must be non-empty" |
| Query > 2000 characters | Reject with error: "query exceeds maximum length of 2000 characters" |
| `OPENAI_API_KEY` unset | Return error: "OPENAI_API_KEY environment variable is not set" `[WEBSEARCH-080]` |
| API returns error (rate limit, auth, etc.) | Return structured error with status code `[WEBSEARCH-070]` |
| API returns no citations | Return answer with empty `citations` array (valid — not all answers cite sources) |
| `allowed_domains` is empty array | Treat as no filter (search all domains) |
| `allowed_domains` contains invalid entries | Pass through to API; let OpenAI validate (fail at API level) |
| `model` not provided | Default to `"gpt-5"` `[WEBSEARCH-020]` |
| Response has no `output_text` | Return error: "No answer text in response" |
| Non-admin invocation | Blocked by RBAC at two layers: ToolRegistry roles check + API route auth `[WEBSEARCH-010]` |

---

## 6. Tool Implementation

### 6.1 `mcp/web-search-tool.ts`

```typescript
import type OpenAI from "openai";

export interface WebSearchToolDeps {
  openai: OpenAI;
}

export interface WebSearchResult {
  answer: string;
  citations: Array<{
    url: string;
    title: string;
    start_index: number;
    end_index: number;
  }>;
  sources: string[];
  model: string;
}

export interface WebSearchError {
  error: string;
  code?: number;
}

export async function adminWebSearch(
  deps: WebSearchToolDeps,
  args: {
    query: string;
    allowed_domains?: string[];
    model?: string;
  },
): Promise<WebSearchResult | WebSearchError> {
  // 1. Validate query [WEBSEARCH-090]
  if (!args.query || args.query.trim().length === 0) {
    return { error: "query is required and must be non-empty" };
  }
  if (args.query.length > 2000) {
    return { error: "query exceeds maximum length of 2000 characters" };
  }

  // 1b. Pre-flight API key check [WEBSEARCH-080]
  if (!process.env.OPENAI_API_KEY) {
    return { error: "OPENAI_API_KEY environment variable is not set" };
  }

  const model = args.model || "gpt-5";

  // 2. Build tool config [WEBSEARCH-050]
  const toolConfig: Record<string, unknown> = { type: "web_search" };
  if (args.allowed_domains && args.allowed_domains.length > 0) {
    toolConfig.filters = { allowed_domains: args.allowed_domains };
  }

  // 3. Call Responses API [WEBSEARCH-020]
  try {
    const response = await deps.openai.responses.create({
      model,
      input: args.query,
      tools: [toolConfig as Parameters<typeof deps.openai.responses.create>[0]["tools"][number]],
      include: ["web_search_call.action.sources"],
    });

    // 4. Extract answer text
    const messageItem = response.output.find(
      (item: { type: string }) => item.type === "message",
    );
    if (!messageItem || !("content" in messageItem)) {
      return { error: "No answer text in response" };
    }

    const content = (messageItem as { content: Array<{ type: string; text?: string; annotations?: unknown[] }> }).content;
    const textContent = content.find((c) => c.type === "output_text");
    if (!textContent || !textContent.text) {
      return { error: "No answer text in response" };
    }

    // 5. Extract citations [WEBSEARCH-030]
    const annotations = (textContent.annotations || []) as Array<{
      type: string;
      url?: string;
      title?: string;
      start_index?: number;
      end_index?: number;
    }>;
    const citations = annotations
      .filter((a) => a.type === "url_citation")
      .map((a) => ({
        url: a.url || "",
        title: a.title || "",
        start_index: a.start_index || 0,
        end_index: a.end_index || 0,
      }));

    // 6. Extract sources [WEBSEARCH-040]
    const sources: string[] = [];
    for (const item of response.output) {
      if (item.type === "web_search_call" && "action" in item) {
        const action = item.action as { sources?: Array<{ url: string }> };
        if (action.sources) {
          for (const s of action.sources) {
            if (s.url && !sources.includes(s.url)) {
              sources.push(s.url);
            }
          }
        }
      }
    }

    return { answer: textContent.text, citations, sources, model };
  } catch (err: unknown) {
    // 7. Handle API errors gracefully [WEBSEARCH-070]
    if (err && typeof err === "object" && "status" in err) {
      const apiErr = err as { status: number; message?: string };
      return {
        error: apiErr.message || "OpenAI API error",
        code: apiErr.status,
      };
    }
    return {
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
```

### 6.2 Tool Descriptor (`admin-web-search.tool.ts`)

The tool descriptor follows the no-op command pattern. The `execute()`
method returns a success message — the real work is done client-side.

```typescript
import { ToolDescriptor, ToolCommand } from "@/core/ports/tool-registry";

class AdminWebSearchCommand implements ToolCommand {
  async execute(): Promise<string> {
    return "Success. Web search results rendered in the chat UI.";
  }
}

export function createAdminWebSearchTool(): ToolDescriptor {
  return {
    name: "admin_web_search",
    description: "Search the live web using OpenAI…",
    schema: { /* query, allowed_domains, model */ },
    roles: ["ADMIN"],
    category: "content",
    command: new AdminWebSearchCommand(),
  };
}
```

### 6.3 API Route (`/api/web-search`)

```typescript
// src/app/api/web-search/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { adminWebSearch, WebSearchToolDeps } from "@/../mcp/web-search-tool";
import { getSessionUser } from "@/lib/auth";

let cachedDeps: WebSearchToolDeps | null = null;
function getDeps(): WebSearchToolDeps {
  if (!cachedDeps) cachedDeps = { openai: new OpenAI() };
  return cachedDeps;
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const result = await adminWebSearch(getDeps(), body);
  return NextResponse.json(result);
}
```

### 6.4 ChatPresenter Wiring

The `ChatPresenter` maps the `admin_web_search` tool call to a
`WEB_SEARCH` BlockNode:

```typescript
case TOOL_NAMES.ADMIN_WEB_SEARCH: {
  const args = JSON.parse(toolCall.function.arguments);
  return {
    type: BLOCK_TYPES.WEB_SEARCH,
    query: args.query,
    allowed_domains: args.allowed_domains,
    model: args.model,
  };
}
```

### 6.5 RichContent BlockNode

```typescript
// In rich-content.ts
export const BLOCK_TYPES = {
  // ... existing types
  WEB_SEARCH: "web-search",
} as const;

// BlockNode union addition:
| {
    type: typeof BLOCK_TYPES.WEB_SEARCH;
    query: string;
    allowed_domains?: string[];
    model?: string;
  }
```

---

## 7. Security

### 7.1 RBAC `[WEBSEARCH-010]`

The `admin_web_search` tool is protected at two layers:

1. **ToolRegistry** — the tool descriptor has `roles: ["ADMIN"]`. The
   registry's RBAC check prevents non-admin users from seeing or
   invoking the tool in the chat interface.
2. **API route** — `/api/web-search` independently verifies the session
   user's role via `getSessionUser()`. Returns 403 Forbidden for
   non-admin requests. This ensures security even if the route is
   called directly (e.g., via curl).

### 7.2 API Key Management `[WEBSEARCH-080]`

- `OPENAI_API_KEY` is read from `process.env` by the `openai` SDK
  constructor. No key is hardcoded or logged.
- The key is stored in `.env.local` (git-ignored), not in `.env`.
- If the key is missing, the API route starts normally (other routes work)
  but `admin_web_search` returns a clear error on invocation.

### 7.3 Input Validation `[WEBSEARCH-090]`

- Query length is capped at 2000 characters to prevent abuse and
  excessive API costs.
- Domain filters are passed through to the OpenAI API for server-side
  validation — no local DNS resolution or URL fetching occurs.

### 7.4 No Stored State

The web search tool is stateless. It does not write to the filesystem,
database, or vector store. Each invocation is a single API call with
a structured response. No search history is retained.

---

## 8. Testing Strategy

### 8.1 Unit Tests (`tests/mcp/web-search-tool.test.ts`)

| Area | Tests | Description |
|------|-------|-------------|
| Input validation | 3 | Empty query, query too long, valid query accepted |
| Default model | 1 | Omitted `model` defaults to `"gpt-5"` |
| Domain filtering | 2 | No filter builds minimal config, filter builds `allowed_domains` |
| Citation extraction | 2 | Parses `url_citation` annotations, handles empty annotations |
| Source extraction | 2 | Extracts sources from `web_search_call`, handles missing sources |
| Answer extraction | 2 | Extracts `output_text`, handles missing message item |
| Error handling | 3 | API error with status code, API error without status, missing API key |
| End-to-end mock | 1 | Full mock response parsed correctly |

**Total: 16 tests**

### 8.2 Integration Tests

| File | Tests | Description |
|------|-------|-------------|
| `tests/core-policy.test.ts` | 1 | ADMIN role sees `admin_web_search` in 12 tool schemas |
| `tests/core-policy.test.ts` | 1 | Tool descriptor has correct name/roles/category/schema |
| `tests/tool-registry.integration.test.ts` | 1 | Registry has exactly 12 tools after full composition |

### 8.2 Mock Strategy

Tests inject a mock `OpenAI` client into `WebSearchToolDeps`. The mock
implements only `responses.create()`, returning canned response objects
that match the documented API shape. No real API calls are made in tests.

```typescript
const mockOpenAI = {
  responses: {
    create: vi.fn().mockResolvedValue({
      output: [
        {
          type: "web_search_call",
          action: { sources: [{ url: "https://example.com" }] },
        },
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: "Example answer",
              annotations: [
                {
                  type: "url_citation",
                  url: "https://example.com",
                  title: "Example",
                  start_index: 0,
                  end_index: 14,
                },
              ],
            },
          ],
        },
      ],
    }),
  },
} as unknown as OpenAI;
```

### 8.3 Test Files

| File | Purpose |
|------|---------|
| `tests/mcp/web-search-tool.test.ts` | Unit tests for `adminWebSearch` (16 tests) |
| `tests/core-policy.test.ts` | RBAC & tool descriptor integration |
| `tests/tool-registry.integration.test.ts` | Full composition root verification |

**Updated total: 376 tests (359 existing + 16 unit + 1 RBAC descriptor)**

---

## 9. Sprint Plan

### Sprint 1 — Web Search Chat Tool with Rich UI

**Goal:** Add `admin_web_search` as an in-process chat tool with a
dedicated API route and rich client-side UI. Admins can search the live
web from the chat interface and receive sourced answers with citations,
real-time progress feedback, and markdown download.

**Prerequisite:** Librarian Sprint 2 complete (359 tests passing)

| Task | Description | Req |
|------|-------------|-----|
| 1.1 | Install `openai` npm package | |
| 1.2 | Create `mcp/web-search-tool.ts` with `WebSearchToolDeps` and `adminWebSearch` | WEBSEARCH-060 |
| 1.3 | Implement input validation (query length, empty check) | WEBSEARCH-090 |
| 1.4 | Implement tool config builder (domain filtering) | WEBSEARCH-050 |
| 1.5 | Implement Responses API call with citation/source extraction | WEBSEARCH-020, 030, 040 |
| 1.6 | Implement error handling (API errors, missing key) | WEBSEARCH-070, 080 |
| 1.7 | Create no-op `ToolDescriptor` in `admin-web-search.tool.ts` | WEBSEARCH-010, 060 |
| 1.8 | Register in `tool-composition-root.ts` (unconditional, no deps) | WEBSEARCH-010 |
| 1.9 | Add `WEB_SEARCH` block type to `rich-content.ts` | |
| 1.10 | Wire `ChatPresenter` to map `tool_call` → `web-search` block | |
| 1.11 | Create `/api/web-search` route with ADMIN auth + OpenAI call | WEBSEARCH-010, 080 |
| 1.12 | Create `WebSearchResultCard` component (progress stages, answer, citations, sources, download) | |
| 1.13 | Wire `RichContentRenderer` to dispatch `web-search` block | |
| 1.14 | Update `ChatPolicyInteractor.ts` ADMIN directive | WEBSEARCH-010 |
| 1.15 | Unit tests (16 tests) with mock OpenAI client | |
| 1.16 | Integration tests (RBAC, tool descriptor, composition root) | |
| 1.17 | Full suite green, build clean | |

**Deliverable:** 376 tests passing (359 + 16 unit + 1 RBAC), build clean.

---

## 10. Future Considerations

### 10.1 User Location

The OpenAI web search tool supports approximate user location via
`user_location: { type: "approximate", country, city, region }`.
A future enhancement could surface this as an optional parameter
for location-aware searches.

### 10.2 Search History

The current design is stateless — no search history is retained.
A future enhancement could log searches (query, timestamp, result
summary) for audit purposes, stored in SQLite alongside embeddings.

### 10.3 Corpus-Augmented Search

A powerful future pattern: search the web, then cross-reference results
with the local corpus. The admin asks a question, the tool searches the
web for external context, then queries the vector store for relevant
internal content, and synthesizes both into a single answer.

### 10.4 Response Streaming

The current implementation fetches the full response before rendering.
The Responses API supports streaming; a future enhancement could stream
partial results to `WebSearchResultCard` via SSE for even more
responsive feedback on long-running searches.

### 10.5 Cost Controls

Web search incurs per-call API costs. A future enhancement could add
rate limiting (e.g., max N searches per hour per user) or cost tracking
to prevent runaway API spending.

### 10.6 YouTube Transcript Tool

The `admin_web_search` tool with `allowed_domains: ["youtube.com"]` can
find videos but **cannot access video transcripts** — making it
insufficient for book-building from YouTube content. A dedicated
`admin_youtube_transcript` tool should shell out to the existing
`eai transcribe_video` CLI pipeline rather than reimplementing it:

**Existing `eai` CLI pipeline:**
- **`eai transcribe_video <url>`** — downloads audio via `yt-dlp`,
  transcribes via OpenAI Whisper, returns full text
- **`VideoDownloader`** — optimized format selection (low-bitrate native
  formats for speed), Invidious mirror failover when YouTube blocks,
  cookie authentication for restricted/age-gated videos, rich error
  handling (login, copyright, region blocks)
- **Parallel transcription** — chunks audio and transcribes concurrently
  (3-5x faster for long videos)
- **Output formats** — text, JSON, SRT, VTT subtitles
- **`eai youtube setup`** — manages persistent YouTube authentication
  cookies

**Proposed MCP tool:** `admin_youtube_transcript` accepts a video URL,
executes `eai transcribe_video <url> -f text` as a subprocess, and
returns the transcript text plus video metadata (title, duration,
uploader). This avoids duplicating the `yt-dlp` + Whisper + cookie
management stack in Node.js while leveraging a proven, battle-tested
pipeline.

**Prerequisite:** `eai` CLI installed and `OPENAI_API_KEY` configured
(already present in `.env.local`).
