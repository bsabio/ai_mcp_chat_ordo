import { afterEach, describe, expect, it, vi } from "vitest";

import { createChatStreamTextBuffer } from "./chatStreamTextBuffer";

describe("chatStreamTextBuffer", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("batches contiguous text until the scheduled flush runs", async () => {
    vi.useFakeTimers();

    const dispatch = vi.fn();
    const buffer = createChatStreamTextBuffer({ assistantIndex: 3, dispatch });

    buffer.append("Hel");
    buffer.append("lo");

    expect(dispatch).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();

    expect(dispatch).toHaveBeenCalledWith({
      type: "APPEND_TEXT",
      index: 3,
      delta: "Hello",
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("flushes immediately before a non-text event and clears the scheduled timer", () => {
    vi.useFakeTimers();

    const dispatch = vi.fn();
    const buffer = createChatStreamTextBuffer({ assistantIndex: 1, dispatch });

    buffer.append("Hi");
    buffer.flushBeforeNonTextEvent();

    expect(dispatch).toHaveBeenCalledWith({
      type: "APPEND_TEXT",
      index: 1,
      delta: "Hi",
    });

    vi.runAllTimers();
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("flushes any remaining text when disposed", () => {
    vi.useFakeTimers();

    const dispatch = vi.fn();
    const buffer = createChatStreamTextBuffer({ assistantIndex: 0, dispatch });

    buffer.append("Done");
    buffer.dispose();

    expect(dispatch).toHaveBeenCalledWith({
      type: "APPEND_TEXT",
      index: 0,
      delta: "Done",
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});