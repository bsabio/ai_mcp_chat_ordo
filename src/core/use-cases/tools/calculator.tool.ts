import { CAPABILITY_CATALOG } from "@/core/capability-catalog/catalog";
import { buildCatalogBoundToolDescriptor } from "@/core/capability-catalog/runtime-tool-projection";
import type { CalculatorResult } from "@/core/entities/calculator";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import { CalculatorCommand } from "./CalculatorTool";

export interface CalculatorInput {
  operation: string;
  a: number;
  b: number;
}

const calculatorCommand = new CalculatorCommand();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseCalculatorInput(value: unknown): CalculatorInput {
  if (!isRecord(value)) {
    throw new Error("calculator input must be an object.");
  }

  const { operation, a, b } = value;
  if (typeof operation !== "string") {
    throw new Error("calculator operation must be a string.");
  }

  if (typeof a !== "number" || typeof b !== "number") {
    throw new Error("calculator expects { operation: string, a: number, b: number }.");
  }

  return { operation, a, b };
}

export async function executeCalculator(
  input: CalculatorInput,
  context?: ToolExecutionContext,
): Promise<CalculatorResult> {
  return calculatorCommand.execute(input, context);
}

export const calculatorTool = buildCatalogBoundToolDescriptor(CAPABILITY_CATALOG.calculator, {
  parse: parseCalculatorInput,
  execute: (input, context) => executeCalculator(input, context),
});
