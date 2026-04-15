# Spec 05: SQLite Single-Node Boundary Formalization

**Priority:** High (architectural documentation + code guards)
**Risk if deferred:** Implicit single-node assumption causes subtle bugs when horizontal scaling is attempted
**Files in scope:**
- `src/adapters/` (all DataMapper and repository implementations)
- `src/lib/db/` (database connection/setup)
- `scripts/start-server.mjs`
- Ops/deployment documentation

---

## Problem Statement

The system uses SQLite for durable jobs, conversation state, embeddings, and background work. This is a valid architectural choice for a single-node deployment, but it is currently an **implicit** constraint rather than an **explicit, documented, and enforced** boundary. Consequences:

1. No runtime check prevents someone from accidentally running two server instances against the same SQLite file (or worse, different files).
2. The deferred-job worker and web server share the same SQLite database via filesystem — this breaks if they ever run on different hosts.
3. Embedding storage, conversation indexes, and job queues all assume exclusive single-writer access.
4. There is no documented migration path for moving to a client/server database when the constraint is outgrown.

---

## Architectural Approach

### Step 1: Add startup invariant check

At server startup, verify single-instance ownership of the database:

```typescript
// src/lib/db/startup-check.ts
import { existsSync, writeFileSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";

const LOCK_FILE = path.join(process.env.DATA_DIR ?? ".data", ".server.lock");

export function acquireInstanceLock(): { release: () => void } {
  if (existsSync(LOCK_FILE)) {
    const existing = readFileSync(LOCK_FILE, "utf-8").trim();
    throw new Error(
      `Another server instance appears to be running (PID: ${existing}). ` +
      `SQLite requires single-writer access. Remove ${LOCK_FILE} if the previous instance crashed.`
    );
  }
  writeFileSync(LOCK_FILE, String(process.pid), "utf-8");
  return {
    release() {
      try { unlinkSync(LOCK_FILE); } catch { /* already cleaned */ }
    },
  };
}
```

Call this at the top of `start-server.mjs` and in the shutdown handler:

```javascript
const lock = acquireInstanceLock();
// ... on shutdown:
lock.release();
```

### Step 2: Document the single-node invariant

Create or update `docs/operations/single-node-invariant.md`:

```markdown
# Single-Node Invariant

This system uses SQLite as its primary data store. SQLite provides
serialized writes via file-level locking, which means:

- Only ONE server process and ONE worker process may access the database.
- Both must run on the SAME host with access to the same filesystem.
- Horizontal scaling requires migrating to PostgreSQL (see Migration Path below).

## What breaks if violated
- Concurrent writes from multiple processes → SQLITE_BUSY / data corruption.
- Deferred jobs polled by a worker on a different host → jobs never processed.
- Embedding indexes built on one node → invisible to queries on another.

## Migration Path to PostgreSQL
1. Replace Drizzle SQLite driver with Drizzle PostgreSQL driver.
2. Update DataMapper implementations (most are already abstracted behind repository interfaces).
3. Replace file-based lock with pg_advisory_lock or similar.
4. Test all repository integration tests against PostgreSQL.
```

### Step 3: Add WAL mode assertion

Ensure the database is opened in WAL mode for better concurrent read performance between the server and worker:

```typescript
// src/lib/db/connection.ts — at connection init
db.run("PRAGMA journal_mode=WAL");
db.run("PRAGMA busy_timeout=5000"); // 5s wait on lock contention
```

### Step 4: Add a runtime diagnostic

Add a check to the admin health/diagnostics endpoint that reports the database mode:

```typescript
// In health or diagnostics route
{
  database: {
    engine: "sqlite",
    journalMode: "wal",
    singleNode: true,
    lockFile: LOCK_FILE,
    pid: process.pid,
  }
}
```

---

## Constraints — Do NOT Introduce

- **Do not** implement the PostgreSQL migration in this spec. Only document the path.
- **Do not** add distributed locking libraries. The file-based PID lock is sufficient for single-node.
- **Do not** change the Drizzle schema or migration files.
- **Do not** make the lock file path configurable via environment variable yet — use the data directory convention.
- **Do not** use `flock` or OS-level advisory locks — they behave inconsistently across macOS and Linux in Docker.

---

## Required Tests

### Unit Tests — `tests/sqlite-boundary.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `acquireInstanceLock creates lock file with current PID` | Call `acquireInstanceLock()`, read the lock file, confirm it contains `process.pid`. |
| 2 | `acquireInstanceLock throws if lock file already exists` | Write a lock file manually, call `acquireInstanceLock()`, expect Error with message mentioning "Another server instance". |
| 3 | `release removes the lock file` | Acquire lock, call `release()`, confirm file no longer exists. |
| 4 | `release is idempotent` | Call `release()` twice — no error on second call. |
| 5 | `lock file directory is created if missing` | Point `DATA_DIR` at a non-existent directory, confirm lock acquisition creates it (or fails cleanly). |

### Documentation Verification Test — `tests/sqlite-boundary-docs.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `single-node invariant document exists` | Assert `docs/operations/single-node-invariant.md` exists and contains key sections: "What breaks if violated", "Migration Path". |

---

## Acceptance Criteria

- [ ] `acquireInstanceLock()` is called at server startup and released on shutdown.
- [ ] Attempting to start a second instance produces a clear error.
- [ ] `docs/operations/single-node-invariant.md` documents the constraint, failure modes, and migration path.
- [ ] WAL mode and busy_timeout are set at database connection init.
- [ ] Health endpoint reports database engine and mode.
- [ ] All new tests pass.
