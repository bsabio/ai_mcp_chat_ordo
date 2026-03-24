// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GraphRenderer } from "./GraphRenderer";

const { downloadBlobMock } = vi.hoisted(() => ({
  downloadBlobMock: vi.fn(),
}));

vi.mock("@/lib/download-browser", () => ({
  downloadBlob: downloadBlobMock,
}));

describe("GraphRenderer", () => {
  beforeEach(() => {
    downloadBlobMock.mockReset();
  });

  it("renders a line graph with legend entries", () => {
    render(
      <GraphRenderer
        title="Lead trend"
        caption="Weekly qualified leads"
        summary="Qualified leads increased week over week."
        dataPreview={[
          { week: "W1", leads: 4 },
          { week: "W2", leads: 7 },
        ]}
        graph={{
          kind: "line",
          data: [
            { week: "W1", leads: 4, team: "North" },
            { week: "W2", leads: 7, team: "North" },
            { week: "W1", leads: 3, team: "South" },
            { week: "W2", leads: 6, team: "South" },
          ],
          x: { field: "week", type: "ordinal", label: "Week" },
          y: { field: "leads", type: "quantitative", label: "Qualified leads" },
          series: { field: "team", type: "nominal", label: "Team" },
        }}
      />,
    );

    expect(screen.getByText("Lead trend")).toBeInTheDocument();
    expect(screen.getByTestId("graph-summary")).toHaveTextContent("Qualified leads increased week over week.");
    expect(screen.getByTestId("graph-svg")).toHaveAttribute("data-graph-kind", "line");
    expect(screen.getByTestId("graph-legend")).toHaveTextContent("North");
    expect(screen.getByTestId("graph-legend")).toHaveTextContent("South");
    expect(screen.getByTestId("graph-data-preview")).toHaveTextContent("W1");
  });

  it("toggles the data preview open and closed", () => {
    render(
      <GraphRenderer
        title="Lead trend"
        graph={{
          kind: "line",
          data: [
            { week: "W1", leads: 4 },
            { week: "W2", leads: 7 },
          ],
          x: { field: "week", type: "ordinal", label: "Week" },
          y: { field: "leads", type: "quantitative", label: "Leads" },
        }}
      />,
    );

    expect(screen.getByTestId("graph-data-preview")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hide data preview" }));
    expect(screen.queryByTestId("graph-data-preview")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show data preview" }));
    expect(screen.getByTestId("graph-data-preview")).toBeInTheDocument();
  });

  it("exports the resolved graph payload as json", () => {
    render(
      <GraphRenderer
        title="Lead trend"
        graph={{
          kind: "line",
          data: [
            { week: "W1", leads: 4 },
            { week: "W2", leads: 7 },
          ],
          x: { field: "week", type: "ordinal", label: "Week" },
          y: { field: "leads", type: "quantitative", label: "Leads" },
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Export graph JSON" }));

    expect(downloadBlobMock).toHaveBeenCalledTimes(1);
    const [blob, filename] = downloadBlobMock.mock.calls[0] ?? [];
    expect(blob).toBeInstanceOf(Blob);
    expect(filename).toMatch(/^lead_trend_\d+\.json$/);
  });

  it("uses a continuous x scale for temporal line charts", () => {
    const { container } = render(
      <GraphRenderer
        title="Lead trend"
        graph={{
          kind: "line",
          data: [
            { week: "2026-03-01", leads: 4 },
            { week: "2026-03-02", leads: 6 },
            { week: "2026-04-01", leads: 9 },
          ],
          x: { field: "week", type: "temporal", label: "Week" },
          y: { field: "leads", type: "quantitative", label: "Qualified leads" },
        }}
      />,
    );

    const circles = Array.from(container.querySelectorAll('circle[data-point="Series 1"]'));
    expect(circles).toHaveLength(3);

    const positions = circles.map((circle) => Number(circle.getAttribute("cx")));
    const firstGap = positions[1] - positions[0];
    const secondGap = positions[2] - positions[1];

    expect(firstGap).toBeGreaterThan(0);
    expect(secondGap).toBeGreaterThan(firstGap * 5);
  });

  it("renders a table graph as an HTML table", () => {
    render(
      <GraphRenderer
        caption="Anonymous lead detail"
        graph={{
          kind: "table",
          columns: ["company", "stage"],
          data: [
            { company: "Acme", stage: "new" },
            { company: "Northwind", stage: "qualified" },
          ],
        }}
      />,
    );

    expect(screen.getByTestId("graph-table")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("qualified")).toBeInTheDocument();
  });

  it("renders provenance and cells for heatmaps", () => {
    const { container } = render(
      <GraphRenderer
        title="Routing density"
        graph={{
          kind: "heatmap",
          data: [
            { lane: "ops", urgency: "high", count: 5 },
            { lane: "ops", urgency: "medium", count: 2 },
            { lane: "advisory", urgency: "high", count: 1 },
          ],
          x: { field: "lane", type: "ordinal", label: "Lane" },
          y: { field: "urgency", type: "ordinal", label: "Urgency" },
          color: { field: "count", type: "quantitative", label: "Count" },
          source: { sourceType: "routing_review", label: "Routing review summary", rowCount: 3 },
        }}
      />,
    );

    expect(screen.getByTestId("graph-source")).toHaveTextContent("Routing review summary");
    expect(screen.getByTestId("graph-svg")).toHaveAttribute("data-graph-kind", "heatmap");
    expect(container.querySelectorAll('[data-heat-cell="true"]').length).toBe(3);
  });

  it("renders stacked bar charts with legend entries", () => {
    const { container } = render(
      <GraphRenderer
        graph={{
          kind: "stacked-bar",
          data: [
            { week: "W1", leads: 4, team: "North" },
            { week: "W1", leads: 3, team: "South" },
            { week: "W2", leads: 7, team: "North" },
            { week: "W2", leads: 2, team: "South" },
          ],
          x: { field: "week", type: "ordinal", label: "Week" },
          y: { field: "leads", type: "quantitative", label: "Leads" },
          series: { field: "team", type: "nominal", label: "Team" },
        }}
      />,
    );

    expect(screen.getByTestId("graph-legend")).toHaveTextContent("North");
    expect(screen.getByTestId("graph-legend")).toHaveTextContent("South");
    expect(container.querySelectorAll('rect[data-bar]').length).toBe(4);
  });

  it("shows an explicit invalid-state message for incomplete graph specs", () => {
    render(
      <GraphRenderer
        graph={{
          kind: "bubble",
          data: [{ week: "W1", leads: 4 }],
          x: { field: "week", type: "ordinal", label: "Week" },
          y: { field: "leads", type: "quantitative", label: "Leads" },
        }}
      />,
    );

    expect(screen.getByTestId("graph-invalid-state")).toHaveTextContent("Bubble graphs require a size encoding");
  });

  it("shows an empty-state message when no data rows exist", () => {
    render(
      <GraphRenderer
        graph={{
          kind: "line",
          data: [],
          x: { field: "week", type: "ordinal", label: "Week" },
          y: { field: "leads", type: "quantitative", label: "Leads" },
        }}
      />,
    );

    expect(screen.getByTestId("graph-empty-state")).toHaveTextContent("No data available yet.");
  });
});