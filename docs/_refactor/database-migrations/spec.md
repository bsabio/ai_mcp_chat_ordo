# Database Migrations — Refactor Spec

> **Status:** Planned
> **Date:** 2026-04-07
> **Scope:** Replace the ad-hoc `addColumnIfNotExists()` migration pattern
> with a numbered-file migration system that tracks applied migrations in a
> `schema_migrations` table and runs automatically at startup.
> **Affects:** `src/lib/db/index.ts`, `src/lib/db/schema.ts`,
> `src/lib/db/tables.ts`, `src/lib/db/migrations.ts`, new `migrations/`
> directory
> **Motivation:** The current schema management uses `CREATE TABLE IF NOT
> EXISTS` and `addColumnIfNotExists()`. This works for additive changes but
> cannot express column renames, type changes, data transformations, or
> index rebuilds. There is no record of which migrations have run, making
> production debugging difficult. A simple numbered-file migration system
> would bring predictability without adding ORM complexity.
> **Requirement IDs:** `DBM-001` through `DBM-099`

---

## 1. Problem Statement

### 1.1 Current state

Schema is managed across two files:

- `src/lib/db/tables.ts` — `createTables()` with ~400 lines of
  `CREATE TABLE IF NOT EXISTS` statements for 26 tables.
- `src/lib/db/migrations.ts` — `runMigrations()` with sequential
  `addColumnIfNotExists()` calls and `CREATE INDEX IF NOT EXISTS` statements.

The startup sequence in `src/lib/db/schema.ts` calls
`createTables()` → `runMigrations()` → `runSeeds()`.

### 1.2 Verified issues

| # | Issue | Evidence | Impact |
| --- | --- | --- | --- |
| 1 | **No migration tracking** | No `schema_migrations` table exists | Cannot determine which migrations have been applied to a given database `[DBM-001]` |
| 2 | **No ordering guarantee** | Migrations are sequential function calls, not numbered files | Adding a migration requires editing `migrations.ts` rather than dropping a new file `[DBM-002]` |
| 3 | **Cannot express destructive changes** | `addColumnIfNotExists()` is the only migration primitive | Column renames, type changes, and data backfills require manual SQL and have no idempotency guard `[DBM-003]` |
| 4 | **No rollback capability** | No down migrations exist | Recovery from a bad migration requires manual SQL intervention `[DBM-004]` |

### 1.3 Root cause

SQLite was chosen for zero-dependency deployment. The migration approach grew
organically from `CREATE TABLE IF NOT EXISTS`, which is idempotent but
insufficient for schema evolution.

### 1.4 Why it matters

As the application adds tables and columns, the risk of running stale
migrations on a fresh database or skipping new migrations on an existing
database increases. A formal migration system eliminates this class of bug.

---

## 2. Design Goals

1. Create a `migrations/` directory at the project root containing numbered
   SQL or TypeScript migration files. `[DBM-010]`
2. Create a `schema_migrations` table that records the filename and
   applied timestamp of each migration. `[DBM-011]`
3. Implement a `runMigrations(db)` function that scans the `migrations/`
   directory, compares against `schema_migrations`, and applies unapplied
   files in numeric order inside a transaction. `[DBM-012]`
4. Reconstruct the current schema as migration `001_initial_schema.sql` so
   new environments start from a known baseline. `[DBM-013]`
5. Convert existing `addColumnIfNotExists()` calls into individual migration
   files. `[DBM-014]`
6. Run migrations automatically at startup in the existing `ensureSchema()`
   call chain. `[DBM-015]`
7. Keep the migration runner under 150 lines — no ORM, no framework. Pure
   better-sqlite3 and `fs.readdirSync`. `[DBM-016]`
8. Support both `.sql` (raw SQL) and `.ts` (programmatic) migration
   files. `[DBM-017]`

---

## 3. Architecture

### 3.1 Migration file naming

```
migrations/
  001_initial_schema.sql
  002_add_referral_columns.sql
  003_add_blog_post_artifacts.sql
  ...
```

Files are sorted lexicographically. The numeric prefix determines execution
order.

### 3.2 schema_migrations table

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT    NOT NULL UNIQUE,
  applied  TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

### 3.3 Migration runner pseudocode

```
1. Ensure schema_migrations table exists
2. Read applied filenames from schema_migrations
3. List files in migrations/ matching *.sql or *.ts
4. Filter to unapplied files, sort by name
5. For each unapplied file:
   a. Begin transaction
   b. Execute SQL or import and call default export function(db)
   c. INSERT INTO schema_migrations (filename) VALUES (?)
   d. Commit
   e. Log: "Applied migration: {filename}"
6. If any migration fails, rollback and throw with filename and error
```

### 3.4 Integration point

Replace the `runMigrations()` call in `src/lib/db/schema.ts` with the new
migration runner. The `createTables()` call can be removed once
`001_initial_schema.sql` covers all base tables.

---

## 4. Security

- Migration files must not contain secrets or hardcoded credentials.
- The migration runner must not execute files outside the `migrations/`
  directory.
- Failed migrations must roll back completely — no partial schema changes.

---

## 5. Testing Strategy

- Unit test the migration runner against an in-memory SQLite database: apply
  migrations in order, verify `schema_migrations` records, verify table
  structure.
- Test idempotency: running the migration runner twice produces no errors.
- Test failure recovery: a deliberately broken migration file rolls back
  cleanly and does not record in `schema_migrations`.

---

## 6. Sprint Plan

| Sprint | Focus |
| --- | --- |
| Sprint 0 | Migration runner, `schema_migrations` table, baseline migration `001`, unit tests |
| Sprint 1 | Convert existing `addColumnIfNotExists()` calls to individual migration files, remove old migration code |

---

## 7. Future Considerations

- Down migrations are not included in this spec. They add complexity and are
  rarely used with SQLite (backups are simpler). Revisit if the team adopts
  a branching workflow that requires schema rollbacks.
- A `migrate` CLI script (`node scripts/migrate.ts`) could be added for
  manual migration management outside the startup path.
