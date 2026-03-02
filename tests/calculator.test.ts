import { describe, expect, it } from "vitest";
import { calculate, isCalculatorOperation } from "@/lib/calculator";

describe("calculate", () => {
  it("adds numbers", () => {
    expect(calculate("add", 2, 3).result).toBe(5);
  });

  it("subtracts numbers", () => {
    expect(calculate("subtract", 7, 4).result).toBe(3);
  });

  it("multiplies numbers", () => {
    expect(calculate("multiply", 6, 5).result).toBe(30);
  });

  it("divides numbers", () => {
    expect(calculate("divide", 20, 4).result).toBe(5);
  });

  it("throws on division by zero", () => {
    expect(() => calculate("divide", 2, 0)).toThrow("Division by zero is not allowed.");
  });

  it("throws on invalid numeric values", () => {
    expect(() => calculate("add", Number.NaN, 1)).toThrow("Calculator inputs must be finite numbers.");
  });
});

describe("isCalculatorOperation", () => {
  it("returns true for supported operations", () => {
    expect(isCalculatorOperation("add")).toBe(true);
    expect(isCalculatorOperation("subtract")).toBe(true);
    expect(isCalculatorOperation("multiply")).toBe(true);
    expect(isCalculatorOperation("divide")).toBe(true);
  });

  it("returns false for unsupported operations", () => {
    expect(isCalculatorOperation("power")).toBe(false);
  });
});
