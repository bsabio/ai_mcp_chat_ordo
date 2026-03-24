# Flexible Graphing System — Quantitative Visualization Tooling

> **Status:** Draft v0.1
> **Date:** 2026-03-24
> **Scope:** Add a new `generate_graph` capability for quantitative visualization of system metrics and arbitrary user-provided data. This feature complements `generate_chart` (Mermaid diagrams) with a graph-first runtime for time series, comparisons, distributions, relationships, and operational dashboards. Sprint 0 is intentionally live: the first shipped increment must already render real graphs for end users, not placeholders.
> **Dependencies:** [Tool Architecture](../tool-architecture/spec.md) (complete), [Tool Manifest](../tool-manifest/spec.md) (implemented), [Chat Experience](../chat-experience/spec.md) (in progress), [Interactive Chat Actions](../interactive-chat-actions/spec.md) (draft), existing `generate_chart` implementation in `src/core/use-cases/tools/generate-chart.tool.ts`
> **Affects:** `src/core/use-cases/tools/`, `src/adapters/ChatPresenter.ts`, `src/core/entities/rich-content.ts`, `src/frameworks/ui/RichContentRenderer.tsx`, `src/components/`, `src/lib/chat/tool-composition-root.ts`, related tests
> **Motivation:** `generate_chart` now handles diagrams well, but Mermaid is the wrong substrate for flexible quantitative graphing. Studio Ordo needs a graphing tool that can visualize operational metrics, time series, value distributions, comparisons, forecasts, and arbitrary tabular data with the same agentic usability as the chart tool.
> **Requirement IDs:** `FGS-010` through `FGS-199`

---

## 1. Problem Statement

### 1.1 Context

The current visualization path is centered on `generate_chart`, which renders Mermaid diagrams inline in the chat UI. That is appropriate for:

- architecture diagrams
- workflow maps
- mindmaps
- funnel or decision-flow sketches
- qualitative operator maps

It is not appropriate for quantitative graphs where the user needs:

- time on the x-axis
- values on the y-axis
- multiple series
- grouped or stacked bars
- scatterplots or bubble plots
- distributions or histograms
- table-backed, auditable data views

The system increasingly produces operational answers about funnel leakage, lead velocity, routing risk, conversion timing, and customer outcomes. Those answers need a visualization tool designed for data, not diagrams. `[FGS-010]`

### 1.2 Verified Gaps

1. `generate_chart` accepts Mermaid, which is flexible for diagrams but awkward for precise quantitative plotting. `[FGS-011]`
2. There is no tool contract for graph-first data structures like rows, series, encodings, aggregations, or time parsing. `[FGS-012]`
3. The chat renderer has no dedicated graph block type, only a Mermaid-backed code-block path. `[FGS-013]`
4. The agent has no clean way to say “plot weekly conversions by lane” without dropping into hand-written syntax. `[FGS-014]`
5. There is no runtime distinction between a conceptual chart and an analytical graph, so UX labels, export names, and accessibility treatment are too generic. `[FGS-015]`
6. System data sources such as funnel analytics, routing-review metrics, lead queues, and conversation counts have no graph-oriented adapter layer. `[FGS-016]`

### 1.3 Why This Matters

- **Founder/operator decisions are increasingly numeric.** The platform already surfaces counts, timing, drop-off, and ranking signals. Graphs make those signals legible quickly. `[FGS-017]`
- **Time-series reasoning is weak in prose alone.** When the user asks about change over time, slope, acceleration, or variance, a graph is often the shortest truthful answer. `[FGS-018]`
- **Quantitative visualizations must be auditable.** A graph should expose the data rows and transforms that produced it, not just render a pretty shape. `[FGS-019]`
- **The system needs one flexible graph grammar, not a proliferation of narrow one-off tools.** `[FGS-020]`

---

## 2. Design Goals

1. **Graph-first, not diagram-first.** `generate_graph` is for quantitative visualization. `generate_chart` remains for Mermaid diagrams. `[FGS-040]`
2. **Two input modes.** The tool must accept both a high-level structured graph spec and an advanced raw graph grammar payload for escape-hatch cases. `[FGS-041]`
3. **Arbitrary data support.** The tool must work for system-derived data and user-provided data. `[FGS-042]`
4. **Time-series friendly.** Time, date, and duration fields must be first-class. `[FGS-043]`
5. **Declarative and auditable.** The graph payload must clearly show data, encodings, transforms, and labels. `[FGS-044]`
6. **UI parity with chart tool.** Inline rendering, expansion, download, captioning, and graceful error states must match the `generate_chart` experience. `[FGS-045]`
7. **Accessible by default.** Every graph must provide a textual summary and table fallback or inspectable underlying values. `[FGS-046]`
8. **Role-aware tool exposure.** The new tool should follow the same RBAC and tool-manifest rules as other UI tools. `[FGS-047]`
9. **Safe transform surface.** The graph tool must not execute arbitrary code. Only declarative graph specs and validated transforms are allowed. `[FGS-048]`
10. **Agent-usable schema.** The input schema must be rich enough that the model can build good graphs without memorizing a third-party library’s entire syntax. `[FGS-049]`

