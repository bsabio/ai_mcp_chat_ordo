import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GraphRenderer } from "@/components/GraphRenderer";

describe("browser graph rendering", () => {
  it("renders a temporal line graph with visible time spacing", () => {
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
    expect(positions[1] - positions[0]).toBeGreaterThan(0);
    expect(positions[2] - positions[1]).toBeGreaterThan((positions[1] - positions[0]) * 5);
  });

  it("renders grouped comparisons with legends and grouped bars", () => {
    const { container } = render(
      <GraphRenderer
        title="Pipeline by team"
        caption="Weekly qualified leads"
        graph={{
          kind: "grouped-bar",
          data: [
            { week: "W1", leads: 4, team: "North" },
            { week: "W1", leads: 3, team: "South" },
            { week: "W2", leads: 7, team: "North" },
            { week: "W2", leads: 5, team: "South" },
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

  it("renders provenance for graphs built from source-backed rows and expands full screen", () => {
    render(
      <GraphRenderer
        title="Routing review"
        summary="Uncertain conversations dominate the review queue."
        dataPreview={[
          { bucket: "Recently changed", count: 2 },
          { bucket: "Uncertain", count: 5 },
        ]}
        graph={{
          kind: "bar",
          data: [
            { bucket: "Recently changed", count: 2 },
            { bucket: "Uncertain", count: 5 },
          ],
          x: { field: "bucket", type: "ordinal", label: "Bucket" },
          y: { field: "count", type: "quantitative", label: "Count" },
          source: { sourceType: "routing_review", label: "Routing review summary", rowCount: 2 },
        }}
      />,
    );

    expect(screen.getByTestId("graph-source")).toHaveTextContent("Routing review summary");

    fireEvent.click(screen.getByRole("button", { name: "Expand full screen" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Routing review")).toBeInTheDocument();
    expect(within(dialog).getByTestId("graph-source")).toHaveTextContent("Routing review summary");
    expect(within(dialog).getByTestId("graph-svg")).toHaveAttribute("data-graph-kind", "bar");
    expect(within(dialog).getByRole("button", { name: "Fit to view" })).toBeInTheDocument();
  });
});