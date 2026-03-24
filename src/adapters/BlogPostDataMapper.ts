import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type { BlogPost, BlogPostSeed } from "@/core/entities/blog";
import type { BlogPostRepository } from "@/core/use-cases/BlogPostRepository";

interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  published_by_user_id: string | null;
}

function mapRow(row: BlogPostRow): BlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    content: row.content,
    status: row.status as BlogPost["status"],
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByUserId: row.created_by_user_id,
    publishedByUserId: row.published_by_user_id,
  };
}

export class BlogPostDataMapper implements BlogPostRepository {
  constructor(private readonly db: Database.Database) {}

  async create(seed: BlogPostSeed): Promise<BlogPost> {
    const id = `blogpost_${randomUUID()}`;
    const now = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO blog_posts (id, slug, title, description, content, status, created_at, updated_at, created_by_user_id)
         VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
      )
      .run(id, seed.slug, seed.title, seed.description, seed.content, now, now, seed.createdByUserId);

    const row = this.db
      .prepare(`SELECT * FROM blog_posts WHERE id = ?`)
      .get(id) as BlogPostRow;
    return mapRow(row);
  }

  async findById(id: string): Promise<BlogPost | null> {
    const row = this.db
      .prepare(`SELECT * FROM blog_posts WHERE id = ?`)
      .get(id) as BlogPostRow | undefined;
    return row ? mapRow(row) : null;
  }

  async findBySlug(slug: string): Promise<BlogPost | null> {
    const row = this.db
      .prepare(`SELECT * FROM blog_posts WHERE slug = ?`)
      .get(slug) as BlogPostRow | undefined;
    return row ? mapRow(row) : null;
  }

  async listPublished(): Promise<BlogPost[]> {
    const rows = this.db
      .prepare(`SELECT * FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC`)
      .all() as BlogPostRow[];
    return rows.map(mapRow);
  }

  async publishById(id: string, publishedByUserId: string): Promise<BlogPost> {
    const now = new Date().toISOString();
    const result = this.db
      .prepare(
        `UPDATE blog_posts SET status = 'published', published_at = ?, updated_at = ?, published_by_user_id = ? WHERE id = ? AND status = 'draft'`,
      )
      .run(now, now, publishedByUserId, id);

    if (result.changes === 0) {
      throw new Error(`Post not found or already published: ${id}`);
    }

    const row = this.db
      .prepare(`SELECT * FROM blog_posts WHERE id = ?`)
      .get(id) as BlogPostRow;
    return mapRow(row);
  }
}
