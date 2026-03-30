import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { existsSync, writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import next from "next";

// ── Instance lock ────────────────────────────────────────────────────────────

const dataDir = process.env.DATA_DIR ?? ".data";
const lockFile = join(dataDir, ".server.lock");

if (existsSync(lockFile)) {
  const existing = readFileSync(lockFile, "utf-8").trim();
  console.error(
    `Another server instance appears to be running (PID: ${existing}). ` +
    `SQLite requires single-writer access. Remove ${lockFile} if the previous instance crashed.`
  );
  process.exit(1);
}

writeFileSync(lockFile, String(process.pid), "utf-8");

function releaseInstanceLock() {
  try { unlinkSync(lockFile); } catch { /* already cleaned */ }
}

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const shutdownTimeoutMs = Number.parseInt(process.env.SHUTDOWN_TIMEOUT_MS ?? "10000", 10);

const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();
const tsxCli = resolve("node_modules", "tsx", "dist", "cli.mjs");

// ── Worker restart-with-backoff ──────────────────────────────────────────────

const MAX_WORKER_RESTARTS = 3;
const RESTART_WINDOW_MS = 60_000;

let workerRestarts = [];
let workerHealthy = true;

function spawnWorker() {
  const worker = spawn(process.execPath, [tsxCli, "scripts/process-deferred-jobs.ts"], {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      DEFERRED_JOB_WORKER_ID: process.env.DEFERRED_JOB_WORKER_ID ?? `worker_server_${port}`,
    },
  });

  worker.stdout.on("data", (data) => {
    process.stdout.write(`[worker] ${data}`);
  });
  worker.stderr.on("data", (data) => {
    process.stderr.write(`[worker] ${data}`);
  });

  worker.on("exit", (code, signal) => {
    if (shuttingDown) return;

    workerHealthy = false;

    const now = Date.now();
    workerRestarts = workerRestarts.filter((t) => now - t < RESTART_WINDOW_MS);
    workerRestarts.push(now);

    if (workerRestarts.length > MAX_WORKER_RESTARTS) {
      console.error(
        `[deferred-jobs] worker crashed ${MAX_WORKER_RESTARTS + 1} times in ${RESTART_WINDOW_MS / 1000}s — shutting down`,
        { code, signal },
      );
      shutdown("SIGTERM");
      return;
    }

    console.warn(
      `[deferred-jobs] worker exited unexpectedly — restarting (${workerRestarts.length}/${MAX_WORKER_RESTARTS})`,
      { code, signal },
    );
    workerProcess = spawnWorker();
    workerHealthy = true;
  });

  return worker;
}

let workerProcess = spawnWorker();

// ── Server setup ─────────────────────────────────────────────────────────────

await app.prepare();

let shuttingDown = false;
const sockets = new Set();

const server = createServer((req, res) => {
  if (shuttingDown) {
    res.statusCode = 503;
    res.setHeader("Connection", "close");
    res.end("Server is shutting down.");
    return;
  }

  void handle(req, res);
});

server.on("connection", (socket) => {
  sockets.add(socket);
  socket.on("close", () => {
    sockets.delete(socket);
  });
});

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.info(`[shutdown] received ${signal}; draining connections`);
  releaseInstanceLock();

  if (!workerProcess.killed) {
    workerProcess.kill(signal);
  }

  server.close(() => {
    console.info("[shutdown] server closed cleanly");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("[shutdown] timeout reached; force closing remaining sockets");
    for (const socket of sockets) {
      socket.destroy();
    }
    process.exit(1);
  }, shutdownTimeoutMs).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export { workerHealthy, MAX_WORKER_RESTARTS, RESTART_WINDOW_MS };

server.listen(port, hostname, () => {
  console.info(`server listening on http://${hostname}:${port}`);
});
