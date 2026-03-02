import Anthropic from "@anthropic-ai/sdk";
import { calculate, isCalculatorOperation } from "@/lib/calculator";

export const CALCULATOR_TOOL: Anthropic.Tool = {
  name: "calculator",
  description:
    "Performs arithmetic. Mandatory for every math calculation. Use for add, subtract, multiply, divide.",
  input_schema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: ["add", "subtract", "multiply", "divide"],
      },
      a: { type: "number" },
      b: { type: "number" },
    },
    required: ["operation", "a", "b"],
    additionalProperties: false,
  },
};

function runCalculatorTool(input: unknown) {
  if (typeof input !== "object" || input === null) {
    throw new Error("Calculator input must be an object.");
  }

  const payload = input as Record<string, unknown>;
  const operation = payload.operation;
  const a = payload.a;
  const b = payload.b;

  if (!isCalculatorOperation(operation)) {
    throw new Error("Invalid operation. Use add, subtract, multiply, or divide.");
  }

  if (typeof a !== "number" || typeof b !== "number") {
    throw new Error("Calculator arguments a and b must be numbers.");
  }

  return calculate(operation, a, b);
}

export function createToolResults(toolUses: Anthropic.Messages.ToolUseBlock[]) {
  return toolUses.map<Anthropic.Messages.ToolResultBlockParam>((toolUse) => {
    try {
      const result = runCalculatorTool(toolUse.input);
      return {
        type: "tool_result" as const,
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      };
    } catch (error) {
      return {
        type: "tool_result" as const,
        tool_use_id: toolUse.id,
        content: error instanceof Error ? error.message : "Calculator tool failed.",
        is_error: true,
      };
    }
  });
}
