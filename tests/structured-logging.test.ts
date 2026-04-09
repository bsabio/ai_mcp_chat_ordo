import { describe, expect, it } from "vitest";
import pino from "pino";
import { Writable } from "node:stream";
import { PinoLogger, createLogger } from "@/adapters/PinoLogger";
import type { Logger } from "@/core/services/ErrorHandler";

/** Collect pino JSON lines into an array of parsed objects. */
function createTestSink(): { lines: Record<string, unknown>[]; stream: Writable } {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      try {
        lines.push(JSON.parse(chunk.toString()));
      } catch {
        // ignore non-JSON
      }
      callback();
    },
  });
  return { lines, stream };
}

function createTestLogger(level = "debug"): { logger: PinoLogger; lines: Record<string, unknown>[] } {
  const { lines, stream } = createTestSink();
  const instance = pino({ level }, stream);
  return { logger: new PinoLogger(instance), lines };
}

describe("Structured Logging — Sprint 0", () => {
  describe("PinoLogger", () => {
    it("info() outputs JSON with level and msg fields", () => {
      const { logger, lines } = createTestLogger();

      logger.info("Hello world");

      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({ level: 30, msg: "Hello world" });
    });

    it("info() includes context in output", () => {
      const { logger, lines } = createTestLogger();

      logger.info("Request started", { route: "/api/chat", requestId: "req_1" });

      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({
        msg: "Request started",
        route: "/api/chat",
        requestId: "req_1",
      });
    });

    it("error() outputs at error level (50)", () => {
      const { logger, lines } = createTestLogger();

      logger.error("Something broke", { code: "INTERNAL_ERROR" });

      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({ level: 50, msg: "Something broke", code: "INTERNAL_ERROR" });
    });

    it("warn() outputs at warn level (40)", () => {
      const { logger, lines } = createTestLogger();

      logger.warn("Rate limited", { ip: "1.2.3.4" });

      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({ level: 40, msg: "Rate limited", ip: "1.2.3.4" });
    });

    it("debug() outputs at debug level (20)", () => {
      const { logger, lines } = createTestLogger();

      logger.debug("Verbose detail", { step: 3 });

      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({ level: 20, msg: "Verbose detail", step: 3 });
    });

    it("child() binds context to all subsequent log calls", () => {
      const { logger, lines } = createTestLogger();

      const child = logger.child({ requestId: "req_abc", userId: "usr_1" });
      child.info("Processing request");
      child.warn("Slow query");

      expect(lines).toHaveLength(2);
      expect(lines[0]).toMatchObject({ requestId: "req_abc", userId: "usr_1", msg: "Processing request" });
      expect(lines[1]).toMatchObject({ requestId: "req_abc", userId: "usr_1", msg: "Slow query" });
    });

    it("child() does not affect parent logger", () => {
      const { logger, lines } = createTestLogger();

      logger.child({ requestId: "req_child" });
      logger.info("Parent log");

      expect(lines).toHaveLength(1);
      expect(lines[0]).not.toHaveProperty("requestId");
    });

    it("context is empty when not provided", () => {
      const { logger, lines } = createTestLogger();

      logger.info("No context");

      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({ msg: "No context" });
      expect(lines[0]).not.toHaveProperty("undefined");
    });
  });

  describe("Logger interface", () => {
    it("PinoLogger satisfies the Logger interface", () => {
      const { logger } = createTestLogger();
      const asInterface: Logger = logger;

      expect(typeof asInterface.info).toBe("function");
      expect(typeof asInterface.warn).toBe("function");
      expect(typeof asInterface.error).toBe("function");
      expect(typeof asInterface.debug).toBe("function");
      expect(typeof asInterface.child).toBe("function");
    });
  });

  describe("createLogger factory", () => {
    it("returns a Logger with all required methods", () => {
      const logger = createLogger({ level: "silent" });

      expect(typeof logger.info).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.debug).toBe("function");
      expect(typeof logger.child).toBe("function");
    });

    it("defaults to info level", () => {
      // createLogger without options should not throw
      const logger = createLogger();
      expect(logger).toBeDefined();
    });
  });
});
