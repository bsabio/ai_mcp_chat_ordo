# Sprint 0 — Tool Contract And Renderer

> **Goal:** Introduce a first-class `generate_graph` tool, a graph rich-content block, and a dedicated live renderer so quantitative visualizations no longer piggyback on Mermaid code blocks.
> **Spec Sections:** `FGS-040` through `FGS-049`, `FGS-060` through `FGS-074`
> **Prerequisite:** Current chart-tool work complete (shared chart payload resolver, rich-content metadata path, and focused chart tests passing on 2026-03-24)

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/core/use-cases/tools/generate-chart.tool.ts` | Exports `generateChartTool: ToolDescriptor` with `name: "generate_chart"`, `schema`, `command: new GenerateChartCommand()`, role-scoped UI tool registration. Useful template for `generate_graph`. |
| `src/core/use-cases/tools/UiTools.ts` | Exports `GenerateChartCommand implements ToolCommand<GenerateChartInput, string>`. This file already holds UI-oriented tool commands and should host or neighbor a new `GenerateGraphCommand`. |
| `src/core/entities/rich-content.ts` | `BlockNode` currently includes paragraph, heading, list, blockquote, `code-block`, table, divider, operator-brief, audio, and web-search. This is the correct place to introduce a dedicated `graph` block type. |
| `src/adapters/ChatPresenter.ts` | `present(message)` maps `tool_call` parts into rich-content blocks. Current chart handling uses `resolveGenerateChartPayload()` and pushes a Mermaid-backed block. `generate_graph` should use the same pattern. |
| `src/frameworks/ui/RichContentRenderer.tsx` | Maintains `blockRegistry` keyed by `BlockNode["type"]` and already dynamically loads renderer components like `MermaidRenderer`, `AudioPlayer`, and `WebSearchResultCard`. This is the correct entry point for `GraphRenderer`. |
| `src/components/ToolCard.tsx` | Reusable UI shell for tool outputs with `title`, `subtitle`, `status`, `onDownload`, `expandable`, and `thumbnailMode`. `GraphRenderer` should use this rather than inventing a new card shell. |
| `src/lib/chat/tool-composition-root.ts` | Registers UI tools in `ToolRegistry` and controls role exposure. `generate_graph` must be registered here so `getSchemasForRole()` and the dynamic tool manifest can see it. |
| `tests/helpers/role-tool-sets.ts` | `EXPECTED_ROLE_TOOL_SETS` currently tracks every live tool by role. This file must be updated in the same sprint that registers `generate_graph`, or the prompt-manifest and policy contract tests will fail immediately. |

---

## Tasks

### 1. Create graph payload and tool contract

Create:

- `src/core/use-cases/tools/generate-graph.tool.ts`
- `src/core/use-cases/tools/graph-payload.ts`

Define a high-level `GenerateGraphInput` contract with:

- `title`
- `caption`
- `summary`
- `downloadFileName`
- `data.rows?`
- `data.source?`
- `spec?`
- `vegaLite?`

Implement a `resolveGenerateGraphPayload()` function that validates:

- structured graph mode (`data + spec`)
- advanced mode (`vegaLite`)

Reject malformed payloads with explicit tool errors.

Verify: `npm exec vitest run src/core/use-cases/tools/graph-payload.test.ts`

### 2. Add `GenerateGraphCommand`, register the tool, and update role contracts

Modify:

- `src/core/use-cases/tools/UiTools.ts`
- `src/lib/chat/tool-composition-root.ts`
- `tests/helpers/role-tool-sets.ts`

Add `GenerateGraphCommand` returning a success string analogous to `GenerateChartCommand`, but only after the graph payload resolves successfully.

Register the new descriptor as:

```typescript
roles: ["AUTHENTICATED", "APPRENTICE", "STAFF", "ADMIN"]
category: "ui"
```

Update the expected role tool sets in the same sprint so the live tool manifest and policy-contract tests remain truthful from the first shipped increment.

Verify: `npm exec vitest run tests/core-policy.test.ts tests/tool-manifest-contract.test.ts tests/system-prompt-assembly.test.ts`

### 3. Introduce a first-class graph rich-content block

Modify:

- `src/core/entities/rich-content.ts`
- `src/adapters/ChatPresenter.ts`

Add a `graph` block type carrying:

- `title`
- `caption`
- `summary`
- `downloadFileName`
- resolved graph `spec`
- optional `dataPreview`

`ChatPresenter` must map `generate_graph` `tool_call` parts into this block by calling the shared graph payload resolver. If resolution fails, do not render a broken graph block.

Verify: `npm exec vitest run src/adapters/ChatPresenter.test.ts`

### 4. Add `GraphRenderer` and a minimal real render path

Create:

- `src/components/GraphRenderer.tsx`

Modify:

- `src/frameworks/ui/RichContentRenderer.tsx`

`GraphRenderer` should initially:

- use `ToolCard`
- render loading / success / error states
- show title, caption, summary
- include download and expand affordances
- render a real, shippable minimal subset of graph types in Sprint 0

Sprint 0 is a live end-user increment. Do not ship a placeholder graph surface. The minimum supported subset in Sprint 0 should be:

- `line`
- `bar`
- `scatter`
- `table`

Any structured spec outside that initial subset must fail cleanly with a tool/runtime error rather than producing fake output.

Verify: `npm exec vitest run src/frameworks/ui/RichContentRenderer.test.tsx src/components/GraphRenderer.test.tsx tests/tool-manifest-contract.test.ts tests/system-prompt-assembly.test.ts`

---

## Completion Checklist

- [ ] `generate_graph` tool descriptor created
- [ ] `GenerateGraphCommand` added
- [ ] tool registered in `tool-composition-root.ts`
- [ ] `graph` block type added to rich content
- [ ] `ChatPresenter` maps `generate_graph` parts into graph blocks
- [ ] `GraphRenderer` component created and mounted by `RichContentRenderer`
- [ ] focused tests pass

## QA Deviations

- None yet
