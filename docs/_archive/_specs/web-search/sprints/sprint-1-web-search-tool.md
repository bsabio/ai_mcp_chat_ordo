# Sprint 1 — Web Search Chat Tool with Rich UI

> **Goal:** Add `admin_web_search` as an in-process chat tool with a
> dedicated API route and rich client-side UI. Admins can search the live
> web from the chat interface and receive sourced answers with inline
> citations, real-time progress feedback, and markdown download.
> **Spec ref:** §5 (tool specification), §6 (implementation), §7 (security)
> **Prerequisite:** Librarian Sprint 2 complete (359 tests passing)
>
> **Scope note:** This sprint covers the general-purpose web search tool
> only. YouTube transcript support is a future sprint (see spec §10.6).

---

## Architecture Overview

The web search tool follows the **no-op command** pattern used by the
audio and chart tools:

```
ToolDescriptor (no-op) → ChatPresenter → BlockNode → RichContentRenderer
  → WebSearchResultCard → /api/web-search → adminWebSearch()
```

1. **Backend** — `AdminWebSearchCommand.execute()` returns a success string
2. **ChatPresenter** — maps the `tool_call` SSE event to a `WEB_SEARCH` BlockNode
3. **RichContentRenderer** — dispatches to `WebSearchResultCard` (dynamic import)
4. **WebSearchResultCard** — auto-fetches `/api/web-search`, shows progress stages
5. **API route** — ADMIN auth check, lazy-cached OpenAI client, calls `adminWebSearch()`

---

## Available Assets (from Librarian Sprints)

| Asset | Purpose | Sprint 1 Use |
|-------|---------|-------------|
| `src/lib/chat/tool-composition-root.ts` | Chat tool registry composition root | Register `admin_web_search` |
| `src/core/ports/tool-registry.ts` | `ToolDescriptor`, `ToolCommand` interfaces | Implement no-op command |
| `src/core/entities/rich-content.ts` | `BLOCK_TYPES`, `BlockNode` union type | Add `WEB_SEARCH` block |
| `src/adapters/ChatPresenter.ts` | Maps SSE events to rich content blocks | Add `tool_call` → block mapping |
| `src/frameworks/ui/RichContentRenderer.tsx` | Dispatches blocks to components | Add `WebSearchResultCard` entry |
| `src/components/ToolCard.tsx` | Shared chrome for tool result cards | Wrap `WebSearchResultCard` |
| `ChatPolicyInteractor.ts` | Role-based LLM directives with tool listings | Add `admin_web_search` to ADMIN block |
| `.env.local` | Contains `OPENAI_API_KEY` | Read by `openai` SDK constructor |

---

## Task 1.1 — Install `openai` npm package

**What:** Add the official OpenAI SDK for Responses API access.

```bash
npm install openai
```

The `openai` package provides typed access to `client.responses.create()`
with the `web_search` built-in tool.

### Verify

```bash
npx tsc --noEmit
```

---

## Task 1.2 — Create `mcp/web-search-tool.ts` `[WEBSEARCH-060]`

**What:** Extracted tool logic module following the established pattern
(`mcp/embedding-tool.ts`, `mcp/librarian-tool.ts`). A single exported
async function validates input, calls the OpenAI Responses API, parses
the response, and returns a plain result object.

| Item | Detail |
|------|--------|
| **Create** | `mcp/web-search-tool.ts` |
| **Pattern** | Matches `mcp/embedding-tool.ts` — dependency injection via interface |

### `WebSearchToolDeps` interface

```typescript
import type OpenAI from "openai";

export interface WebSearchToolDeps {
  openai: OpenAI;  // pre-configured client instance
}
```

### Result types

```typescript
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
```

### `adminWebSearch` function signature

```typescript
export async function adminWebSearch(
  deps: WebSearchToolDeps,
  args: {
    query: string;
    allowed_domains?: string[];
    model?: string;
  },
): Promise<WebSearchResult | WebSearchError>
```

### Verify

```bash
npx tsc --noEmit
```

---

## Task 1.3 — Implement input validation `[WEBSEARCH-090]`

**What:** Validate query constraints before making any API call.

### Implementation

```typescript
// 1. Validate query
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
```

### Verify

```bash
npx vitest run tests/mcp/web-search-tool.test.ts  # targeted tests (after Task 1.10)
```

