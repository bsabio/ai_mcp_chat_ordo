import { describe, it, expect, beforeEach, vi } from "vitest";

// Must import after env setup
let getEnvConfig: typeof import("@/lib/config/env-config").getEnvConfig;
let _resetEnvConfig: typeof import("@/lib/config/env-config")._resetEnvConfig;

beforeEach(async () => {
  vi.unstubAllEnvs();
  const mod = await import("@/lib/config/env-config");
  getEnvConfig = mod.getEnvConfig;
  _resetEnvConfig = mod._resetEnvConfig;
  _resetEnvConfig();
});

describe("getEnvConfig", () => {
  it("returns default values when no env vars are set", () => {
    const config = getEnvConfig();
    expect(config.NODE_ENV).toBe("test");
    expect(config.PORT).toBe(3000);
    expect(config.DATA_DIR).toBe(".data");
  });

  it("parses PORT as a number", () => {
    vi.stubEnv("PORT", "8080");
    _resetEnvConfig();
    const config = getEnvConfig();
    expect(config.PORT).toBe(8080);
  });

  it("caches the config after first call", () => {
    const first = getEnvConfig();
    const second = getEnvConfig();
    expect(first).toBe(second);
  });

  it("_resetEnvConfig clears cache", () => {
    const first = getEnvConfig();
    _resetEnvConfig();
    vi.stubEnv("PORT", "9999");
    const second = getEnvConfig();
    expect(second.PORT).toBe(9999);
    expect(first).not.toBe(second);
  });

  it("accepts optional API keys", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test-key");
    _resetEnvConfig();
    const config = getEnvConfig();
    expect(config.ANTHROPIC_API_KEY).toBe("sk-test-key");
  });

  it("allows missing optional fields", () => {
    const config = getEnvConfig();
    expect(config.ANTHROPIC_API_KEY).toBeUndefined();
    expect(config.OPENAI_API_KEY).toBeUndefined();
    expect(config.DEFERRED_JOB_POLL_INTERVAL_MS).toBeUndefined();
  });

  it("treats blank optional env vars as unset", () => {
    vi.stubEnv("API__OPENAI_API_KEY", "");
    vi.stubEnv("DEFERRED_JOB_POLL_INTERVAL_MS", "");
    _resetEnvConfig();

    const config = getEnvConfig();

    expect(config.OPENAI_API_KEY).toBeUndefined();
    expect(config.DEFERRED_JOB_POLL_INTERVAL_MS).toBeUndefined();
  });

  it("rejects invalid NODE_ENV", () => {
    vi.stubEnv("NODE_ENV", "staging");
    _resetEnvConfig();
    expect(() => getEnvConfig()).toThrow("Environment validation failed");
  });

  it("coerces numeric env vars", () => {
    vi.stubEnv("DEFERRED_JOB_POLL_INTERVAL_MS", "3000");
    _resetEnvConfig();
    const config = getEnvConfig();
    expect(config.DEFERRED_JOB_POLL_INTERVAL_MS).toBe(3000);
  });
});
