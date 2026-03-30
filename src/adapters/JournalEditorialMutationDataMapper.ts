import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

import type { BlogPost } from "@/core/entities/blog";
import type { AtomicJournalRevisionRestoreInput, JournalEditorialMutationRepository } from "@/core/use-cases/JournalEditorialMutationRepository";

interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  standfirst: string | null;
  section: string | null;
  hero_image_asset_id: string | null;
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
    standfirst: row.standfirst,
    section: row.section as BlogPost["section"],
    heroImageAssetId: row.hero_image_asset_id,
    status: row.status as BlogPost["status"],
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByUserId: row.created_by_user_id,
    publishedByUserId: row.published_by_user_id,
  };
}

function snapshotJson(post: BlogPost) {
  return JSON.stringify({
    slug: post.slug,
    title: post.title,
    description: post.description,
    standfirst: post.standfirst ?? null,
    content: post.content,
    section: post.section ?? null,
    status: post.status,
  });
}

export class JournalEditorialMutationDataMapper implements JournalEditorialMutationRepository {
  constructor(private readonly db: Database.Database) {}

  async restoreRevisionAtomically(input: AtomicJournalRevisionRestoreInput): Promise<BlogPost> {
    const transaction = this.db.transaction((params: AtomicJournalRevisionRestoreInput) => {
      const now = new Date().toISOString();
      const revisionId = `blogrevision_${randomUUID()}`;

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
        revisionId,
        params.postId,
        snapshotJson(params.currentPost),
        params.changeNote,
        params.actorUserId,
        now,
      );

      const restoringPublished = params.targetSnapshot.status === "published";

      this.db.prepare(
        `UPDATE blog_posts
         SET slug = ?,
             title = ?,
             description = ?,
             content = ?,
             standfirst = ?,
             section = ?,
             status = ?,
             published_at = ?,
             published_by_user_id = ?,
             updated_at = ?
         WHERE id = ?`,
      ).run(
        params.targetSnapshot.slug,
        params.targetSnapshot.title,
        params.targetSnapshot.description,
        params.targetSnapshot.content,
        params.targetSnapshot.standfirst,
        params.targetSnapshot.section,
        params.targetSnapshot.status,
        restoringPublished ? (params.currentPost.publishedAt ?? now) : null,
        restoringPublished ? params.actorUserId : null,
        now,
        params.postId,
      );

      const row = this.db.prepare(`SELECT * FROM blog_posts WHERE id = ?`).get(params.postId) as BlogPostRow | undefined;

      if (!row) {
        throw new Error(`Post not found after restore: ${params.postId}`);
      }

      return mapRow(row);
    });

    return transaction(input);
  }
}