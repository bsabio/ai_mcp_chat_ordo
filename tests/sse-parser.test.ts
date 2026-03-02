import { describe, expect, it } from "vitest";
import { extractTextFromSseBlock, SseTextParser } from "@/lib/chat/sse-parser";

describe("sse parser", () => {
  it("parses content_block_delta text", () => {
    const block =
      'event: content_block_delta\ndata: {"delta":{"text":"Hello"}}';
    expect(extractTextFromSseBlock(block)).toBe("Hello");
  });

  it("parses content_block_start text", () => {
    const block =
      'event: content_block_start\ndata: {"content_block":{"text":"Hi"}}';
    expect(extractTextFromSseBlock(block)).toBe("Hi");
  });

  it("ignores malformed json", () => {
    const block = "event: content_block_delta\ndata: {bad-json}";
    expect(extractTextFromSseBlock(block)).toBe("");
  });

  it("handles split events across chunk boundaries", () => {
    const parser = new SseTextParser();
    expect(parser.feed('event: content_block_delta\ndata: {"delta":{"tex')).toEqual([]);
    expect(parser.feed('t":"Hel"}}\n\n')).toEqual(["Hel"]);
  });

  it("handles multiple events in one chunk", () => {
    const parser = new SseTextParser();
    const output = parser.feed(
      'event: content_block_delta\ndata: {"delta":{"text":"A"}}\n\n' +
        'event: content_block_delta\ndata: {"delta":{"text":"B"}}\n\n',
    );

    expect(output).toEqual(["A", "B"]);
  });
});
