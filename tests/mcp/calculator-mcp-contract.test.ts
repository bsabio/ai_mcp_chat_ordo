import { describe, expect, it } from "vitest";
import { calculate } from "@/lib/calculator";
import { executeCalculatorTool } from "@/lib/capabilities/shared/calculator-tool";

describe("calculator domain and MCP tool parity", () => {
  it("returns equivalent results for add", () => {
    expect(executeCalculatorTool({ operation: "add", a: 3, b: 9 })).toEqual(calculate("add", 3, 9));
  });

  it("returns equivalent results for subtract", () => {
    expect(executeCalculatorTool({ operation: "subtract", a: 9, b: 3 })).toEqual(
      calculate("subtract", 9, 3),
    );
  });

  it("returns equivalent results for multiply", () => {
    expect(executeCalculatorTool({ operation: "multiply", a: 7, b: 8 })).toEqual(
      calculate("multiply", 7, 8),
    );
  });

  it("returns equivalent results for divide", () => {
    expect(executeCalculatorTool({ operation: "divide", a: 30, b: 5 })).toEqual(calculate("divide", 30, 5));
  });

  it("throws the same domain divide-by-zero error", () => {
    expect(() => executeCalculatorTool({ operation: "divide", a: 5, b: 0 })).toThrow(
      "Division by zero is not allowed.",
    );
  });

  it("throws for invalid operation", () => {
    expect(() => executeCalculatorTool({ operation: "pow", a: 2, b: 3 })).toThrow(
      "Invalid operation. Use add, subtract, multiply, or divide.",
    );
  });
});
