import { describe, it, expect } from "vitest";
import { ChatStreamRequestSchema } from "@/app/api/chat/stream/schema";
import { TtsRequestSchema } from "@/app/api/tts/schema";
import { AuthSwitchRequestSchema } from "@/app/api/auth/switch/schema";

describe("ChatStreamRequestSchema", () => {
  it("accepts valid minimal request", () => {
    const result = ChatStreamRequestSchema.safeParse({
      messages: [{ role: "user", content: "hi" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty messages array", () => {
    const result = ChatStreamRequestSchema.safeParse({ messages: [] });
    expect(result.success).toBe(false);
  });

  it("rejects missing messages", () => {
    const result = ChatStreamRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects message with empty content", () => {
    const result = ChatStreamRequestSchema.safeParse({
      messages: [{ role: "user", content: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = ChatStreamRequestSchema.safeParse({
      messages: [{ role: "system", content: "hi" }],
    });
    expect(result.success).toBe(false);
  });

  it("defaults attachments to empty array", () => {
    const result = ChatStreamRequestSchema.safeParse({
      messages: [{ role: "user", content: "hi" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.attachments).toEqual([]);
    }
  });

  it("accepts valid attachments", () => {
    const result = ChatStreamRequestSchema.safeParse({
      messages: [{ role: "user", content: "hi" }],
      attachments: [
        { assetId: "abc", fileName: "file.txt", mimeType: "text/plain", fileSize: 100 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects attachments with missing fields", () => {
    const result = ChatStreamRequestSchema.safeParse({
      messages: [{ role: "user", content: "hi" }],
      attachments: [{ assetId: "abc" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("TtsRequestSchema", () => {
  it("accepts valid request", () => {
    const result = TtsRequestSchema.safeParse({ text: "Hello world" });
    expect(result.success).toBe(true);
  });

  it("rejects empty text", () => {
    const result = TtsRequestSchema.safeParse({ text: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing text", () => {
    const result = TtsRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects text exceeding 4096 characters", () => {
    const result = TtsRequestSchema.safeParse({ text: "a".repeat(4097) });
    expect(result.success).toBe(false);
  });

  it("accepts text at exactly 4096 characters", () => {
    const result = TtsRequestSchema.safeParse({ text: "a".repeat(4096) });
    expect(result.success).toBe(true);
  });
});

describe("AuthSwitchRequestSchema", () => {
  it("accepts valid role", () => {
    const result = AuthSwitchRequestSchema.safeParse({ role: "ADMIN" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid role", () => {
    const result = AuthSwitchRequestSchema.safeParse({ role: "SUPERUSER" });
    expect(result.success).toBe(false);
  });

  it("rejects missing role", () => {
    const result = AuthSwitchRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts all allowed roles", () => {
    for (const role of ["ANONYMOUS", "AUTHENTICATED", "STAFF", "ADMIN"]) {
      const result = AuthSwitchRequestSchema.safeParse({ role });
      expect(result.success).toBe(true);
    }
  });
});