---

## 3. Architecture

### 3.1 Tool Separation

Two visualization tools should coexist:

| Tool | Purpose | Rendering Substrate |
| --- | --- | --- |
| `generate_chart` | Diagrams, flows, conceptual structures | Mermaid |
| `generate_graph` | Quantitative data graphs, trends, comparisons, distributions | Graph grammar runtime |

`generate_graph` should not replace `generate_chart`; it should cover the analytical use cases Mermaid handles poorly. `[FGS-060]`

### 3.2 Preferred Rendering Model

The rendering substrate for this feature is **Vega-Lite-compatible declarative specs**, because it supports:

- line/area/bar/scatter/bubble
- layered and multi-series graphs
- temporal axes
- transforms (aggregate, filter, calculate, fold, pivot, bin, sort)
- tooltips and legends
- JSON-serializable, safe declarative payloads

This is a deliberate product decision, not an open implementation question. The system-facing tool should not expose raw Vega-Lite as the primary contract. Instead, it should expose a Studio Ordo graph spec that compiles into validated Vega-Lite. Raw Vega-Lite remains the advanced escape hatch only. `[FGS-061]`

### 3.3 High-Level Tool Contract

```typescript
type GenerateGraphInput = {
  title?: string;
  caption?: string;
  summary?: string;
  downloadFileName?: string;
  data?: {
    rows?: Array<Record<string, string | number | boolean | null>>;
    source?: GraphDataSource;
  };
  spec?: StudioGraphSpec;
  vegaLite?: Record<string, unknown>; // advanced escape hatch
};
```

`GenerateGraphInput` must allow two modes:

1. **Structured mode**: `data + spec`
2. **Advanced mode**: validated `vegaLite`

At least one of these modes is required. `[FGS-062]`

### 3.4 Studio Graph Spec

The structured `spec` contract should support a common graph grammar without forcing the agent to hand-author low-level Vega-Lite:

```typescript
type StudioGraphSpec = {
  graphType:
    | "line"
    | "area"
    | "bar"
    | "grouped-bar"
    | "stacked-bar"
    | "scatter"
    | "bubble"
    | "histogram"
    | "heatmap"
    | "table";
  x?: GraphFieldEncoding;
  y?: GraphFieldEncoding;
  color?: GraphFieldEncoding;
  size?: GraphFieldEncoding;
  tooltip?: GraphFieldEncoding[];
  series?: string;
  stack?: boolean;
  orientation?: "vertical" | "horizontal";
  interpolation?: "linear" | "step" | "monotone";
  annotations?: GraphAnnotation[];
  transforms?: GraphTransform[];
  config?: GraphVisualConfig;
};
```

`GraphFieldEncoding` should capture:

- field name
- semantic type: `quantitative | temporal | nominal | ordinal`
- optional aggregation (`sum`, `avg`, `count`, `min`, `max`, `median`)
- formatting hints (currency, percent, integer, days, hours)
- scale hints (domain, clamp, log)

`[FGS-063]` through `[FGS-069]`

### 3.5 Graph Data Sources

The tool must support two classes of data source:

#### A. Inline rows

Used when the model already has the data values in context:

```typescript
data: {
  rows: [
    { week: "2026-03-01", anonymous: 53, converted: 1 },
    { week: "2026-03-08", anonymous: 48, converted: 4 },
  ];
}
```

#### B. System datasets

Used when the graph should be built from runtime-owned data:

```typescript
type GraphDataSource = {
  sourceType:
    | "analytics_funnel"
    | "lead_queue"
    | "routing_review"
    | "conversation_activity"
    | "training_path_progress";
  params?: Record<string, string | number | boolean>;
};
```

Each `sourceType` must map to a validated server-side loader that returns rows, schema metadata, and provenance. `[FGS-070]`

Arbitrary user-provided data must flow through inline `data.rows`. The model must never author SQL, table names, or ad-hoc query text as graph input. If the product later needs reusable internal datasets beyond the fixed `sourceType` list, that should be added as a server-owned dataset-handle mechanism rather than an open-ended query surface.

