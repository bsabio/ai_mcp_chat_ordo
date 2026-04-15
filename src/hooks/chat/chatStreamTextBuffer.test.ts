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
    expect(buffer.hasDispatchedText()).toBe(true);
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
    expect(buffer.hasDispatchedText()).toBe(true);

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

  it("holds an incomplete action link tail until more text arrives", async () => {
    vi.useFakeTimers();

    const dispatch = vi.fn();
    const buffer = createChatStreamTextBuffer({ assistantIndex: 4, dispatch });

    buffer.append("Your primary archetype: [The Magi");

    await vi.runAllTimersAsync();

    expect(dispatch).toHaveBeenCalledWith({
      type: "APPEND_TEXT",
      index: 4,
      delta: "Your primary archetype: ",
    });
    expect(dispatch).toHaveBeenCalledTimes(1);

    buffer.append("cian](?corpus=ch06-the-magician)");

    await vi.runAllTimersAsync();

    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: "APPEND_TEXT",
      index: 4,
      delta: "[The Magician](?corpus=ch06-the-magician)",
    });
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it("flushes incomplete markdown tails on dispose so text is not lost", () => {
    vi.useFakeTimers();

    const dispatch = vi.fn();
    const buffer = createChatStreamTextBuffer({ assistantIndex: 2, dispatch });

    buffer.append("Draft [The Magi");
    buffer.dispose();

    expect(dispatch).toHaveBeenCalledWith({
      type: "APPEND_TEXT",
      index: 2,
      delta: "Draft [The Magi",
    });
    expect(buffer.hasDispatchedText()).toBe(true);
  });

  it("reports false when no text has been dispatched", () => {
    const dispatch = vi.fn();
    const buffer = createChatStreamTextBuffer({ assistantIndex: 5, dispatch });

    expect(buffer.hasDispatchedText()).toBe(false);
  });
});