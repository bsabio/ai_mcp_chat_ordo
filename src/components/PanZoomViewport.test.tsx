// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PanZoomViewport } from "./PanZoomViewport";

describe("PanZoomViewport", () => {
  it("exposes zoom controls and updates the zoom level", () => {
    render(
      <PanZoomViewport ariaLabel="Test viewport" contentWidth={800} contentHeight={400} testId="panzoom-viewport">
        <svg width="800" height="400" viewBox="0 0 800 400">
          <rect width="800" height="400" fill="transparent" />
        </svg>
      </PanZoomViewport>,
    );

    const viewport = screen.getByTestId("panzoom-viewport");
    expect(viewport).toHaveAttribute("data-scale", "0.800");

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(Number(viewport.getAttribute("data-scale"))).toBeGreaterThan(0.8);

    fireEvent.click(screen.getByRole("button", { name: "Fit to view" }));
    expect(viewport).toHaveAttribute("data-scale", "0.800");
  });
});