### 3.6 Transform Model

The tool needs a safe, declarative transform pipeline:

```typescript
type GraphTransform =
  | { type: "filter"; field: string; operator: "=" | "!=" | ">" | ">=" | "<" | "<=" | "in"; value: unknown }
  | { type: "calculate"; as: string; expression: "safe derived field expression" }
  | { type: "aggregate"; groupBy?: string[]; measures: Array<{ field?: string; op: string; as: string }> }
  | { type: "sort"; field: string; direction: "asc" | "desc" }
  | { type: "limit"; value: number }
  | { type: "bin"; field: string; as: string; maxBins?: number }
  | { type: "fold"; fields: string[]; as?: [string, string] };
```

Expressions must be constrained and compiled through a safe mapper. No raw JavaScript execution is permitted. `[FGS-071]`

### 3.7 Rich Content And Rendering

The rich content system should add a first-class `graph` block:

```typescript
| {
    type: "graph";
    title?: string;
    caption?: string;
    summary?: string;
    downloadFileName?: string;
    spec: Record<string, unknown>;
    dataPreview?: Array<Record<string, unknown>>;
  }
```

This keeps graph rendering semantically distinct from Mermaid code blocks. `[FGS-072]`

The UI should introduce a `GraphRenderer` component that:

- renders the graph inline
- supports expand/full-screen
- supports PNG/SVG/JSON export where practical
- displays a summary line
- exposes a data-preview table or “view data” drawer
- shows clean error states without leaking raw graph grammar text

`[FGS-073]`

### 3.8 Tool Roles

`generate_graph` should mirror `generate_chart` initially:

```typescript
roles: ["AUTHENTICATED", "APPRENTICE", "STAFF", "ADMIN"]
```

`ANONYMOUS` stays excluded unless and until the product explicitly wants public graphing. `[FGS-074]`

---

## 4. Security And Safety

1. **No arbitrary code execution.** Raw JS expressions are not accepted. `[FGS-090]`
2. **Schema validation is mandatory.** Invalid graph payloads must fail server-side and be returned to the model as tool errors. `[FGS-091]`
3. **System data sources are whitelisted.** The graph tool cannot query arbitrary tables by name. `[FGS-092]`
4. **Transforms are declarative only.** Any `calculate`-like field derivation must use a constrained expression grammar or a fixed operator set. `[FGS-093]`
5. **Sensitive fields stay filtered.** The graph loader layer must explicitly remove secrets, raw PII, and internal IDs unless those fields are intentionally whitelisted. `[FGS-094]`
6. **Result provenance is retained.** When the graph is built from system data, the payload should preserve source metadata for QA and auditing. `[FGS-095]`

---

## 5. Testing Strategy

### 5.1 Unit Tests

- graph payload resolver
- graph spec → Vega-Lite compilation
- transform validation
- tool command validation and error handling
- data source resolver guards

### 5.2 Presenter And Rich Content Tests

- `tool_call` → graph block mapping
- invalid graph payload suppression
- graph metadata preservation (`title`, `caption`, `summary`, `downloadFileName`)

### 5.3 Renderer Tests

- inline graph rendering
- loading/error/success states
- data preview toggle
- download/export controls

### 5.4 Contract Tests

- tool manifest includes `generate_graph` for permitted roles only
- role directives do not mention `generate_graph` for excluded roles
- system prompt graph guidance stays aligned with schema

### 5.5 Browser Tests

- time-series graph renders in Chrome/Safari-compatible path
- large datasets degrade gracefully
- fullscreen/expanded graph interaction works
- data preview remains readable on mobile

Target initial coverage: 20-30 focused tests across payload resolution, presenter mapping, renderer behavior, and RBAC/tool-manifest contract updates. `[FGS-100]`

---

## 6. Sprint Plan

| Sprint | Goal |
| --- | --- |
| 0 | Ship a live `generate_graph` tool with a minimal real renderer and role-contract updates |
| 1 | Add structured graph grammar, system-data sources, and validated transform pipeline |
| 2 | Add agent guidance, export/data-preview UX, browser hardening, and contract coverage |

---

## 7. Future Considerations

1. Add forecast overlays and confidence bands for time-series analysis.
2. Support small multiples and faceting for lane-by-lane or segment-by-segment comparisons.
3. Support graph templates for recurring operator views: funnel trend, response latency, lead velocity, churn risk.
4. Add MCP-facing graph generation endpoints once the chat-local implementation stabilizes.
5. Add a persistent graph gallery or saved visualization workspace if users start curating repeatable visual reports.
