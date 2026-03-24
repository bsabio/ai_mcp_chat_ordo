import type Database from "better-sqlite3";
import { seedOperatorQaFixtures, shouldSeedOperatorQaFixtures } from "./fixtures";
import { runMigrations } from "./migrations";
import { runSeeds, SYSTEM_PROMPT_SEEDS } from "./seeds";
import { createTables } from "./tables";

export { SYSTEM_PROMPT_SEEDS };

export function ensureSchema(db: Database.Database): void {
  createTables(db);
  runMigrations(db);
  pruneExpiredSessions(db);
  runSeeds(db);

  if (shouldSeedOperatorQaFixtures(db)) {
    seedOperatorQaFixtures(db);
  }
}

function pruneExpiredSessions(db: Database.Database): void {
  db.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`).run();
}
