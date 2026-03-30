import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

import type {
  BlogPostRevision,
  BlogPostRevisionSeed,
} from "@/core/entities/blog-revision";
import type { BlogPostRevisionRepository } from "@/core/use-cases/BlogPostRevisionRepository";

interface BlogPostRevisionRow {
  id: string;
  post_id: string;
  snapshot_json: string;
  change_note: string | null;
  created_by_user_id: string;
  created_at: string;
}

function mapRow(row: BlogPostRevisionRow): BlogPostRevision {
  return {
    id: row.id,
    postId: row.post_id,
    snapshot: JSON.parse(row.snapshot_json),
    changeNote: row.change_note,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
  };
}

export class BlogPostRevisionDataMapper implements BlogPostRevisionRepository {
  constructor(private readonly db: Database.Database) {}

  async create(seed: BlogPostRevisionSeed): Promise<BlogPostRevision> {
    const id = `blogrevision_${randomUUID()}`;
    const createdAt = new Date().toISOString();

    this.db.prepare(
      `INSERT INTO blog_post_revisions (
        id,
        post_id,
        snapshot_json,
        change_note,
        created_by_user_id,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      seed.postId,
      JSON.stringify(seed.snapshot),
      seed.changeNote ?? null,
      seed.createdByUserId,
      createdAt,
    );

    return this.getRequiredById(id);
  }

  async findById(id: string): Promise<BlogPostRevision | null> {
    const row = this.db.prepare(
      `SELECT * FROM blog_post_revisions WHERE id = ?`,
    ).get(id) as BlogPostRevisionRow | undefined;

    return row ? mapRow(row) : null;
  }

  async listByPostId(postId: string): Promise<BlogPostRevision[]> {
    const rows = this.db.prepare(
      `SELECT * FROM blog_post_revisions WHERE post_id = ? ORDER BY created_at DESC`,
    ).all(postId) as BlogPostRevisionRow[];

    return rows.map(mapRow);
  }

  private getRequiredById(id: string): BlogPostRevision {
    const row = this.db.prepare(
      `SELECT * FROM blog_post_revisions WHERE id = ?`,
    ).get(id) as BlogPostRevisionRow | undefined;

    if (!row) {
      throw new Error(`Blog post revision not found: ${id}`);
    }

    return mapRow(row);
  }
}