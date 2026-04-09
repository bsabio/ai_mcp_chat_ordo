import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { calculatorTool } from "@/core/use-cases/tools/calculator.tool";
import { generateChartTool } from "@/core/use-cases/tools/generate-chart.tool";
import { generateGraphTool } from "@/core/use-cases/tools/generate-graph.tool";
import { generateAudioTool } from "@/core/use-cases/tools/generate-audio.tool";

export function registerCalculatorTools(registry: ToolRegistry): void {
  registry.register(calculatorTool);
  registry.register(generateChartTool);
  registry.register(generateGraphTool);
  registry.register(generateAudioTool);
}
