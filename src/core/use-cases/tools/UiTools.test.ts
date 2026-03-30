import { describe, expect, it, vi } from "vitest";

import { AdjustUICommand, GenerateChartCommand, GenerateGraphCommand, SetThemeCommand } from "./UiTools";
import { resolveGenerateChartPayload } from "./chart-payload";
import { resolveGenerateGraphPayload } from "./graph-payload";

describe("SetThemeCommand", () => {
  it("accepts a narrow named-theme request", async () => {
    const command = new SetThemeCommand();

    await expect(command.execute({ theme: "bauhaus" })).resolves.toContain("bauhaus");
  });
});

describe("AdjustUICommand", () => {
  it("persists theme-related preferences for authenticated users", async () => {
    const preferencesRepo = {
      set: vi.fn().mockResolvedValue(undefined),
    };

    const command = new AdjustUICommand(preferencesRepo as never);

    await expect(command.execute(
      {
        theme: "swiss",
        dark: true,
        density: "compact",
        fontSize: "xl",
        colorBlindMode: "deuteranopia",
      },
      {
        role: "ADMIN",
        userId: "user-123",
      },
    )).resolves.toContain("Success");

    expect(preferencesRepo.set).toHaveBeenCalledWith("user-123", "theme", "swiss");
    expect(preferencesRepo.set).toHaveBeenCalledWith("user-123", "dark_mode", "true");
    expect(preferencesRepo.set).toHaveBeenCalledWith("user-123", "font_size", "xl");
    expect(preferencesRepo.set).toHaveBeenCalledWith("user-123", "density", "compact");
    expect(preferencesRepo.set).toHaveBeenCalledWith("user-123", "color_blind_mode", "deuteranopia");
  });

  it("does not persist preferences for anonymous users", async () => {
    const preferencesRepo = {
      set: vi.fn().mockResolvedValue(undefined),
    };

    const command = new AdjustUICommand(preferencesRepo as never);

    await expect(command.execute(
      {
        theme: "fluid",
        density: "relaxed",
      },
      {
        role: "ANONYMOUS",
        userId: "anonymous",
      },
    )).resolves.toContain("Success");

    expect(preferencesRepo.set).not.toHaveBeenCalled();
  });
});

describe("GenerateChartCommand", () => {
  it("accepts valid mermaid flowchart definitions", async () => {
    const command = new GenerateChartCommand();

    await expect(
      command.execute({
        code: "flowchart TD\nA[Anonymous conversations: 53] --> B[Drop-off risk: 23]",
      }),
    ).resolves.toContain("Success");
  });

  it("accepts mermaid diagrams with init preamble", async () => {
    const command = new GenerateChartCommand();

    await expect(
      command.execute({
        code: "%%{init: {'theme': 'base'}}%%\nflowchart LR\nA --> B",
      }),
    ).resolves.toContain("Success");
  });

  it("rejects prose passed as chart code", async () => {
    const command = new GenerateChartCommand();

    await expect(
      command.execute({
        code: "funnel Anonymous User Funnel – Live Signals section Conversations : 53 section Engaged Recommendations Triggered : 1",
      }),
    ).rejects.toThrow(/requires valid Mermaid code/i);
  });

  it("accepts structured flowchart specs", async () => {
    const command = new GenerateChartCommand();

    await expect(
      command.execute({
        title: "Anonymous Funnel",
        caption: "Live drop-off view",
        spec: {
          chartType: "flowchart",
          direction: "LR",
          nodes: [
            { id: "conversations", label: "Anonymous conversations: 53" },
            { id: "risk", label: "At-risk drop-off: 23", shape: "diamond" },
          ],
          edges: [{ from: "conversations", to: "risk", label: "review now", lineStyle: "thick" }],
        },
      }),
    ).resolves.toContain("flowchart LR");
  });

  it("builds xychart mermaid from structured series data", () => {
    const payload = resolveGenerateChartPayload({
      title: "Lead velocity",
      spec: {
        chartType: "xychart",
        title: "Lead velocity",
        xAxis: {
          label: "Week",
          values: ["W1", "W2", "W3"],
        },
        yAxis: {
          label: "Leads",
          min: 0,
          max: 20,
        },
        series: [
          { type: "bar", label: "New leads", data: [5, 8, 11] },
          { type: "line", label: "Qualified", data: [2, 4, 7] },
        ],
      },
    });

    expect(payload.code).toContain("xychart-beta");
    expect(payload.code).toContain('x-axis "Week" ["W1", "W2", "W3"]');
    expect(payload.code).toContain('y-axis "Leads" 0 --> 20');
    expect(payload.code).toContain("bar [5, 8, 11]");
    expect(payload.code).toContain("line [2, 4, 7]");
  });
});

describe("GenerateGraphCommand", () => {
  it("accepts explicit line graph specs", async () => {
    const command = new GenerateGraphCommand();

    await expect(
      command.execute({
        title: "Lead trend",
        data: {
          rows: [
            { week: "W1", leads: 5 },
            { week: "W2", leads: 8 },
          ],
        },
        spec: {
          graphType: "line",
          xField: "week",
          yField: "leads",
        },
      }),
    ).resolves.toMatchObject({
      title: "Lead trend",
      graph: expect.objectContaining({
        kind: "line",
      }),
    });
  });

  it("normalizes a Vega-Lite style point graph", () => {
    const payload = resolveGenerateGraphPayload({
      vegaLite: {
        mark: "point",
        data: {
          values: [
            { score: 2, revenue: 11 },
            { score: 4, revenue: 19 },
          ],
        },
        encoding: {
          x: { field: "score", type: "quantitative", title: "Lead score" },
          y: { field: "revenue", type: "quantitative", title: "Revenue" },
        },
      },
    });

    expect(payload.graph.kind).toBe("scatter");
    expect(payload.graph.x?.label).toBe("Lead score");
  });

  it("rejects incomplete graph specs", async () => {
    const command = new GenerateGraphCommand();

    await expect(
      command.execute({
        spec: {
          graphType: "line",
          data: { values: [{ week: "W1" }] },
          xField: "week",
        } as never,
      }),
    ).rejects.toThrow(/both x and y/i);
  });

  it("rejects Sprint 0 source-backed graph requests explicitly", async () => {
    const command = new GenerateGraphCommand();

    await expect(
      command.execute({
        data: {
          source: {
            sourceType: "analytics_funnel",
          },
        },
        spec: {
          graphType: "line",
          xField: "week",
          yField: "leads",
        } as never,
      }),
    ).rejects.toThrow(/Admin operator loaders require|signed-in user|resolved tool result/i);
  });
});