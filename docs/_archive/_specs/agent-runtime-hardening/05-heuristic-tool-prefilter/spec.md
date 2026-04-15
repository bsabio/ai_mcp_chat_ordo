# Heuristic Tool Pre-Filter

> **Status:** Draft v0.1
> **Date:** 2026-04-08
> **Scope:** Add a prompt-scoring pass before the LLM tool manifest is assembled so that each request receives only the K most contextually relevant tool schemas, rather than the full role-filtered registry. Modeled on the `route_prompt()` scoring function and `simple_mode` flag from the Claude Code harness.
> **Dependencies:** [Tool Architecture](../../tool-architecture/spec.md), [Conversation Lane Routing](../../conversation-lane-routing/spec.md), [Chat Experience](../../chat-experience/spec.md)
> **Affects:** `src/lib/chat/tool-composition-root.ts`, `src/app/api/chat/stream/route.ts`, `src/lib/chat/stream-pipeline.ts`, `src/core/tool-registry/ToolRegistry.ts`
> **Motivation:** The tool manifest sent to the LLM on every request currently includes every tool available to the user's role. As the tool registry grows, this wastes tokens, increases latency, and degrades LLM response quality — the model receives irrelevant tools that compete for attention. Claude Code's harness solves this with a scored routing pass that selects only the most relevant tools for the current prompt before the LLM context is assembled.
> **Requirement IDs:** `HTP-001` through `HTP-099`

---

## 1. Problem Statement

### 1.1 Current State

In `tool-composition-root.ts`, `getToolComposition()` builds a registry by registering all available tool bundles and filtering by instance config. In the stream route handler, `toolRegistry.getSchemasForRole(role)` returns every tool schema available to the role and passes the full array to the Anthropic API call. `[HTP-001]`

### 1.2 Verified Issues

| # | Issue | Evidence | Impact |
|---|---|---|---|
| 1 | **Full manifest on every request** | `const tools = toolRegistry.getSchemasForRole(role) as Anthropic.Tool[]` — no pre-filter applied. | Every request sends corpus tools, calculator tools, navigation tools, admin tools, etc., even when only one is relevant. |
| 2 | **Token cost grows with registry size** | Tool schema JSON is included verbatim in the Anthropic API request body. | Each new tool registered system-wide increases per-request token cost for all users. |
| 3 | **LLM tool selection degrades under noise** | Anthropic models select tools based on schema relevance to the current prompt. | A medical question should not see blog-drafting tools competing for selection. |
| 4 | **No signal from routing analysis** | `HeuristicConversationRoutingAnalyzer` produces a lane (`organization`, `individual`, `development`) but this signal is never used to filter the tool manifest. | The routing system's output goes unused in the most critical context-budget decision. |
| 5 | **No lightweight mode for simple queries** | There is no analog to claw-code's `simple_mode` for serving only core tools on clearly simple prompts. | Trivial requests pay the full manifest cost. |

### 1.3 Root Cause

Tool manifest assembly is decoupled from prompt analysis. The registry correctly handles role-based access control but has no mechanism for relevance-based selection. `[HTP-002]`

### 1.4 Why It Matters

Without a pre-filter:

- Token costs scale linearly with registry size for every request regardless of relevance
- LLM tool selection quality degrades as the manifest grows
- The routing lane analysis produces no downstream value in tool selection
- Adding more tools makes every existing request more expensive and noisier

`[HTP-003]`

---

## 2. Design Goals

1. **Score before serve.** Each request must score tool descriptors against the current prompt before assembling the manifest sent to the LLM. `[HTP-010]`
2. **Use routing lane signal.** The active conversation lane (`individual`, `organization`, `development`) must be a first-class input to the scoring function. `[HTP-011]`
3. **Configurable K.** The maximum number of tools sent to the LLM must be configurable per request, per role, or per system config. `[HTP-012]`
4. **Always include critical tools.** Certain tools (e.g., conversation management, navigation) must be pinned as always-included regardless of score. `[HTP-013]`
5. **Transparent and testable.** The scoring function must be a pure function testable without an LLM call. `[HTP-014]`
6. **Non-breaking.** The filter layer must sit on top of the existing RBAC-gated registry and must not change the tool execution path. `[HTP-015]`
7. **Simple mode support.** Requests classified as simple or low-complexity must be able to invoke a reduced tool set (e.g., 3–5 core tools only). `[HTP-016]`

