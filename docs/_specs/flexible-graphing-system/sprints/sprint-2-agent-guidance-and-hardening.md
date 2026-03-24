# Sprint 2 — Agent Guidance And Hardening

> **Goal:** Make the graph tool easy for the model to use correctly, while hardening export, browser behavior, and prompt/tool-manifest alignment.
> **Spec Sections:** `FGS-044` through `FGS-049`, `FGS-090` through `FGS-100`
> **Prerequisite:** Sprint 1 complete

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/core/use-cases/SystemPromptBuilder.ts` | `withToolManifest()` builds a live tool section from `ToolRegistry.getSchemasForRole(role)`. Once `generate_graph` is registered, its description becomes visible to the model automatically. |
| `tests/tool-manifest-contract.test.ts` | Contract suite already enforces that manifests derive from the registry and contain no ghost tools. Add graph-specific assertions only where behavior requires it. |
| `tests/system-prompt-assembly.test.ts` | Assembled prompt contract verifies exact tool presence by role. Sprint 0 should already have updated expected role tool sets, so this sprint extends guidance and coverage rather than introducing the tool for the first time. |
| `src/components/MermaidRenderer.tsx` | Existing visualization renderer already supports download, expand, error states, and contextual headers. `GraphRenderer` should reach parity with this affordance set. |

---

## Tasks

### 1. Add graph usage guidance to prompt and tool description

Update the `generate_graph` tool description so the model knows when to use it:

- time-series questions
- comparisons across segments or categories
- distributions and outlier analysis
- when the user explicitly asks for a graph, trend, plot, values over time, or custom visualization

Add examples to the schema description showing structured graph specs, not just raw graph-runtime JSON.

Verify: `npm exec vitest run tests/tool-manifest-contract.test.ts tests/system-prompt-assembly.test.ts`

### 2. Harden GraphRenderer UX

Add:

- full-screen mode
- JSON export for the resolved graph spec
- data-preview toggle
- empty-state and invalid-spec handling
- responsive overflow behavior for mobile

Verify: `npm exec vitest run src/components/GraphRenderer.test.tsx tests/browser-fab-mobile-density.test.tsx`

### 3. Add browser and runtime verification

Create graph-specific browser/runtime coverage for:

- a temporal line graph
- a grouped comparison graph
- a graph built from system data source rows
- graph expansion and export controls

The existing generic browser utility suites are not sufficient verification for this feature. Add dedicated graph tests, for example:

- `tests/browser-graph-rendering.test.tsx`
- `tests/browser-graph-data-preview.test.tsx`

Verify: `npm exec vitest run src/components/GraphRenderer.test.tsx tests/browser-graph-rendering.test.tsx tests/browser-graph-data-preview.test.tsx`

### 4. Align role contracts and handbook docs

Update:

- user handbook MCP/tool catalog as needed
- architecture/operations docs if graphing becomes part of the standard operator surface

If prompt wording or role guidance changes in this sprint, keep contract tests green rather than deferring prompt-manifest parity work.

Verify: `npm exec vitest run tests/core-policy.test.ts tests/tool-manifest-contract.test.ts tests/system-prompt-assembly.test.ts`

---

## Completion Checklist

- [ ] tool description teaches correct graph use
- [ ] GraphRenderer reaches feature parity with MermaidRenderer affordances
- [ ] browser/runtime verification added
- [ ] role contracts updated
- [ ] docs updated where required

## QA Deviations

- None yet
