# Sprint 0 — Migration Runner and Baseline Schema

> **Goal:** Implement the numbered-file migration runner, create the
> `schema_migrations` table, extract the current schema as the baseline
> migration, and verify with unit tests.
>
> **Spec Sections:** 2 (Design Goals), 3 (Architecture)
>
> **Prerequisite:** None

## Available Assets

| Asset | Location |
| --- | --- |
| Current table definitions | `src/lib/db/tables.ts` |
| Current migration logic | `src/lib/db/migrations.ts` |
| Schema orchestration | `src/lib/db/schema.ts` |
| Database singleton | `src/lib/db/index.ts` |

---

### Task 1 — Create migration runner module

Create `src/lib/db/migration-runner.ts` implementing the runner described in
spec section 3.3.

Requirements:

- Export `runNumberedMigrations(db: Database.Database, migrationsDir: string): void`
- Create `schema_migrations` table if it does not exist (spec section 3.2).
- Read `migrations/` directory, filter `*.sql` files, sort lexicographically.
- For each unapplied file: begin transaction, exec SQL, insert record, commit.
- On failure: rollback and throw with filename and original error.
- Log applied migrations to stdout (will be replaced by structured logger
  in the logging refactor).

Keep implementation under 150 lines.

**Verify:**

```bash
npx tsc --noEmit src/lib/db/migration-runner.ts
```

---

### Task 2 — Extract baseline migration

Create `migrations/001_initial_schema.sql` containing all `CREATE TABLE`
statements from `src/lib/db/tables.ts` and all `CREATE INDEX` statements.

This file must produce the exact same schema as the current `createTables()`
function when executed against an empty database.

**Verify:**

```bash
# Create a test database from migration
node -e "
  const Database = require('better-sqlite3');
  const fs = require('fs');
  const db = new Database(':memory:');
  db.exec(fs.readFileSync('migrations/001_initial_schema.sql', 'utf-8'));
  const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name\").all();
  console.log(tables.map(t => t.name).join('\n'));
"
```

---

### Task 3 — Wire migration runner into startup

Modify `src/lib/db/schema.ts` to call `runNumberedMigrations()` after (or
instead of) the existing `createTables()` and `runMigrations()` calls.

During the transition period, keep `createTables()` as a safety net. Once
Sprint 1 converts all existing migrations, `createTables()` can be removed.

**Verify:**

```bash
npm run build
```

---

### Task 4 — Unit tests

Create `tests/database-migration-runner.test.ts` with the following test
cases:

1. `applies migrations in numeric order`
2. `records applied migrations in schema_migrations table`
3. `skips already-applied migrations on re-run`
4. `rolls back on SQL error and does not record migration`
5. `baseline migration produces all 26 tables`

Use in-memory SQLite databases for all tests.

**Verify:**

```bash
npx vitest run tests/database-migration-runner.test.ts
```

---

## Completion Checklist

- [ ] `src/lib/db/migration-runner.ts` exports `runNumberedMigrations()`
- [ ] `migrations/001_initial_schema.sql` exists and produces all 26 tables
- [ ] `schema_migrations` table created automatically at startup
- [ ] `src/lib/db/schema.ts` calls the new runner
- [ ] `tests/database-migration-runner.test.ts` passes (~5 tests)
- [ ] `npm run build` succeeds
