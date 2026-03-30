import type Database from "better-sqlite3";
import type {
  UserPreference,
  UserPreferencesRepository,
} from "@/core/ports/UserPreferencesRepository";

const ALLOWED_KEYS = new Set([
  "theme",
  "dark_mode",
  "font_size",
  "line_height",
  "letter_spacing",
  "density",
  "color_blind_mode",
  "response_style",
  "tone",
  "business_context",
  "preferred_name",
  "push_notifications",
]);

const MAX_VALUE_LENGTHS: Record<string, number> = {
  business_context: 500,
  preferred_name: 100,
};

const DEFAULT_MAX_VALUE_LENGTH = 50;

export class UserPreferencesDataMapper implements UserPreferencesRepository {
  constructor(private readonly db: Database.Database) {}

  async getAll(userId: string): Promise<UserPreference[]> {
    const rows = this.db
      .prepare(
        "SELECT key, value, updated_at FROM user_preferences WHERE user_id = ? ORDER BY key",
      )
      .all(userId) as Array<{
      key: string;
      value: string;
      updated_at: string;
    }>;
    return rows.map((r) => ({
      key: r.key,
      value: r.value,
      updatedAt: r.updated_at,
    }));
  }

  async get(userId: string, key: string): Promise<UserPreference | null> {
    this.validateKey(key);
    const row = this.db
      .prepare(
        "SELECT key, value, updated_at FROM user_preferences WHERE user_id = ? AND key = ?",
      )
      .get(userId, key) as
      | { key: string; value: string; updated_at: string }
      | undefined;
    return row
      ? { key: row.key, value: row.value, updatedAt: row.updated_at }
      : null;
  }

  async set(userId: string, key: string, value: string): Promise<void> {
    this.validateKey(key);
    this.validateValue(key, value);
    const id = `pref_${crypto.randomUUID()}`;
    this.db
      .prepare(
        `INSERT INTO user_preferences (id, user_id, key, value, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      )
      .run(id, userId, key, value);
  }

  async delete(userId: string, key: string): Promise<void> {
    this.validateKey(key);
    this.db
      .prepare("DELETE FROM user_preferences WHERE user_id = ? AND key = ?")
      .run(userId, key);
  }

  private validateKey(key: string): void {
    if (!ALLOWED_KEYS.has(key)) {
      throw new Error(`Unknown preference key: ${key}`);
    }
  }

  private validateValue(key: string, value: string): void {
    const maxLength = MAX_VALUE_LENGTHS[key] ?? DEFAULT_MAX_VALUE_LENGTH;
    if (value.length > maxLength) {
      throw new Error(
        `Preference value for "${key}" exceeds maximum length of ${maxLength}`,
      );
    }
  }
}
