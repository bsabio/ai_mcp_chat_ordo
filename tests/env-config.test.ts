import { afterEach, describe, expect, it, vi } from "vitest";
import { getAnthropicApiKey, getAnthropicModel, getModelFallbacks, validateRequiredRuntimeConfig } from "@/lib/config/env";

const ORIGINAL_ENV = process.env;

describe("env config", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("reads ANTHROPIC_API_KEY first", () => {
    process.env = {
      ...ORIGINAL_ENV,
      ANTHROPIC_API_KEY: "new-key",
      API__ANTHROPIC_API_KEY: "legacy-key",
    };

    expect(getAnthropicApiKey()).toBe("new-key");
  });

  it("falls back to API__ANTHROPIC_API_KEY", () => {
    const warningSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    process.env = {
      ...ORIGINAL_ENV,
      ANTHROPIC_API_KEY: "",
      API__ANTHROPIC_API_KEY: "legacy-key",
    };

    expect(getAnthropicApiKey()).toBe("legacy-key");
    expect(warningSpy).toHaveBeenCalled();
    warningSpy.mockRestore();
  });

  it("throws when no anthropic key is provided", () => {
    process.env = {
      ...ORIGINAL_ENV,
      ANTHROPIC_API_KEY: "",
      API__ANTHROPIC_API_KEY: "   ",
    };

    expect(() => getAnthropicApiKey()).toThrow("must be set to a non-empty value");
  });

  it("uses configured model if provided", () => {
    const warningSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    process.env = {
      ...ORIGINAL_ENV,
      API__ANTHROPIC_MODEL: "claude-sonnet-4-6",
    };

    expect(getAnthropicModel()).toBe("claude-sonnet-4-6");
    expect(warningSpy).toHaveBeenCalled();
    warningSpy.mockRestore();
  });

  it("falls back to default model", () => {
    process.env = {
      ...ORIGINAL_ENV,
      ANTHROPIC_MODEL: "",
      API__ANTHROPIC_MODEL: "",
    };

    expect(getAnthropicModel()).toBe("claude-haiku-4-5");
  });

  it("returns ordered unique model fallbacks", () => {
    process.env = {
      ...ORIGINAL_ENV,
      API__ANTHROPIC_MODEL: "claude-sonnet-4-6",
    };

    expect(getModelFallbacks()).toEqual(["claude-sonnet-4-6", "claude-haiku-4-5", "claude-opus-4-6"]);
  });

  it("validates runtime config successfully when key exists", () => {
    process.env = {
      ...ORIGINAL_ENV,
      ANTHROPIC_API_KEY: "new-key",
    };

    expect(() => validateRequiredRuntimeConfig()).not.toThrow();
  });

  it("fails runtime config validation when key missing", () => {
    process.env = {
      ...ORIGINAL_ENV,
      ANTHROPIC_API_KEY: "",
      API__ANTHROPIC_API_KEY: "",
    };

    expect(() => validateRequiredRuntimeConfig()).toThrow("must be set to a non-empty value");
  });
});