---

## Task 1.4 — Implement tool config builder `[WEBSEARCH-050]`

**What:** Build the OpenAI `web_search` tool configuration, with optional
domain filtering.

### Implementation

```typescript
const model = args.model || "gpt-5";

const toolConfig: Record<string, unknown> = { type: "web_search" };
if (args.allowed_domains && args.allowed_domains.length > 0) {
  toolConfig.filters = { allowed_domains: args.allowed_domains };
}
```

### Edge cases

- `allowed_domains` is `undefined` → no filter (search all domains)
- `allowed_domains` is `[]` (empty array) → no filter (per §5.3 acceptance rules)
- `allowed_domains` is `["en.wikipedia.org"]` → filters to Wikipedia only

---

## Task 1.5 — Implement Responses API call with citation/source extraction

**What:** Call `client.responses.create()` and parse the response to
extract answer text, citations, and sources.

### Implementation

```typescript
// Call Responses API [WEBSEARCH-020]
const response = await deps.openai.responses.create({
  model,
  input: args.query,
  tools: [toolConfig as Parameters<typeof deps.openai.responses.create>[0]["tools"][number]],
  include: ["web_search_call.action.sources"],
});

// Extract answer text
const messageItem = response.output.find(
  (item: { type: string }) => item.type === "message",
);
if (!messageItem || !("content" in messageItem)) {
  return { error: "No answer text in response" };
}

const content = (messageItem as {
  content: Array<{ type: string; text?: string; annotations?: unknown[] }>;
}).content;
const textContent = content.find((c) => c.type === "output_text");
if (!textContent || !textContent.text) {
  return { error: "No answer text in response" };
}

// Extract citations [WEBSEARCH-030]
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

// Extract sources [WEBSEARCH-040]
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
```

### Key design decisions

- **`include: ["web_search_call.action.sources"]`** — requests the full
  source URL list, not just inline citations `[WEBSEARCH-040]`
- **Citation `start_index` / `end_index`** — character offsets into the
  answer text for precise attribution `[WEBSEARCH-030]`
- **Source deduplication** — `!sources.includes(s.url)` prevents duplicates

---

## Task 1.6 — Implement error handling `[WEBSEARCH-070, WEBSEARCH-080]`

**What:** Catch API errors and return structured error objects. Never
throw unhandled exceptions from the tool function.

### Implementation

```typescript
try {
  // ... API call (Task 1.5) ...
} catch (err: unknown) {
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
```

### Error scenarios

| Scenario | Behavior |
|----------|----------|
| 401 Unauthorized (bad key) | `{ error: "...", code: 401 }` |
| 429 Rate Limited | `{ error: "...", code: 429 }` |
| 500 Server Error | `{ error: "...", code: 500 }` |
| Network failure | `{ error: "message from Error" }` |
| Missing `OPENAI_API_KEY` | `{ error: "OPENAI_API_KEY environment variable is not set" }` (from Task 1.3) |

---

## Task 1.7 — Create no-op ToolDescriptor `[WEBSEARCH-010, WEBSEARCH-060]`

**What:** Create the tool descriptor following the no-op command pattern.
The `execute()` method returns a success message — the real work is done
client-side via the API route.

### Create `src/core/use-cases/tools/admin-web-search.tool.ts`

```typescript
import type { ToolDescriptor, ToolCommand } from "@/core/ports/tool-registry";

class AdminWebSearchCommand implements ToolCommand {
  async execute(): Promise<string> {
    return "Success. Web search results rendered in the chat UI.";
  }
}

export function createAdminWebSearchTool(): ToolDescriptor {
  return {
    name: "admin_web_search",
    description:
      "Search the live web using OpenAI and return a sourced answer with citations. Use allowed_domains to target specific sites. Admin only.",
    schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query (max 2000 characters).",
        },
        allowed_domains: {
          type: "array",
          description: "Optional list of domains to restrict results to.",
          items: { type: "string" },
        },
        model: {
          type: "string",
          description: 'OpenAI model to use. Default: "gpt-5".',
        },
      },
      required: ["query"],
    },
    roles: ["ADMIN"],
    category: "content",
    command: new AdminWebSearchCommand(),
  };
}
```

### Key design decisions

