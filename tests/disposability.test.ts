import { afterEach, describe, expect, it, vi } from "vitest";
import { createAbortTimeout, safeCancelReader } from "@/lib/chat/disposability";

describe("disposability helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("aborts controller after timeout", () => {
    vi.useFakeTimers();
    const { controller } = createAbortTimeout(1000);

    expect(controller.signal.aborted).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(controller.signal.aborted).toBe(true);
  });

  it("safeCancelReader swallows cancel errors", async () => {
    const reader = {
      cancel: vi.fn().mockRejectedValue(new Error("cancel failed")),
    } as unknown as ReadableStreamDefaultReader<Uint8Array>;

    await expect(safeCancelReader(reader)).resolves.toBeUndefined();
  });
});
