import { existsSync, writeFileSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";

export function acquireInstanceLock(
  dataDir: string = process.env.DATA_DIR ?? ".data",
): { release: () => void } {
  const lockFile = path.join(dataDir, ".server.lock");

  if (existsSync(lockFile)) {
    const existing = readFileSync(lockFile, "utf-8").trim();
    throw new Error(
      `Another server instance appears to be running (PID: ${existing}). ` +
        `SQLite requires single-writer access. Remove ${lockFile} if the previous instance crashed.`,
    );
  }

  writeFileSync(lockFile, String(process.pid), "utf-8");

  return {
    release() {
      try {
        unlinkSync(lockFile);
      } catch {
        /* already cleaned */
      }
    },
  };
}
