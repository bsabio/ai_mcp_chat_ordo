# Sprint 1 — Graph Grammar And Data Sources

> **Goal:** Expand the live Sprint 0 graphing surface into a genuinely flexible system with broader graph grammar, declarative transforms, and runtime-owned system data loaders.
> **Spec Sections:** `FGS-061` through `FGS-071`
> **Prerequisite:** Sprint 0 complete

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/core/use-cases/tools/chart-payload.ts` | Existing resolver for `generate_chart` already normalizes structured chart input into renderable output. `generate_graph` should follow this pattern with a graph-specific resolver instead of duplicating validation logic inline. |
| `src/core/use-cases/tools/UiTools.test.ts` | Current chart tests cover valid Mermaid, invalid prose, and structured chart specs. This is a useful contract style for new graph tool tests. |
| `src/lib/operator/operator-signal-loaders.ts` | Existing signal loaders expose funnel, anonymous opportunity, lead queue, and routing-review datasets for admin/operator use. This is the right family of runtime-owned data for first system graph sources. |
| `src/core/tool-registry/ToolRegistry.ts` | `getSchemasForRole()` and `canExecute()` enforce role exposure automatically once the tool is registered. No special graph-specific manifest path is needed. |

---

## Tasks

### 1. Expand the Studio graph grammar beyond the Sprint 0 live subset

In `graph-payload.ts`, add a structured `StudioGraphSpec` supporting at minimum:

- `area`
- `grouped-bar`
- `stacked-bar`
- `bubble`
- `histogram`
- `heatmap`

`line`, `bar`, `scatter`, and `table` are already live from Sprint 0 and should remain backward-compatible.

Add field encodings for:

- x
- y
- color
- size
- tooltip

Support semantic types:

- `quantitative`
- `temporal`
- `nominal`
- `ordinal`

Verify: `npm exec vitest run src/core/use-cases/tools/graph-payload.test.ts`

### 2. Add transform compilation and validation

Implement a safe transform pipeline for:

- filter
- aggregate
- sort
- limit
- bin
- fold
- constrained calculate

Compile the Studio graph grammar into a renderable graph-runtime spec.

Reject:

- unsupported graph types
- unknown fields in transforms where schema metadata exists
- illegal calculate expressions

Verify: `npm exec vitest run src/core/use-cases/tools/graph-payload.test.ts src/core/use-cases/tools/UiTools.test.ts`

### 3. Add system-data source adapters

Create a graph data source layer, for example:

- `src/lib/graphs/graph-data-sources.ts`

Initial runtime-owned sources should include:

- analytics funnel
- lead queue summary
- routing review summary
- conversation activity

Do not add an open-ended query source in this sprint. Arbitrary user-provided data continues to flow through inline `data.rows`; runtime-owned data must stay behind explicit server-side source types.

Each loader should return rows plus source metadata. Sensitive internal fields must be stripped before they reach the tool payload.

Verify: `npm exec vitest run src/lib/graphs/graph-data-sources.test.ts`

### 4. Add data preview and summary support

Extend the resolved graph payload so the renderer can show:

- graph summary text
- a small table of source rows or transformed rows
- source/provenance label when system data was used
- browser-level graph interaction coverage for expand, download, and data-preview flows

Verify: `npm exec vitest run src/adapters/ChatPresenter.test.ts src/components/GraphRenderer.test.tsx`
Verify: `npm exec vitest run tests/browser-graph-interactions.test.tsx`

---

## Completion Checklist

- [ ] structured graph grammar supports the first graph families
- [ ] transform compiler exists and validates input
- [ ] system data source loader layer exists
- [ ] data preview path exists
- [ ] browser-level graph interaction coverage exists
- [ ] focused tests pass

## QA Deviations

- None yet
