import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  logDegradation,
  logFailure,
} from "@/lib/observability/logger";
import { REASON_CODES } from "@/lib/observability/reason-codes";

describe("logDegradation", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("emits structured JSON to console.warn", () => {
    logDegradation("TEST_CODE", "something degraded", { foo: "bar" });

    expect(warnSpy).toHaveBeenCalled();
    const output = JSON.parse(warnSpy.mock.calls[0][0] as string);
    expect(output.level).toBe("warn");
    expect(output.event).toBe("TEST_CODE");
    expect(output.message).toBe("something degraded");
    expect(output.foo).toBe("bar");
    expect(output.timestamp).toBeDefined();
  });

  it("serializes Error objects with name, message, and stack", () => {
    const err = new Error("test failure");
    logDegradation("TEST_CODE", "degraded", {}, err);

    const output = JSON.parse(warnSpy.mock.calls[0][0] as string);
    expect(output.error).toBeDefined();
    expect(output.error.name).toBe("Error");
    expect(output.error.message).toBe("test failure");
    expect(output.error.stack).toBeDefined();
  });

  it("handles non-Error objects gracefully", () => {
    logDegradation("TEST_CODE", "degraded", {}, "just a string");

    const output = JSON.parse(warnSpy.mock.calls[0][0] as string);
    expect(output.error).toBeUndefined();
  });
});

describe("logFailure", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("emits structured JSON to console.error", () => {
    logFailure("FAIL_CODE", "something failed", { key: "value" });

    expect(errorSpy).toHaveBeenCalled();
    const output = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(output.level).toBe("error");
    expect(output.event).toBe("FAIL_CODE");
    expect(output.message).toBe("something failed");
    expect(output.key).toBe("value");
    expect(output.timestamp).toBeDefined();
  });

  it("serializes Error objects with name, message, and stack", () => {
    const err = new TypeError("bad type");
    logFailure("FAIL_CODE", "typed failure", {}, err);

    const output = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(output.error.name).toBe("TypeError");
    expect(output.error.message).toBe("bad type");
    expect(output.error.stack).toBeDefined();
  });
});

describe("REASON_CODES", () => {
  it("all values are non-empty strings", () => {
    for (const [key, value] of Object.entries(REASON_CODES)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
      expect(value).toBe(key);
    }
  });

  it("includes expected codes", () => {
    expect(REASON_CODES.ROUTING_ANALYSIS_FAILED).toBeDefined();
    expect(REASON_CODES.TTS_PROVIDER_FAILED).toBeDefined();
    expect(REASON_CODES.UNKNOWN_ROUTE_ERROR).toBeDefined();
    expect(REASON_CODES.MESSAGE_PERSIST_FAILED).toBeDefined();
  });
});
