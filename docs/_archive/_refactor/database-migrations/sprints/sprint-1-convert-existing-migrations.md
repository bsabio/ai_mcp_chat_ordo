# Sprint 1 — Convert Existing Migrations

> **Goal:** Convert every `addColumnIfNotExists()` call and inline
> `CREATE INDEX IF NOT EXISTS` statement from `src/lib/db/migrations.ts`
> into individual numbered migration files, then remove the legacy migration
> code.
>
> **Spec Sections:** 2 (Design Goals §5), 3 (Architecture §3.1)
>
> **Prerequisite:** Sprint 0 complete (migration runner operational)

## Available Assets

| Asset | Location |
| --- | --- |
| Legacy migration code | `src/lib/db/migrations.ts` |
| Migration runner | `src/lib/db/migration-runner.ts` |
| Baseline migration | `migrations/001_initial_schema.sql` |

---

### Task 1 — Audit existing migration calls

Read `src/lib/db/migrations.ts` and catalog every `addColumnIfNotExists()`
call and `CREATE INDEX` statement. Group related changes into logical
migration files (e.g., all referral columns in one file, all blog artifact
columns in another).

Document the mapping in a comment at the top of the task or in a temporary
tracking file.

**Verify:**

Manual review — confirm every call in `migrations.ts` maps to a migration
file.

---

### Task 2 — Create numbered migration files

For each group identified in Task 1, create a migration file:

```
migrations/002_add_referral_columns.sql
migrations/003_add_blog_post_artifacts.sql
migrations/004_add_conversation_metadata.sql
...
```

Each file must contain standard `ALTER TABLE ... ADD COLUMN` and
`CREATE INDEX IF NOT EXISTS` SQL. Use `ALTER TABLE` directly — the migration
runner guarantees each file runs exactly once, so `addColumnIfNotExists()` is
no longer needed.

**Verify:**

```bash
# Apply all migrations to a fresh in-memory database
node -e "
  const Database = require('better-sqlite3');
  const fs = require('fs');
  const { runNumberedMigrations } = require('./src/lib/db/migration-runner');
  const db = new Database(':memory:');
  runNumberedMigrations(db, './migrations');
  const cols = db.pragma('table_info(conversations)');
  console.log(cols.map(c => c.name).join(', '));
"
```

---

### Task 3 — Remove legacy migration code

1. Delete `src/lib/db/migrations.ts` (or gut it to a stub that calls the
   new runner for backward compatibility if other code imports it).
2. Remove the `addColumnIfNotExists` helper.
3. Update `src/lib/db/schema.ts` to remove the old `runMigrations()` call
   if it still references the legacy function.

**Verify:**

```bash
npm run build
npx vitest run
```

---

## Completion Checklist

- [ ] All `addColumnIfNotExists()` calls converted to numbered SQL files
- [ ] `src/lib/db/migrations.ts` removed or reduced to a no-op
- [ ] Fresh database created from `migrations/` matches existing schema exactly
- [ ] `npm run build` succeeds
- [ ] All existing tests pass
