import { describe, it, expect } from "vitest";
import { CommandParserService } from "./CommandParserService";

describe("CommandParserService", () => {
  const parser = new CommandParserService();

  it("should parse a set_theme command", () => {
    const result = parser.parse(
      "Changing look: __ui_command__:set_theme:bauhaus",
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: "set_theme", theme: "bauhaus" });
  });

  it("should parse a navigate command", () => {
    const result = parser.parse("Redirecting: __ui_command__:navigate:/books");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: "navigate", path: "/books" });
  });

  it("should parse multiple commands", () => {
    const text =
      "__ui_command__:set_theme:swiss and __ui_command__:navigate:/ch1";
    const result = parser.parse(text);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("set_theme");
    expect(result[1].type).toBe("navigate");
  });

  it("should return empty array when no commands found", () => {
    expect(parser.parse("Normal text")).toHaveLength(0);
    expect(parser.parse("__ui_command__:invalid:val")).toHaveLength(0);
  });

  it("should not treat adjust_ui as part of the legacy text-command parser contract", () => {
    expect(parser.parse("__ui_command__:adjust_ui:compact")).toHaveLength(0);
  });

  it("should ignore unsupported legacy theme commands", () => {
    expect(parser.parse("__ui_command__:set_theme:postmodern")).toHaveLength(0);
  });
});
