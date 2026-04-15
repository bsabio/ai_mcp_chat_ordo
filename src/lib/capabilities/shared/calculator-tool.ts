import { calculate, isCalculatorOperation } from "@/lib/calculator";

export type CalculatorToolArgs = {
  operation: string;
  a: number;
  b: number;
};

export function executeCalculatorTool(args: CalculatorToolArgs) {
  const { operation, a, b } = args;

  if (!isCalculatorOperation(operation)) {
    throw new Error("Invalid operation. Use add, subtract, multiply, or divide.");
  }

  if (typeof a !== "number" || typeof b !== "number") {
    throw new Error("calculator expects { operation: string, a: number, b: number }.");
  }

  return calculate(operation, a, b);
}