- **No dependencies** — `createAdminWebSearchTool()` takes no arguments
  (unlike the MCP pattern). The OpenAI client lives in the API route.
- **Always registered** — no env check. The tool descriptor doesn't need
  `OPENAI_API_KEY`; the API route handles that at call time.
- **`roles: ["ADMIN"]`** — RBAC enforced at the tool registry level.

### Verify

```bash
npx tsc --noEmit
```

---

## Task 1.8 — Register in `tool-composition-root.ts` `[WEBSEARCH-010]`

**What:** Register the tool descriptor unconditionally in the composition
root. No OpenAI import needed.

### Change to `src/lib/chat/tool-composition-root.ts`

```typescript
import { createAdminWebSearchTool } from "@/core/use-cases/tools/admin-web-search.tool";

// In composeTools():
reg.register(createAdminWebSearchTool());
```

### Verify

```bash
npx vitest run tests/tool-registry.integration.test.ts
```

---

## Task 1.9 — Add `WEB_SEARCH` block type

**What:** Extend `rich-content.ts` with the new block type for web
search results.

### Changes to `src/core/entities/rich-content.ts`

1. Add to `BLOCK_TYPES`:

```typescript
WEB_SEARCH: "web-search",
```

2. Add to `BlockNode` union:

```typescript
| {
    type: typeof BLOCK_TYPES.WEB_SEARCH;
    query: string;
    allowed_domains?: string[];
    model?: string;
  }
```

---

## Task 1.10 — Wire `ChatPresenter` tool_call → block mapping

**What:** Map the `admin_web_search` tool call to a `WEB_SEARCH` BlockNode.

### Changes to `src/adapters/ChatPresenter.ts`

1. Add to `TOOL_NAMES`:

```typescript
ADMIN_WEB_SEARCH: "admin_web_search",
```

2. Add case in tool_call handler:

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

---

## Task 1.11 — Create `/api/web-search` route

**What:** Server-side API route that performs the actual OpenAI web
search. Verifies ADMIN auth independently.

### Create `src/app/api/web-search/route.ts`

```typescript
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { adminWebSearch, type WebSearchToolDeps } from "@/../mcp/web-search-tool";
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

### Security layers

- **ToolRegistry RBAC** — prevents non-admin users from seeing/calling
  the tool in the chat UI
- **API route auth** — `getSessionUser()` check ensures direct API calls
  (e.g., curl) are also blocked for non-admins

---

## Task 1.12 — Create `WebSearchResultCard` component

**What:** Client-side UI component with progressive feedback, answer
display, citations, sources, and markdown download.

### Create `src/components/WebSearchResultCard.tsx`

**Stage-based progress:**

| Stage | Label | Progress |
|-------|-------|----------|
| `connecting` | Connecting… | 5% |
| `searching` | Searching the web… | 20% |
| `reading-sources` | Reading sources… | 50% |
| `composing` | Composing answer… | 75% |
| `done` | Done | 100% |
| `error` | Error | 0% |

**Features:**
- `useReducer` state machine for predictable stage transitions
- Auto-fetches `/api/web-search` on mount with stage progression
- Elapsed time ticker (updates every 100ms during search)
- Animated progress bar (asymptotic, caps at 95% over ~12s)
- Answer text with inline citation links (numbered superscripts)
- Sources displayed as domain-name pills
- `buildMarkdown()` generates downloadable `.md` file
- Wrapped in `ToolCard` with `expandable={true}` and `onDownload`

---

## Task 1.13 — Wire `RichContentRenderer`

**What:** Dynamic import with SSR disabled, stable key, block registry.

### Changes to `src/frameworks/ui/RichContentRenderer.tsx`

```typescript
const WebSearchResultCard = dynamic(
  () => import("@/components/WebSearchResultCard"),
  { ssr: false, loading: () => <p className="p-4 text-sm …">Loading…</p> },
);
```

Block registry entry:

```typescript
case BLOCK_TYPES.WEB_SEARCH:
  return (
    <WebSearchResultCard
      key={`websearch-${block.query.substring(0, 60)}`}
      query={block.query}
      allowedDomains={block.allowed_domains}
      model={block.model}
    />
  );
