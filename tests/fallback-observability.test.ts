import { describe, it, expect } from "vitest";
import {
  logDegradation,
  logFailure,
} from "@/lib/observability/logger";
import { subscribeObservability } from "@/lib/observability/events";
import { REASON_CODES } from "@/lib/observability/reason-codes";

/**
 * Capture observability events emitted during a callback.
 */
function captureEvents(fn: () => void) {
  const events: Array<{ type: string; payload: Record<string, unknown> }> = [];
  const unsub = subscribeObservability((e) => events.push(e as never));
  fn();
  unsub();
  return events;
}

describe("logDegradation", () => {
  it("emits a structured warn-level log event", () => {
    const events = captureEvents(() =>
      logDegradation("TEST_CODE", "something degraded", { foo: "bar" }),
    );

    expect(events).toHaveLength(1);
    const payload = events[0].payload as Record<string, unknown>;
    expect(payload.level).toBe("warn");
    expect(payload.event).toBe("TEST_CODE");
    expect((payload.context as Record<string, unknown>).message).toBe("something degraded");
    expect((payload.context as Record<string, unknown>).foo).toBe("bar");
    expect(payload.timestamp).toBeDefined();
  });

  it("serializes Error objects with name, message, and stack", () => {
    const err = new Error("test failure");
    const events = captureEvents(() =>
      logDegradation("TEST_CODE", "degraded", {}, err),
    );

    const ctx = events[0].payload.context as Record<string, unknown>;
    const error = ctx.error as Record<string, string>;
    expect(error).toBeDefined();
    expect(error.name).toBe("Error");
    expect(error.message).toBe("test failure");
    expect(error.stack).toBeDefined();
  });

  it("handles non-Error objects gracefully", () => {
    const events = captureEvents(() =>
      logDegradation("TEST_CODE", "degraded", {}, "just a string"),
    );

    const ctx = events[0].payload.context as Record<string, unknown>;
    expect(ctx.error).toBeUndefined();
  });
});

describe("logFailure", () => {
  it("emits a structured error-level log event", () => {
    const events = captureEvents(() =>
      logFailure("FAIL_CODE", "something failed", { key: "value" }),
    );

    expect(events).toHaveLength(1);
    const payload = events[0].payload as Record<string, unknown>;
    expect(payload.level).toBe("error");
    expect(payload.event).toBe("FAIL_CODE");
    expect((payload.context as Record<string, unknown>).message).toBe("something failed");
    expect((payload.context as Record<string, unknown>).key).toBe("value");
    expect(payload.timestamp).toBeDefined();
  });

  it("serializes Error objects with name, message, and stack", () => {
    const err = new TypeError("bad type");
    const events = captureEvents(() =>
      logFailure("FAIL_CODE", "typed failure", {}, err),
    );

    const ctx = events[0].payload.context as Record<string, unknown>;
    const error = ctx.error as Record<string, string>;
    expect(error.name).toBe("TypeError");
    expect(error.message).toBe("bad type");
    expect(error.stack).toBeDefined();
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
