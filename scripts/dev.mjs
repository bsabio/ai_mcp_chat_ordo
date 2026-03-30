#!/usr/bin/env node
/**
 * Starts `next dev` on the first available port, beginning with PORT
 * from the environment (default 3000). If that port is busy, it tries
 * the next one, up to 10 attempts.
 */
import { createServer } from "net";
import { spawn } from "child_process";
import { resolve } from "path";

const PREFERRED = parseInt(process.env.PORT || "3000", 10);
const MAX_ATTEMPTS = 10;

function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => {
      srv.close(() => resolve(true));
    });
    srv.listen(port, "0.0.0.0");
  });
}

async function findFreePort(start) {
  for (let port = start; port < start + MAX_ATTEMPTS; port++) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(
    `No free port found in range ${start}–${start + MAX_ATTEMPTS - 1}`,
  );
}

const port = await findFreePort(PREFERRED);
if (port !== PREFERRED) {
  console.log(`⚡ Port ${PREFERRED} is busy — using port ${port}`);
}

const nextBin = resolve("node_modules/.bin/next");

function spawnManaged(command, args, env) {
  return spawn(command, args, {
    stdio: "inherit",
    env,
  });
}

const tsxCli = resolve("node_modules", "tsx", "dist", "cli.mjs");
const sharedEnv = { ...process.env, PORT: String(port) };
const nextProcess = spawnManaged(nextBin, ["dev", "--port", String(port)], sharedEnv);
const workerProcess = spawnManaged(process.execPath, [tsxCli, "scripts/process-deferred-jobs.ts"], {
  ...sharedEnv,
  DEFERRED_JOB_WORKER_ID: process.env.DEFERRED_JOB_WORKER_ID ?? `worker_dev_${port}`,
});

let shuttingDown = false;

function terminate(child, signal = "SIGTERM") {
  if (!child.killed) {
    child.kill(signal);
  }
}

function shutdown(signal, exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  terminate(workerProcess, signal);
  terminate(nextProcess, signal);
  setTimeout(() => process.exit(exitCode), 250).unref();
}

process.on("SIGINT", () => shutdown("SIGINT", 0));
process.on("SIGTERM", () => shutdown("SIGTERM", 0));

workerProcess.on("exit", (code, signal) => {
  if (shuttingDown) {
    return;
  }

  console.error("[deferred-jobs] worker exited unexpectedly", { code, signal });
  shutdown("SIGTERM", code ?? 1);
});

nextProcess.on("exit", (code, signal) => {
  if (shuttingDown) {
    return;
  }

  console.error("[next-dev] process exited", { code, signal });
  shutdown("SIGTERM", code ?? 1);
});
