import { describe, it, expect, vi, beforeEach } from "vitest";
import { CHAT_CONFIG } from "@/lib/chat/chat-config";
import { orchestrateChatTurn } from "@/lib/chat/orchestrator";
import type { ChatProvider } from "@/lib/chat/anthropic-client";

describe("Spec 03: Tool-Round Config Unification", () => {
  describe("CHAT_CONFIG", () => {
    it("maxToolRounds is a positive integer", () => {
      expect(typeof CHAT_CONFIG.maxToolRounds).toBe("number");
      expect(CHAT_CONFIG.maxToolRounds).toBeGreaterThan(0);
      expect(Number.isInteger(CHAT_CONFIG.maxToolRounds)).toBe(true);
    });

    it("CHAT_CONFIG is frozen / immutable", () => {
      expect(Object.isFrozen(CHAT_CONFIG)).toBe(true);
      expect(() => {
        (CHAT_CONFIG as Record<string, unknown>).maxToolRounds = 99;
      }).toThrow();
    });
  });

  describe("orchestrateChatTurn", () => {
    function createMockProvider(toolCallRounds: number): ChatProvider {
      let callCount = 0;
      return {
        createMessage: vi.fn(async () => {
          callCount++;
          if (callCount <= toolCallRounds) {
            return {
              content: [
                { type: "tool_use", id: `call_${callCount}`, name: "test_tool", input: {} },
              ],
            };
          }
          return {
            content: [{ type: "text", text: "Done." }],
          };
        }),
      } as unknown as ChatProvider;
    }

    const mockToolExecutor = vi.fn(async () => "tool result");

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("respects maxToolRounds from config", async () => {
      // Provider always returns tool calls — loop should exhaust after maxToolRounds
      const provider = createMockProvider(Infinity);

      await expect(
        orchestrateChatTurn({
          provider,
          conversation: [{ role: "user", content: "test" }],
          toolChoice: { type: "auto" },
          toolExecutor: mockToolExecutor,
        }),
      ).rejects.toThrow("Exceeded tool-call safety limit");

      expect(provider.createMessage).toHaveBeenCalledTimes(CHAT_CONFIG.maxToolRounds);
    });

    it("respects optional per-request override", async () => {
      const provider = createMockProvider(Infinity);

      await expect(
        orchestrateChatTurn({
          provider,
          conversation: [{ role: "user", content: "test" }],
          toolChoice: { type: "auto" },
          toolExecutor: mockToolExecutor,
          maxRounds: 2,
        }),
      ).rejects.toThrow("Exceeded tool-call safety limit");

      expect(provider.createMessage).toHaveBeenCalledTimes(2);
    });

    it("error message includes the configured limit value", async () => {
      const provider = createMockProvider(Infinity);

      await expect(
        orchestrateChatTurn({
          provider,
          conversation: [{ role: "user", content: "test" }],
          toolChoice: { type: "auto" },
          toolExecutor: mockToolExecutor,
          maxRounds: 3,
        }),
      ).rejects.toThrow("3 rounds");
    });

    it("completes normally when tool calls finish before limit", async () => {
      // Provider returns 2 tool calls then a text response
      const provider = createMockProvider(2);

      const result = await orchestrateChatTurn({
        provider,
        conversation: [{ role: "user", content: "test" }],
        toolChoice: { type: "auto" },
        toolExecutor: mockToolExecutor,
      });

      expect(result).toBe("Done.");
      expect(provider.createMessage).toHaveBeenCalledTimes(3); // 2 tool rounds + 1 final
    });
  });
});

describe("Spec 03: No magic number regression guard", () => {
  it("no hardcoded tool-round literals remain in orchestrator", async () => {
    const fs = await import("node:fs");
    const orchestratorSource = fs.readFileSync(
      "src/lib/chat/orchestrator.ts",
      "utf-8",
    );
    // Should not have bare `< 6` or `< 4` loop conditions
    expect(orchestratorSource).not.toMatch(/step\s*<\s*\d+/);
  });

  it("no hardcoded tool-round default remains in anthropic-stream", async () => {
    const fs = await import("node:fs");
    const streamSource = fs.readFileSync(
      "src/lib/chat/anthropic-stream.ts",
      "utf-8",
    );
    // Default should reference CHAT_CONFIG, not a bare number like `= 4`
    expect(streamSource).not.toMatch(/maxToolRounds\s*=\s*\d+\s*,/);
  });
});
