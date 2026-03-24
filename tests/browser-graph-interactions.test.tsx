import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GraphRenderer } from "@/components/GraphRenderer";

const { downloadBlobMock } = vi.hoisted(() => ({
  downloadBlobMock: vi.fn(),
}));

vi.mock("@/lib/download-browser", () => ({
  downloadBlob: downloadBlobMock,
}));

function renderLineGraph() {
  return render(
    <GraphRenderer
      title="Lead trend"
      caption="Weekly qualified leads"
      summary="Qualified leads increased week over week."
      dataPreview={[
        { week: "W1", leads: 4, team: "North" },
        { week: "W2", leads: 7, team: "North" },
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
}

describe("browser graph interactions", () => {
  it("opens the expanded graph view from the thumbnail and preserves the data preview", () => {
    renderLineGraph();

    expect(screen.getByTestId("graph-data-preview")).toHaveTextContent("W1");
    expect(screen.getByTestId("graph-data-preview")).toHaveTextContent("North");

    fireEvent.click(screen.getByRole("button", { name: /view diagram/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(within(dialog).getByText("Lead trend")).toBeInTheDocument();
    expect(within(dialog).getByTestId("graph-data-preview")).toHaveTextContent("W2");
    expect(within(dialog).getByTestId("graph-svg")).toHaveAttribute("data-graph-kind", "line");
  });

  it("downloads the rendered graph as svg from the card header", () => {
    downloadBlobMock.mockReset();
    renderLineGraph();

    fireEvent.click(screen.getByRole("button", { name: "Download" }));

    expect(downloadBlobMock).toHaveBeenCalledTimes(1);
    const [blob, filename] = downloadBlobMock.mock.calls[0] ?? [];
    expect(blob).toBeInstanceOf(Blob);
    expect(filename).toMatch(/^lead_trend_\d+\.svg$/);
  });
});