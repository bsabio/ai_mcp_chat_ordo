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

describe("browser graph data preview", () => {
  it("toggles the data preview while leaving the graph visible", () => {
    render(
      <GraphRenderer
        title="Lead trend"
        dataPreview={[
          { week: "W1", leads: 4 },
          { week: "W2", leads: 7 },
        ]}
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

    expect(screen.getByTestId("graph-data-preview")).toHaveTextContent("W1");
    expect(screen.getByTestId("graph-svg")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hide data preview" }));

    expect(screen.queryByTestId("graph-data-preview")).toBeNull();
    expect(screen.getByTestId("graph-svg")).toBeInTheDocument();
  });

  it("exports both graph svg and resolved graph json", () => {
    downloadBlobMock.mockReset();

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

    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    fireEvent.click(screen.getByRole("button", { name: "Export graph JSON" }));

    expect(downloadBlobMock).toHaveBeenCalledTimes(2);
    expect(downloadBlobMock.mock.calls[0]?.[1]).toMatch(/^lead_trend_\d+\.svg$/);
    expect(downloadBlobMock.mock.calls[1]?.[1]).toMatch(/^lead_trend_\d+\.json$/);
  });

  it("keeps preview controls available inside the expanded graph view", () => {
    render(
      <GraphRenderer
        title="Lead trend"
        dataPreview={[
          { week: "W1", leads: 4 },
          { week: "W2", leads: 7 },
        ]}
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

    fireEvent.click(screen.getByRole("button", { name: /view diagram/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Export graph JSON" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Hide data preview" })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Hide data preview" }));
    expect(within(dialog).queryByTestId("graph-data-preview")).toBeNull();
  });
});