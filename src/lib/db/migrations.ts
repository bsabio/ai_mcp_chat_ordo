import type Database from "better-sqlite3";

function assertSafeIdentifier(value: string, kind: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe ${kind} identifier: ${value}`);
  }

  return value;
}

export function addColumnIfNotExists(
  db: Database.Database,
  table: string,
  column: string,
  definition: string,
): void {
  const safeTable = assertSafeIdentifier(table, "table");
  const safeColumn = assertSafeIdentifier(column, "column");
  const columns = db.pragma(`table_info(${safeTable})`) as Array<{ name: string }>;

  if (!columns.some((current) => current.name === safeColumn)) {
    db.exec(`ALTER TABLE ${safeTable} ADD COLUMN ${safeColumn} ${definition}`);
  }
}

export function runMigrations(db: Database.Database): void {
  addColumnIfNotExists(db, "users", "password_hash", "TEXT");
  addColumnIfNotExists(db, "users", "created_at", "TEXT");
  db.exec("UPDATE users SET created_at = datetime('now') WHERE created_at IS NULL");

  addColumnIfNotExists(
    db,
    "conversations",
    "status",
    "TEXT NOT NULL DEFAULT 'active'",
  );
  db.exec(`CREATE INDEX IF NOT EXISTS idx_conv_user_status ON conversations(user_id, status)`);

  addColumnIfNotExists(db, "conversations", "converted_from", "TEXT DEFAULT NULL");
  addColumnIfNotExists(
    db,
    "conversations",
    "message_count",
    "INTEGER NOT NULL DEFAULT 0",
  );
  addColumnIfNotExists(db, "conversations", "first_message_at", "TEXT DEFAULT NULL");
  addColumnIfNotExists(db, "conversations", "last_tool_used", "TEXT DEFAULT NULL");
  addColumnIfNotExists(
    db,
    "conversations",
    "session_source",
    "TEXT NOT NULL DEFAULT 'unknown'",
  );
  addColumnIfNotExists(db, "conversations", "prompt_version", "INTEGER DEFAULT NULL");
  addColumnIfNotExists(
    db,
    "conversations",
    "lane",
    "TEXT NOT NULL DEFAULT 'uncertain'",
  );
  addColumnIfNotExists(db, "conversations", "lane_confidence", "REAL DEFAULT NULL");
  addColumnIfNotExists(
    db,
    "conversations",
    "recommended_next_step",
    "TEXT DEFAULT NULL",
  );
  addColumnIfNotExists(
    db,
    "conversations",
    "detected_need_summary",
    "TEXT DEFAULT NULL",
  );
  addColumnIfNotExists(
    db,
    "conversations",
    "lane_last_analyzed_at",
    "TEXT DEFAULT NULL",
  );
  addColumnIfNotExists(db, "conversations", "referral_source", "TEXT DEFAULT NULL");

  addColumnIfNotExists(
    db,
    "messages",
    "token_estimate",
    "INTEGER NOT NULL DEFAULT 0",
  );

  addColumnIfNotExists(
    db,
    "lead_records",
    "triage_state",
    "TEXT NOT NULL DEFAULT 'new'",
  );
  addColumnIfNotExists(db, "lead_records", "founder_note", "TEXT DEFAULT NULL");
  addColumnIfNotExists(
    db,
    "lead_records",
    "last_contacted_at",
    "TEXT DEFAULT NULL",
  );
  addColumnIfNotExists(db, "lead_records", "triaged_at", "TEXT DEFAULT NULL");
  addColumnIfNotExists(
    db,
    "lead_records",
    "authority_level",
    "TEXT DEFAULT NULL",
  );
  addColumnIfNotExists(db, "lead_records", "urgency", "TEXT DEFAULT NULL");
  addColumnIfNotExists(
    db,
    "lead_records",
    "budget_signal",
    "TEXT DEFAULT NULL",
  );
  addColumnIfNotExists(
    db,
    "lead_records",
    "technical_environment",
    "TEXT DEFAULT NULL",
  );
  addColumnIfNotExists(
    db,
    "lead_records",
    "training_fit",
    "TEXT DEFAULT NULL",
  );
  db.exec(`CREATE INDEX IF NOT EXISTS idx_lead_records_triage_state ON lead_records(triage_state)`);

  addColumnIfNotExists(
    db,
    "users",
    "affiliate_enabled",
    "INTEGER NOT NULL DEFAULT 0",
  );
  addColumnIfNotExists(db, "users", "referral_code", "TEXT DEFAULT NULL");
  addColumnIfNotExists(db, "users", "credential", "TEXT DEFAULT NULL");
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code)`);
}