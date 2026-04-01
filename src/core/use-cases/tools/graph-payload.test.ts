import { describe, expect, it } from "vitest";

import { resolveGenerateGraphPayload } from "./graph-payload";

describe("resolveGenerateGraphPayload", () => {
  it("builds a line graph from the explicit graphType contract using top-level rows", () => {
    const payload = resolveGenerateGraphPayload({
      title: "Lead trend",
      summary: "Qualified leads rose week over week.",
      data: {
        rows: [
          { week: "2026-03-01", leads: 4 },
          { week: "2026-03-08", leads: 7 },
        ],
      },
      spec: {
        graphType: "line",
        xField: "week",
        yField: "leads",
        xType: "temporal",
        yLabel: "Qualified leads",
      },
    });

    expect(payload.title).toBe("Lead trend");
    expect(payload.summary).toBe("Qualified leads rose week over week.");
    expect(payload.dataPreview).toEqual([
      { week: "2026-03-01", leads: 4 },
      { week: "2026-03-08", leads: 7 },
    ]);
    expect(payload.graph.kind).toBe("line");
    expect(payload.graph.x).toEqual({ field: "week", type: "temporal", label: undefined });
    expect(payload.graph.y).toEqual({ field: "leads", type: "quantitative", label: "Qualified leads" });
  });

  it("normalizes a top-level Vega-Lite style point chart into a scatter graph", () => {
    const payload = resolveGenerateGraphPayload({
      vegaLite: {
        mark: "point",
        data: {
          values: [
            { score: 2, revenue: 12, segment: "A" },
            { score: 4, revenue: 18, segment: "B" },
          ],
        },
        encoding: {
          x: { field: "score", type: "quantitative", title: "Lead score" },
          y: { field: "revenue", type: "quantitative", title: "Revenue" },
          color: { field: "segment", type: "nominal", title: "Segment" },
        },
      },
    });

    expect(payload.graph.kind).toBe("scatter");
    expect(payload.graph.series).toEqual({ field: "segment", type: "nominal", label: "Segment" });
  });

  it("supports transform compilation for calculated and filtered graph rows", () => {
    const payload = resolveGenerateGraphPayload({
      data: {
        rows: [
          { week: "2026-03-01", leads: 10, qualified: 2 },
          { week: "2026-03-08", leads: 12, qualified: 6 },
          { week: "2026-03-15", leads: 8, qualified: 4 },
        ],
      },
      spec: {
        graphType: "line",
        xField: "week",
        yField: "conversionRate",
        xType: "temporal",
        transforms: [
          { type: "calculate", as: "conversionRate", expression: "qualified / leads" },
          { type: "filter", field: "qualified", operator: ">", value: 2 },
          { type: "sort", field: "week", direction: "asc" },
        ],
      },
    });

    expect(payload.graph.data).toHaveLength(2);
    expect(payload.graph.data[0].conversionRate).toBe(0.5);
    expect(payload.graph.data[1].conversionRate).toBe(0.5);
  });

  it("builds histograms from quantitative x values", () => {
    const payload = resolveGenerateGraphPayload({
      data: {
        rows: [{ score: 1 }, { score: 2 }, { score: 2.5 }, { score: 9 }],
      },
      spec: {
        graphType: "histogram",
        xField: "score",
      },
    });

    expect(payload.graph.kind).toBe("histogram");
    expect(payload.graph.x?.field).toBe("bin");
    expect(payload.graph.y?.field).toBe("count");
    expect(payload.graph.data.length).toBeGreaterThan(0);
  });

  it("requires resolved source data for source-backed requests", () => {
    expect(() =>
      resolveGenerateGraphPayload({
        data: {
          source: {
            sourceType: "analytics_funnel",
          },
        },
        spec: {
          graphType: "line",
          xField: "week",
          yField: "leads",
        },
      }),
    ).toThrow(/resolved tool result/i);
  });

  it("accepts resolved source data and preserves provenance", () => {
    const payload = resolveGenerateGraphPayload(
      {
        summary: "Routing review pressure is concentrated in the uncertain queue.",
        data: {
          source: {
            sourceType: "routing_review",
          },
        },
        spec: {
          graphType: "bar",
          xField: "bucket",
          yField: "count",
        },
      },
      {
        sourceData: {
          rows: [
            { bucket: "Recently changed", count: 2 },
            { bucket: "Uncertain", count: 5 },
          ],
          source: {
            sourceType: "routing_review",
            label: "Routing review summary",
            rowCount: 2,
            scope: "global",
            audience: "admin_global",
            provenance: ["operator_signal_loaders.loadOperatorRoutingReview"],
          },
        },
      },
    );

    expect(payload.graph.source?.label).toBe("Routing review summary");
    expect(payload.dataPreview).toEqual([
      { bucket: "Recently changed", count: 2 },
      { bucket: "Uncertain", count: 5 },
    ]);
  });

  it("allows table graphs with derived columns", () => {
    const payload = resolveGenerateGraphPayload({
      caption: "Anonymous lead detail",
      spec: {
        graphType: "table",
        data: {
          values: [
            { company: "Acme", stage: "new" },
            { company: "Northwind", stage: "qualified", owner: "Morgan" },
          ],
        },
      },
    });

    expect(payload.graph.kind).toBe("table");
    expect(payload.graph.columns).toEqual(["company", "stage", "owner"]);
  });

  it("rejects graph requests that omit numeric y data", () => {
    expect(() =>
      resolveGenerateGraphPayload({
        data: {
          rows: [{ label: "Week 1", status: "high" }],
        },
        spec: {
          graphType: "bar",
          xField: "label",
          yField: "status",
        },
      }),
    ).toThrow(/numeric value/i);
  });

  it("rejects calculate expressions with illegal syntax", () => {
    expect(() =>
      resolveGenerateGraphPayload({
        data: {
          rows: [{ leads: 5, qualified: 2 }],
        },
        spec: {
          graphType: "line",
          xField: "leads",
          yField: "rate",
          transforms: [{ type: "calculate", as: "rate", expression: "qualified ** leads" }],
        },
      }),
    ).toThrow(/invalid calculate expression|only support identifiers/i);
  });
});