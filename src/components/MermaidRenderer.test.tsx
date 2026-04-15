// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MermaidRenderer } from "./MermaidRenderer";
import mermaid from "mermaid";
import React from "react";

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

describe("MermaidRenderer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially and then the diagram", async () => {
    (mermaid.render as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      svg: "<svg data-testid='mermaid-svg'></svg>",
    });

    render(<MermaidRenderer code="graph TD" caption="Test Caption" />);

    expect(screen.getByText("Rendering node graph...")).toBeInTheDocument();

    await waitFor(() => {
      expect(mermaid.initialize).toHaveBeenCalled();
      expect(mermaid.render).toHaveBeenCalledWith(
        expect.stringMatching(/^mermaid-/),
        "graph TD",
      );
    });
  });

  it("renders error state when mermaid throws", async () => {
    (mermaid.render as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Syntax error"));

    render(<MermaidRenderer code="graph TD" caption="Test Caption" />);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to render chart: Syntax error/),
      ).toBeInTheDocument();
    });
  });

  it("renders contextual title and subtitle metadata", async () => {
    (mermaid.render as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      svg: "<svg data-testid='mermaid-svg'></svg>",
    });

    render(
      <MermaidRenderer
        code="flowchart TD\nA --> B"
        title="Anonymous Funnel"
        caption="Live drop-off view"
        downloadFileName="anonymous_funnel"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Anonymous Funnel")).toBeInTheDocument();
      expect(screen.getByText("Live drop-off view")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
      expect(screen.getByTestId("mermaid-viewport")).toBeInTheDocument();
    });
  });
});
