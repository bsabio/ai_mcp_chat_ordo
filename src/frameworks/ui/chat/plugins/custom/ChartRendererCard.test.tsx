// @vitest-environment jsdom

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/MermaidRenderer", () => ({
  MermaidRenderer: ({ code, title, caption }: { code: string; title?: string; caption?: string }) => (
    <div data-testid="mock-mermaid-renderer">
      {title}:{caption}:{code.split("\n")[0]}
    </div>
  ),
}));

import { ChartRendererCard } from "./ChartRendererCard";
import type { ToolPluginProps } from "../../registry/types";

function createPart(overrides: Partial<NonNullable<ToolPluginProps["part"]>> = {}) {
  return {
    type: "job_status" as const,
    jobId: "job_chart_1",
    toolName: "generate_chart",
    label: "Generate Chart",
    status: "succeeded" as const,
    ...overrides,
  };
}

describe("ChartRendererCard", () => {
  it("wraps mermaid output in the shared artifact shell", async () => {
    render(
      <ChartRendererCard
        part={createPart()}
        resultEnvelope={{
          schemaVersion: 1,
          toolName: "generate_chart",
          family: "artifact",
          cardKind: "artifact_viewer",
          executionMode: "browser",
          inputSnapshot: {},
          summary: {},
          artifacts: [
            {
              kind: "chart",
              label: "Launch Flow source",
              mimeType: "text/vnd.mermaid",
              assetId: "uf_chart_1",
              uri: "/api/user-files/uf_chart_1",
              retentionClass: "conversation",
              source: "derived",
            },
          ],
          payload: {
            code: "flowchart TD\nA[Start] --> B[Finish]",
            title: "Launch Flow",
            caption: "Launch Flow Caption",
            downloadFileName: "launch_flow",
          },
        }}
        toolCall={{
          name: "generate_chart",
          args: {
            code: "flowchart TD\nA[Start] --> B[Finish]",
            title: "Launch Flow",
            caption: "Launch Flow Caption",
            downloadFileName: "launch_flow",
          },
        }}
        isStreaming={false}
      />,
    );

    expect(screen.getByRole("region", { name: "Generate Chart result" })).toHaveAttribute(
      "data-capability-card",
      "true",
    );
    expect(screen.getByText("Rendered")).toBeInTheDocument();
    expect(await screen.findByTestId("mock-mermaid-renderer")).toHaveTextContent(
      "Launch Flow:Launch Flow Caption:flowchart TD",
    );
    expect(screen.getByRole("link", { name: "Launch Flow source" })).toHaveAttribute(
      "href",
      "/api/user-files/uf_chart_1",
    );
  });
});