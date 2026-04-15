// @vitest-environment jsdom

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/GraphRenderer", () => ({
  GraphRenderer: ({ title, caption, graph }: { title?: string; caption?: string; graph: { kind: string; data: unknown[] } }) => (
    <div data-testid="mock-graph-renderer">
      {title}:{caption}:{graph.kind}:{graph.data.length}
    </div>
  ),
}));

import { GraphRendererCard } from "./GraphRendererCard";
import type { ToolPluginProps } from "../../registry/types";

function createPart(overrides: Partial<NonNullable<ToolPluginProps["part"]>> = {}) {
  return {
    type: "job_status" as const,
    jobId: "job_graph_1",
    toolName: "generate_graph",
    label: "Generate Graph",
    status: "succeeded" as const,
    ...overrides,
  };
}

describe("GraphRendererCard", () => {
  it("wraps resolved graph payloads in the shared artifact shell", async () => {
    render(
      <GraphRendererCard
        part={createPart()}
        resultEnvelope={{
          schemaVersion: 1,
          toolName: "generate_graph",
          family: "artifact",
          cardKind: "artifact_viewer",
          executionMode: "browser",
          inputSnapshot: {},
          summary: {},
          artifacts: [
            {
              kind: "graph",
              label: "Quarterly Mix JSON",
              mimeType: "application/vnd.studioordo.graph+json",
              assetId: "uf_graph_1",
              uri: "/api/user-files/uf_graph_1",
              retentionClass: "conversation",
              source: "derived",
            },
          ],
          payload: {
            graph: {
              kind: "table",
              data: [{ label: "A", value: 1 }],
              columns: ["label", "value"],
            },
            title: "Quarterly Mix",
            caption: "Snapshot",
            summary: "One row preview",
          },
        }}
        toolCall={{
          name: "generate_graph",
          args: {},
          result: {
            graph: {
              kind: "table",
              data: [{ label: "A", value: 1 }],
              columns: ["label", "value"],
            },
            title: "Quarterly Mix",
            caption: "Snapshot",
            summary: "One row preview",
          },
        }}
        isStreaming={false}
      />,
    );

    expect(screen.getByRole("region", { name: "Generate Graph result" })).toHaveAttribute(
      "data-capability-card",
      "true",
    );
    expect(screen.getByText("Rendered")).toBeInTheDocument();
    expect(screen.getByText("table")).toBeInTheDocument();
    expect(await screen.findByTestId("mock-graph-renderer")).toHaveTextContent(
      "Quarterly Mix:Snapshot:table:1",
    );
    expect(screen.getByRole("link", { name: "Quarterly Mix JSON" })).toHaveAttribute(
      "href",
      "/api/user-files/uf_graph_1",
    );
  });
});