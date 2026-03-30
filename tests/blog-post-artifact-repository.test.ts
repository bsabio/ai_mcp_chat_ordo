import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";

import { BlogPostArtifactDataMapper } from "@/adapters/BlogPostArtifactDataMapper";
import { BlogPostDataMapper } from "@/adapters/BlogPostDataMapper";
import { ensureSchema } from "@/lib/db/schema";

describe("BlogPostArtifactDataMapper", () => {
  let db: Database.Database;
  let artifactRepo: BlogPostArtifactDataMapper;
  let postRepo: BlogPostDataMapper;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    ensureSchema(db);
    db.prepare(`INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)`)
      .run("usr_admin", "admin@example.com", "Admin");
    artifactRepo = new BlogPostArtifactDataMapper(db);
    postRepo = new BlogPostDataMapper(db);
  });

  it("persists and filters artifacts by post and type", async () => {
    const post = await postRepo.create({
      slug: "artifact-post",
      title: "Artifact Post",
      description: "Artifact tests.",
      content: "## Artifact\n\nBody.",
      createdByUserId: "usr_admin",
    });

    await artifactRepo.create({
      postId: post.id,
      artifactType: "article_generation_prompt",
      payload: { brief: "Write about testing." },
      createdByUserId: "usr_admin",
    });
    await artifactRepo.create({
      postId: post.id,
      artifactType: "article_qa_report",
      payload: { approved: false, findings: [{ severity: "medium" }] },
      createdByUserId: "usr_admin",
    });

    const artifacts = await artifactRepo.listByPost(post.id);
    const qaArtifacts = await artifactRepo.listByPostAndType(post.id, "article_qa_report");

    expect(artifacts).toHaveLength(2);
    expect(qaArtifacts).toHaveLength(1);
    expect(qaArtifacts[0]?.payload).toMatchObject({ approved: false });
  });

  it("preserves nested JSON payloads and rejects unknown post ids", async () => {
    const post = await postRepo.create({
      slug: "artifact-nested-post",
      title: "Artifact Nested Post",
      description: "Artifact nested tests.",
      content: "## Artifact\n\nBody.",
      createdByUserId: "usr_admin",
    });

    const artifact = await artifactRepo.create({
      postId: post.id,
      artifactType: "article_qa_report",
      payload: {
        approved: true,
        findings: [{
          id: "finding_1",
          severity: "low",
          metadata: { section: "intro", tags: ["style", "clarity"] },
        }],
      },
      createdByUserId: "usr_admin",
    });

    expect(artifact.payload).toMatchObject({
      approved: true,
      findings: [{
        id: "finding_1",
        metadata: { section: "intro", tags: ["style", "clarity"] },
      }],
    });

    await expect(artifactRepo.create({
      postId: "post_missing",
      artifactType: "article_qa_report",
      payload: { approved: false, findings: [] },
      createdByUserId: "usr_admin",
    })).rejects.toThrow(/foreign key/i);
  });
});