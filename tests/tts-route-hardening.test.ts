import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { TtsRequestSchema } from "@/app/api/tts/schema";

describe("TTS Route Hardening", () => {
  it("rejects request with missing text field", () => {
    const result = TtsRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects request with text exceeding 4096 characters", () => {
    const result = TtsRequestSchema.safeParse({ text: "a".repeat(4097) });
    expect(result.success).toBe(false);
  });

  it("accepts request with text at exactly 4096 characters", () => {
    const result = TtsRequestSchema.safeParse({ text: "a".repeat(4096) });
    expect(result.success).toBe(true);
  });

  it("does not use readFileSync anywhere in the TTS route module", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/app/api/tts/route.ts"),
      "utf-8",
    );
    expect(source).not.toContain("readFileSync");
  });

  it("uses AbortController for fetch timeout", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/app/api/tts/route.ts"),
      "utf-8",
    );
    expect(source).toContain("AbortController");
    expect(source).toContain("controller.signal");
    expect(source).toContain("clearTimeout");
  });

  it("has response size cap constant defined", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/app/api/tts/route.ts"),
      "utf-8",
    );
    expect(source).toContain("TTS_MAX_RESPONSE_BYTES");
    expect(source).toContain("10 * 1024 * 1024");
  });

  it("handles AbortError with 504 status", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/app/api/tts/route.ts"),
      "utf-8",
    );
    expect(source).toContain('"AbortError"');
    expect(source).toContain("504");
  });

  it("uses async readFile from node:fs/promises", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/app/api/tts/route.ts"),
      "utf-8",
    );
    expect(source).toContain('from "node:fs/promises"');
    expect(source).toContain("await readFile(");
  });
});