---

## 3. Architecture

### 3.1 Scoring Model

Borrowed directly from claw-code's `PortRuntime._score()`:

```typescript
export interface ToolScoringContext {
  /** The latest user message text */
  latestUserText: string;
  /** Recent conversation messages (last N, for signal building) */
  recentMessages: string[];
  /** Active routing lane, if determined */
  routingLane?: ConversationLane;
  /** Whether this is classified as a simple/low-complexity request */
  simpleMode?: boolean;
}

export interface ScoredTool {
  schema: Anthropic.Tool;
  score: number;
  pinned: boolean;
}

export function scoreTool(
  tool: { name: string; description: string; category: ToolCategory },
  ctx: ToolScoringContext,
): number {
  const corpus = [ctx.latestUserText, ...ctx.recentMessages].join(" ").toLowerCase();
  const tokens = new Set(corpus.split(/\s+/).filter(Boolean));

  let score = 0;

  // Token match against tool name and description
  for (const token of tokens) {
    if (tool.name.toLowerCase().includes(token)) score += 2;
    if (tool.description.toLowerCase().includes(token)) score += 1;
  }

  // Lane affinity bonus
  if (ctx.routingLane) {
    score += laneCategoryBonus(tool.category, ctx.routingLane);
  }

  return score;
}
```

`[HTP-031]`

### 3.2 Lane → Category Affinity Map

```typescript
const LANE_CATEGORY_AFFINITY: Record<ConversationLane, ToolCategory[]> = {
  organization:  ["system", "content", "ui"],
  individual:    ["content", "ui"],
  development:   ["system", "content"],
  uncertain:     [],
};

function laneCategoryBonus(category: ToolCategory, lane: ConversationLane): number {
  return LANE_CATEGORY_AFFINITY[lane]?.includes(category) ? 3 : 0;
}
```

`[HTP-032]`

### 3.3 Pinned Tools

Certain tools must always be included regardless of score:

```typescript
const ALWAYS_PINNED_TOOLS = new Set([
  "navigate_to_page",       // navigation — always relevant
  "get_conversation_info",  // conversation management — always relevant
  "calculate",              // calculator — lightweight, never harmful to include
]);
```

The pinned set must be configurable via instance config to allow environment-specific overrides. `[HTP-033]`

### 3.4 `selectToolsForRequest()` Function

```typescript
export interface ToolSelectionConfig {
  maxTools?: number;           // default: 12
  simpleMode?: boolean;        // default: false
  simpleModeTools?: string[];  // default: ["calculate", "navigate_to_page", "search_corpus"]
  pinnedTools?: Set<string>;   // default: ALWAYS_PINNED_TOOLS
}

export function selectToolsForRequest(
  allTools: Anthropic.Tool[],
  descriptors: ToolDescriptor[],
  ctx: ToolScoringContext,
  config: ToolSelectionConfig = {},
): Anthropic.Tool[] {
  const { maxTools = 12, simpleMode = false, simpleModeTools, pinnedTools = ALWAYS_PINNED_TOOLS } = config;

  if (simpleMode && simpleModeTools) {
    return allTools.filter(t => simpleModeTools.includes(t.name));
  }

  const scored = allTools.map(tool => {
    const descriptor = descriptors.find(d => d.name === tool.name);
    const score = descriptor
      ? scoreTool({ name: tool.name, description: tool.description ?? "", category: descriptor.category }, ctx)
      : 0;
    return { tool, score, pinned: pinnedTools.has(tool.name) };
  });

  const pinned = scored.filter(s => s.pinned).map(s => s.tool);
  const ranked = scored
    .filter(s => !s.pinned)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, maxTools - pinned.length))
    .map(s => s.tool);

  return [...pinned, ...ranked];
}
```

`[HTP-034]`

### 3.5 Integration in Stream Route

