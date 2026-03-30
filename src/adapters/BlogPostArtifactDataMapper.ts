import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

import type {
  BlogPostArtifact,
  BlogPostArtifactSeed,
  BlogPostArtifactType,
} from "@/core/entities/blog-artifact";
import type { BlogPostArtifactRepository } from "@/core/use-cases/BlogPostArtifactRepository";

interface BlogPostArtifactRow {
  id: string;
  post_id: string;
  artifact_type: string;
  payload_json: string;
  created_by_user_id: string;
  created_at: string;
}

function mapRow(row: BlogPostArtifactRow): BlogPostArtifact {
  return {
    id: row.id,
    postId: row.post_id,
    artifactType: row.artifact_type as BlogPostArtifactType,
    payload: JSON.parse(row.payload_json),
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
  };
}

export class BlogPostArtifactDataMapper implements BlogPostArtifactRepository {
  constructor(private readonly db: Database.Database) {}

  async create(seed: BlogPostArtifactSeed): Promise<BlogPostArtifact> {
    const id = `blogartifact_${randomUUID()}`;
    const createdAt = new Date().toISOString();

    this.db.prepare(
      `INSERT INTO blog_post_artifacts (
        id,
        post_id,
        artifact_type,
        payload_json,
        created_by_user_id,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      seed.postId,
      seed.artifactType,
      JSON.stringify(seed.payload),
      seed.createdByUserId,
      createdAt,
    );

    return this.getRequiredById(id);
  }

  async listByPost(postId: string): Promise<BlogPostArtifact[]> {
    const rows = this.db.prepare(
      `SELECT * FROM blog_post_artifacts WHERE post_id = ? ORDER BY created_at ASC`,
    ).all(postId) as BlogPostArtifactRow[];
    return rows.map(mapRow);
  }

  async listByPostAndType(
    postId: string,
    artifactType: BlogPostArtifactType,
  ): Promise<BlogPostArtifact[]> {
    const rows = this.db.prepare(
      `SELECT * FROM blog_post_artifacts WHERE post_id = ? AND artifact_type = ? ORDER BY created_at ASC`,
    ).all(postId, artifactType) as BlogPostArtifactRow[];
    return rows.map(mapRow);
  }

  private getRequiredById(id: string): BlogPostArtifact {
    const row = this.db.prepare(
      `SELECT * FROM blog_post_artifacts WHERE id = ?`,
    ).get(id) as BlogPostArtifactRow | undefined;

    if (!row) {
      throw new Error(`Blog post artifact not found: ${id}`);
    }

    return mapRow(row);
  }
}