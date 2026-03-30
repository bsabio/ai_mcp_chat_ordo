import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

import { ensureSchema } from "@/lib/db/schema";

describe("blog asset schema", () => {
  it("creates the blog_assets table and hero_image_asset_id column", () => {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");

    ensureSchema(db);

    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('blog_posts', 'blog_assets')`)
      .all() as Array<{ name: string }>;
    const blogPostColumns = db.pragma("table_info(blog_posts)") as Array<{ name: string }>;
    const blogAssetColumns = db.pragma("table_info(blog_assets)") as Array<{ name: string }>;

    expect(tables.map((entry) => entry.name).sort()).toEqual(["blog_assets", "blog_posts"]);
    expect(blogPostColumns.some((column) => column.name === "hero_image_asset_id")).toBe(true);
    expect(blogAssetColumns.map((column) => column.name)).toEqual(expect.arrayContaining([
      "post_id",
      "storage_path",
      "alt_text",
      "visibility",
      "selection_state",
      "variation_group_id",
    ]));
  });
});