```typescript
// In route.ts or stream-pipeline.ts, replace:
const tools = toolRegistry.getSchemasForRole(role) as Anthropic.Tool[];

// With:
const allTools = toolRegistry.getSchemasForRole(role) as Anthropic.Tool[];
const allDescriptors = toolRegistry.getDescriptors(); // new method needed
const scoringCtx: ToolScoringContext = {
  latestUserText,
  recentMessages: incomingMessages
    .filter(m => m.role === "user")
    .slice(-6)
    .map(m => typeof m.content === "string" ? m.content : ""),
  routingLane: preparation.routingSnapshot?.lane,
};
const tools = selectToolsForRequest(allTools, allDescriptors, scoringCtx);
```

`[HTP-035]`

### 3.6 `ToolRegistry` Changes Required

Add a `getDescriptors()` method to `ToolRegistry`:

```typescript
getDescriptors(): ToolDescriptor[] {
  return Array.from(this.tools.values());
}
```

And expose `category` in all tool registrations (already present in `ToolDescriptor`). `[HTP-036]`

### 3.7 Simple Mode Detection

Simple mode is activated when:

- The routing snapshot confidence is high + lane is `individual`
- The latest message is short (< 15 tokens) with no domain-specific terminology
- An explicit config flag is set for the role or instance

Simple mode tool set (configurable, defaults):

```
calculate, navigate_to_page, search_corpus
```

`[HTP-037]`

---

## 4. Security And Access

1. **Pre-filter does not bypass RBAC.** `selectToolsForRequest()` operates on the already RBAC-filtered output of `getSchemasForRole()`. It can only reduce, never expand, the tool set. `[HTP-040]`
2. **Pinned tool list is server-controlled.** The pinned set must not be configurable from user input or client-supplied parameters. `[HTP-041]`
3. **Scoring is deterministic and loggable.** The scored tool list and final selection must be loggable for observability (tool names + scores only — no prompt content in logs). `[HTP-042]`
4. **Simple mode cannot be forced by the client.** Simple mode classification must derive entirely from server-side signal analysis, not from a boolean in the request body. `[HTP-043]`

---

## 5. Testing Strategy

### 5.1 Unit Tests

| Area | Estimated Count | What's Tested |
|---|---|---|
| `scoreTool()` pure function | 10 | Token match, lane bonus, zero-score case, description match |
| `laneCategoryBonus()` | 6 | Each lane × category combination |
| `selectToolsForRequest()` | 12 | maxTools limit, pinned always included, simple mode, ranking order |
| Simple mode detection | 6 | Short message, high-confidence lane, explicit flag |
| RBAC preservation | 4 | Pre-filter never introduces tools not in the RBAC-filtered set |

### 5.2 Integration Tests

| Area | Estimated Count | What's Tested |
|---|---|---|
| Stream route tool selection | 6 | Actual manifest sent to Anthropic respects maxTools |
| Routing lane → tool boost | 4 | Development lane boosts system-category tools |
| Pinned tools always present | 4 | Navigate + calculate always in manifest regardless of prompt |
| Token count reduction | 4 | Verify average manifest token reduction vs baseline |

### 5.3 Existing Test Preservation

Tool execution paths must remain identical. The pre-filter only changes which schemas are sent to the LLM — it does not change the registry's ability to execute any registered tool when selected. `[HTP-050]`

---

## 6. Sprint Plan

| Sprint | Name | Goal | Estimated Tests |
|---|---|---|---|
| **0** | **Scoring Core** | Implement `scoreTool()`, `laneCategoryBonus()`, and `ToolScoringContext`. Add `getDescriptors()` to `ToolRegistry`. | +16 |
| **1** | **Selection Function** | Implement `selectToolsForRequest()` with pinning, maxTools, and simple mode. Unit test suite. | +18 |
| **2** | **Route Integration** | Wire pre-filter into `stream-pipeline.ts`. Add observability logging for selected tool names + scores. | +10 |
| **3** | **Tuning And Measurement** | Benchmark token reduction, measure LLM response quality with A/B manifests, tune `maxTools` default. | +8 |

---

## 7. Future Considerations

1. Embedding-based tool scoring — replace token matching with semantic similarity for higher-quality selection.
2. Per-user tool preference learning — boost tools the user has frequently invoked in past sessions.
3. Dynamic `maxTools` — infer budget from model context window remaining rather than a fixed config.
4. Conversation-phase awareness — early turns get a broader manifest; later turns narrow to tools already used.
5. Tool deprecation scoring — automatically down-rank tools marked for deprecation to smooth transitions.
