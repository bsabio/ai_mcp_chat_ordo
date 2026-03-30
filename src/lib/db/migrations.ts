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

  addColumnIfNotExists(db, "lead_records", "follow_up_at", "TEXT DEFAULT NULL");
  addColumnIfNotExists(db, "deal_records", "follow_up_at", "TEXT DEFAULT NULL");

  addColumnIfNotExists(
    db,
    "users",
    "affiliate_enabled",
    "INTEGER NOT NULL DEFAULT 0",
  );
  addColumnIfNotExists(db, "users", "referral_code", "TEXT DEFAULT NULL");
  addColumnIfNotExists(db, "users", "credential", "TEXT DEFAULT NULL");
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code)`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS blog_assets (
      id TEXT PRIMARY KEY,
      post_id TEXT,
      kind TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      alt_text TEXT NOT NULL DEFAULT '',
      source_prompt TEXT,
      provider TEXT,
      provider_model TEXT,
      visibility TEXT NOT NULL DEFAULT 'draft',
      selection_state TEXT NOT NULL DEFAULT 'candidate',
      variation_group_id TEXT DEFAULT NULL,
      created_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_blog_assets_post ON blog_assets(post_id);
    CREATE INDEX IF NOT EXISTS idx_blog_assets_visibility ON blog_assets(visibility);
    CREATE INDEX IF NOT EXISTS idx_blog_assets_created_by ON blog_assets(created_by_user_id);
  `);
  addColumnIfNotExists(
    db,
    "blog_assets",
    "selection_state",
    "TEXT NOT NULL DEFAULT 'candidate'",
  );
  addColumnIfNotExists(
    db,
    "blog_assets",
    "variation_group_id",
    "TEXT DEFAULT NULL",
  );
  db.exec(`CREATE INDEX IF NOT EXISTS idx_blog_assets_selection_state ON blog_assets(selection_state)`);
  db.exec(`
    UPDATE blog_assets
    SET selection_state = 'selected'
    WHERE id IN (
      SELECT hero_image_asset_id
      FROM blog_posts
      WHERE hero_image_asset_id IS NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS blog_post_artifacts (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      artifact_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_blog_post_artifacts_post ON blog_post_artifacts(post_id);
    CREATE INDEX IF NOT EXISTS idx_blog_post_artifacts_type ON blog_post_artifacts(artifact_type);
  `);

  addColumnIfNotExists(
    db,
    "blog_posts",
    "standfirst",
    "TEXT DEFAULT NULL",
  );
  addColumnIfNotExists(
    db,
    "blog_posts",
    "section",
    "TEXT DEFAULT NULL",
  );
  addColumnIfNotExists(
    db,
    "blog_posts",
    "hero_image_asset_id",
    "TEXT DEFAULT NULL REFERENCES blog_assets(id)",
  );
  db.exec(`CREATE INDEX IF NOT EXISTS idx_blog_posts_hero_image_asset ON blog_posts(hero_image_asset_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_blog_posts_section ON blog_posts(section)`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS blog_post_revisions (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      snapshot_json TEXT NOT NULL,
      change_note TEXT DEFAULT NULL,
      created_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_blog_post_revisions_post ON blog_post_revisions(post_id);
    CREATE INDEX IF NOT EXISTS idx_blog_post_revisions_created_at ON blog_post_revisions(created_at);
  `);
}