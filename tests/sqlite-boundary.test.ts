import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, unlinkSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { acquireInstanceLock } from "@/lib/db/startup-check";

const TEST_DATA_DIR = path.join(process.cwd(), ".data", "_test_lock");

describe("acquireInstanceLock", () => {
  beforeEach(() => {
    mkdirSync(TEST_DATA_DIR, { recursive: true });
    const lockPath = path.join(TEST_DATA_DIR, ".server.lock");
    if (existsSync(lockPath)) {
      unlinkSync(lockPath);
    }
  });

  afterEach(() => {
    const lockPath = path.join(TEST_DATA_DIR, ".server.lock");
    if (existsSync(lockPath)) {
      unlinkSync(lockPath);
    }
  });

  it("creates a lock file with the current PID", () => {
    const lock = acquireInstanceLock(TEST_DATA_DIR);
    const lockPath = path.join(TEST_DATA_DIR, ".server.lock");

    expect(existsSync(lockPath)).toBe(true);
    expect(readFileSync(lockPath, "utf-8").trim()).toBe(String(process.pid));

    lock.release();
    expect(existsSync(lockPath)).toBe(false);
  });

  it("throws if lock file already exists", () => {
    const lock = acquireInstanceLock(TEST_DATA_DIR);

    expect(() => acquireInstanceLock(TEST_DATA_DIR)).toThrowError(
      /Another server instance appears to be running/,
    );

    lock.release();
  });

  it("release cleans up the lock file", () => {
    const lock = acquireInstanceLock(TEST_DATA_DIR);
    const lockPath = path.join(TEST_DATA_DIR, ".server.lock");

    expect(existsSync(lockPath)).toBe(true);
    lock.release();
    expect(existsSync(lockPath)).toBe(false);
  });

  it("release is idempotent", () => {
    const lock = acquireInstanceLock(TEST_DATA_DIR);
    lock.release();
    expect(() => lock.release()).not.toThrow();
  });
});

describe("SQLite pragmas", () => {
  it("db module exports getDb without crashing", async () => {
    // This tests that the module loads and pragmas are applied
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    const walResult = db.pragma("journal_mode");
    expect(walResult).toEqual([{ journal_mode: "wal" }]);

    const timeoutResult = db.pragma("busy_timeout");
    expect(timeoutResult).toEqual([{ timeout: 5000 }]);
  });
});
