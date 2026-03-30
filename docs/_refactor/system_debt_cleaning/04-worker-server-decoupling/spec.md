# Spec 04: Worker/Server Decoupling

**Priority:** Critical
**Risk if deferred:** Any worker crash causes full site unavailability in production
**Files in scope:**
- `scripts/start-server.mjs` (~68 lines)
- `scripts/process-deferred-jobs.ts`

---

## Problem Statement

`start-server.mjs` spawns the deferred-job worker as a child process with `stdio: "inherit"`. If the worker exits unexpectedly (OOM, unhandled rejection, segfault), the parent server calls `shutdown("SIGTERM")` and takes itself down. This couples two independent failure domains:

1. **Web server** — serves HTTP requests, manages SSE streams.
2. **Background worker** — processes deferred jobs (blog generation, long LLM calls).

A worker crash should degrade the system (no new deferred jobs processed) but should NOT cause total service unavailability.

---

## Architectural Approach

### Step 1: Add restart logic with a bounded retry window

Replace the immediate `shutdown()` call with a restart-with-backoff strategy:

```javascript
// start-server.mjs
const MAX_WORKER_RESTARTS = 3;
const RESTART_WINDOW_MS = 60_000; // 1 minute window

let workerRestarts = [];

function spawnWorker() {
  const worker = spawn(process.execPath, [tsxCli, "scripts/process-deferred-jobs.ts"], {
    stdio: "inherit",
    env: {
      ...process.env,
      DEFERRED_JOB_WORKER_ID: process.env.DEFERRED_JOB_WORKER_ID ?? `worker_server_${port}`,
    },
  });

  worker.on("exit", (code, signal) => {
    if (shuttingDown) return;

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
  });

  return worker;
}

let workerProcess = spawnWorker();
```

### Step 2: Add a health status flag for the worker

Expose an internal flag so the server knows whether the worker is alive:

```javascript
let workerHealthy = true;

// Inside the exit handler:
workerHealthy = false;
// After successful respawn:
workerHealthy = true;
```

This flag can be checked by a health endpoint (`/api/health`) to report degraded mode.

### Step 3: Update the shutdown handler to reference the current worker process

Since `workerProcess` can now be reassigned after respawn, the shutdown handler must use the current reference:

```javascript
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  workerProcess.kill(signal);
  // ... existing server close logic
}
```

### Step 4: Separate worker stdout/stderr (optional improvement)

Replace `stdio: "inherit"` with prefixed output to distinguish worker logs from server logs:

```javascript
worker.stdout.on("data", (data) => {
  process.stdout.write(`[worker] ${data}`);
});
worker.stderr.on("data", (data) => {
  process.stderr.write(`[worker] ${data}`);
});
```

Use `stdio: ["ignore", "pipe", "pipe"]` to enable this.

---

## Constraints — Do NOT Introduce

- **Do not** introduce a process manager (pm2, systemd units) in this spec. That is an ops-level decision outside the application.
- **Do not** add IPC messaging between server and worker. The current "fire and poll" model via the database is correct.
- **Do not** make restart limits configurable via environment variables yet. Hardcoded constants are the right starting point.
- **Do not** change `process-deferred-jobs.ts` in this spec. It should already exit cleanly on errors; the parent's handling of that exit is what changes.
- **Do not** attempt to restart the worker if the parent is shutting down (the `shuttingDown` guard handles this).

---

## Required Tests

### Unit Tests — `tests/worker-server-decoupling.test.ts`

These tests operate on the restart logic extracted into a testable function, not by spawning real processes.

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `worker restart is attempted after first unexpected exit` | Simulate a worker exit event. Confirm `spawnWorker()` is called again. |
| 2 | `worker restart count is tracked within the time window` | Simulate 3 exits within 60s. Confirm all 3 trigger restarts. |
| 3 | `server shuts down after exceeding MAX_WORKER_RESTARTS in window` | Simulate 4 exits within 60s. Confirm `shutdown()` is called on the 4th. |
| 4 | `old exits outside the time window do not count` | Simulate 2 exits, advance clock past `RESTART_WINDOW_MS`, simulate 2 more exits. Confirm no shutdown (only 2 in current window). |
| 5 | `graceful shutdown does not trigger restart` | Set `shuttingDown = true`, kill the worker. Confirm no restart attempt. |
| 6 | `workerHealthy flag reflects current state` | Simulate exit → flag is `false`. Simulate successful respawn → flag is `true`. |

### Integration Test — `tests/worker-health-endpoint.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `GET /api/health reports degraded when worker is down` | Set `workerHealthy = false`, call health endpoint, expect `{ status: "degraded", worker: "down" }`. |
| 2 | `GET /api/health reports healthy when worker is running` | Set `workerHealthy = true`, call health endpoint, expect `{ status: "ok", worker: "running" }`. |

---

## Acceptance Criteria

- [ ] Worker exit no longer causes immediate server shutdown.
- [ ] Worker is automatically restarted up to `MAX_WORKER_RESTARTS` times within `RESTART_WINDOW_MS`.
- [ ] Exceeding the restart limit within the window triggers server shutdown with a clear log message.
- [ ] A `workerHealthy` flag is available for health-check endpoints.
- [ ] Worker logs are prefixed to distinguish from server logs.
- [ ] All existing start-server behavior is preserved for clean shutdown (SIGTERM/SIGINT).
- [ ] New tests above pass.
