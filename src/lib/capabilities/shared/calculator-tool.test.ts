/**
 * Sprint 18 — Calculator Tool Domain Tests
 *
 * Tests executeCalculatorTool() for all operations, error handling,
 * and input validation.
 */
import { describe, it, expect } from "vitest";
import { executeCalculatorTool } from "./calculator-tool";

describe("calculator-tool", () => {
  it("adds two numbers", () => {
    const result = executeCalculatorTool({ operation: "add", a: 2, b: 3 });
    expect(result).toEqual({ operation: "add", a: 2, b: 3, result: 5 });
  });

  it("subtracts two numbers", () => {
    const result = executeCalculatorTool({ operation: "subtract", a: 10, b: 4 });
    expect(result).toEqual({ operation: "subtract", a: 10, b: 4, result: 6 });
  });

  it("multiplies two numbers", () => {
    const result = executeCalculatorTool({ operation: "multiply", a: 3, b: 7 });
    expect(result).toEqual({ operation: "multiply", a: 3, b: 7, result: 21 });
  });

  it("divides two numbers", () => {
    const result = executeCalculatorTool({ operation: "divide", a: 15, b: 3 });
    expect(result).toEqual({ operation: "divide", a: 15, b: 3, result: 5 });
  });

  it("throws on division by zero", () => {
    expect(() => executeCalculatorTool({ operation: "divide", a: 10, b: 0 }))
      .toThrow("Division by zero");
  });

  it("throws on invalid operation", () => {
    expect(() => executeCalculatorTool({ operation: "modulo" as string, a: 1, b: 2 }))
      .toThrow("Invalid operation");
  });

  it("throws on non-numeric input", () => {
    expect(() => executeCalculatorTool({ operation: "add", a: "x" as unknown as number, b: 2 }))
      .toThrow();
  });
});
