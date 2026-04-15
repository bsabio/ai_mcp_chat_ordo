// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InspectThemeCard } from "./InspectThemeCard";
import type { ToolPluginProps } from "../../registry/types";

function createPart(overrides: Partial<NonNullable<ToolPluginProps["part"]>> = {}) {
  return {
    type: "job_status" as const,
    jobId: "job_theme_1",
    toolName: "inspect_theme",
    label: "Inspect Theme",
    status: "succeeded" as const,
    ...overrides,
  };
}

describe("InspectThemeCard", () => {
  it("renders manifest-backed theme inspection results with disclosures", () => {
    render(
      <InspectThemeCard
        part={createPart()}
        toolCall={{
          name: "inspect_theme",
          args: {},
          result: {
            action: "inspect_theme",
            message: "Returned theme metadata.",
            supported_theme_ids: ["linen", "vault"],
            ordered_theme_profiles: [
              {
                id: "linen",
                name: "Linen",
                motionIntent: "calm",
                shadowIntent: "soft",
                densityDefaults: { standard: "comfortable", dataDense: "compact", touch: "relaxed" },
                primaryAttributes: ["warm", "print-like"],
              },
            ],
            approved_control_axes: [
              {
                id: "density",
                label: "Density",
                options: ["comfortable", "compact"],
                defaultValue: "comfortable",
                mutationTools: ["adjust_ui"],
              },
            ],
            active_theme_state: {
              available: false,
              reason: "Client runtime owns active theme state.",
            },
          },
        }}
        isStreaming={false}
      />,
    );

    expect(screen.getByText("Theme Profiles")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Approved control axes/i }));
    expect(screen.getByText(/Density/)).toBeInTheDocument();
    expect(screen.getByText(/comfortable/)).toBeInTheDocument();
  });

  it("renders theme mutation summaries without falling back", () => {
    render(
      <InspectThemeCard
        part={createPart({ toolName: "set_theme", label: "Set Theme" })}
        toolCall={{
          name: "set_theme",
          args: { theme: "linen" },
          result: "Success. The theme has been changed to linen.",
        }}
        isStreaming={false}
      />,
    );

    expect(screen.getByRole("heading", { name: "linen" })).toBeInTheDocument();
    expect(screen.getByText("Applied")).toBeInTheDocument();
    expect(screen.getByText("Success. The theme has been changed to linen.")).toBeInTheDocument();
  });

  it("renders UI adjustment summaries with applied controls", () => {
    render(
      <InspectThemeCard
        part={createPart({ toolName: "adjust_ui", label: "Adjust Ui" })}
        toolCall={{
          name: "adjust_ui",
          args: { density: "compact", fontSize: "large", dark: true },
          result: "Success. UI adjusted: density=compact, fontSize=large, dark=true.",
        }}
        isStreaming={false}
      />,
    );

    expect(screen.getByText("UI adjustments")).toBeInTheDocument();
    expect(screen.getByText("compact")).toBeInTheDocument();
    expect(screen.getByText("large")).toBeInTheDocument();
  });
});