```

---

## Task 1.14 — Update `ChatPolicyInteractor.ts` ADMIN directive `[WEBSEARCH-010]`

**What:** Add `admin_web_search` to the ADMIN role's tool listing so the
LLM knows the capability exists and how to use domain filtering.

### Change

Add after the librarian tool listings in the ADMIN directive:

```typescript
"",
"ADMIN-ONLY TOOL — Web Search:",
"- **admin_web_search**: Search the live web with optional domain targeting.",
"  You MUST call this tool directly when the user requests a web search.",
```

### Verify

```bash
npx vitest run tests/core-policy.test.ts
```

---

## Task 1.15 — Unit tests (16 tests)

**What:** 16 unit tests for `adminWebSearch` using a mock OpenAI client.
No real API calls.

### Test file: `tests/mcp/web-search-tool.test.ts`

```typescript
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type OpenAI from "openai";
import { adminWebSearch, type WebSearchToolDeps } from "../../mcp/web-search-tool";
```

### Mock factory

```typescript
function mockOpenAI(overrides?: {
  output?: unknown[];
  error?: Error;
}): WebSearchToolDeps {
  const create = overrides?.error
    ? vi.fn().mockRejectedValue(overrides.error)
    : vi.fn().mockResolvedValue({ output: overrides?.output ?? [] });
  return {
    openai: { responses: { create } } as unknown as OpenAI,
  };
}

// Standard successful response
const MOCK_OUTPUT = [
  {
    type: "web_search_call",
    action: {
      sources: [
        { url: "https://en.wikipedia.org/wiki/Transistor" },
        { url: "https://example.com/transistors" },
      ],
    },
  },
  {
    type: "message",
    content: [
      {
        type: "output_text",
        text: "The transistor was invented in 1947.",
        annotations: [
          {
            type: "url_citation",
            url: "https://en.wikipedia.org/wiki/Transistor",
            title: "Transistor - Wikipedia",
            start_index: 0,
            end_index: 36,
          },
        ],
      },
    ],
  },
];
```

### Test cases

| # | Test | Area |
|---|------|------|
| 1 | rejects empty query | Input validation |
| 2 | rejects whitespace-only query | Input validation |
| 3 | rejects query over 2000 characters | Input validation |
| 4 | returns error when OPENAI_API_KEY is unset | API key check |
| 5 | defaults model to gpt-5 when omitted | Default model |
| 6 | passes allowed_domains as filters | Domain filtering |
| 7 | omits filters when allowed_domains is empty array | Domain filtering |
| 8 | extracts answer text from response | Answer extraction |
| 9 | returns error when response has no message item | Answer extraction |
| 10 | extracts url_citation annotations | Citation extraction |
| 11 | returns empty citations when no annotations present | Citation extraction |
| 12 | extracts sources from web_search_call | Source extraction |
| 13 | returns empty sources when no web_search_call present | Source extraction |
| 14 | returns structured error with status code on API error | Error handling |
| 15 | returns error message for non-API errors | Error handling |
| 16 | full mock response parsed correctly (end-to-end) | End-to-end |

### Environment variable handling for test 4

```typescript
it("returns error when OPENAI_API_KEY is unset", async () => {
  const saved = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const result = await adminWebSearch(
      mockOpenAI({ output: MOCK_OUTPUT }),
      { query: "test" },
    );
    expect(result).toEqual({
      error: "OPENAI_API_KEY environment variable is not set",
    });
  } finally {
    if (saved) process.env.OPENAI_API_KEY = saved;
  }
});
```

### Verify

```bash
npx vitest run tests/mcp/web-search-tool.test.ts
```

---

## Task 1.16 — Integration tests

**What:** Verify RBAC, tool descriptor, and composition root wiring.

### Tests in `tests/core-policy.test.ts`

- ADMIN role sees `admin_web_search` in 12 tool schemas
- Tool descriptor has correct `name`, `roles`, `category`, `schema`

### Tests in `tests/tool-registry.integration.test.ts`

- Registry has exactly 12 tools after full composition

### Verify

```bash
npx vitest run tests/core-policy.test.ts tests/tool-registry.integration.test.ts
```

---

## Task 1.17 — Full suite green, build clean

**What:** Run the complete test suite and build to verify no regressions.

```bash
npm run lint
npm run build
npx vitest run
```

**Expected:** 376 tests passing (359 existing + 16 unit + 1 RBAC), zero
lint errors, build succeeds.
